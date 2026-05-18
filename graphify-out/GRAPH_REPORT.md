# Graph Report - .  (2026-05-17)

## Corpus Check
- 14 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 244 nodes · 256 edges · 42 communities (32 shown, 10 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.82)
- Token cost: 85,000 input · 8,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Auth & TOTP|Admin Auth & TOTP]]
- [[_COMMUNITY_Catalog & Product CRUD|Catalog & Product CRUD]]
- [[_COMMUNITY_Orders Test Suite|Orders Test Suite]]
- [[_COMMUNITY_Server Entry & Data Store|Server Entry & Data Store]]
- [[_COMMUNITY_Admin Panel Pages|Admin Panel Pages]]
- [[_COMMUNITY_Admin Product CRUD Flow|Admin Product CRUD Flow]]
- [[_COMMUNITY_IP Ban  Rate Limiting|IP Ban / Rate Limiting]]
- [[_COMMUNITY_Login & TOTP Setup Flow|Login & TOTP Setup Flow]]
- [[_COMMUNITY_Catalog Search Logic|Catalog Search Logic]]
- [[_COMMUNITY_Orders API (Supabase)|Orders API (Supabase)]]
- [[_COMMUNITY_Checkout Form Tests|Checkout Form Tests]]
- [[_COMMUNITY_Frontend Catalog & Composables|Frontend Catalog & Composables]]
- [[_COMMUNITY_Frontend HTTP Client|Frontend HTTP Client]]
- [[_COMMUNITY_Cart State Management|Cart State Management]]
- [[_COMMUNITY_SSG Products Route|SSG Products Route]]
- [[_COMMUNITY_Order Creation Flow|Order Creation Flow]]
- [[_COMMUNITY_Static Info Pages|Static Info Pages]]
- [[_COMMUNITY_Order Email Notifications|Order Email Notifications]]
- [[_COMMUNITY_Frontend Auth Middleware|Frontend Auth Middleware]]
- [[_COMMUNITY_Payment Success Page|Payment Success Page]]
- [[_COMMUNITY_SSG Collections Route|SSG Collections Route]]
- [[_COMMUNITY_Admin Layout & Guard|Admin Layout & Guard]]
- [[_COMMUNITY_Checkout Form Structural Tests|Checkout Form Structural Tests]]
- [[_COMMUNITY_Checkout & Product Load|Checkout & Product Load]]
- [[_COMMUNITY_Orders Auth Middleware|Orders Auth Middleware]]
- [[_COMMUNITY_Cart Key Identifier|Cart Key Identifier]]
- [[_COMMUNITY_In-Memory Cart|In-Memory Cart]]
- [[_COMMUNITY_Graph-First Workflow|Graph-First Workflow]]

## God Nodes (most connected - your core abstractions)
1. `POST /api/admin/login handler` - 6 edges
2. `PUT /api/admin/products/:id handler` - 6 edges
3. `useApi composable` - 5 edges
4. `useAdminApi composable` - 5 edges
5. `sanitizeString` - 5 edges
6. `POST /api/admin/products handler` - 5 edges
7. `Admin Orders Flow Tests` - 4 edges
8. `admin_token localStorage key` - 4 edges
9. `getAdmins()` - 4 edges
10. `getAdminSecret()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `POST /api/admin/login handler` --rationale_for--> `OWASP-tagged security hardening`  [INFERRED]
  backend/routes/admin-auth.js → CLAUDE.md
- `Nuxt Server Route collections.get` --implements--> `SSG prerender of API JSON for GitHub Pages`  [INFERRED]
  frontend/server/api/collections.get.ts → PROJECT_NOTES.md
- `Nuxt Server Route products.get` --implements--> `SSG prerender of API JSON for GitHub Pages`  [INFERRED]
  frontend/server/api/products.get.ts → PROJECT_NOTES.md
- `sanitizeString` --rationale_for--> `OWASP-tagged security hardening`  [INFERRED]
  backend/lib/sanitize.js → CLAUDE.md
- `saveBase64Image` --rationale_for--> `OWASP-tagged security hardening`  [INFERRED]
  backend/lib/store.js → CLAUDE.md

## Hyperedges (group relationships)
- **Admin login: rate limit + IP ban + TOTP** — adminauth_login, security_isipbanned, security_recordfailedattempt, security_resetattempts, auth_getadminsecret [EXTRACTED 1.00]
- **Product image upload pipeline: frontend composable to backend base64 storage** — useimageupload_useimageupload, add_handlesubmit, id_handlesubmit, catalog_postproducts, store_savebase64image [INFERRED 0.75]

## Communities (42 total, 10 thin omitted)

### Community 0 - "Admin Auth & TOTP"
Cohesion: 0.09
Nodes (27): authMiddleware(), fs, getAdmins(), getAdminSecret(), jwt, loadSecrets(), path, saveSecrets() (+19 more)

### Community 1 - "Catalog & Product CRUD"
Cohesion: 0.08
Nodes (24): ALLOWED_BADGES, ALLOWED_CLOTHING, sanitizeString(), { ALLOWED_BADGES, sanitizeString }, { authMiddleware }, category, clothingType, collections (+16 more)

### Community 2 - "Orders Test Suite"
Cohesion: 0.09
Nodes (22): apiKey, apiSrc, assert, createIdx, createSection, dynamicIdx, env, envPath (+14 more)

### Community 3 - "Server Entry & Data Store"
Cohesion: 0.09
Nodes (17): app, cors, express, { getAdmins }, { UPLOADS_DIR }, collections, COLLECTIONS_FILE, crypto (+9 more)

### Community 4 - "Admin Panel Pages"
Cohesion: 0.15
Nodes (17): admin_token localStorage key, auth middleware (JWT guard), Nuxt Server Route collections.get, collections.json data store, Admin Dashboard (index.vue), Admin Login handleLogin, Admin Orders fetchOrders, Admin Orders submitLink (+9 more)

### Community 5 - "Admin Product CRUD Flow"
Cohesion: 0.25
Nodes (14): admin/add addCollection, admin/add handleSubmit, authMiddleware (JWT), DELETE /api/admin/products/:id handler, POST /api/admin/products handler, PUT /api/admin/products/:id handler, Dual admin edit route design, OWASP-tagged security hardening (+6 more)

### Community 6 - "IP Ban / Rate Limiting"
Cohesion: 0.26
Nodes (9): BANLIST_FILE, fs, isIpBanned(), loadBanlist(), loginAttempts, path, recordFailedAttempt(), resetAttempts() (+1 more)

### Community 7 - "Login & TOTP Setup Flow"
Cohesion: 0.26
Nodes (12): POST /api/admin/login handler, GET /api/admin/setup-totp handler, getAdmins, getAdminSecret, loadSecrets, saveSecrets, isIpBanned, loadBanlist (+4 more)

### Community 8 - "Catalog Search Logic"
Cohesion: 0.2
Nodes (9): ids, list, others, parts, q, script, sizes, string (+1 more)

### Community 9 - "Orders API (Supabase)"
Cohesion: 0.25
Nodes (6): { createClient }, express, id, jwt, q, router

### Community 10 - "Checkout Form Tests"
Cohesion: 0.25
Nodes (7): assert, contactIdx, deliveryIdx, fs, layoutSrc, path, test

### Community 11 - "Frontend Catalog & Composables"
Cohesion: 0.4
Nodes (6): index.vue catalog page, fetchJson, getBase, useAdminApi composable, useApi composable, useCart composable

### Community 12 - "Frontend HTTP Client"
Cohesion: 0.6
Nodes (3): getBase(), useAdminApi(), useApi()

### Community 13 - "Cart State Management"
Cohesion: 0.4
Nodes (3): CartItem, cartItems, cartOpen

### Community 14 - "SSG Products Route"
Cohesion: 0.5
Nodes (3): file, products, query

### Community 15 - "Order Creation Flow"
Cohesion: 0.5
Nodes (4): Supabase customers table, Edge Function send-payment-link, orders Supabase client, createOrder

### Community 16 - "Static Info Pages"
Cohesion: 0.67
Nodes (3): Mellizan.ttf font, Public Offer Page (oferta.vue), Size Chart Page (zamer.vue)

### Community 17 - "Order Email Notifications"
Cohesion: 0.67
Nodes (3): buildEmailHtml (order email template), Supabase Edge Function notify-paid-order, Resend Email API

## Ambiguous Edges - Review These
- `Size Chart Page (zamer.vue)` → `Mellizan.ttf font`  [AMBIGUOUS]
  frontend/public/fonts/README.txt · relation: conceptually_related_to

## Knowledge Gaps
- **141 isolated node(s):** `express`, `router`, `jwt`, `{ createClient }`, `q` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Size Chart Page (zamer.vue)` and `Mellizan.ttf font`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `authMiddleware()` connect `Admin Auth & TOTP` to `Catalog & Product CRUD`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `sanitizeString()` connect `Catalog & Product CRUD` to `Admin Auth & TOTP`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `getAdmins()` connect `Admin Auth & TOTP` to `Server Entry & Data Store`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PUT /api/admin/products/:id handler` (e.g. with `admin/edit/[id] handleSubmit` and `admin/edit handleSubmit`) actually correct?**
  _`PUT /api/admin/products/:id handler` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useApi composable` (e.g. with `Nuxt Server Route collections.get` and `Nuxt Server Route products.get`) actually correct?**
  _`useApi composable` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `sanitizeString` (e.g. with `admin/add addCollection` and `OWASP-tagged security hardening`) actually correct?**
  _`sanitizeString` has 2 INFERRED edges - model-reasoned connections that need verification._