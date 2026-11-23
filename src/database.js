// ==============================================================================
// NEXUS AI - DATABASE LAYER (NODE.JS & SQLITE)
// Uses native node:sqlite DatabaseSync (Node.js 22.5+)
// ==============================================================================

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'ecommerce_recommendation.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        dbInstance = new DatabaseSync(DB_PATH);
        dbInstance.exec('PRAGMA foreign_keys = ON;');
    }
    return dbInstance;
}

function initDb(forceRecreate = false) {
    const db = getDb();
    if (forceRecreate) {
        try {
            db.exec(`
                PRAGMA foreign_keys = OFF;
                DROP TABLE IF EXISTS recommendation_logs;
                DROP TABLE IF EXISTS product_similarity_matrix;
                DROP TABLE IF EXISTS product_reviews;
                DROP TABLE IF EXISTS order_items;
                DROP TABLE IF EXISTS orders;
                DROP TABLE IF EXISTS cart_items;
                DROP TABLE IF EXISTS user_category_affinity;
                DROP TABLE IF EXISTS customer_browsing_history;
                DROP TABLE IF EXISTS users;
                DROP TABLE IF EXISTS inventory_logs;
                DROP TABLE IF EXISTS inventory;
                DROP TABLE IF EXISTS products;
                DROP TABLE IF EXISTS brands;
                DROP TABLE IF EXISTS categories;
                DROP VIEW IF EXISTS vw_customer_lifetime_value;
                DROP VIEW IF EXISTS vw_product_performance_and_stock;
                DROP VIEW IF EXISTS vw_frequently_bought_together;
                DROP VIEW IF EXISTS vw_trending_products;
                DROP VIEW IF EXISTS vw_user_recent_intent;
                PRAGMA foreign_keys = ON;
            `);
            console.log('[DB] Dropped previous schema successfully.');
        } catch (e) {
            console.warn(`[DB] Notice during cleanup: ${e.message}`);
        }
    }
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);
    console.log(`[DB] Database schema initialized successfully at ${DB_PATH}`);
}

function query(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    // Convert to plain JS objects
    return rows.map(r => ({ ...r }));
}

function queryOne(sql, params = []) {
    const rows = query(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid)
    };
}

function exec(sql) {
    const db = getDb();
    return db.exec(sql);
}

function runRawSql(sqlQuery) {
    const startTime = performance.now();
    const db = getDb();
    try {
        const stripped = sqlQuery.trim();
        const isSelect = /^(SELECT|WITH|PRAGMA|EXPLAIN)/i.test(stripped);

        if (isSelect) {
            const stmt = db.prepare(sqlQuery);
            const rawRows = stmt.all();
            const data = rawRows.map(r => ({ ...r }));
            const columns = data.length > 0 ? Object.keys(data[0]) : [];
            const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
            return {
                success: true,
                columns,
                data,
                row_count: data.length,
                execution_time_ms: executionTimeMs,
                error: null
            };
        } else {
            db.exec(sqlQuery);
            const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
            return {
                success: true,
                columns: [],
                data: [],
                row_count: 0,
                execution_time_ms: executionTimeMs,
                error: null
            };
        }
    } catch (err) {
        const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
        return {
            success: false,
            columns: [],
            data: [],
            row_count: 0,
            execution_time_ms: executionTimeMs,
            error: err.message
        };
    }
}

module.exports = {
    getDb,
    initDb,
    query,
    queryOne,
    execute,
    exec,
    runRawSql,
    DB_PATH
};
