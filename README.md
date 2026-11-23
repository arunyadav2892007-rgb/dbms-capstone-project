# 🛍️ NEXUS AI — Intelligent E-Commerce Recommendation Engine & DBMS System

> **DBMS Capstone Project**: A production-grade relational database architecture and full-stack application for tracking customer browsing behavior, purchasing history, inventory supply-chain telemetry, and automated personalized product recommendations.

---

## 📌 Executive Overview

Modern e-commerce platforms require real-time synergy between relational transactional guarantees (**ACID compliance**) and predictive machine learning models (**Explainable Recommendation Systems**).

This project implements an end-to-end DBMS-centered architecture:
1. **Behavioral Clickstream Tracking**: Captures fine-grained customer browsing events (`view`, `dwell_time`, `cart_add`, `search_click`) with sub-second timestamps and device metadata.
2. **ACID Inventory Triggers**: Automatic stock deduction and low-stock threshold alerts fired by database triggers upon transactional order placement.
3. **Automated AI Recommendation Engine**: A multi-factor hybrid algorithm combining **User-Category Affinity**, **Item-to-Item Collaborative Filtering (Co-Purchases)**, and **Content-Based Feature Vectors** with real-time explainability.
4. **Interactive Storefront & DBMS Console**: A responsive web application with customer persona switching, live dwell-time tracking, shopping cart, and an integrated **Live SQL Console** for query execution.

---

## 🏗️ System Architecture

```
                       ┌────────────────────────────────────────┐
                       │          FRONTEND SPA (HTML/JS)         │
                       │ Storefront • Analytics • SQL Console   │
                       └──────────────────┬─────────────────────┘
                                          │ REST API / JSON
                                          ▼
                       ┌────────────────────────────────────────┐
                       │       FASTAPI BACKEND (Python 3.13)    │
                       │  Endpoints • Recommender • Transactions│
                       └──────────────────┬─────────────────────┘
                                          │ SQL Queries & Triggers
                                          ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         RELATIONAL DBMS (SQLite / SQL)                      │
    ├─────────────────────────────┬───────────────────────────┬───────────────────┤
    │          CATALOG            │         BEHAVIOR          │     INVENTORY     │
    │ • categories                │ • customer_browsing_hist  │ • inventory       │
    │ • brands                    │ • user_category_affinity  │ • inventory_logs  │
    │ • products                  │ • recommendation_logs     │   (Audit Trail)   │
    │ • product_reviews           │ • cart_items              │                   │
    ├─────────────────────────────┼───────────────────────────┼───────────────────┤
    │         PURCHASES           │       SIMILARITY / AI     │       VIEWS       │
    │ • users                     │ • product_similarity_mat  │ • vw_clv          │
    │ • orders                    │   (Co-Purchase + Content) │ • vw_fbt          │
    │ • order_items               │                           │ • vw_trending     │
    └─────────────────────────────┴───────────────────────────┴───────────────────┘
```

---

## 🗄️ Database Schema & Relational Design

The system implements 14 normalized tables (3NF) and indexed relationships:

| Table Name | Primary Key | Key Foreign Keys | Purpose |
|---|---|---|---|
| `categories` | `category_id` | `parent_category_id` | Hierarchical product classification |
| `brands` | `brand_id` | - | Manufacturer credentials & brand tier |
| `products` | `product_id` | `category_id`, `brand_id` | Catalog items, prices, ratings, and tag vectors |
| `inventory` | `inventory_id` | `product_id` (1:1) | Real-time stock, safety thresholds & warehouse bins |
| `inventory_logs` | `log_id` | `product_id` | Immutable audit trail of every stock increase/decrease |
| `users` | `user_id` | `preferred_category_id` | Customer profiles, personas, and membership tiers |
| `customer_browsing_history` | `event_id` | `user_id`, `product_id` | Granular clickstream logs with dwell seconds & session IDs |
| `user_category_affinity` | `affinity_id` | `user_id`, `category_id` | Real-time AI feature vector of customer category interest |
| `cart_items` | `cart_id` | `user_id`, `product_id` | Active shopping cart items per user |
| `orders` | `order_id` | `user_id` | Master orders table with payment & shipping records |
| `order_items` | `item_id` | `order_id`, `product_id` | Line items purchased with prices at time of sale |
| `product_reviews` | `review_id` | `product_id`, `user_id` | Customer ratings (1-5) and sentiment scores |
| `product_similarity_matrix` | `similarity_id` | `product_a_id`, `product_b_id` | Pre-computed Jaccard co-purchase and content similarity |
| `recommendation_logs` | `rec_id` | `user_id`, `product_id` | Feedback loop tracking recommendation CTR & conversions |

---

## ⚡ Active Database Triggers & Analytical Views

### 1. SQL Triggers
* **`trg_after_order_item_deduct_inventory`**:
  Fires immediately after an item is inserted into `order_items`. It automatically decrements `inventory.stock_quantity`, updates status to `'Low Stock'` or `'Out of Stock'` if below `safety_stock_threshold`, and creates an immutable entry in `inventory_logs`.
* **`trg_after_browsing_event_update_affinity`**:
  Fires upon every clickstream event in `customer_browsing_history`. It updates `users.last_active_at` and upserts `user_category_affinity` scores using a weighted formula based on interaction dwell time:
  $$\Delta \text{Affinity} = 1.0 + (\text{DwellSeconds} \times 0.05)$$
* **`trg_after_review_update_rating`**:
  Automatically recalculates average star ratings and review counts on `products` when a new review is added.

### 2. Analytical SQL Views
* **`vw_customer_lifetime_value`**:
  Computes total orders, cumulative spend, average order value (AOV), total items purchased, and browsing interaction count per customer.
* **`vw_frequently_bought_together`**:
  Performs SQL Association Rule Mining on `order_items` self-joins to find high-confidence complementary product bundles:
  $$\text{Confidence}(A \rightarrow B) = \frac{|\text{Orders containing } A \text{ and } B|}{|\text{Orders containing } A|}$$
* **`vw_trending_products`**:
  Ranks catalog products by real-time velocity (recent 30-day views, orders, and ratings) using window functions.
* **`vw_product_performance_and_stock`**:
  Calculates units sold, gross revenue, page views, conversion rate percentage, and inventory health.

---

## 🧠 Recommendation Engine Algorithms

The recommendation engine combines multiple behavioral signals into an explainable composite score:

1. **Category Affinity Match ($S_{affinity}$)**:
   Inferred from cumulative dwell time and browsing frequency in `user_category_affinity`.
2. **Item-to-Item Collaborative Similarity ($S_{sim}$)**:
   Calculated using co-purchase Jaccard similarity and feature vector distance (category, brand, price ratio, tags).
3. **Rating & Quality Signal ($S_{rating}$)**:
   Normalizes customer ratings ($\frac{\text{Rating}}{5.0}$).
4. **Behavioral Recency Boost ($S_{recency}$)**:
   Rewards products recently engaged with in the active session.

$$\text{Final Score}(U, P) = 0.40 \cdot S_{sim}(P, \text{Viewed}(U)) + 0.30 \cdot S_{affinity}(U, \text{Cat}(P)) + 0.20 \cdot S_{rating}(P) + 0.10 \cdot S_{recency}(P)$$

### Cold-Start Handling:
When a new or guest customer arrives with zero history, the system dynamically falls back to top products from `vw_trending_products`. As soon as the visitor spends even 10 seconds viewing any product, the SQL trigger fires and instantly adapts the storefront recommendations to their inferred taste profile!

---

## 🚀 How to Run the Project (Node.js & SQL)

### Prerequisites
* **Node.js**: v22.5.0+ (Tested on Node.js v25.8.1 with native `node:sqlite`)
* **Zero External Dependencies**: Built entirely with Node.js built-in modules (`node:http`, `node:sqlite`, `node:fs`, `node:path`, `node:url`)

### 1. Launch the System
Run directly with Node.js:
```bash
node server.js
```
Or via npm:
```bash
npm start
```

To re-import or re-sync the real Amazon Kaggle dataset at any time:
```bash
npm run import-amazon
# or: node src/import_amazon.js
```

To reset to baseline dataset:
```bash
node src/seed.js
```

### 2. Open in Your Browser
* **Storefront & DBMS Console**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Capstone Standalone SQL File**: Located at [`cpstone/gb.sql`](file:///c:/dbmscapstoneproject/cpstone/gb.sql) (ANSI/MySQL/PostgreSQL/SQLite compatible).

---

## 🧪 Demonstration Walkthrough

1. **Persona Switching**:
   * Click the top-right persona selector (e.g. switch between **Alex Rivera** [Tech], **Priya Patel** [Fitness], **Marcus Vance** [Smart Home], and **Jordan Taylor** [Guest]).
   * Observe how the **"🔥 AI Personalized Recommendations"** rail updates instantly with explainable badges (`"Frequently bought together with..."`, `"High interest in Computing"`).
2. **Live Dwell-Time Tracking**:
   * Click any product card (e.g., Sony WH-1000XM5 Headphones).
   * Notice the live clickstream dwell timer: `⏱️ 00:08s`.
   * Close the modal after 15 seconds.
   * A toast notification will pop up: *"Tracked 15s dwell time • Category affinity boosted!"*
   * Watch the homepage recommendation rail adjust to feature audio accessories!
3. **Association Mining & Co-Purchases**:
   * In the product modal, scroll to **"Frequently Bought Together"** to see SQL-mined complementary accessories with co-purchase confidence scores.
4. **ACID Checkout & Trigger Verification**:
   * Add products to cart and click **"Complete Checkout"**.
   * An atomic SQL transaction executes. The order is created, and the SQL Trigger `trg_after_order_item_deduct_inventory` deducts stock from `inventory` and writes to `inventory_logs`.
   * Check the **Inventory** tab to see the updated stock levels and audit trail!
5. **Interactive SQL Console**:
   * Navigate to the **"SQL Console"** tab.
   * Click preset buttons (e.g., *Customer Lifetime Value*, *Association Mining*, *Trending Velocity*) or type custom SQL queries to inspect live tables with millisecond execution timing!
