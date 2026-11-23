PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'package',
    parent_category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS brands (
    brand_id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    tier VARCHAR(50) DEFAULT 'Mid-Range', -- 'Flagship', 'Premium', 'Mid-Range', 'Budget'
    country VARCHAR(100) DEFAULT 'Global',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL,
    brand_id INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(10, 2) CHECK (original_price >= price),
    rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating BETWEEN 0.0 AND 5.0),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    image_url TEXT,
    tags TEXT, -- Comma-separated keyword vector for Content-Based matching
    is_featured BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    safety_stock_threshold INTEGER DEFAULT 10 CHECK (safety_stock_threshold >= 0),
    reorder_point INTEGER DEFAULT 15 CHECK (reorder_point >= 0),
    warehouse_location VARCHAR(100) DEFAULT 'Main Hub - Sec A',
    status VARCHAR(50) DEFAULT 'In Stock', -- 'In Stock', 'Low Stock', 'Out of Stock'
    last_restocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS inventory_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    change_type VARCHAR(50) NOT NULL, 
    quantity_delta INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id VARCHAR(100),
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    persona_label VARCHAR(100) DEFAULT 'Shopper',
    preferred_category_id INTEGER,
    segment VARCHAR(50) DEFAULT 'Standard',       
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preferred_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS customer_browsing_history (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    product_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    dwell_time_seconds INTEGER DEFAULT 0 CHECK (dwell_time_seconds >= 0),
    device_type VARCHAR(50) DEFAULT 'Desktop',
    referrer VARCHAR(150) DEFAULT 'Direct',
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_category_affinity (
    affinity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    affinity_score REAL DEFAULT 0.0 CHECK (affinity_score >= 0.0),
    view_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    total_dwell_seconds INTEGER DEFAULT 0,
    last_interacted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cart_items (
    cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    order_status VARCHAR(50) DEFAULT 'COMPLETED',
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    discount_amount DECIMAL(10, 2) DEFAULT 0.0,
    tax_amount DECIMAL(10, 2) DEFAULT 0.0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0.0,
    payment_method VARCHAR(50) DEFAULT 'Credit Card',
    shipping_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS order_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS product_reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    headline VARCHAR(255),
    comment TEXT,
    sentiment_score REAL DEFAULT 0.0, 
    verified_purchase BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS product_similarity_matrix (
    similarity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_a_id INTEGER NOT NULL,
    product_b_id INTEGER NOT NULL,
    co_purchase_score REAL DEFAULT 0.0,   -- Jaccard co-purchase index
    co_view_score REAL DEFAULT 0.0,       -- Co-browsing correlation
    content_similarity REAL DEFAULT 0.0,   -- Feature proximity (category, brand, price, tags)
    hybrid_score REAL DEFAULT 0.0,         -- Weighted composite recommendation score
    last_computed DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_a_id, product_b_id),
    CHECK (product_a_id <> product_b_id),
    FOREIGN KEY (product_a_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (product_b_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- Table 14: Recommendation Feedback Logs (CTR & Model Evaluation)
CREATE TABLE IF NOT EXISTS recommendation_logs (
    rec_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    algorithm VARCHAR(50) NOT NULL, -- 'HYBRID_AI', 'COLLABORATIVE', 'CONTENT_BASED', 'TRENDING'
    predicted_score REAL NOT NULL,
    position INTEGER DEFAULT 1,
    was_clicked BOOLEAN DEFAULT 0,
    was_purchased BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR QUERY OPTIMIZATION & FAST ACCESS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_inv_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_browsing_usr ON customer_browsing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_browsing_prod ON customer_browsing_history(product_id);
CREATE INDEX IF NOT EXISTS idx_browsing_time ON customer_browsing_history(viewed_at);
CREATE INDEX IF NOT EXISTS idx_ord_items_ord ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_ord_items_prod ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_usr ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_pair ON product_similarity_matrix(product_a_id, product_b_id);
CREATE INDEX IF NOT EXISTS idx_affinity_pair ON user_category_affinity(user_id, category_id);

-- ------------------------------------------------------------------------------
-- 4. DATABASE VIEWS (ANALYTICAL & RECOMMENDATION INTELLIGENCE)
-- ------------------------------------------------------------------------------

-- VIEW 1: Customer Lifetime Value (CLV) & Purchasing Summary
CREATE VIEW IF NOT EXISTS vw_customer_lifetime_value AS
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.persona_label,
    u.segment,
    u.last_active_at,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0.0) AS total_spend,
    COALESCE(AVG(o.total_amount), 0.0) AS avg_order_value,
    COALESCE(SUM(oi.quantity), 0) AS total_items_purchased,
    (SELECT COUNT(*) FROM customer_browsing_history cb WHERE cb.user_id = u.user_id) AS total_browsing_events
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id AND o.order_status = 'COMPLETED'
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY u.user_id, u.username, u.full_name, u.persona_label, u.segment, u.last_active_at;

-- VIEW 2: Real-Time Product Stock & Conversion Performance
CREATE VIEW IF NOT EXISTS vw_product_performance_and_stock AS
SELECT 
    p.product_id,
    p.sku,
    p.title,
    c.category_name,
    b.brand_name,
    p.price,
    p.rating,
    p.review_count,
    i.stock_quantity,
    i.safety_stock_threshold,
    i.reorder_point,
    i.warehouse_location,
    CASE 
        WHEN i.stock_quantity <= 0 THEN 'Out of Stock'
        WHEN i.stock_quantity <= i.safety_stock_threshold THEN 'Low Stock'
        ELSE 'In Stock'
    END AS computed_stock_status,
    COALESCE(sales.units_sold, 0) AS units_sold,
    COALESCE(sales.total_revenue, 0.0) AS total_revenue,
    COALESCE(views.view_count, 0) AS view_count,
    ROUND(
        CASE WHEN COALESCE(views.view_count, 0) = 0 THEN 0.0 
             ELSE (CAST(COALESCE(sales.units_sold, 0) AS REAL) / views.view_count) * 100 
        END, 2
    ) AS conversion_rate_percent
FROM products p
JOIN categories c ON p.category_id = c.category_id
JOIN brands b ON p.brand_id = b.brand_id
JOIN inventory i ON p.product_id = i.product_id
LEFT JOIN (
    SELECT product_id, SUM(quantity) AS units_sold, SUM(subtotal) AS total_revenue 
    FROM order_items 
    GROUP BY product_id
) sales ON p.product_id = sales.product_id
LEFT JOIN (
    SELECT product_id, COUNT(*) AS view_count 
    FROM customer_browsing_history 
    GROUP BY product_id
) views ON p.product_id = views.product_id;

-- VIEW 3: Frequently Bought Together (Pure SQL Association Mining)
CREATE VIEW IF NOT EXISTS vw_frequently_bought_together AS
SELECT 
    oi1.product_id AS base_product_id,
    p1.title AS base_product_title,
    oi2.product_id AS complementary_product_id,
    p2.title AS complementary_product_title,
    p2.price AS complementary_price,
    p2.image_url AS complementary_image,
    c2.category_name AS complementary_category,
    COUNT(*) AS co_purchase_frequency,
    ROUND(CAST(COUNT(*) AS REAL) / (
        SELECT COUNT(DISTINCT o_sub.order_id) 
        FROM order_items o_sub 
        WHERE o_sub.product_id = oi1.product_id
    ), 3) AS confidence_score
FROM order_items oi1
JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id <> oi2.product_id
JOIN products p1 ON oi1.product_id = p1.product_id
JOIN products p2 ON oi2.product_id = p2.product_id
JOIN categories c2 ON p2.category_id = c2.category_id
GROUP BY oi1.product_id, oi2.product_id
HAVING COUNT(*) >= 1
ORDER BY base_product_id, co_purchase_frequency DESC;

-- VIEW 4: Trending Products (Velocity of Browsing & Recent Purchases)
CREATE VIEW IF NOT EXISTS vw_trending_products AS
SELECT 
    p.product_id,
    p.sku,
    p.title,
    c.category_name,
    b.brand_name,
    p.price,
    p.rating,
    p.image_url,
    i.stock_quantity,
    COALESCE(recent_views.recent_view_count, 0) AS recent_views,
    COALESCE(recent_orders.recent_purchases, 0) AS recent_purchases,
    ROUND(
        (COALESCE(recent_views.recent_view_count, 0) * 1.5) + 
        (COALESCE(recent_orders.recent_purchases, 0) * 5.0) + 
        (p.rating * 2.0), 2
    ) AS trending_score
FROM products p
JOIN categories c ON p.category_id = c.category_id
JOIN brands b ON p.brand_id = b.brand_id
JOIN inventory i ON p.product_id = i.product_id
LEFT JOIN (
    SELECT product_id, COUNT(*) AS recent_view_count 
    FROM customer_browsing_history 
    WHERE viewed_at >= DATETIME('now', '-30 days')
    GROUP BY product_id
) recent_views ON p.product_id = recent_views.product_id
LEFT JOIN (
    SELECT oi.product_id, SUM(oi.quantity) AS recent_purchases 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.created_at >= DATETIME('now', '-30 days')
    GROUP BY oi.product_id
) recent_orders ON p.product_id = recent_orders.product_id
WHERE i.stock_quantity > 0
ORDER BY trending_score DESC;

-- ------------------------------------------------------------------------------
-- 5. DATABASE TRIGGERS
-- ------------------------------------------------------------------------------

-- TRIGGER 1: Order Placement Inventory Deduction & Audit Logging
CREATE TRIGGER IF NOT EXISTS trg_after_order_item_deduct_inventory
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    -- Step A: Insert into audit log
    INSERT INTO inventory_logs (
        product_id,
        change_type,
        quantity_delta,
        previous_stock,
        new_stock,
        reference_id,
        notes
    )
    SELECT 
        NEW.product_id,
        'ORDER_PURCHASE',
        -NEW.quantity,
        i.stock_quantity,
        i.stock_quantity - NEW.quantity,
        'ORDER-' || NEW.order_id,
        'Automatic stock deduction triggered by Order #' || NEW.order_id
    FROM inventory i
    WHERE i.product_id = NEW.product_id;

    -- Step B: Update stock level and computed status
    UPDATE inventory
    SET 
        stock_quantity = stock_quantity - NEW.quantity,
        status = CASE 
            WHEN (stock_quantity - NEW.quantity) <= 0 THEN 'Out of Stock'
            WHEN (stock_quantity - NEW.quantity) <= safety_stock_threshold THEN 'Low Stock'
            ELSE 'In Stock'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;
END;

-- TRIGGER 2: Update User Last Active and Increment Category Affinity on Browsing
CREATE TRIGGER IF NOT EXISTS trg_after_browsing_event_update_affinity
AFTER INSERT ON customer_browsing_history
FOR EACH ROW
BEGIN
    UPDATE users 
    SET last_active_at = CURRENT_TIMESTAMP 
    WHERE user_id = NEW.user_id;

    INSERT INTO user_category_affinity (user_id, category_id, affinity_score, view_count, total_dwell_seconds, last_interacted_at)
    SELECT 
        NEW.user_id, 
        p.category_id,
        1.0 + (NEW.dwell_time_seconds * 0.05),
        1,
        NEW.dwell_time_seconds,
        CURRENT_TIMESTAMP
    FROM products p 
    WHERE p.product_id = NEW.product_id
    ON CONFLICT(user_id, category_id) DO UPDATE SET
        affinity_score = user_category_affinity.affinity_score + 1.0 + (NEW.dwell_time_seconds * 0.05),
        view_count = user_category_affinity.view_count + 1,
        total_dwell_seconds = user_category_affinity.total_dwell_seconds + NEW.dwell_time_seconds,
        last_interacted_at = CURRENT_TIMESTAMP;
END;

-- TRIGGER 3: Recalculate Product Average Rating on New Review
CREATE TRIGGER IF NOT EXISTS trg_after_review_update_rating
AFTER INSERT ON product_reviews
FOR EACH ROW
BEGIN
    UPDATE products
    SET 
        rating = ROUND((
            SELECT AVG(rating) FROM product_reviews WHERE product_id = NEW.product_id
        ), 2),
        review_count = (
            SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id
        )
    WHERE product_id = NEW.product_id;
END;

-- ------------------------------------------------------------------------------
-- 6. SEED DATA POPULATION
-- ------------------------------------------------------------------------------

-- Insert Categories
INSERT INTO categories (category_id, category_name, slug, description, icon) VALUES
(1, 'Electronics & Smart Tech', 'electronics-smart-tech', 'Next-gen personal electronics and connected devices', 'cpu'),
(2, 'Computing & Peripherals', 'computing-peripherals', 'High-performance keyboards, mice, monitors, and docks', 'monitor'),
(3, 'Audio & Wearables', 'audio-wearables', 'Audiophile-grade headphones, earbuds, and studio monitors', 'headphones'),
(4, 'Smart Home & Automation', 'smart-home-automation', 'Intelligent lighting, robotics, climate control, and security', 'home'),
(5, 'Fitness & Outdoor Gear', 'fitness-outdoor-gear', 'Performance tracking wearables, smart recovery, and athletic gear', 'activity');

-- Insert Brands
INSERT INTO brands (brand_id, brand_name, tier, country) VALUES
(1, 'Sony', 'Flagship', 'Japan'),
(2, 'Logitech', 'Premium', 'Switzerland'),
(3, 'Keychron', 'Premium', 'United States'),
(4, 'Samsung', 'Flagship', 'South Korea'),
(5, 'Philips Hue', 'Premium', 'Netherlands'),
(6, 'Garmin', 'Flagship', 'United States'),
(7, 'Anker', 'Mid-Range', 'United States'),
(8, 'Bose', 'Flagship', 'United States'),
(9, 'Dyson', 'Flagship', 'United Kingdom'),
(10, 'Shure', 'Flagship', 'United States'),
(11, 'Roborock', 'Premium', 'Global'),
(12, 'Twelve South', 'Premium', 'United States');

-- Insert Products
INSERT INTO products (product_id, sku, title, description, category_id, brand_id, price, original_price, rating, review_count, image_url, tags, is_featured) VALUES
(1, 'SONY-WH1000XM5', 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones', 'Industry-leading active noise cancellation with 8 microphones, LDAC Hi-Res audio, and 30-hour battery life.', 3, 1, 399.99, 449.99, 4.85, 248, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80', 'audio,headphones,bluetooth,noise-canceling,anc,wireless,hi-res,sony', 1),
(2, 'KEY-K3-PRO', 'Keychron K3 Pro Ultra-Slim Wireless Mechanical Keyboard', '75% compact layout with hot-swappable low profile mechanical switches, QMK/VIA programmable, RGB backlighting.', 2, 3, 109.99, 129.99, 4.78, 185, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', 'keyboard,mechanical,wireless,bluetooth,keychron,rgb,workspace,compact', 1),
(3, 'LOGI-MX-M3S', 'Logitech MX Master 3S Ergonomic Wireless Performance Mouse', '8K DPI any-surface laser sensor, 90% quieter clicks, MagSpeed electromagnetic scrolling wheel.', 2, 2, 99.99, 119.99, 4.90, 420, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80', 'mouse,ergonomic,wireless,logitech,productivity,bluetooth,workspace', 1),
(4, 'SAM-ODYSSEY-34', 'Samsung Odyssey Neo G8 34-inch Curved UltraWide Gaming Monitor', 'Quantum Mini-LED display, 1000R curvature, 240Hz refresh rate, 1ms response time, HDR2000.', 2, 4, 899.99, 1099.99, 4.65, 89, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80', 'monitor,curved,ultrawide,gaming,display,4k,samsung,workspace', 1),
(5, 'HUE-STARTER-KIT', 'Philips Hue Smart White & Color Ambiance Starter Kit', 'Includes Hue Bridge hub and 3 smart E26 LED bulbs with 16 million colors, automated schedules, Apple HomeKit support.', 4, 5, 179.99, 199.99, 4.70, 310, 'https://images.unsplash.com/photo-1550524514-9b6999cb5974?auto=format&fit=crop&w=800&q=80', 'smart-home,lighting,rgb,philips-hue,automation,iot,alexa,google-home', 1),
(6, 'GARMIN-FORERUNNER', 'Garmin Forerunner 265 Running Smartwatch GPS', 'Vibrant AMOLED touch display, advanced training readiness metrics, HRV status, multi-band GPS, 13-day battery.', 5, 6, 449.99, 499.99, 4.88, 142, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80', 'fitness,smartwatch,garmin,running,gps,heart-rate,wearable,workout', 1),
(7, 'ANKER-737-CHARGER', 'Anker 737 Power Bank (PowerCore 24K) 140W 3-Port Portable Charger', 'Ultra-powerful two-way fast charging with smart digital display, GaNPrime technology.', 1, 7, 149.99, 169.99, 4.82, 390, 'https://images.unsplash.com/photo-1609592426504-d5588358ea96?auto=format&fit=crop&w=800&q=80', 'charging,powerbank,usb-c,anker,portable,battery,fast-charge,travel', 0),
(8, 'BOSE-QC-ULTRA', 'Bose QuietComfort Ultra Noise-Cancelling Earbuds', 'Breakthrough Spatial Audio, CustomTune personalized sound profiling, world-class active noise cancellation.', 3, 8, 299.99, 329.99, 4.72, 175, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', 'audio,earbuds,bose,wireless,anc,spatial-audio,bluetooth,sound', 1),
(9, 'DYSON-COOL-PURIFIER', 'Dyson Purifier Hot+Cool HP07 Smart Air Purifier & Heater', 'HEPA H13 filtration capturing 99.97% of particles as small as 0.3 microns, real-time air quality report.', 4, 9, 649.99, 749.99, 4.60, 114, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80', 'smart-home,air-purifier,dyson,heater,clean-air,iot,app-control', 0),
(10, 'SHURE-MV7-MIC', 'Shure MV7+ Podcast Microphone with USB-C and XLR Output', 'Dynamic broadcast microphone, voice isolation technology, customizable LED touch panel, real-time DSP denoiser.', 3, 10, 279.99, 299.99, 4.92, 160, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', 'microphone,podcast,audio,shure,streaming,usb-c,studio,recording', 0),
(11, 'ROBOROCK-S8-PRO', 'Roborock S8 Pro Ultra Robot Vacuum and Sonic Mop', '6000Pa extreme suction, DuoRoller Riser brush, VibraRise 2.0 mopping system, All-in-One RockDock Ultra.', 4, 11, 1199.99, 1399.99, 4.80, 95, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80', 'smart-home,robot-vacuum,roborock,mop,automation,cleaning,iot', 1),
(12, 'TWELVE-CURVE-STAND', 'Twelve South Curve Aluminum Ergonomic Laptop Stand', 'Sculpted matte black aluminum design elevates screen 6 inches for improved posture and airflow.', 2, 12, 59.99, 69.99, 4.68, 230, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80', 'stand,laptop,ergonomic,twelve-south,aluminum,desk-setup,accessory', 0);

-- Insert Inventory
INSERT INTO inventory (product_id, stock_quantity, safety_stock_threshold, reorder_point, warehouse_location, status) VALUES
(1, 38, 10, 15, 'Hub-Alpha-A01', 'In Stock'),
(2, 42, 10, 15, 'Hub-Alpha-B04', 'In Stock'),
(3, 3, 10, 15, 'Hub-Beta-C12', 'Low Stock'),
(4, 14, 5, 8, 'Hub-Gamma-D08', 'In Stock'),
(5, 50, 10, 20, 'Hub-Alpha-E02', 'In Stock'),
(6, 19, 8, 12, 'Hub-Beta-F11', 'In Stock'),
(7, 65, 15, 25, 'Hub-Alpha-A19', 'In Stock'),
(8, 22, 10, 15, 'Hub-Alpha-B09', 'In Stock'),
(9, 4, 6, 10, 'Hub-Gamma-C03', 'Low Stock'),
(10, 18, 5, 10, 'Hub-Beta-D07', 'In Stock'),
(11, 7, 5, 10, 'Hub-Gamma-E15', 'Low Stock'),
(12, 55, 10, 20, 'Hub-Alpha-F02', 'In Stock');

-- Insert Customers
INSERT INTO users (user_id, username, email, full_name, avatar_url, persona_label, preferred_category_id, segment) VALUES
(1, 'alex_tech', 'alex.rivera@codenexus.dev', 'Alex Rivera', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'Tech Enthusiast & Software Architect', 2, 'VIP Platinum'),
(2, 'priya_fitness', 'priya.patel@vitalityfit.io', 'Priya Patel', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', 'Marathon Runner & Wellness Coach', 5, 'Active Explorer'),
(3, 'marcus_home', 'marcus.vance@ambientstudio.com', 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'Architect & Smart Home Designer', 4, 'Premium Buyer'),
(4, 'sophia_audio', 'sophia.chen@soundwave.net', 'Sophia Chen', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', 'Audio Engineer & Music Creator', 3, 'VIP Gold'),
(5, 'guest_jordan', 'guest.jordan@demo.test', 'Jordan Taylor (Guest)', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', 'New Visitor (Cold Start Learning)', NULL, 'Standard');

-- Insert Browsing Behavior Records (Clickstream)
INSERT INTO customer_browsing_history (user_id, session_id, product_id, event_type, dwell_time_seconds, device_type, referrer) VALUES
(1, 'sess_alex_001', 2, 'view', 45, 'Desktop', 'https://news.ycombinator.com'),
(1, 'sess_alex_001', 3, 'view', 72, 'Desktop', 'Direct'),
(1, 'sess_alex_001', 4, 'view', 95, 'Desktop', 'Google Search'),
(1, 'sess_alex_001', 12, 'view', 38, 'Desktop', 'Internal Nav'),
(1, 'sess_alex_002', 2, 'cart_add', 15, 'Desktop', 'Direct'),
(1, 'sess_alex_002', 3, 'cart_add', 20, 'Desktop', 'Direct'),
(2, 'sess_priya_001', 6, 'view', 110, 'Mobile', 'Instagram'),
(2, 'sess_priya_001', 8, 'view', 60, 'Mobile', 'Direct'),
(3, 'sess_marcus_001', 5, 'view', 90, 'Tablet', 'Pinterest'),
(3, 'sess_marcus_001', 11, 'view', 130, 'Tablet', 'Google Search'),
(4, 'sess_sophia_001', 1, 'view', 120, 'Desktop', 'AudioReview.org'),
(4, 'sess_sophia_001', 10, 'view', 145, 'Desktop', 'YouTube');

-- Insert Orders & Order Items
INSERT INTO orders (order_id, order_number, user_id, order_status, total_amount, payment_method, shipping_address) VALUES
(1, 'ORD-2026-8801', 1, 'COMPLETED', 269.97, 'Apple Pay', '742 Evergreen Terrace, San Francisco, CA'),
(2, 'ORD-2026-8802', 2, 'COMPLETED', 449.99, 'Visa Platinum', '120 Ocean Drive, Miami, FL'),
(3, 'ORD-2026-8803', 3, 'COMPLETED', 179.99, 'MasterCard', '88 Brooklyn Heights, New York, NY'),
(4, 'ORD-2026-8804', 4, 'COMPLETED', 679.98, 'American Express', '55 Sunset Blvd, Austin, TX');

INSERT INTO order_items (item_id, order_id, product_id, unit_price, quantity, subtotal) VALUES
(1, 1, 2, 109.99, 1, 109.99),
(2, 1, 3, 99.99, 1, 99.99),
(3, 1, 12, 59.99, 1, 59.99),
(4, 2, 6, 449.99, 1, 449.99),
(5, 3, 5, 179.99, 1, 179.99),
(6, 4, 1, 399.99, 1, 399.99),
(7, 4, 10, 279.99, 1, 279.99);

-- ------------------------------------------------------------------------------
-- 7. ADVANCED ANALYTICAL SQL QUERIES (FOR DEMONSTRATION & EVALUATION)
-- ------------------------------------------------------------------------------

-- QUERY 1: Association Mining (Customers Who Bought X Also Bought Y)
SELECT 
    fbt.base_product_title,
    fbt.complementary_product_title,
    fbt.complementary_price,
    fbt.co_purchase_frequency,
    fbt.confidence_score
FROM vw_frequently_bought_together fbt
ORDER BY fbt.co_purchase_frequency DESC, fbt.confidence_score DESC;

-- QUERY 2: User Behavioral Dwell-Time & Category Affinity Profile
SELECT 
    u.full_name,
    u.persona_label,
    c.category_name,
    uca.affinity_score,
    uca.view_count,
    uca.total_dwell_seconds,
    ROUND(CAST(uca.total_dwell_seconds AS REAL) / CASE WHEN uca.view_count = 0 THEN 1 ELSE uca.view_count END, 1) AS avg_dwell_per_view_sec
FROM user_category_affinity uca
JOIN users u ON uca.user_id = u.user_id
JOIN categories c ON uca.category_id = c.category_id
ORDER BY uca.affinity_score DESC;

-- QUERY 3: Inventory Low Stock Alert & Supply Reorder Warning
SELECT 
    p.sku,
    p.title,
    i.stock_quantity,
    i.safety_stock_threshold,
    i.reorder_point,
    i.warehouse_location,
    (i.reorder_point - i.stock_quantity) AS recommended_reorder_units
FROM inventory i
JOIN products p ON i.product_id = p.product_id
WHERE i.stock_quantity <= i.safety_stock_threshold
ORDER BY i.stock_quantity ASC;

-- QUERY 4: Conversion Funnel (Views vs Sales Velocity per Category)
SELECT 
    c.category_name,
    COUNT(DISTINCT p.product_id) AS catalog_size,
    COUNT(DISTINCT cb.event_id) AS total_category_views,
    COALESCE(SUM(oi.quantity), 0) AS units_sold,
    COALESCE(SUM(oi.subtotal), 0.0) AS gross_sales
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
LEFT JOIN customer_browsing_history cb ON p.product_id = cb.product_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY c.category_name
ORDER BY gross_sales DESC;
