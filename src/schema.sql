-- ==============================================================================
-- AI-Powered E-Commerce Recommendation Engine Database Schema
-- Capstone Project: Behavioral Tracking, Inventory Management & Automated Personalization
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Product Categories
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

-- 2. Brands
CREATE TABLE IF NOT EXISTS brands (
    brand_id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    tier VARCHAR(50) DEFAULT 'Mid-Range', -- 'Flagship', 'Premium', 'Mid-Range', 'Budget'
    country VARCHAR(100) DEFAULT 'Global',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products
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
    tags TEXT, -- comma-separated tags or JSON for content-based matching
    is_featured BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE RESTRICT
);

-- 4. Inventory Tracking & Supply Chain
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

-- 5. Inventory Movement Audit Log
CREATE TABLE IF NOT EXISTS inventory_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'ORDER_PURCHASE', 'RESTOCK', 'RETURN', 'MANUAL_ADJUSTMENT'
    quantity_delta INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id VARCHAR(100),
    notes TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- 6. Customers / Users
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    persona_label VARCHAR(100) DEFAULT 'Shopper', -- e.g., 'Tech Enthusiast', 'Fitness & Wellness', 'Home Decorator'
    preferred_category_id INTEGER,
    segment VARCHAR(50) DEFAULT 'Standard', -- 'VIP Platinum', 'Tech Explorer', 'Bargain Seeker', 'Standard'
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preferred_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- 7. Customer Browsing Behavior & Clickstream Tracking
CREATE TABLE IF NOT EXISTS customer_browsing_history (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    product_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'dwell', 'search_click', 'hover', 'add_to_wishlist', 'cart_add'
    dwell_time_seconds INTEGER DEFAULT 0 CHECK (dwell_time_seconds >= 0),
    device_type VARCHAR(50) DEFAULT 'Desktop',
    referrer VARCHAR(150) DEFAULT 'Direct',
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- 8. Customer Category & Feature Affinity (AI Feature Store)
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

-- 9. Shopping Cart
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

-- 10. Orders
CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    order_status VARCHAR(50) DEFAULT 'COMPLETED', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    discount_amount DECIMAL(10, 2) DEFAULT 0.0,
    tax_amount DECIMAL(10, 2) DEFAULT 0.0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0.0,
    payment_method VARCHAR(50) DEFAULT 'Credit Card',
    shipping_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 11. Order Items (Purchasing History details)
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

-- 12. Product Reviews & Customer Sentiment
CREATE TABLE IF NOT EXISTS product_reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    headline VARCHAR(255),
    comment TEXT,
    sentiment_score REAL DEFAULT 0.0, -- -1.0 to +1.0
    verified_purchase BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 13. Item-to-Item Similarity Matrix (Collaborative & Content-Based Vector Matrix)
CREATE TABLE IF NOT EXISTS product_similarity_matrix (
    similarity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_a_id INTEGER NOT NULL,
    product_b_id INTEGER NOT NULL,
    co_purchase_score REAL DEFAULT 0.0,   -- Jaccard index of co-purchases
    co_view_score REAL DEFAULT 0.0,       -- Co-browsing frequency
    content_similarity REAL DEFAULT 0.0,   -- Category, brand, tag & price proximity
    hybrid_score REAL DEFAULT 0.0,         -- Weighted composite AI similarity
    last_computed DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_a_id, product_b_id),
    CHECK (product_a_id <> product_b_id),
    FOREIGN KEY (product_a_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (product_b_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- 14. Recommendation Impression & Click Tracking (Conversion Feedback Loop)
CREATE TABLE IF NOT EXISTS recommendation_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    algorithm VARCHAR(50) NOT NULL, -- 'HYBRID_AI', 'COLLABORATIVE', 'CONTENT_BASED', 'CO_PURCHASE', 'TRENDING'
    predicted_score REAL NOT NULL,
    position INTEGER DEFAULT 1,
    was_clicked BOOLEAN DEFAULT 0,
    was_purchased BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & REAL-TIME RECOMMENDATIONS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_browsing_user ON customer_browsing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_browsing_product ON customer_browsing_history(product_id);
CREATE INDEX IF NOT EXISTS idx_browsing_session ON customer_browsing_history(session_id);
CREATE INDEX IF NOT EXISTS idx_browsing_viewed_at ON customer_browsing_history(viewed_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_similarity_pair ON product_similarity_matrix(product_a_id, product_b_id);
CREATE INDEX IF NOT EXISTS idx_affinity_user_cat ON user_category_affinity(user_id, category_id);

-- ==============================================================================
-- DATABASE VIEWS FOR ANALYTICS AND REAL-TIME AI RECOMMENDATION ENGINE
-- ==============================================================================

-- VIEW 1: Customer Lifetime Value, Activity & Purchase Persona
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

-- VIEW 2: Real-Time Product Performance, Demand & Inventory Status
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

-- VIEW 3: Frequently Bought Together (Pure SQL Co-Purchase Association Mining)
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

-- VIEW 4: Trending Products (Real-Time Velocity of Views & Recent Purchases)
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

-- VIEW 5: Real-time Customer Browsing Intent & Recency
CREATE VIEW IF NOT EXISTS vw_user_recent_intent AS
SELECT 
    cb.user_id,
    cb.product_id,
    p.title,
    p.category_id,
    c.category_name,
    COUNT(cb.event_id) AS interaction_count,
    SUM(cb.dwell_time_seconds) AS total_dwell_seconds,
    MAX(cb.viewed_at) AS last_viewed_at
FROM customer_browsing_history cb
JOIN products p ON cb.product_id = p.product_id
JOIN categories c ON p.category_id = c.category_id
GROUP BY cb.user_id, cb.product_id
ORDER BY cb.user_id, last_viewed_at DESC;

-- ==============================================================================
-- DATABASE TRIGGERS
-- ==============================================================================

-- TRIGGER 1: Deduct Inventory and Log Stock Movement when an Order is Placed
CREATE TRIGGER IF NOT EXISTS trg_after_order_item_deduct_inventory
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    -- 1. Create audit log of inventory deduction
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

    -- 2. Update stock level and computed status
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

-- TRIGGER 2: Update User Last Active Time and Recalculate Category Affinity on Browsing
CREATE TRIGGER IF NOT EXISTS trg_after_browsing_event_update_affinity
AFTER INSERT ON customer_browsing_history
FOR EACH ROW
BEGIN
    -- Update customer last active timestamp
    UPDATE users 
    SET last_active_at = CURRENT_TIMESTAMP 
    WHERE user_id = NEW.user_id;

    -- Upsert user category affinity: Views + Dwell Time weighted score
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

-- TRIGGER 3: Update Product Rating and Review Count on New Review
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
