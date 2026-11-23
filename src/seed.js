// ==============================================================================
// NEXUS AI - DATABASE SEED GENERATOR (NODE.JS & SQL)
// Populates Catalog, Inventory, Users, Clickstream, Orders, and AI Matrices
// ==============================================================================

const { initDb, getDb } = require('./database');

function seedDatabase(force = true) {
    console.log('[Seed] Initializing database schema...');
    initDb(force);
    const db = getDb();

    console.log('[Seed] Inserting Categories...');
    const insertCat = db.prepare('INSERT INTO categories (category_name, slug, description, icon) VALUES (?, ?, ?, ?)');
    const categories = [
        ["Electronics & Smart Tech", "electronics-smart-tech", "Next-gen personal electronics and connected devices", "cpu"],
        ["Computing & Peripherals", "computing-peripherals", "High-performance keyboards, mice, monitors, and docks", "monitor"],
        ["Audio & Wearables", "audio-wearables", "Audiophile-grade headphones, earbuds, and studio monitors", "headphones"],
        ["Smart Home & Automation", "smart-home-automation", "Intelligent lighting, robotics, climate control, and security", "home"],
        ["Fitness & Outdoor Gear", "fitness-outdoor-gear", "Performance tracking wearables, smart recovery, and athletic gear", "activity"]
    ];
    for (const cat of categories) {
        insertCat.run(...cat);
    }

    console.log('[Seed] Inserting Brands...');
    const insertBrand = db.prepare('INSERT INTO brands (brand_name, tier, country) VALUES (?, ?, ?)');
    const brands = [
        ["Sony", "Flagship", "Japan"],
        ["Logitech", "Premium", "Switzerland"],
        ["Keychron", "Premium", "United States"],
        ["Samsung", "Flagship", "South Korea"],
        ["Philips Hue", "Premium", "Netherlands"],
        ["Garmin", "Flagship", "United States"],
        ["Anker", "Mid-Range", "United States"],
        ["Bose", "Flagship", "United States"],
        ["Dyson", "Flagship", "United Kingdom"],
        ["Shure", "Flagship", "United States"],
        ["Roborock", "Premium", "Global"],
        ["Twelve South", "Premium", "United States"]
    ];
    for (const b of brands) {
        insertBrand.run(...b);
    }

    console.log('[Seed] Inserting Products...');
    const insertProd = db.prepare(`
        INSERT INTO products 
        (sku, title, description, category_id, brand_id, price, original_price, rating, review_count, image_url, tags, is_featured) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const products = [
        [
            "SONY-WH1000XM5", 
            "Sony WH-1000XM5 Wireless Noise-Canceling Headphones", 
            "Industry-leading active noise cancellation with 8 microphones, LDAC Hi-Res audio, and 30-hour battery life with ultra-comfortable lightweight design.",
            3, 1, 399.99, 449.99, 4.85, 248,
            "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
            "audio,headphones,bluetooth,noise-canceling,anc,wireless,hi-res,sony", 1
        ],
        [
            "KEY-K3-PRO", 
            "Keychron K3 Pro Ultra-Slim Wireless Mechanical Keyboard", 
            "75% compact layout with hot-swappable low profile Gateron mechanical switches, QMK/VIA programmable, Bluetooth 5.1 and RGB backlighting.",
            2, 3, 109.99, 129.99, 4.78, 185,
            "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
            "keyboard,mechanical,wireless,bluetooth,keychron,rgb,workspace,compact", 1
        ],
        [
            "LOGI-MX-M3S", 
            "Logitech MX Master 3S Ergonomic Wireless Performance Mouse", 
            "8K DPI any-surface laser sensor, 90% quieter clicks, MagSpeed electromagnetic scrolling wheel, customizable gesture buttons and multi-OS flow.",
            2, 2, 99.99, 119.99, 4.90, 420,
            "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80",
            "mouse,ergonomic,wireless,logitech,productivity,bluetooth,workspace", 1
        ],
        [
            "SAM-ODYSSEY-34", 
            "Samsung Odyssey Neo G8 34-inch Curved UltraWide Gaming Monitor", 
            "Quantum Mini-LED display, 1000R curvature, 240Hz refresh rate, 1ms response time, HDR2000, and AMD FreeSync Premium Pro.",
            2, 4, 899.99, 1099.99, 4.65, 89,
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
            "monitor,curved,ultrawide,gaming,display,4k,samsung,workspace", 1
        ],
        [
            "HUE-STARTER-KIT", 
            "Philips Hue Smart White & Color Ambiance Starter Kit", 
            "Includes Hue Bridge hub and 3 smart E26 LED bulbs with 16 million colors, automated schedules, Apple HomeKit and Google Assistant compatibility.",
            4, 5, 179.99, 199.99, 4.70, 310,
            "https://images.unsplash.com/photo-1550524514-9b6999cb5974?auto=format&fit=crop&w=800&q=80",
            "smart-home,lighting,rgb,philips-hue,automation,iot,alexa,google-home", 1
        ],
        [
            "GARMIN-FORERUNNER", 
            "Garmin Forerunner 265 Running Smartwatch GPS", 
            "Vibrant AMOLED touch display, advanced training readiness metrics, morning report, HRV status, multi-band GPS, and 13-day battery.",
            5, 6, 449.99, 499.99, 4.88, 142,
            "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80",
            "fitness,smartwatch,garmin,running,gps,heart-rate,wearable,workout", 1
        ],
        [
            "ANKER-737-CHARGER", 
            "Anker 737 Power Bank (PowerCore 24K) 140W 3-Port Portable Charger", 
            "Ultra-powerful two-way fast charging with smart digital display, GaNPrime technology, capable of fast charging a MacBook Pro 16 to 50% in 40 mins.",
            1, 7, 149.99, 169.99, 4.82, 390,
            "https://images.unsplash.com/photo-1609592426504-d5588358ea96?auto=format&fit=crop&w=800&q=80",
            "charging,powerbank,usb-c,anker,portable,battery,fast-charge,travel", 0
        ],
        [
            "BOSE-QC-ULTRA", 
            "Bose QuietComfort Ultra Noise-Cancelling Earbuds", 
            "Breakthrough Spatial Audio, CustomTune personalized sound profiling, world-class active noise cancellation and 24-hour playtime with case.",
            3, 8, 299.99, 329.99, 4.72, 175,
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
            "audio,earbuds,bose,wireless,anc,spatial-audio,bluetooth,sound", 1
        ],
        [
            "DYSON-COOL-PURIFIER", 
            "Dyson Purifier Hot+Cool HP07 Smart Air Purifier & Heater", 
            "HEPA H13 filtration capturing 99.97% of particles as small as 0.3 microns, real-time air quality LCD report, oscillating airflow and smart app.",
            4, 9, 649.99, 749.99, 4.60, 114,
            "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80",
            "smart-home,air-purifier,dyson,heater,clean-air,iot,app-control", 0
        ],
        [
            "SHURE-MV7-MIC", 
            "Shure MV7+ Podcast Microphone with USB-C and XLR Output", 
            "Dynamic broadcast microphone inspired by the legendary SM7B, voice isolation technology, customizable LED touch panel, and real-time DSP denoiser.",
            3, 10, 279.99, 299.99, 4.92, 160,
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
            "microphone,podcast,audio,shure,streaming,usb-c,studio,recording", 0
        ],
        [
            "ROBOROCK-S8-PRO", 
            "Roborock S8 Pro Ultra Robot Vacuum and Sonic Mop", 
            "6000Pa extreme suction, DuoRoller Riser brush, VibraRise 2.0 mopping system, and All-in-One RockDock Ultra with automatic self-washing and hot air drying.",
            4, 11, 1199.99, 1399.99, 4.80, 95,
            "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
            "smart-home,robot-vacuum,roborock,mop,automation,cleaning,iot", 1
        ],
        [
            "TWELVE-CURVE-STAND", 
            "Twelve South Curve Aluminum Ergonomic Laptop Stand", 
            "Sculpted matte black aluminum design elevates screen 6 inches for improved ergonomics, cooling airflow, and pairable with external keyboard and mouse.",
            2, 12, 59.99, 69.99, 4.68, 230,
            "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
            "stand,laptop,ergonomic,twelve-south,aluminum,desk-setup,accessory", 0
        ],
        [
            "LOGI-BRIO-4K", 
            "Logitech Brio 4K Ultra HD Streaming Webcam with HDR", 
            "Ultra 4K sensor, RightLight 3 with HDR, dual omnidirectional noise-canceling mics, adjustable FOV (65/78/90 degrees), and Windows Hello facial login.",
            2, 2, 169.99, 199.99, 4.58, 310,
            "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=800&q=80",
            "webcam,4k,streaming,logitech,remote-work,hdr,video-calls,workspace", 0
        ],
        [
            "ANKER-MAG-CHARGER", 
            "Anker 3-in-1 Cube with MagSafe 15W Wireless Charging Station", 
            "Official Apple-certified 15W MagSafe charging for iPhone, Apple Watch fast charging, and AirPods pad in an ultra-compact foldable travel cube.",
            1, 7, 139.99, 149.99, 4.75, 140,
            "https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?auto=format&fit=crop&w=800&q=80",
            "charging,wireless,magsafe,anker,iphone,apple-watch,travel-cube", 0
        ],
        [
            "HUE-LIGHTSTRIP-GRAD", 
            "Philips Hue Play Gradient 65-inch TV Lightstrip", 
            "Seamless blend of multiple simultaneous colors behind your TV, dynamic screen synchronization for movies, gaming and music, works with Hue HDMI Sync Box.",
            4, 5, 249.99, 279.99, 4.62, 88,
            "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=800&q=80",
            "smart-home,lighting,tv-backlight,gradient,rgb,philips-hue,home-theater", 0
        ],
        [
            "GARMIN-HRM-PRO", 
            "Garmin HRM-Pro Plus Premium Heart Rate Monitor Chest Strap", 
            "Dual transmission ANT+ and BLE, real-time heart rate accuracy, advanced running dynamics metrics, and pace/distance tracking indoors on treadmill.",
            5, 6, 129.99, 149.99, 4.84, 115,
            "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=800&q=80",
            "fitness,heart-rate,garmin,chest-strap,running,athletics,sensor", 0
        ]
    ];
    for (const p of products) {
        insertProd.run(...p);
    }

    console.log('[Seed] Inserting Inventory Data & Stock Levels...');
    const insertInv = db.prepare(`
        INSERT INTO inventory 
        (product_id, stock_quantity, safety_stock_threshold, reorder_point, warehouse_location, status) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const inventoryData = [
        [1, 38, 10, 15, "Hub-Alpha-A01", "In Stock"],
        [2, 42, 10, 15, "Hub-Alpha-B04", "In Stock"],
        [3, 3, 10, 15, "Hub-Beta-C12", "Low Stock"],       // Demonstrates low stock
        [4, 14, 5, 8, "Hub-Gamma-D08", "In Stock"],
        [5, 50, 10, 20, "Hub-Alpha-E02", "In Stock"],
        [6, 19, 8, 12, "Hub-Beta-F11", "In Stock"],
        [7, 65, 15, 25, "Hub-Alpha-A19", "In Stock"],
        [8, 22, 10, 15, "Hub-Alpha-B09", "In Stock"],
        [9, 4, 6, 10, "Hub-Gamma-C03", "Low Stock"],
        [10, 18, 5, 10, "Hub-Beta-D07", "In Stock"],
        [11, 7, 5, 10, "Hub-Gamma-E15", "Low Stock"],
        [12, 55, 10, 20, "Hub-Alpha-F02", "In Stock"],
        [13, 27, 8, 15, "Hub-Beta-A05", "In Stock"],
        [14, 34, 10, 15, "Hub-Alpha-C11", "In Stock"],
        [15, 16, 5, 10, "Hub-Alpha-E09", "In Stock"],
        [16, 29, 8, 12, "Hub-Beta-F18", "In Stock"]
    ];
    for (const item of inventoryData) {
        insertInv.run(...item);
    }

    console.log('[Seed] Inserting Initial Inventory Movement Logs...');
    const insertLog = db.prepare(`
        INSERT INTO inventory_logs 
        (product_id, change_type, quantity_delta, previous_stock, new_stock, reference_id, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of inventoryData) {
        const [pId, qty, , , loc] = item;
        insertLog.run(pId, "RESTOCK", qty, 0, qty, "PO-INITIAL-2026", `Initial baseline inventory reception at ${loc}`);
    }

    console.log('[Seed] Inserting User Personas...');
    const insertUser = db.prepare(`
        INSERT INTO users 
        (username, email, full_name, avatar_url, persona_label, preferred_category_id, segment) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const users = [
        [
            "alex_tech", "alex.rivera@codenexus.dev", "Alex Rivera", 
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            "Tech Enthusiast & Software Architect", 2, "VIP Platinum"
        ],
        [
            "priya_fitness", "priya.patel@vitalityfit.io", "Priya Patel",
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
            "Marathon Runner & Wellness Coach", 5, "Active Explorer"
        ],
        [
            "marcus_home", "marcus.vance@ambientstudio.com", "Marcus Vance",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
            "Architect & Smart Home Designer", 4, "Premium Buyer"
        ],
        [
            "sophia_audio", "sophia.chen@soundwave.net", "Sophia Chen",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
            "Audio Engineer & Music Creator", 3, "VIP Gold"
        ],
        [
            "guest_jordan", "guest.jordan@demo.test", "Jordan Taylor (Guest Persona)",
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
            "New Visitor (Real-Time Cold Start Profile)", null, "Standard"
        ]
    ];
    for (const u of users) {
        insertUser.run(...u);
    }

    console.log('[Seed] Generating Historical Browsing Behavior...');
    const insertBrowse = db.prepare(`
        INSERT INTO customer_browsing_history 
        (user_id, session_id, product_id, event_type, dwell_time_seconds, device_type, referrer) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const browsingEvents = [
        [1, "sess_alex_001", 2, "view", 45, "Desktop", "https://news.ycombinator.com"],
        [1, "sess_alex_001", 3, "view", 72, "Desktop", "Direct"],
        [1, "sess_alex_001", 4, "view", 95, "Desktop", "Google Search"],
        [1, "sess_alex_001", 12, "view", 38, "Desktop", "Internal Nav"],
        [1, "sess_alex_002", 2, "cart_add", 15, "Desktop", "Direct"],
        [1, "sess_alex_002", 3, "cart_add", 20, "Desktop", "Direct"],
        [1, "sess_alex_003", 7, "view", 30, "Mobile", "Direct"],
        [1, "sess_alex_003", 13, "view", 55, "Mobile", "Internal Nav"],

        [2, "sess_priya_001", 6, "view", 110, "Mobile", "Instagram"],
        [2, "sess_priya_001", 16, "view", 85, "Mobile", "Instagram"],
        [2, "sess_priya_001", 8, "view", 60, "Mobile", "Direct"],
        [2, "sess_priya_002", 6, "cart_add", 25, "Desktop", "Direct"],
        [2, "sess_priya_002", 16, "cart_add", 18, "Desktop", "Direct"],

        [3, "sess_marcus_001", 5, "view", 90, "Tablet", "Pinterest"],
        [3, "sess_marcus_001", 15, "view", 65, "Tablet", "Pinterest"],
        [3, "sess_marcus_001", 11, "view", 130, "Tablet", "Google Search"],
        [3, "sess_marcus_002", 9, "view", 80, "Desktop", "Direct"],
        [3, "sess_marcus_002", 5, "cart_add", 30, "Desktop", "Direct"],

        [4, "sess_sophia_001", 1, "view", 120, "Desktop", "AudioReview.org"],
        [4, "sess_sophia_001", 8, "view", 75, "Desktop", "Direct"],
        [4, "sess_sophia_001", 10, "view", 145, "Desktop", "YouTube"],
        [4, "sess_sophia_002", 1, "cart_add", 40, "Desktop", "Direct"],
        [4, "sess_sophia_002", 10, "cart_add", 35, "Desktop", "Direct"]
    ];
    for (const ev of browsingEvents) {
        insertBrowse.run(...ev);
    }

    console.log('[Seed] Inserting Orders & Co-Purchases...');
    const insertOrder = db.prepare(`
        INSERT INTO orders (order_number, user_id, order_status, total_amount, payment_method, shipping_address)
        VALUES (?, ?, 'COMPLETED', ?, ?, ?)
    `);
    const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, unit_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?)
    `);

    // Order 1: Keyboard + Mouse + Stand
    const ord1 = insertOrder.run('ORD-2026-8801', 1, 269.97, 'Apple Pay', '742 Evergreen Terrace, San Francisco, CA');
    insertItem.run(Number(ord1.lastInsertRowid), 2, 109.99, 1, 109.99);
    insertItem.run(Number(ord1.lastInsertRowid), 3, 99.99, 1, 99.99);
    insertItem.run(Number(ord1.lastInsertRowid), 12, 59.99, 1, 59.99);

    // Order 2: Garmin Watch + Chest Strap
    const ord2 = insertOrder.run('ORD-2026-8802', 2, 579.98, 'Visa Platinum', '120 Ocean Drive, Miami, FL');
    insertItem.run(Number(ord2.lastInsertRowid), 6, 449.99, 1, 449.99);
    insertItem.run(Number(ord2.lastInsertRowid), 16, 129.99, 1, 129.99);

    // Order 3: Hue Starter + Hue Lightstrip
    const ord3 = insertOrder.run('ORD-2026-8803', 3, 429.98, 'MasterCard', '88 Brooklyn Heights, New York, NY');
    insertItem.run(Number(ord3.lastInsertRowid), 5, 179.99, 1, 179.99);
    insertItem.run(Number(ord3.lastInsertRowid), 15, 249.99, 1, 249.99);

    // Order 4: Sony XM5 + Shure Mic
    const ord4 = insertOrder.run('ORD-2026-8804', 4, 679.98, 'American Express', '55 Sunset Blvd, Austin, TX');
    insertItem.run(Number(ord4.lastInsertRowid), 1, 399.99, 1, 399.99);
    insertItem.run(Number(ord4.lastInsertRowid), 10, 279.99, 1, 279.99);

    // Order 5: Keyboard + Mouse + Monitor
    const ord5 = insertOrder.run('ORD-2026-8805', 1, 1099.98, 'Apple Pay', '742 Evergreen Terrace, San Francisco, CA');
    insertItem.run(Number(ord5.lastInsertRowid), 2, 109.99, 1, 109.99);
    insertItem.run(Number(ord5.lastInsertRowid), 3, 99.99, 1, 99.99);
    insertItem.run(Number(ord5.lastInsertRowid), 4, 899.99, 1, 899.99);

    console.log('[Seed] Inserting Product Reviews...');
    const insertRev = db.prepare(`
        INSERT INTO product_reviews (product_id, user_id, rating, headline, comment, sentiment_score)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const reviews = [
        [1, 4, 5, "Absolute Audio Mastery", "The noise cancellation is staggering. I wear them in coffee shops and hear complete silence. Battery is top notch.", 0.92],
        [2, 1, 5, "Best low-profile keyboard on the market", "Tactile switches feel crisp and the Bluetooth switching between Mac and Linux laptop is instant.", 0.88],
        [3, 1, 5, "Ergonomic perfection", "The MagSpeed wheel alone makes this mouse worth every single dollar. Zero wrist strain after 10hr coding sessions.", 0.95],
        [6, 2, 5, "Incredible runner's companion", "AMOLED screen is crystal clear even in direct blazing midday sun. GPS locking takes less than 3 seconds.", 0.90],
        [5, 3, 5, "Transforms the room atmosphere", "Automated sunset routines with warm ambient lighting made our living room so much more cozy.", 0.85],
        [10, 4, 5, "Radio-broadcast quality microphone", "Crystal clean vocal isolation. Completely filters out keyboard clatter and room echoes.", 0.94]
    ];
    for (const r of reviews) {
        insertRev.run(...r);
    }

    console.log('[Seed] Calculating Product Similarity Matrix...');
    const allProds = db.prepare("SELECT product_id, category_id, brand_id, tags, price FROM products").all();
    const prodDict = {};
    for (const p of allProds) {
        prodDict[p.product_id] = {
            cat: p.category_id,
            brand: p.brand_id,
            tags: new Set(p.tags.split(",")),
            price: Number(p.price)
        };
    }

    const coPurchasesRaw = db.prepare(`
        SELECT oi1.product_id AS p1, oi2.product_id AS p2, COUNT(*) AS count
        FROM order_items oi1 
        JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id <> oi2.product_id 
        GROUP BY oi1.product_id, oi2.product_id
    `).all();
    const coPurchases = {};
    for (const row of coPurchasesRaw) {
        coPurchases[`${row.p1}_${row.p2}`] = row.count;
    }

    const insertSim = db.prepare(`
        INSERT INTO product_similarity_matrix 
        (product_a_id, product_b_id, co_purchase_score, co_view_score, content_similarity, hybrid_score)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const pIds = Object.keys(prodDict).map(Number);
    for (let i = 0; i < pIds.length; i++) {
        for (let j = 0; j < pIds.length; j++) {
            if (i === j) continue;
            const pA = pIds[i];
            const pB = pIds[j];

            const catScore = prodDict[pA].cat === prodDict[pB].cat ? 0.40 : 0.05;
            const brandScore = prodDict[pA].brand === prodDict[pB].brand ? 0.20 : 0.0;

            const tagsA = prodDict[pA].tags;
            const tagsB = prodDict[pB].tags;
            let intersection = 0;
            for (const t of tagsA) {
                if (tagsB.has(t)) intersection++;
            }
            const union = new Set([...tagsA, ...tagsB]).size;
            const tagJaccard = union > 0 ? (intersection / union) * 0.30 : 0.0;

            const priceA = prodDict[pA].price;
            const priceB = prodDict[pB].price;
            const priceRatio = (Math.min(priceA, priceB) / Math.max(priceA, priceB)) * 0.10;

            const contentSim = Number((catScore + brandScore + tagJaccard + priceRatio).toFixed(3));
            const coCount = coPurchases[`${pA}_${pB}`] || 0;
            const coPurchaseScore = Number(Math.min(coCount * 0.35, 1.0).toFixed(3));
            const coViewScore = Number((0.5 * catScore + (coCount > 0 ? 0.3 : 0.0)).toFixed(3));
            const hybridScore = Number(((contentSim * 0.45) + (coPurchaseScore * 0.40) + (coViewScore * 0.15)).toFixed(3));

            insertSim.run(pA, pB, coPurchaseScore, coViewScore, contentSim, hybridScore);
        }
    }

    console.log('[Seed] Node.js database seed completed successfully!');
}

if (require.main === module) {
    seedDatabase(true);
}

module.exports = { seedDatabase };
