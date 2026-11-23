// ==============================================================================
// NEXUS AI - RECOMMENDATION ENGINE (NODE.JS & SQL)
// Multi-Factor Hybrid Recommender: Dwell Time, Item Similarity & Co-Purchases
// ==============================================================================

const { query, queryOne, execute } = require('./database');

function getTrendingProducts(limit = 8) {
    return query("SELECT * FROM vw_trending_products LIMIT ?", [limit]);
}

function getPersonalizedRecommendations(userId, limit = 6) {
    // 1. Fetch user profile
    const user = queryOne("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (!user) {
        return getTrendingProducts(limit);
    }

    // 2. Fetch user's recent browsing history
    const recentViews = query(`
        SELECT product_id, dwell_time_seconds, viewed_at 
        FROM customer_browsing_history 
        WHERE user_id = ? 
        ORDER BY viewed_at DESC 
        LIMIT 5
    `, [userId]);

    // 3. Fetch user's purchased items to prevent duplicate recommendations
    const purchasedItems = query(`
        SELECT DISTINCT oi.product_id 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.user_id = ? AND o.order_status = 'COMPLETED'
    `, [userId]);
    const purchasedIds = new Set(purchasedItems.map(p => p.product_id));

    // 4. Fetch user category affinities (dynamically updated by SQL trigger)
    const affinities = query(`
        SELECT category_id, affinity_score, view_count, purchase_count 
        FROM user_category_affinity 
        WHERE user_id = ? 
        ORDER BY affinity_score DESC
    `, [userId]);
    const affinityMap = {};
    for (const a of affinities) {
        affinityMap[a.category_id] = Number(a.affinity_score);
    }

    // Cold-Start: If no views and no affinities, return trending
    if (recentViews.length === 0 && Object.keys(affinityMap).length === 0) {
        const trending = getTrendingProducts(limit);
        return trending.map(p => ({
            ...p,
            recommendation_reason: "Trending Best-Seller • High Customer Satisfaction",
            match_confidence: 85,
            algorithm_tag: "TRENDING_POPULARITY"
        }));
    }

    // Fetch active candidates in stock
    const candidateProducts = query(`
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
            i.stock_quantity,
            i.status AS stock_status,
            i.warehouse_location
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN brands b ON p.brand_id = b.brand_id
        JOIN inventory i ON p.product_id = i.product_id
        WHERE p.is_active = 1 AND i.stock_quantity > 0
    `);

    const viewedIds = recentViews.map(v => v.product_id);
    const simScores = {};

    if (viewedIds.length > 0) {
        const placeholders = viewedIds.map(() => '?').join(',');
        const simData = query(`
            SELECT product_a_id, product_b_id, hybrid_score, co_purchase_score, content_similarity 
            FROM product_similarity_matrix 
            WHERE product_a_id IN (${placeholders})
        `, viewedIds);

        for (const row of simData) {
            const targetId = row.product_b_id;
            const score = Number(row.hybrid_score);
            if (!simScores[targetId] || score > simScores[targetId].score) {
                simScores[targetId] = {
                    score,
                    source_product_id: row.product_a_id,
                    co_purchase: Number(row.co_purchase_score),
                    content_sim: Number(row.content_similarity)
                };
            }
        }
    }

    const scoredCandidates = [];
    for (const p of candidateProducts) {
        const pid = p.product_id;
        const cid = p.category_id;

        // Skip exact items already bought by the user
        if (purchasedIds.has(pid)) continue;

        // 1. Category Affinity (normalized 0.0 - 1.0)
        const userCatAff = affinityMap[cid] || 0.0;
        const normCatScore = Math.min(userCatAff / 8.0, 1.0);

        // 2. Item-to-Item Similarity Score to viewed products
        const simInfo = simScores[pid] || { score: 0.0, source_product_id: null, co_purchase: 0.0, content_sim: 0.0 };
        const itemSimScore = simInfo.score;

        // 3. Rating & Quality Score
        const ratingScore = p.rating / 5.0;

        // 4. View Recency
        const isRecentlyViewed = viewedIds.includes(pid) ? 1.0 : 0.0;

        // Composite Hybrid Formula:
        let compositeScore;
        if (viewedIds.length > 0) {
            compositeScore = (itemSimScore * 0.40) + (normCatScore * 0.30) + (ratingScore * 0.20) + (isRecentlyViewed * 0.10);
        } else {
            compositeScore = (normCatScore * 0.65) + (ratingScore * 0.35);
        }

        let matchConfidence = Math.min(Math.round(compositeScore * 100), 99);
        if (matchConfidence < 35) {
            matchConfidence = 35 + Math.round(ratingScore * 30);
        }

        // Explainable Reasoning
        let reason = "";
        let algorithmTag = "HYBRID_AI";

        if (simInfo.source_product_id) {
            const srcProd = candidateProducts.find(x => x.product_id === simInfo.source_product_id);
            const srcName = srcProd ? (srcProd.title.length > 28 ? srcProd.title.substring(0, 28) + '...' : srcProd.title) : "recently viewed products";
            if (simInfo.co_purchase > 0.3) {
                reason = `Frequently bought together with ${srcName}`;
                algorithmTag = "COLLABORATIVE_FILTERING";
            } else {
                reason = `Similar features & category match to ${srcName}`;
                algorithmTag = "CONTENT_BASED";
            }
        } else if (normCatScore > 0.4) {
            reason = `Based on your high interest in ${p.category_name}`;
            algorithmTag = "CATEGORY_AFFINITY";
        } else {
            reason = `Top-rated ${p.brand_name} flagship in ${p.category_name}`;
            algorithmTag = "POPULARITY_BOOST";
        }

        scoredCandidates.push({
            ...p,
            ai_score: Number(compositeScore.toFixed(4)),
            match_confidence: matchConfidence,
            recommendation_reason: reason,
            algorithm_tag: algorithmTag
        });
    }

    scoredCandidates.sort((a, b) => b.ai_score - a.ai_score);
    return scoredCandidates.slice(0, limit);
}

function getFrequentlyBoughtTogether(productId, limit = 3) {
    const coPurchases = query(`
        SELECT 
            complementary_product_id AS product_id,
            complementary_product_title AS title,
            complementary_price AS price,
            complementary_image AS image_url,
            complementary_category AS category_name,
            co_purchase_frequency,
            confidence_score
        FROM vw_frequently_bought_together 
        WHERE base_product_id = ?
        ORDER BY co_purchase_frequency DESC, confidence_score DESC
        LIMIT ?
    `, [productId, limit]);

    if (coPurchases.length >= limit) {
        return coPurchases;
    }

    const needed = limit - coPurchases.length;
    const existingIds = coPurchases.map(r => r.product_id).concat([productId]);
    const placeholders = existingIds.map(() => '?').join(',');

    const similar = query(`
        SELECT 
            p.product_id,
            p.title,
            p.price,
            p.image_url,
            c.category_name,
            1 AS co_purchase_frequency,
            sm.hybrid_score AS confidence_score
        FROM product_similarity_matrix sm
        JOIN products p ON sm.product_b_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        JOIN inventory i ON p.product_id = i.product_id
        WHERE sm.product_a_id = ? AND p.product_id NOT IN (${placeholders}) AND i.stock_quantity > 0
        ORDER BY sm.hybrid_score DESC
        LIMIT ?
    `, [productId, ...existingIds, needed]);

    return [...coPurchases, ...similar];
}

function getSimilarProducts(productId, limit = 4) {
    return query(`
        SELECT 
            p.product_id,
            p.sku,
            p.title,
            p.price,
            p.original_price,
            p.rating,
            p.review_count,
            p.image_url,
            c.category_name,
            b.brand_name,
            i.stock_quantity,
            i.status AS stock_status,
            sm.hybrid_score,
            sm.content_similarity,
            sm.co_purchase_score
        FROM product_similarity_matrix sm
        JOIN products p ON sm.product_b_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        JOIN brands b ON p.brand_id = b.brand_id
        JOIN inventory i ON p.product_id = i.product_id
        WHERE sm.product_a_id = ? AND i.stock_quantity > 0
        ORDER BY sm.hybrid_score DESC
        LIMIT ?
    `, [productId, limit]);
}

function trackBrowsingEvent(userId, sessionId, productId, eventType = "view", dwellTimeSeconds = 0, deviceType = "Desktop", referrer = "Storefront") {
    // Inserts event into clickstream table (which fires SQL trigger trg_after_browsing_event_update_affinity!)
    const result = execute(`
        INSERT INTO customer_browsing_history 
        (user_id, session_id, product_id, event_type, dwell_time_seconds, device_type, referrer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, sessionId, productId, eventType, dwellTimeSeconds, deviceType, referrer]);

    const prod = queryOne("SELECT category_id FROM products WHERE product_id = ?", [productId]);
    let updatedAffinity = null;
    if (prod) {
        updatedAffinity = queryOne(`
            SELECT affinity_score, view_count, total_dwell_seconds 
            FROM user_category_affinity 
            WHERE user_id = ? AND category_id = ?
        `, [userId, prod.category_id]);
    }

    return {
        event_id: result.lastInsertRowid,
        user_id: userId,
        product_id: productId,
        dwell_time_seconds: dwellTimeSeconds,
        updated_affinity: updatedAffinity
    };
}

module.exports = {
    getPersonalizedRecommendations,
    getFrequentlyBoughtTogether,
    getSimilarProducts,
    getTrendingProducts,
    trackBrowsingEvent
};
