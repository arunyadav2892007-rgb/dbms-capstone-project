// ==============================================================================
// NEXUS AI - FULL-STACK NODE.JS HTTP SERVER & SQL API ENGINE
// Built with pure Node.js & SQLite (Zero external dependencies)
// ==============================================================================

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { query, queryOne, execute, runRawSql, initDb } = require('./src/database');
const { seedDatabase } = require('./src/seed');
const recommender = require('./src/recommender');

const PORT = process.env.PORT || 8000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

// Ensure DB exists on boot
const DB_PATH = path.join(__dirname, 'ecommerce_recommendation.db');
if (!fs.existsSync(DB_PATH)) {
    console.log('[Server] Database not found. Running seed...');
    seedDatabase(true);
}

// Helpers
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
    });
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
    const method = req.method;

    try {
        // ==============================================================================
        // 1. STATIC FRONTEND ROUTES
        // ==============================================================================
        if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
            return sendFile(res, path.join(FRONTEND_DIR, 'index.html'), 'text/html; charset=utf-8');
        }

        if (method === 'GET' && pathname.startsWith('/static/')) {
            const relativePath = pathname.replace('/static/', '');
            const filePath = path.join(FRONTEND_DIR, relativePath);
            const ext = path.extname(filePath);
            const mimeTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            return sendFile(res, filePath, contentType);
        }

        // ==============================================================================
        // 2. USER & PERSONA APIS
        // ==============================================================================
        if (method === 'GET' && pathname === '/api/users') {
            const users = query(`
                SELECT 
                    u.user_id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.avatar_url,
                    u.persona_label,
                    u.preferred_category_id,
                    c.category_name AS preferred_category_name,
                    u.segment,
                    u.last_active_at,
                    COALESCE(clv.total_spend, 0.0) AS total_spend,
                    COALESCE(clv.total_orders, 0) AS total_orders,
                    COALESCE(clv.total_browsing_events, 0) AS total_browsing_events
                FROM users u
                LEFT JOIN categories c ON u.preferred_category_id = c.category_id
                LEFT JOIN vw_customer_lifetime_value clv ON u.user_id = clv.user_id
                ORDER BY u.user_id ASC
            `);
            return sendJson(res, 200, { users });
        }

        const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
        if (method === 'GET' && userMatch) {
            const userId = Number(userMatch[1]);
            const user = queryOne("SELECT * FROM users WHERE user_id = ?", [userId]);
            if (!user) return sendJson(res, 404, { detail: "User not found" });

            const affinities = query(`
                SELECT 
                    uca.affinity_id,
                    uca.category_id,
                    c.category_name,
                    ROUND(uca.affinity_score, 2) AS affinity_score,
                    uca.view_count,
                    uca.purchase_count,
                    uca.total_dwell_seconds,
                    uca.last_interacted_at
                FROM user_category_affinity uca
                JOIN categories c ON uca.category_id = c.category_id
                WHERE uca.user_id = ?
                ORDER BY uca.affinity_score DESC
            `, [userId]);

            const recentBrowsing = query(`
                SELECT 
                    cb.event_id,
                    cb.product_id,
                    p.title AS product_title,
                    p.image_url,
                    c.category_name,
                    cb.event_type,
                    cb.dwell_time_seconds,
                    cb.device_type,
                    cb.viewed_at
                FROM customer_browsing_history cb
                JOIN products p ON cb.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                WHERE cb.user_id = ?
                ORDER BY cb.viewed_at DESC
                LIMIT 10
            `, [userId]);

            const lifetime = queryOne("SELECT * FROM vw_customer_lifetime_value WHERE user_id = ?", [userId]);

            return sendJson(res, 200, {
                user,
                affinities,
                recent_browsing: recentBrowsing,
                lifetime_metrics: lifetime
            });
        }

        if (method === 'POST' && pathname === '/api/users') {
            const body = await parseJsonBody(req);
            const avatarUrl = `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random()*1000)}?auto=format&fit=crop&w=200&q=80`;
            const result = execute(`
                INSERT INTO users (username, email, full_name, avatar_url, persona_label, preferred_category_id, segment)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                body.username.toLowerCase().replace(/\s+/g, '_'),
                `${body.username.toLowerCase().replace(/\s+/g, '_')}@domain.test`,
                body.full_name,
                avatarUrl,
                body.persona_label || "Shopper",
                body.preferred_category_id || null,
                body.segment || "Standard"
            ]);
            return sendJson(res, 201, { message: "User created", user_id: result.lastInsertRowid });
        }

        // ==============================================================================
        // 3. CATEGORIES & PRODUCTS CATALOG
        // ==============================================================================
        if (method === 'GET' && pathname === '/api/categories') {
            const categories = query(`
                SELECT 
                    c.category_id,
                    c.category_name,
                    c.slug,
                    c.description,
                    c.icon,
                    COUNT(p.product_id) AS product_count,
                    COALESCE(SUM(i.stock_quantity), 0) AS total_category_stock
                FROM categories c
                LEFT JOIN products p ON c.category_id = p.category_id AND p.is_active = 1
                LEFT JOIN inventory i ON p.product_id = i.product_id
                GROUP BY c.category_id, c.category_name, c.slug, c.description, c.icon
                ORDER BY c.category_id ASC
            `);
            return sendJson(res, 200, { categories });
        }

        if (method === 'GET' && pathname === '/api/products') {
            let sql = `
                SELECT 
                    p.product_id,
                    p.sku,
                    p.title,
                    p.description,
                    p.category_id,
                    c.category_name,
                    b.brand_name,
                    p.price,
                    p.original_price,
                    p.rating,
                    p.review_count,
                    p.image_url,
                    p.tags,
                    p.is_featured,
                    i.stock_quantity,
                    i.safety_stock_threshold,
                    i.reorder_point,
                    i.warehouse_location,
                    CASE 
                        WHEN i.stock_quantity <= 0 THEN 'Out of Stock'
                        WHEN i.stock_quantity <= i.safety_stock_threshold THEN 'Low Stock'
                        ELSE 'In Stock'
                    END AS stock_status
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                JOIN brands b ON p.brand_id = b.brand_id
                JOIN inventory i ON p.product_id = i.product_id
                WHERE p.is_active = 1
            `;
            const params = [];

            if (queryParams.category_id) {
                sql += " AND p.category_id = ?";
                params.push(Number(queryParams.category_id));
            }

            if (queryParams.search) {
                const s = `%${queryParams.search}%`;
                sql += " AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR b.brand_name LIKE ?)";
                params.push(s, s, s, s);
            }

            if (queryParams.in_stock_only === 'true') {
                sql += " AND i.stock_quantity > 0";
            }

            const sortBy = queryParams.sort_by || 'featured';
            if (sortBy === 'price_asc') sql += " ORDER BY p.price ASC";
            else if (sortBy === 'price_desc') sql += " ORDER BY p.price DESC";
            else if (sortBy === 'rating') sql += " ORDER BY p.rating DESC, p.review_count DESC";
            else if (sortBy === 'stock') sql += " ORDER BY i.stock_quantity ASC";
            else sql += " ORDER BY p.is_featured DESC, p.rating DESC";

            const products = query(sql, params);
            return sendJson(res, 200, { products, total: products.length });
        }

        // Product Details
        const prodMatch = pathname.match(/^\/api\/products\/(\d+)$/);
        if (method === 'GET' && prodMatch) {
            const productId = Number(prodMatch[1]);
            const product = queryOne(`
                SELECT 
                    p.product_id,
                    p.sku,
                    p.title,
                    p.description,
                    p.category_id,
                    c.category_name,
                    b.brand_id,
                    b.brand_name,
                    b.tier AS brand_tier,
                    p.price,
                    p.original_price,
                    p.rating,
                    p.review_count,
                    p.image_url,
                    p.tags,
                    p.is_featured,
                    i.inventory_id,
                    i.stock_quantity,
                    i.safety_stock_threshold,
                    i.reorder_point,
                    i.warehouse_location,
                    i.last_restocked_at,
                    CASE 
                        WHEN i.stock_quantity <= 0 THEN 'Out of Stock'
                        WHEN i.stock_quantity <= i.safety_stock_threshold THEN 'Low Stock'
                        ELSE 'In Stock'
                    END AS stock_status
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                JOIN brands b ON p.brand_id = b.brand_id
                JOIN inventory i ON p.product_id = i.product_id
                WHERE p.product_id = ?
            `, [productId]);

            if (!product) return sendJson(res, 404, { detail: "Product not found" });

            const reviews = query(`
                SELECT 
                    pr.review_id,
                    pr.rating,
                    pr.headline,
                    pr.comment,
                    pr.sentiment_score,
                    pr.verified_purchase,
                    pr.created_at,
                    u.full_name AS reviewer_name,
                    u.avatar_url AS reviewer_avatar
                FROM product_reviews pr
                JOIN users u ON pr.user_id = u.user_id
                WHERE pr.product_id = ?
                ORDER BY pr.created_at DESC
            `, [productId]);

            const logs = query(`
                SELECT change_type, quantity_delta, previous_stock, new_stock, reference_id, notes, logged_at 
                FROM inventory_logs 
                WHERE product_id = ? 
                ORDER BY logged_at DESC 
                LIMIT 5
            `, [productId]);

            return sendJson(res, 200, { product, reviews, inventory_logs: logs });
        }

        // ==============================================================================
        // 4. RECOMMENDATIONS & CLICKSTREAM APIS
        // ==============================================================================
        if (method === 'GET' && pathname === '/api/recommendations/personalized') {
            const userId = Number(queryParams.user_id || 1);
            const limit = Number(queryParams.limit || 6);
            const recs = recommender.getPersonalizedRecommendations(userId, limit);
            return sendJson(res, 200, { recommendations: recs, user_id: userId, count: recs.length });
        }

        const fbtMatch = pathname.match(/^\/api\/products\/(\d+)\/frequently-bought-together$/);
        if (method === 'GET' && fbtMatch) {
            const productId = Number(fbtMatch[1]);
            const limit = Number(queryParams.limit || 3);
            const bundle = recommender.getFrequentlyBoughtTogether(productId, limit);
            return sendJson(res, 200, { frequently_bought_together: bundle, product_id: productId });
        }

        const simMatch = pathname.match(/^\/api\/products\/(\d+)\/similar$/);
        if (method === 'GET' && simMatch) {
            const productId = Number(simMatch[1]);
            const limit = Number(queryParams.limit || 4);
            const similar = recommender.getSimilarProducts(productId, limit);
            return sendJson(res, 200, { similar_products: similar, product_id: productId });
        }

        if (method === 'GET' && pathname === '/api/recommendations/trending') {
            const limit = Number(queryParams.limit || 8);
            const trending = recommender.getTrendingProducts(limit);
            return sendJson(res, 200, { trending });
        }

        if (method === 'POST' && pathname === '/api/tracking/browsing') {
            const body = await parseJsonBody(req);
            const result = recommender.trackBrowsingEvent(
                body.user_id,
                body.session_id,
                body.product_id,
                body.event_type || 'view',
                body.dwell_time_seconds || 0,
                body.device_type || 'Desktop',
                body.referrer || 'Storefront'
            );
            return sendJson(res, 200, { success: true, data: result });
        }

        // ==============================================================================
        // 5. SHOPPING CART & ACID CHECKOUT
        // ==============================================================================
        if (method === 'GET' && pathname === '/api/cart') {
            const userId = Number(queryParams.user_id || 1);
            const cartItems = query(`
                SELECT 
                    ci.cart_id,
                    ci.product_id,
                    ci.quantity,
                    p.title,
                    p.sku,
                    p.price,
                    p.image_url,
                    c.category_name,
                    i.stock_quantity,
                    ROUND(p.price * ci.quantity, 2) AS subtotal
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN inventory i ON p.product_id = i.product_id
                WHERE ci.user_id = ?
                ORDER BY ci.added_at DESC
            `, [userId]);

            const totalAmount = Number(cartItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
            const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

            return sendJson(res, 200, {
                cart_items: cartItems,
                total_amount: totalAmount,
                total_items: totalItems
            });
        }

        if (method === 'POST' && pathname === '/api/cart/add') {
            const body = await parseJsonBody(req);
            const inv = queryOne("SELECT stock_quantity FROM inventory WHERE product_id = ?", [body.product_id]);
            if (!inv || inv.stock_quantity < (body.quantity || 1)) {
                return sendJson(res, 400, { detail: "Insufficient stock available for this product" });
            }

            execute(`
                INSERT INTO cart_items (user_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, product_id) DO UPDATE SET
                    quantity = cart_items.quantity + excluded.quantity;
            `, [body.user_id, body.product_id, body.quantity || 1]);

            recommender.trackBrowsingEvent(
                body.user_id,
                `sess_user_${body.user_id}`,
                body.product_id,
                "cart_add",
                10
            );

            return sendJson(res, 200, { success: true, message: "Product added to cart" });
        }

        if (method === 'POST' && pathname === '/api/cart/update') {
            const body = await parseJsonBody(req);
            if (body.quantity <= 0) {
                execute("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", [body.user_id, body.product_id]);
            } else {
                execute("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", [body.quantity, body.user_id, body.product_id]);
            }
            return sendJson(res, 200, { success: true });
        }

        const cartDeleteMatch = pathname.match(/^\/api\/cart\/(\d+)$/);
        if (method === 'DELETE' && cartDeleteMatch) {
            const productId = Number(cartDeleteMatch[1]);
            const userId = Number(queryParams.user_id || 1);
            execute("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, productId]);
            return sendJson(res, 200, { success: true });
        }

        // ACID Checkout
        if (method === 'POST' && pathname === '/api/orders/checkout') {
            const body = await parseJsonBody(req);
            const userId = body.user_id;

            const cartItems = query(`
                SELECT ci.product_id, ci.quantity, p.price, p.title, i.stock_quantity 
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.product_id
                JOIN inventory i ON p.product_id = i.product_id
                WHERE ci.user_id = ?
            `, [userId]);

            if (cartItems.length === 0) {
                return sendJson(res, 400, { detail: "Cart is empty" });
            }

            // Check stock
            for (const ci of cartItems) {
                if (ci.stock_quantity < ci.quantity) {
                    return sendJson(res, 400, {
                        detail: `Product '${ci.title}' has only ${ci.stock_quantity} units in stock (requested ${ci.quantity})`
                    });
                }
            }

            const totalAmount = Number(cartItems.reduce((acc, ci) => acc + (ci.price * ci.quantity), 0).toFixed(2));
            const orderNumber = `ORD-${Date.now()}-${userId}`;

            // Place Order
            const orderRes = execute(`
                INSERT INTO orders (order_number, user_id, order_status, total_amount, payment_method, shipping_address)
                VALUES (?, ?, 'COMPLETED', ?, ?, ?)
            `, [orderNumber, userId, totalAmount, body.payment_method || 'Credit Card', body.shipping_address || 'Default Address']);

            const orderId = orderRes.lastInsertRowid;

            // Insert line items -> This automatically activates SQL trigger trg_after_order_item_deduct_inventory!
            for (const ci of cartItems) {
                const subtotal = Number((ci.price * ci.quantity).toFixed(2));
                execute(`
                    INSERT INTO order_items (order_id, product_id, unit_price, quantity, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `, [orderId, ci.product_id, ci.price, ci.quantity, subtotal]);
            }

            // Clear Cart
            execute("DELETE FROM cart_items WHERE user_id = ?", [userId]);

            return sendJson(res, 200, {
                success: true,
                order_id: orderId,
                order_number: orderNumber,
                total_amount: totalAmount,
                items_count: cartItems.length,
                message: "Order placed successfully! SQL Trigger automatically decremented inventory."
            });
        }

        if (method === 'GET' && pathname === '/api/orders') {
            const userId = Number(queryParams.user_id || 1);
            const orders = query(`
                SELECT order_id, order_number, order_status, total_amount, payment_method, shipping_address, created_at 
                FROM orders 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            `, [userId]);

            for (const o of orders) {
                o.items = query(`
                    SELECT oi.item_id, oi.product_id, p.title, p.image_url, oi.unit_price, oi.quantity, oi.subtotal 
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.product_id
                    WHERE oi.order_id = ?
                `, [o.order_id]);
            }

            return sendJson(res, 200, { orders });
        }

        // ==============================================================================
        // 6. INVENTORY MANAGEMENT APIS
        // ==============================================================================
        if (method === 'GET' && pathname === '/api/inventory') {
            const inventory = query(`
                SELECT 
                    i.inventory_id,
                    i.product_id,
                    p.sku,
                    p.title,
                    c.category_name,
                    b.brand_name,
                    p.price,
                    i.stock_quantity,
                    i.safety_stock_threshold,
                    i.reorder_point,
                    i.warehouse_location,
                    i.status,
                    i.last_restocked_at,
                    (SELECT COUNT(*) FROM inventory_logs WHERE product_id = p.product_id) AS total_movements
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN brands b ON p.brand_id = b.brand_id
                ORDER BY 
                    CASE 
                        WHEN i.stock_quantity <= 0 THEN 1 
                        WHEN i.stock_quantity <= i.safety_stock_threshold THEN 2 
                        ELSE 3 
                    END,
                    i.stock_quantity ASC
            `);
            return sendJson(res, 200, { inventory });
        }

        if (method === 'POST' && pathname === '/api/inventory/restock') {
            const body = await parseJsonBody(req);
            const inv = queryOne("SELECT stock_quantity, safety_stock_threshold FROM inventory WHERE product_id = ?", [body.product_id]);
            if (!inv) return sendJson(res, 404, { detail: "Product inventory not found" });

            const prevStock = inv.stock_quantity;
            const newStock = prevStock + body.quantity_to_add;
            const newStatus = newStock <= inv.safety_stock_threshold ? "Low Stock" : "In Stock";

            execute(`
                UPDATE inventory 
                SET stock_quantity = ?, status = ?, last_restocked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE product_id = ?
            `, [newStock, newStatus, body.product_id]);

            execute(`
                INSERT INTO inventory_logs (product_id, change_type, quantity_delta, previous_stock, new_stock, reference_id, notes)
                VALUES (?, 'RESTOCK', ?, ?, ?, ?, ?)
            `, [body.product_id, body.quantity_to_add, prevStock, newStock, body.reference_id || 'PO-RESTOCK', body.notes || 'Restock']);

            return sendJson(res, 200, {
                success: true,
                product_id: body.product_id,
                previous_stock: prevStock,
                new_stock: newStock,
                status: newStatus,
                message: `Successfully restocked ${body.quantity_to_add} units.`
            });
        }

        if (method === 'GET' && pathname === '/api/inventory/logs') {
            const limit = Number(queryParams.limit || 25);
            const logs = query(`
                SELECT 
                    il.log_id,
                    il.product_id,
                    p.title AS product_title,
                    p.sku,
                    il.change_type,
                    il.quantity_delta,
                    il.previous_stock,
                    il.new_stock,
                    il.reference_id,
                    il.notes,
                    il.logged_at
                FROM inventory_logs il
                JOIN products p ON il.product_id = p.product_id
                ORDER BY il.logged_at DESC
                LIMIT ?
            `, [limit]);
            return sendJson(res, 200, { logs });
        }

        // ==============================================================================
        // 7. ANALYTICS & DBMS METRICS
        // ==============================================================================
        if (method === 'GET' && pathname === '/api/analytics/summary') {
            const totalRev = queryOne("SELECT COALESCE(SUM(total_amount), 0.0) AS total_revenue FROM orders WHERE order_status = 'COMPLETED'");
            const totalOrders = queryOne("SELECT COUNT(*) AS count FROM orders WHERE order_status = 'COMPLETED'");
            const totalProducts = queryOne("SELECT COUNT(*) AS count FROM products WHERE is_active = 1");
            const lowStock = queryOne("SELECT COUNT(*) AS count FROM inventory WHERE stock_quantity <= safety_stock_threshold");
            const totalViews = queryOne("SELECT COUNT(*) AS count FROM customer_browsing_history");
            const totalUsers = queryOne("SELECT COUNT(*) AS count FROM users");

            const categoryBreakdown = query(`
                SELECT c.category_name, COUNT(p.product_id) AS products_count, COALESCE(SUM(oi.quantity), 0) AS units_sold 
                FROM categories c
                LEFT JOIN products p ON c.category_id = p.category_id
                LEFT JOIN order_items oi ON p.product_id = oi.product_id
                GROUP BY c.category_name
            `);

            const topPerforming = query(`
                SELECT title, units_sold, total_revenue, view_count, conversion_rate_percent 
                FROM vw_product_performance_and_stock 
                ORDER BY units_sold DESC, total_revenue DESC 
                LIMIT 5
            `);

            return sendJson(res, 200, {
                total_revenue: totalRev ? totalRev.total_revenue : 0,
                total_orders: totalOrders ? totalOrders.count : 0,
                total_products: totalProducts ? totalProducts.count : 0,
                low_stock_count: lowStock ? lowStock.count : 0,
                total_views: totalViews ? totalViews.count : 0,
                total_users: totalUsers ? totalUsers.count : 0,
                category_breakdown: categoryBreakdown,
                top_performing_products: topPerforming
            });
        }

        // ==============================================================================
        // 8. INTERACTIVE SQL CONSOLE & RESET
        // ==============================================================================
        if (method === 'POST' && pathname === '/api/sql/console') {
            const body = await parseJsonBody(req);
            const result = runRawSql(body.sql_query || '');
            return sendJson(res, 200, result);
        }

        if (method === 'POST' && pathname === '/api/database/reset') {
            seedDatabase(true);
            return sendJson(res, 200, { success: true, message: "Database reset and re-seeded successfully in Node.js!" });
        }

        // 404 Catch-All
        sendJson(res, 404, { detail: `Route ${method} ${pathname} not found` });

    } catch (err) {
        console.error(`[Server Error] ${method} ${pathname}:`, err);
        sendJson(res, 500, { detail: err.message });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(70));
    console.log('   NEXUS AI - NODE.JS & SQL RECOMMENDATION ENGINE & STOREFRONT');
    console.log('='.repeat(70));
    console.log(`>> Node.js Storefront & DBMS Console : http://127.0.0.1:${PORT}`);
    console.log(`>> Pure Node.js Runtime (v${process.versions.node}) with node:sqlite`);
    console.log(`>> Capstone Submission SQL Script    : cpstone/gb.sql`);
    console.log('='.repeat(70));
    console.log('Ready for connections!\n');
});

module.exports = { server };
