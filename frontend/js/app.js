// ==============================================================================
// NEXUS AI - FRONTEND APPLICATION & REAL-TIME BEHAVIORAL TRACKER
// DBMS Capstone Project
// ==============================================================================

const API_BASE = "";

// State
let state = {
    users: [],
    currentUser: null,
    categories: [],
    selectedCategory: null,
    catalogProducts: [],
    recommendations: [],
    trendingProducts: [],
    cart: { items: [], total: 0, count: 0 },
    activeModalProduct: null,
    modalDwellTimer: null,
    modalDwellStart: null,
    searchTimeout: null,
    charts: {
        categorySales: null,
        userAffinity: null
    }
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadUsers();
        await loadCategories();
        await loadRecommendations();
        await loadTrending();
        await loadCatalog();
        await loadCart();
        lucide.createIcons();
    } catch (err) {
        console.error("Initialization error:", err);
    }
});

// ==============================================================================
// 1. PERSONA MANAGEMENT & SWITCHING
// ==============================================================================
async function loadUsers() {
    const res = await fetch(`${API_BASE}/api/users`);
    const data = await res.json();
    state.users = data.users || [];
    
    // Default to user 1 (Alex Rivera) or first user
    if (!state.currentUser && state.users.length > 0) {
        state.currentUser = state.users[0];
    }
    renderCurrentUserUI();
    renderPersonaDropdownList();
}

function renderCurrentUserUI() {
    if (!state.currentUser) return;
    const u = state.currentUser;
    
    // Navbar
    const avatar = document.getElementById("current-user-avatar");
    if (avatar) avatar.src = u.avatar_url;
    const name = document.getElementById("current-user-name");
    if (name) name.textContent = u.full_name.split(" ")[0];
    const segment = document.getElementById("current-user-segment");
    if (segment) segment.textContent = u.segment ? u.segment.split(" ")[0] : "User";
    const persona = document.getElementById("current-user-persona");
    if (persona) persona.textContent = u.persona_label;

    // Hero banner
    const heroName = document.getElementById("hero-user-name");
    if (heroName) heroName.textContent = u.full_name;
    const heroPersona = document.getElementById("hero-persona-label");
    if (heroPersona) heroPersona.textContent = u.persona_label;
    const heroCategory = document.getElementById("hero-top-category");
    if (heroCategory) heroCategory.textContent = u.preferred_category_name || "Multi-Interest";

    // Order history user header
    const ordersUser = document.getElementById("orders-user-name");
    if (ordersUser) ordersUser.textContent = u.full_name;
}

function renderPersonaDropdownList() {
    const list = document.getElementById("persona-list");
    if (!list) return;
    list.innerHTML = state.users.map(u => {
        const isCurrent = state.currentUser && state.currentUser.user_id === u.user_id;
        return `
            <div onclick="selectPersona(${u.user_id})" class="flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${isCurrent ? 'bg-indigo-600/30 border border-indigo-500/40' : 'hover:bg-slate-800'}">
                <img src="${u.avatar_url}" class="w-8 h-8 rounded-full object-cover border border-slate-700">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-white truncate">${u.full_name}</span>
                        <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-mono">${u.segment}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 truncate">${u.persona_label}</p>
                </div>
            </div>
        `;
    }).join("");
}

function togglePersonaDropdown() {
    const dropdown = document.getElementById("persona-dropdown");
    if (dropdown) dropdown.classList.toggle("hidden");
}

async function selectPersona(userId) {
    const user = state.users.find(u => u.user_id === userId);
    if (!user) return;
    state.currentUser = user;
    renderCurrentUserUI();
    renderPersonaDropdownList();
    togglePersonaDropdown();

    // Trigger visual toast
    showClickstreamToast(`Switched active persona to ${user.full_name}. Real-time recommendations recalculating...`);

    // Reload user-specific data
    await loadRecommendations();
    await loadCart();
    await loadOrders();
    lucide.createIcons();
}

// ==============================================================================
// 2. STOREFRONT & AI RECOMMENDATIONS
// ==============================================================================
async function loadRecommendations() {
    if (!state.currentUser) return;
    const container = document.getElementById("recommendations-container");
    if (!container) return;
    
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">Computing real-time Bayesian recommendations...</div>`;
    
    try {
        const res = await fetch(`${API_BASE}/api/recommendations/personalized?user_id=${state.currentUser.user_id}&limit=6`);
        const data = await res.json();
        state.recommendations = data.recommendations || [];
        renderRecommendations(state.recommendations);
    } catch (err) {
        container.innerHTML = `<div class="col-span-full py-4 text-center text-red-400 text-xs">Could not load recommendations.</div>`;
    }
}

function renderRecommendations(recs) {
    const container = document.getElementById("recommendations-container");
    if (!container) return;
    if (recs.length === 0) {
        container.innerHTML = `<div class="col-span-full py-6 text-center text-slate-400 text-xs">No candidate recommendations available.</div>`;
        return;
    }

    container.innerHTML = recs.map(p => {
        const stockBadge = p.stock_quantity <= 0 
            ? `<span class="badge-out-of-stock text-[10px] font-bold px-2 py-0.5 rounded">Out of Stock</span>`
            : p.stock_quantity <= 10 
            ? `<span class="badge-low-stock text-[10px] font-bold px-2 py-0.5 rounded">Low Stock: ${p.stock_quantity} left</span>`
            : `<span class="badge-in-stock text-[10px] font-bold px-2 py-0.5 rounded">In Stock</span>`;

        return `
            <div class="product-card bg-cardBg border border-borderBg hover:border-indigo-500/40 rounded-xl overflow-hidden flex flex-col justify-between p-4 shadow-lg">
                <div>
                    <!-- AI MATCH HEADER -->
                    <div class="flex items-center justify-between mb-2">
                        <span class="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <i data-lucide="sparkles" class="w-3 h-3"></i>
                            <span>${p.match_confidence || 88}% Match</span>
                        </span>
                        ${stockBadge}
                    </div>

                    <!-- IMAGE -->
                    <div onclick="openProductModal(${p.product_id})" class="aspect-video w-full rounded-lg overflow-hidden bg-slate-800 cursor-pointer mb-3 relative group">
                        <img src="${p.image_url}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        <div class="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span class="text-xs bg-black/70 text-white font-medium px-2.5 py-1 rounded-md backdrop-blur-xs flex items-center space-x-1">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                <span>Inspect Product</span>
                            </span>
                        </div>
                    </div>

                    <!-- EXPLAINABLE AI REASON BADGE -->
                    <div class="mb-2 bg-slate-900/90 border border-indigo-500/20 rounded-md p-1.5 flex items-start space-x-1.5">
                        <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"></i>
                        <span class="text-[10px] text-indigo-200 line-clamp-1 leading-tight">${p.recommendation_reason || "Based on your browsing activity"}</span>
                    </div>

                    <!-- BRAND & TITLE -->
                    <div class="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">${p.brand_name} • ${p.category_name}</div>
                    <h3 onclick="openProductModal(${p.product_id})" class="text-xs font-semibold text-white hover:text-indigo-300 cursor-pointer line-clamp-2 leading-snug">${p.title}</h3>
                </div>

                <!-- FOOTER: PRICE & CTA -->
                <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                        <span class="text-base font-bold text-white">$${p.price.toFixed(2)}</span>
                        ${p.original_price ? `<span class="text-[11px] text-slate-500 line-through ml-1.5">$${p.original_price.toFixed(2)}</span>` : ""}
                    </div>
                    <button onclick="addToCart(${p.product_id})" class="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center space-x-1 text-xs font-medium shadow-md shadow-indigo-600/20" title="Add to Cart">
                        <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                        <span class="hidden sm:inline">Add</span>
                    </button>
                </div>
            </div>
        `;
    }).join("");
    lucide.createIcons();
}

async function loadTrending() {
    const container = document.getElementById("trending-container");
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/recommendations/trending?limit=4`);
        const data = await res.json();
        state.trendingProducts = data.trending || [];
        
        container.innerHTML = state.trendingProducts.map(p => `
            <div class="bg-cardBg border border-borderBg rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                    <div class="aspect-video rounded-lg overflow-hidden bg-slate-800 mb-2.5 cursor-pointer" onclick="openProductModal(${p.product_id})">
                        <img src="${p.image_url}" alt="${p.title}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                    </div>
                    <div class="flex items-center space-x-1 text-amber-400 text-[10px] mb-1">
                        <i data-lucide="flame" class="w-3 h-3 fill-current"></i>
                        <span class="font-bold text-white">${p.rating} ★</span>
                        <span class="text-slate-400">(${p.recent_views} views)</span>
                    </div>
                    <h4 onclick="openProductModal(${p.product_id})" class="text-xs font-semibold text-slate-200 hover:text-white cursor-pointer line-clamp-1">${p.title}</h4>
                </div>
                <div class="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span class="text-xs font-bold text-white">$${p.price.toFixed(2)}</span>
                    <button onclick="addToCart(${p.product_id})" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Add to Cart</button>
                </div>
            </div>
        `).join("");
        lucide.createIcons();
    } catch (err) {
        console.error("Failed to load trending:", err);
    }
}

// ==============================================================================
// 3. CATALOG & FILTERS
// ==============================================================================
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        state.categories = data.categories || [];
        renderCategoryPills();
    } catch (err) {
        console.error("Failed to load categories:", err);
    }
}

function renderCategoryPills() {
    const container = document.getElementById("category-pills");
    if (!container) return;

    let html = `
        <button onclick="filterCategory(null)" class="cat-pill ${state.selectedCategory === null ? 'active' : 'bg-slate-900 border-slate-800 text-slate-300'} px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0">
            All Products
        </button>
    `;

    html += state.categories.map(c => `
        <button onclick="filterCategory(${c.category_id})" class="cat-pill ${state.selectedCategory === c.category_id ? 'active' : 'bg-slate-900 border-slate-800 text-slate-300'} px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0">
            ${c.category_name} (${c.product_count})
        </button>
    `).join("");

    container.innerHTML = html;
}

function filterCategory(catId) {
    state.selectedCategory = catId;
    renderCategoryPills();
    loadCatalog();
}

function debounceSearch() {
    clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(() => {
        loadCatalog();
    }, 250);
}

async function loadCatalog() {
    const container = document.getElementById("catalog-container");
    if (!container) return;

    const searchInput = document.getElementById("catalog-search");
    const searchVal = searchInput ? searchInput.value.trim() : "";
    const sortVal = document.getElementById("catalog-sort") ? document.getElementById("catalog-sort").value : "featured";
    const inStockVal = document.getElementById("catalog-instock") ? document.getElementById("catalog-instock").checked : false;

    let url = `${API_BASE}/api/products?sort_by=${sortVal}&in_stock_only=${inStockVal}`;
    if (state.selectedCategory) url += `&category_id=${state.selectedCategory}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        state.catalogProducts = data.products || [];
        renderCatalogGrid(state.catalogProducts);
    } catch (err) {
        container.innerHTML = `<div class="col-span-full py-4 text-center text-red-400 text-xs">Error loading catalog.</div>`;
    }
}

function renderCatalogGrid(products) {
    const container = document.getElementById("catalog-container");
    if (!container) return;
    if (products.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-xs">No products match your search/filter criteria.</div>`;
        return;
    }

    container.innerHTML = products.map(p => {
        const stockBadge = p.stock_quantity <= 0 
            ? `<span class="badge-out-of-stock text-[10px] font-bold px-2 py-0.5 rounded">Out of Stock</span>`
            : p.stock_quantity <= p.safety_stock_threshold 
            ? `<span class="badge-low-stock text-[10px] font-bold px-2 py-0.5 rounded">Low: ${p.stock_quantity} left</span>`
            : `<span class="badge-in-stock text-[10px] font-bold px-2 py-0.5 rounded">Stock: ${p.stock_quantity}</span>`;

        return `
            <div class="product-card bg-cardBg border border-borderBg hover:border-slate-700 rounded-xl overflow-hidden flex flex-col justify-between p-4 shadow-md">
                <div>
                    <div class="aspect-square rounded-lg overflow-hidden bg-slate-800 mb-3 cursor-pointer relative group" onclick="openProductModal(${p.product_id})">
                        <img src="${p.image_url}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        <div class="absolute top-2 right-2">${stockBadge}</div>
                    </div>
                    <div class="text-[10px] uppercase font-bold text-slate-400 mb-0.5">${p.brand_name}</div>
                    <h3 onclick="openProductModal(${p.product_id})" class="text-xs font-semibold text-white hover:text-indigo-300 cursor-pointer line-clamp-2 leading-snug">${p.title}</h3>
                    <div class="flex items-center space-x-1 text-xs text-amber-400 mt-1">
                        <span>★ ${p.rating.toFixed(1)}</span>
                        <span class="text-slate-500 text-[10px]">(${p.review_count})</span>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                        <span class="text-sm font-bold text-white">$${p.price.toFixed(2)}</span>
                    </div>
                    <button onclick="addToCart(${p.product_id})" class="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors" title="Add to Cart">
                        <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
    lucide.createIcons();
}

// ==============================================================================
// 4. ACTIVE DWELL TIME TRACKING & PRODUCT MODAL
// ==============================================================================
async function openProductModal(productId) {
    try {
        const res = await fetch(`${API_BASE}/api/products/${productId}`);
        const data = await res.json();
        state.activeModalProduct = data.product;

        // Set UI
        document.getElementById("modal-product-image").src = data.product.image_url;
        document.getElementById("modal-title").textContent = data.product.title;
        document.getElementById("modal-brand").textContent = data.product.brand_name;
        document.getElementById("modal-category").textContent = data.product.category_name;
        document.getElementById("modal-sku").textContent = data.product.sku;
        document.getElementById("modal-warehouse").textContent = data.product.warehouse_location;
        document.getElementById("modal-rating-num").textContent = data.product.rating.toFixed(2);
        document.getElementById("modal-reviews-count").textContent = `(${data.product.review_count} verified reviews)`;
        document.getElementById("modal-price").textContent = `$${data.product.price.toFixed(2)}`;
        document.getElementById("modal-description").textContent = data.product.description;

        const origPrice = document.getElementById("modal-orig-price");
        if (data.product.original_price) {
            origPrice.textContent = `$${data.product.original_price.toFixed(2)}`;
            origPrice.classList.remove("hidden");
        } else {
            origPrice.classList.add("hidden");
        }

        const badge = document.getElementById("modal-stock-badge");
        if (data.product.stock_quantity <= 0) {
            badge.className = "absolute top-3 left-3 text-[11px] font-bold px-2 py-1 rounded-md shadow-lg badge-out-of-stock";
            badge.textContent = "Out of Stock";
        } else if (data.product.stock_quantity <= data.product.safety_stock_threshold) {
            badge.className = "absolute top-3 left-3 text-[11px] font-bold px-2 py-1 rounded-md shadow-lg badge-low-stock";
            badge.textContent = `Low Stock: Only ${data.product.stock_quantity} left`;
        } else {
            badge.className = "absolute top-3 left-3 text-[11px] font-bold px-2 py-1 rounded-md shadow-lg badge-in-stock";
            badge.textContent = `In Stock (${data.product.stock_quantity} units)`;
        }

        // Render reviews
        renderModalReviews(data.reviews || []);

        // Load Frequently Bought Together bundle
        loadFrequentlyBoughtTogether(productId);

        // Start Active Dwell Time Tracking
        state.modalDwellStart = Date.now();
        const timerBadge = document.getElementById("modal-dwell-timer");
        clearInterval(state.modalDwellTimer);
        state.modalDwellTimer = setInterval(() => {
            const elapsedSec = Math.floor((Date.now() - state.modalDwellStart) / 1000);
            const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
            const ss = String(elapsedSec % 60).padStart(2, "0");
            if (timerBadge) timerBadge.textContent = `⏱️ ${mm}:${ss}s`;
        }, 1000);

        // Open modal
        const modal = document.getElementById("product-modal");
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        lucide.createIcons();

    } catch (err) {
        console.error("Failed to open product modal:", err);
    }
}

function closeProductModal() {
    const modal = document.getElementById("product-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");

    // Calculate elapsed dwell seconds
    clearInterval(state.modalDwellTimer);
    if (state.modalDwellStart && state.activeModalProduct && state.currentUser) {
        const dwellSeconds = Math.max(1, Math.floor((Date.now() - state.modalDwellStart) / 1000));
        
        // Transmit Clickstream event to SQL backend
        transmitBrowsingEvent(state.currentUser.user_id, state.activeModalProduct.product_id, "view", dwellSeconds);
    }
    state.activeModalProduct = null;
    state.modalDwellStart = null;
}

async function transmitBrowsingEvent(userId, productId, eventType = "view", dwellSeconds = 0) {
    try {
        const res = await fetch(`${API_BASE}/api/tracking/browsing`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                session_id: `sess_${userId}_${Math.floor(Date.now() / 10000)}`,
                product_id: productId,
                event_type: eventType,
                dwell_time_seconds: dwellSeconds,
                device_type: "Desktop",
                referrer: "Storefront Modal"
            })
        });
        const data = await res.json();
        
        // Show live feedback toast
        const aff = data.data && data.data.updated_affinity;
        const affScore = aff ? aff.affinity_score.toFixed(1) : "+0.5";
        showClickstreamToast(`Tracked ${dwellSeconds}s dwell time • Category affinity boosted to ${affScore}! SQL triggers firing...`);

        // Refresh recommendations dynamically!
        await loadRecommendations();
    } catch (err) {
        console.error("Failed to transmit browsing event:", err);
    }
}

async function loadFrequentlyBoughtTogether(productId) {
    const container = document.getElementById("fbt-bundle-container");
    if (!container) return;
    container.innerHTML = `<div class="col-span-full text-slate-400 text-xs">Mining co-purchase association rules...</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/products/${productId}/frequently-bought-together?limit=3`);
        const data = await res.json();
        const items = data.frequently_bought_together || [];

        if (items.length === 0) {
            container.innerHTML = `<div class="col-span-full text-slate-400 text-xs">No complementary accessories registered yet.</div>`;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                <div class="flex items-center space-x-2 min-w-0">
                    <img src="${item.image_url}" class="w-10 h-10 rounded object-cover border border-slate-800 shrink-0">
                    <div class="min-w-0">
                        <h4 class="text-xs font-semibold text-white truncate">${item.title}</h4>
                        <div class="flex items-center space-x-1.5 text-[10px] text-slate-400">
                            <span class="text-indigo-400 font-bold">$${item.price.toFixed(2)}</span>
                            <span>•</span>
                            <span class="text-emerald-400 font-mono">${Math.round(item.confidence_score * 100)}% Co-Buy</span>
                        </div>
                    </div>
                </div>
                <button onclick="addToCart(${item.product_id})" class="p-1.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors shrink-0 ml-2" title="Add Complementary Item">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `).join("");
        lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<div class="col-span-full text-red-400 text-xs">Error loading complementary bundle.</div>`;
    }
}

function renderModalReviews(reviews) {
    const container = document.getElementById("modal-reviews-list");
    if (!container) return;
    if (reviews.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500">No reviews recorded yet for this product.</div>`;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <img src="${r.reviewer_avatar}" class="w-6 h-6 rounded-full object-cover">
                    <span class="text-xs font-bold text-white">${r.reviewer_name}</span>
                    <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Verified Buyer</span>
                </div>
                <span class="text-xs text-amber-400">${"★".repeat(r.rating)}</span>
            </div>
            <h5 class="text-xs font-semibold text-slate-200">${r.headline || ""}</h5>
            <p class="text-[11px] text-slate-400 leading-relaxed">${r.comment || ""}</p>
        </div>
    `).join("");
}

function modalAddToCart() {
    if (state.activeModalProduct) {
        addToCart(state.activeModalProduct.product_id);
    }
}

// ==============================================================================
// 5. SHOPPING CART & ACID CHECKOUT
// ==============================================================================
function toggleCartDrawer() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-drawer-overlay");
    if (!drawer || !overlay) return;

    const isHidden = drawer.classList.contains("translate-x-full");
    if (isHidden) {
        drawer.classList.remove("translate-x-full");
        overlay.classList.remove("hidden");
        setTimeout(() => overlay.classList.remove("opacity-0"), 10);
    } else {
        drawer.classList.add("translate-x-full");
        overlay.classList.add("opacity-0");
        setTimeout(() => overlay.classList.add("hidden"), 300);
    }
}

async function loadCart() {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/api/cart?user_id=${state.currentUser.user_id}`);
        const data = await res.json();
        state.cart.items = data.cart_items || [];
        state.cart.total = data.total_amount || 0;
        state.cart.count = data.total_items || 0;

        renderCartUI();
    } catch (err) {
        console.error("Failed to load cart:", err);
    }
}

function renderCartUI() {
    // Badge
    const badge = document.getElementById("cart-badge");
    if (badge) badge.textContent = state.cart.count;

    // Subtotals
    const subtotal = document.getElementById("cart-subtotal");
    if (subtotal) subtotal.textContent = `$${state.cart.total.toFixed(2)}`;
    const total = document.getElementById("cart-total");
    if (total) total.textContent = `$${state.cart.total.toFixed(2)}`;

    // Container
    const container = document.getElementById("cart-items-container");
    if (!container) return;

    if (state.cart.items.length === 0) {
        container.innerHTML = `
            <div class="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <div class="p-3 bg-slate-800 rounded-full text-slate-400">
                    <i data-lucide="shopping-bag" class="w-8 h-8"></i>
                </div>
                <p class="text-xs text-slate-400">Your cart is currently empty.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = state.cart.items.map(item => `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
            <img src="${item.image_url}" class="w-14 h-14 rounded-lg object-cover border border-slate-800 shrink-0">
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-semibold text-white truncate">${item.title}</h4>
                <div class="text-[11px] text-indigo-400 font-bold">$${item.price.toFixed(2)}</div>
                
                <div class="flex items-center space-x-2 mt-1">
                    <button onclick="updateCartQty(${item.product_id}, ${item.quantity - 1})" class="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold">-</button>
                    <span class="text-xs font-mono text-white">${item.quantity}</span>
                    <button onclick="updateCartQty(${item.product_id}, ${item.quantity + 1})" class="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold">+</button>
                </div>
            </div>
            <button onclick="removeCartItem(${item.product_id})" class="text-slate-500 hover:text-red-400 p-1" title="Remove">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    `).join("");
    lucide.createIcons();
}

async function addToCart(productId, quantity = 1) {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/api/cart/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: state.currentUser.user_id,
                product_id: productId,
                quantity: quantity
            })
        });
        const data = await res.json();
        if (res.ok) {
            showClickstreamToast(`Added item to cart! Inventory validated & cart_add event logged.`);
            await loadCart();
            toggleCartDrawer();
        } else {
            alert(data.detail || "Could not add to cart");
        }
    } catch (err) {
        console.error("Cart add error:", err);
    }
}

async function updateCartQty(productId, newQty) {
    if (!state.currentUser) return;
    await fetch(`${API_BASE}/api/cart/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: state.currentUser.user_id,
            product_id: productId,
            quantity: newQty
        })
    });
    await loadCart();
}

async function removeCartItem(productId) {
    if (!state.currentUser) return;
    await fetch(`${API_BASE}/api/cart/${productId}?user_id=${state.currentUser.user_id}`, {
        method: "DELETE"
    });
    await loadCart();
}

async function performCheckout() {
    if (!state.currentUser) return;
    const btn = document.getElementById("btn-checkout");
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/orders/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: state.currentUser.user_id,
                payment_method: "Credit Card (Tokenized)",
                shipping_address: "742 Innovation Way, Tech Campus"
            })
        });
        const data = await res.json();

        if (res.ok) {
            alert(`🎉 Order Completed Successfully!\nOrder Number: ${data.order_number}\nTotal: $${data.total_amount.toFixed(2)}\n\nSQL Trigger trg_after_order_item_deduct_inventory automatically decremented warehouse stock and created audit logs!`);
            toggleCartDrawer();
            await loadCart();
            await loadCatalog();
            await loadInventoryData();
            await loadRecommendations();
            await loadOrders();
        } else {
            alert(`Checkout Error: ${data.detail}`);
        }
    } catch (err) {
        alert("Failed to process checkout transaction.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ==============================================================================
// 6. DBMS & AI ANALYTICS DASHBOARD
// ==============================================================================
async function loadAnalyticsData() {
    try {
        const [sumRes, usersRes] = await Promise.all([
            fetch(`${API_BASE}/api/analytics/summary`),
            fetch(`${API_BASE}/api/users`)
        ]);
        const sumData = await sumRes.json();
        const usersData = await usersRes.json();

        // Update KPIs
        document.getElementById("kpi-revenue").textContent = `$${sumData.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById("kpi-orders").textContent = sumData.total_orders;
        document.getElementById("kpi-views").textContent = sumData.total_views;
        document.getElementById("kpi-low-stock").textContent = sumData.low_stock_count;

        // Render Charts
        renderCategorySalesChart(sumData.category_breakdown || []);
        renderUserAffinityChart(state.currentUser ? state.currentUser.user_id : 1);

        // Render CLV Table
        renderCLVTable(usersData.users || []);

    } catch (err) {
        console.error("Analytics load error:", err);
    }
}

function renderCategorySalesChart(breakdown) {
    const ctx = document.getElementById("categorySalesChart");
    if (!ctx) return;

    if (state.charts.categorySales) {
        state.charts.categorySales.destroy();
    }

    const labels = breakdown.map(b => b.category_name);
    const data = breakdown.map(b => b.units_sold);

    state.charts.categorySales = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Units Sold',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#1f2937' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 9 } }
                }
            }
        }
    });
}

async function renderUserAffinityChart(userId) {
    const ctx = document.getElementById("userAffinityChart");
    if (!ctx) return;

    try {
        const res = await fetch(`${API_BASE}/api/users/${userId}`);
        const data = await res.json();
        const affinities = data.affinities || [];

        if (state.charts.userAffinity) {
            state.charts.userAffinity.destroy();
        }

        const labels = affinities.map(a => a.category_name);
        const scores = affinities.map(a => a.affinity_score);

        state.charts.userAffinity = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${data.user.full_name}'s Affinity`,
                    data: scores,
                    backgroundColor: 'rgba(168, 85, 247, 0.25)',
                    borderColor: '#a855f7',
                    pointBackgroundColor: '#ec4899',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: '#1f2937' },
                        grid: { color: '#1f2937' },
                        pointLabels: { color: '#cbd5e1', font: { size: 10 } },
                        ticks: { display: false }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#e2e8f0', font: { size: 11 } } }
                }
            }
        });
    } catch (err) {
        console.error("Affinity chart error:", err);
    }
}

function renderCLVTable(users) {
    const tbody = document.getElementById("clv-table-body");
    if (!tbody) return;

    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-900/40 transition-colors">
            <td class="p-3 flex items-center space-x-2">
                <img src="${u.avatar_url}" class="w-6 h-6 rounded-full object-cover">
                <div>
                    <div class="font-bold text-white">${u.full_name}</div>
                    <div class="text-[10px] text-slate-500 font-mono">${u.email}</div>
                </div>
            </td>
            <td class="p-3 text-slate-300">${u.persona_label}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">${u.segment}</span></td>
            <td class="p-3 font-mono font-bold text-white">${u.total_orders}</td>
            <td class="p-3 font-mono font-bold text-emerald-400">$${u.total_spend.toFixed(2)}</td>
            <td class="p-3 font-mono text-slate-300">$${(u.total_orders > 0 ? u.total_spend / u.total_orders : 0).toFixed(2)}</td>
            <td class="p-3 font-mono text-purple-400">${u.total_browsing_events}</td>
            <td class="p-3 text-slate-500 font-mono text-[10px]">${u.last_active_at || "Recent"}</td>
        </tr>
    `).join("");
}

// ==============================================================================
// 7. LIVE SQL CONSOLE STUDIO
// ==============================================================================
const SQL_TEMPLATES = {
    clv: "SELECT * FROM vw_customer_lifetime_value ORDER BY total_spend DESC;",
    fbt: "SELECT base_product_title, complementary_product_title, co_purchase_frequency, confidence_score FROM vw_frequently_bought_together ORDER BY co_purchase_frequency DESC LIMIT 10;",
    trending: "SELECT sku, title, category_name, price, stock_quantity, recent_views, recent_purchases, trending_score FROM vw_trending_products LIMIT 8;",
    inventory_audit: "SELECT il.log_id, p.title, il.change_type, il.quantity_delta, il.previous_stock, il.new_stock, il.reference_id, il.logged_at FROM inventory_logs il JOIN products p ON il.product_id = p.product_id ORDER BY il.logged_at DESC LIMIT 15;",
    clickstream: "SELECT cb.event_id, u.full_name, p.title, cb.event_type, cb.dwell_time_seconds, cb.device_type, cb.viewed_at FROM customer_browsing_history cb JOIN users u ON cb.user_id = u.user_id JOIN products p ON cb.product_id = p.product_id ORDER BY cb.viewed_at DESC LIMIT 15;",
    similarity_matrix: "SELECT p1.title AS Product_A, p2.title AS Product_B, sm.content_similarity, sm.co_purchase_score, sm.hybrid_score FROM product_similarity_matrix sm JOIN products p1 ON sm.product_a_id = p1.product_id JOIN products p2 ON sm.product_b_id = p2.product_id ORDER BY sm.hybrid_score DESC LIMIT 12;"
};

function setSqlTemplate(key) {
    const input = document.getElementById("sql-input");
    if (input && SQL_TEMPLATES[key]) {
        input.value = SQL_TEMPLATES[key];
        executeSqlQuery();
    }
}

async function executeSqlQuery() {
    const input = document.getElementById("sql-input");
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    const timer = document.getElementById("query-timer");
    const status = document.getElementById("sql-status-badge");
    const errBox = document.getElementById("sql-error-box");
    const thead = document.getElementById("sql-table-head");
    const tbody = document.getElementById("sql-table-body");

    status.textContent = "Executing query...";
    errBox.classList.add("hidden");

    try {
        const res = await fetch(`${API_BASE}/api/sql/console`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql_query: query })
        });
        const result = await res.json();

        timer.textContent = `⏱️ ${result.execution_time_ms} ms`;
        timer.classList.remove("hidden");

        if (!result.success) {
            status.textContent = "Execution Error";
            errBox.textContent = `Error: ${result.error}`;
            errBox.classList.remove("hidden");
            thead.innerHTML = "";
            tbody.innerHTML = "";
            return;
        }

        status.textContent = `Success • ${result.row_count} rows returned in ${result.execution_time_ms} ms`;

        // Render table
        if (result.columns.length === 0) {
            thead.innerHTML = "";
            tbody.innerHTML = `<tr><td class="p-4 text-center text-slate-400">Statement executed successfully. Affected rows: ${result.row_count}</td></tr>`;
            return;
        }

        thead.innerHTML = `<tr>${result.columns.map(col => `<th class="p-2.5">${col}</th>`).join("")}</tr>`;
        tbody.innerHTML = result.data.map(row => `
            <tr class="hover:bg-slate-900 transition-colors">
                ${result.columns.map(col => `<td class="p-2.5 text-slate-300 border-r border-slate-900 last:border-0">${row[col] !== null ? row[col] : '<span class="text-slate-600">NULL</span>'}</td>`).join("")}
            </tr>
        `).join("");

    } catch (err) {
        status.textContent = "Network Error";
        errBox.textContent = String(err);
        errBox.classList.remove("hidden");
    }
}

// ==============================================================================
// 8. INVENTORY MANAGEMENT & AUDIT LOGS
// ==============================================================================
async function loadInventoryData() {
    const tbody = document.getElementById("inventory-table-body");
    const logsBody = document.getElementById("inventory-logs-body");
    if (!tbody) return;

    try {
        const [invRes, logsRes] = await Promise.all([
            fetch(`${API_BASE}/api/inventory`),
            fetch(`${API_BASE}/api/inventory/logs?limit=15`)
        ]);
        const invData = await invRes.json();
        const logsData = await logsRes.json();

        tbody.innerHTML = (invData.inventory || []).map(item => {
            const statusBadge = item.stock_quantity <= 0 
                ? `<span class="badge-out-of-stock text-[10px] font-bold px-2 py-0.5 rounded">Out of Stock</span>`
                : item.stock_quantity <= item.safety_stock_threshold 
                ? `<span class="badge-low-stock text-[10px] font-bold px-2 py-0.5 rounded">Low Stock</span>`
                : `<span class="badge-in-stock text-[10px] font-bold px-2 py-0.5 rounded">In Stock</span>`;

            return `
                <tr class="hover:bg-slate-900/40 transition-colors">
                    <td class="p-3 font-mono text-indigo-400 font-semibold">${item.sku}</td>
                    <td class="p-3 font-bold text-white">${item.title}</td>
                    <td class="p-3 text-slate-400">${item.category_name}</td>
                    <td class="p-3 font-mono text-slate-300">${item.warehouse_location}</td>
                    <td class="p-3 text-right font-mono font-bold text-base ${item.stock_quantity <= item.safety_stock_threshold ? 'text-amber-400' : 'text-emerald-400'}">${item.stock_quantity}</td>
                    <td class="p-3 text-right font-mono text-slate-400">${item.safety_stock_threshold}</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-center">
                        <button onclick="restockItem(${item.product_id})" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-xs font-semibold transition-colors">
                            +25 Restock
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        // Audit Logs
        if (logsBody) {
            logsBody.innerHTML = (logsData.logs || []).map(l => `
                <tr class="hover:bg-slate-900">
                    <td class="p-2 text-indigo-400 font-mono">#${l.log_id}</td>
                    <td class="p-2 text-slate-200">${l.product_title}</td>
                    <td class="p-2"><span class="px-1.5 py-0.5 rounded text-[10px] ${l.change_type === 'RESTOCK' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'} font-bold">${l.change_type}</span></td>
                    <td class="p-2 text-right font-mono ${l.quantity_delta > 0 ? 'text-emerald-400' : 'text-red-400'}">${l.quantity_delta > 0 ? '+' : ''}${l.quantity_delta}</td>
                    <td class="p-2 text-right font-mono text-slate-400">${l.previous_stock} → ${l.new_stock}</td>
                    <td class="p-2 text-slate-400 font-mono">${l.reference_id || "-"}</td>
                    <td class="p-2 text-slate-500">${l.logged_at}</td>
                </tr>
            `).join("");
        }

    } catch (err) {
        console.error("Inventory load error:", err);
    }
}

async function restockItem(productId) {
    try {
        const res = await fetch(`${API_BASE}/api/inventory/restock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product_id: productId,
                quantity_to_add: 25,
                reference_id: `PO-${Math.floor(Date.now() / 1000)}`,
                notes: "Restock replenishment triggered via DBMS Inventory console"
            })
        });
        const data = await res.json();
        if (res.ok) {
            showClickstreamToast(`Restocked +25 units! Recorded in inventory_logs audit ledger.`);
            await loadInventoryData();
            await loadCatalog();
            await loadRecommendations();
        } else {
            alert(data.detail || "Restock failed");
        }
    } catch (err) {
        alert("Restock network error");
    }
}

// ==============================================================================
// 9. PAST ORDERS TAB
// ==============================================================================
async function loadOrders() {
    if (!state.currentUser) return;
    const container = document.getElementById("orders-list-container");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/orders?user_id=${state.currentUser.user_id}`);
        const data = await res.json();
        const orders = data.orders || [];

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="bg-cardBg border border-borderBg rounded-xl p-8 text-center text-slate-400 text-xs">
                    No order history found for ${state.currentUser.full_name}. Place an order from the cart to test SQL inventory deduction triggers!
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(o => `
            <div class="bg-cardBg border border-borderBg rounded-xl p-4 shadow-lg space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-white text-sm">${o.order_number}</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">${o.order_status}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Placed on ${o.created_at} • Payment: ${o.payment_method}</div>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-slate-400">Total:</span>
                        <span class="text-base font-extrabold text-indigo-400 ml-1">$${o.total_amount.toFixed(2)}</span>
                    </div>
                </div>

                <div class="space-y-2">
                    ${(o.items || []).map(item => `
                        <div class="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-lg">
                            <div class="flex items-center space-x-2">
                                <img src="${item.image_url}" class="w-8 h-8 rounded object-cover">
                                <span class="font-semibold text-slate-200">${item.title}</span>
                            </div>
                            <div class="font-mono text-slate-300">
                                <span>${item.quantity} × $${item.unit_price.toFixed(2)}</span>
                                <span class="font-bold text-white ml-3">$${item.subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Orders load error:", err);
    }
}

// ==============================================================================
// 10. SYSTEM UTILITIES & NAVIGATION
// ==============================================================================
function switchTab(tabName) {
    const tabs = ["storefront", "analytics", "sql-console", "inventory", "orders"];
    tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        const nav = document.getElementById(`nav-${t}`);
        if (el) el.classList.toggle("hidden", t !== tabName);
        if (nav) nav.classList.toggle("active", t === tabName);
    });

    if (tabName === "analytics") loadAnalyticsData();
    if (tabName === "inventory") loadInventoryData();
    if (tabName === "orders") loadOrders();
    if (tabName === "sql-console") {
        const input = document.getElementById("sql-input");
        if (input && !input.value) setSqlTemplate('clv');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const m = document.getElementById("mobile-nav");
    if (m) m.classList.toggle("hidden");
}

function showClickstreamToast(msg) {
    const toast = document.getElementById("live-clickstream-toast");
    const msgEl = document.getElementById("clickstream-toast-msg");
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    toast.classList.remove("translate-y-32", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
        toast.classList.add("translate-y-32", "opacity-0");
        toast.classList.remove("translate-y-0", "opacity-100");
    }, 4500);
}

async function resetDemoData() {
    if (!confirm("Reset database to baseline dataset? This will restore original stock, orders, and clean test events.")) return;
    try {
        await fetch(`${API_BASE}/api/database/reset`, { method: "POST" });
        alert("Database successfully reset and re-seeded!");
        location.reload();
    } catch (err) {
        alert("Failed to reset database.");
    }
}
