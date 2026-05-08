# PODOMORO — Full-Stack Restaurant Management Platform
## Claude Code Project Prompt (CLAUDE.md-ready)

---

## PROJECT OVERVIEW

Build **Podomoro** — a full-stack, multi-branch restaurant management platform for a Dutch restaurant group. The system consists of **11 integrated modules** sharing one PostgreSQL database and one authentication layer. Every module that writes financial data talks to the Finance system. The owner gets a unified Dashboard to monitor all branches in real time.

---

## TECH STACK (use exactly this — no substitutions)

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Frontend | React + TypeScript + Vite |
| Auth | JWT with role-based access control (RBAC) |
| Real-time | Socket.IO (POS ↔ Online Order sync) |
| Email | Nodemailer + node-cron |
| File storage | Local filesystem (PDFs/videos for SOP) |
| Payments | Stripe (online orders only) |
| PDF export | Puppeteer (chosen over html-to-pdf — requires Chromium) |
| Validation | Zod on every POST/PUT endpoint |
| Testing | Jest + Supertest |

---

## FOLDER STRUCTURE

```
podomoro/
├── CLAUDE.md                    # This file, checked into git
├── .env.example
├── .gitignore                   # Must include .env from commit 1
├── backend/
│   ├── src/
│   │   ├── modules/             # One subfolder per module
│   │   ├── middleware/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── jobs/                # Cron jobs
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── modules/
│   │   └── components/
│   └── package.json
└── README.md
```

---

## ROLES & ACCESS CONTROL

Define these roles in the database. Enforce on **EVERY route** with middleware. No exceptions.

| Role | Access |
|---|---|
| `owner` | Everything: all branches, Finance, Dashboard |
| `partner` | Dashboard only (read-only, all branches) |
| `boekhouder` | Finance system only |
| `manager` | All modules EXCEPT Finance and Dashboard |
| `cashier` | POS/Kassa only |
| `staff` | HR (own schedule), SOP, Distributor orders |
| `customer` | Online ordering portal only |

### RBAC Rules
- Every API route MUST check `req.user.role` via `requireRole(...)` middleware
- Tokens expire in 8 hours; refresh token valid 30 days
- Failed login: lock account after 5 attempts for 15 minutes
- All auth events logged to `audit_log` table
- Finance routes MUST return `403` for any role other than `owner` and `boekhouder` — **no exceptions**
- Dashboard routes MUST return `403` for any role other than `owner` and `partner` — **no exceptions**

---

## CRITICAL CONSTRAINTS (read before writing any code)

1. **Allergen popup is legally required** (NVWA, Warenwetbesluit allergenen). It MUST NOT be skippable. The cashier must actively click "Bevestig — klant is geïnformeerd" before the order proceeds. Do not allow dismissing by clicking outside.
2. **All monetary values stored as integers (eurocents)** to avoid floating point errors. Display as `€ X,XX` (Dutch format).
3. **Waste log and allergen log are append-only**. Never add DELETE or UPDATE routes on these tables.
4. **All passwords hashed with bcrypt**, cost factor 12.
5. **No secrets in git**. `.env` must be in `.gitignore` from commit 1.
6. **All dates stored as UTC** in the database; convert to `Europe/Amsterdam` for display.
7. **CORS**: allow `FRONTEND_URL` from `.env`. Configure this from the start.
8. **Rate limiting**: apply `express-rate-limit` to `/auth/login` (max 10 requests per 15 minutes per IP) in addition to the account lockout.

---

## API DESIGN RULES

- All routes: `/api/v1/[module]/[resource]`
- All responses: `{ success: true, data: {...} }` or `{ success: false, error: "message" }`
- Pagination on all list endpoints: `?page=1&limit=20`
- Input validation: Zod on every POST/PUT
- Global Express error handler; log to console + `error_log` table

---

## ENVIRONMENT VARIABLES

Create `.env.example` with exactly these keys:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/podomoro
JWT_SECRET=change_this_in_production
JWT_REFRESH_SECRET=change_this_too
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@podomoro.nl
SMTP_PASS=...
OWNER_EMAIL=eigenaar@podomoro.nl
PARTNER_BRIEFING_ENABLED=false
FRONTEND_URL=http://localhost:5173
PORT=3000
TZ=Europe/Amsterdam
FILE_UPLOAD_MAX_MB=50
```

---

## BUILD ORDER (follow this sequence strictly — each step depends on the previous)

### PHASE 1 — Foundation

**Step 1 — Database schema + Prisma + seed data**

Create the full Prisma schema with ALL tables listed below. Run `prisma migrate dev`. Create a seed file that inserts:
- 2 sample branches
- 1 owner account, 1 manager account, 1 cashier account, 2 staff accounts, 1 boekhouder account
- 5 menu items with allergens (covering at least gluten, pinda, melk)
- 3 recipes with ingredients
- 2 suppliers with products
- Sample stock levels and par levels

All tables must have: `id` (UUID, default `gen_random_uuid()`), `created_at`, `updated_at`. All branch-specific tables must have `branch_id` (FK to `branches`).

**branches**: `id, name, address, city, phone, email, is_active, created_at, updated_at`

**Verification**: Run `prisma migrate status` — must show all migrations applied. Run seed — must complete without errors.

---

**Step 2 — Module 0: Branch Management**

CRUD API for branches. Required before all other modules.

Endpoints:
- `GET /api/v1/branches` — list all (owner only)
- `POST /api/v1/branches` — create (owner only)
- `GET /api/v1/branches/:id` — get one
- `PUT /api/v1/branches/:id` — update (owner only)
- `DELETE /api/v1/branches/:id` — soft delete via `is_active = false` (owner only)

**Verification**: Write an integration test that creates a branch, fetches it, and updates it.

---

**Step 3 — Module 1: Authentication**

Tables: `users`, `sessions`, `audit_log`

`users`: `id, email, password_hash, role (enum), branch_id (nullable — null = all branches), is_active, failed_attempts, locked_until, created_at, updated_at`

Endpoints:
- `POST /api/v1/auth/login` — returns JWT + refresh token. Hash password with bcrypt cost 12. Log to `audit_log`.
- `POST /api/v1/auth/refresh` — exchange refresh token for new JWT
- `POST /api/v1/auth/logout` — invalidate session
- `GET /api/v1/auth/me` — return current user (requires `authenticate` middleware)

Middleware to build:
- `authenticate` — validates JWT, attaches `req.user`
- `requireRole(...roles)` — checks `req.user.role`, returns 403 if not allowed
- `requireBranch` — ensures user only sees their own `branch_id` data (skip for owner, partner, boekhouder)

Security:
- Apply `express-rate-limit` to `/auth/login`
- Lock account after 5 failed attempts for 15 minutes (set `locked_until`)
- Log every auth event (login, logout, failed attempt, token refresh) to `audit_log` with: `user_id, event_type, ip_address, user_agent, created_at`

**Verification**: Integration tests for login, failed login lockout, token refresh, and role-based 403s on a protected route.

---

**Step 4 — Menu Items + Allergens**

Table: `menu_items`

`menu_items`: `id, branch_id, name, description, price (integer, eurocents), category, image_url, allergens (text array), is_available, created_at, updated_at`

Allergens enum values (use exact Dutch/EU names):
`gluten, schaaldieren, eieren, vis, pinda, soja, melk, noten, selderij, mosterd, sesam, sulfieten, lupine, weekdieren`

Endpoints:
- `GET /api/v1/menu` — public (no auth required), returns available items with allergen icons data
- `GET /api/v1/menu/:id` — public
- `POST /api/v1/menu` — manager/owner only
- `PUT /api/v1/menu/:id` — manager/owner only
- `DELETE /api/v1/menu/:id` — soft delete via `is_available = false`, manager/owner only

**Verification**: Seed 5 items. Fetch `/api/v1/menu` unauthenticated — must return items with allergens array.

---

### PHASE 2 — Core Modules

**Step 5 — Module 2: Kassa (POS) System**

Who can access: `cashier`, `manager`

Tables: `orders, order_items, transactions, allergen_log, tables`

`orders`: `id, branch_id, order_number (auto-increment per branch), source (enum: pos/online), table_number, is_takeaway, status (enum: pending/accepted/preparing/ready/completed/cancelled), payment_method (enum: cash/pin/credit_card/online), payment_status (enum: unpaid/paid), total_amount (integer eurocents), discount_amount (integer eurocents), discount_type (enum: percentage/fixed/null), discount_applied_by (FK users), notes, cashier_id (FK users), created_at, updated_at`

`order_items`: `id, order_id, menu_item_id, quantity, unit_price (eurocents), notes, created_at`

`transactions`: `id, order_id, branch_id, amount (eurocents), payment_method, cashier_id, stripe_payment_intent_id (nullable), created_at`

`allergen_log`: `id, order_id, item_id, allergens_shown (text array), confirmed_by (FK users), confirmed_at` — **append-only, no DELETE/UPDATE**

`tables`: `id, branch_id, table_number, capacity, status (enum: free/occupied/reserved), current_order_id (nullable FK)`

Endpoints:
- `GET /api/v1/pos/menu` — search menu items by name or category
- `POST /api/v1/pos/orders` — create new order
- `PUT /api/v1/pos/orders/:id` — update order (add items, change status)
- `POST /api/v1/pos/orders/:id/payment` — process payment
- `POST /api/v1/pos/orders/:id/discount` — apply discount (requires manager PIN verification)
- `GET /api/v1/pos/allergens/:menuItemId` — return allergens for item (called on every add-to-cart)
- `POST /api/v1/pos/allergens/confirm` — log allergen confirmation to `allergen_log`
- `GET /api/v1/pos/tables` — get table map
- `PUT /api/v1/pos/tables/:id` — update table status

**Allergen popup behaviour (LEGAL REQUIREMENT):**
- On every add-to-cart action: call allergen endpoint
- If `allergens.length > 0`: show modal immediately
- Modal: red header, list allergens with icons, checkbox "Ik heb de klant geïnformeerd over de allergenen"
- Only close button: "Bevestig — klant is geïnformeerd" (only enabled when checkbox is checked)
- `pointer-events: none` on backdrop — clicking outside does nothing
- On confirm: POST to `/api/v1/pos/allergens/confirm`, then allow item to be added
- If API call fails: block the action and show error — never silently skip

**Payment:**
- Cash: show change calculator (`change = cash_given - total`)
- On payment: generate print-ready HTML receipt, record in `transactions`, call Finance internal function

**IMPORTANT**: On every completed transaction, call the internal Finance recording function (not an HTTP call — direct service layer call within the same process).

**Verification**: Unit test allergen detection logic. Integration test: create order → add item with allergens → confirm allergen → process payment → verify `allergen_log` entry exists and `transactions` entry exists.

---

**Step 6 — Module 3: Online Ordering (Customer-facing)**

Who can access: `customer` (public browse, login required for checkout)

No new tables — uses `orders`, `order_items`, `transactions` from Module 2, plus:

`customers`: `id, email, name, phone, birthday (nullable), visit_count (default 0), last_visit, total_spent (integer eurocents, default 0), created_at, updated_at`

Pages/Endpoints:
- `GET /api/v1/online/menu` — public, returns menu with allergen icons
- `POST /api/v1/online/cart` — session-based cart (stateless via JWT or localStorage on frontend)
- `POST /api/v1/online/checkout` — create Stripe PaymentIntent, return `client_secret`
- `POST /api/v1/webhooks/stripe` — **Stripe webhook endpoint with `stripe.webhooks.constructEvent()` signature verification**. On `payment_intent.succeeded`: create order record with `source: 'online', payment_status: 'paid'`, emit Socket.IO event to POS, send confirmation email, upsert customer record.
- `GET /api/v1/online/orders/:id/status` — real-time order status (Socket.IO room per order)
- `POST /api/v1/online/reservations` — table reservation form (name, date, time, party_size, notes) — sends confirmation email

Allergen display: show allergen icons on every menu item. Add filter: "Toon alleen gerechten zonder [allergen]".

Loyalty foundation (no full program yet):
- On each completed online order: increment `visit_count`, update `last_visit`, add to `total_spent`

**Verification**: Integration test for Stripe webhook — mock `stripe.webhooks.constructEvent()`, verify order is created and Socket.IO event is emitted.

---

**Step 7 — Socket.IO Bridge (POS ↔ Online)**

- When online order is created (after Stripe webhook): emit `order:new` to room `branch:{branch_id}:pos`
- POS frontend listens to `branch:{branch_id}:pos` and shows incoming order in panel "Binnenkomende bestellingen"
- Cashier accepts (`order:accepted`) or rejects with reason (`order:rejected`)
- On status change: emit `order:status:{orderId}` — customer frontend listens to track their order
- Status flow: `pending → accepted → preparing → ready → completed`

**Verification**: Integration test that simulates online order creation → Socket.IO event emission → POS acknowledgement.

---

**Step 8 — Module 4: HR & Rooster**

Who can access: `manager`, `staff` (own data only), `owner`

Tables: `employees, shifts, attendance, leave_requests, availability`

`employees`: `id, branch_id, user_id (FK users), name, role, contract_type (enum: fulltime/parttime/oproep), hourly_rate (integer eurocents), start_date, emergency_contact_name, emergency_contact_phone, created_at, updated_at`

`shifts`: `id, branch_id, employee_id, date, start_time, end_time, role_on_shift, created_at, updated_at`

`attendance`: `id, branch_id, employee_id, shift_id (nullable), clock_in, clock_out, scheduled_hours (decimal), actual_hours (decimal), created_at`

`leave_requests`: `id, employee_id, type (enum: vakantie/ziek/bijzonder_verlof), start_date, end_date, reason, status (enum: pending/approved/rejected), reviewed_by (nullable FK users), reviewed_at, created_at, updated_at`

`availability`: `id, employee_id, date, is_unavailable, reason, created_at`

Endpoints:
- Full CRUD for employees (manager/owner)
- `GET /api/v1/hr/schedule?week=YYYY-Www` — weekly schedule grid
- `POST /api/v1/hr/shifts` — create shift (manager)
- `GET /api/v1/hr/shifts/my` — own shifts (staff)
- `POST /api/v1/hr/availability` — submit unavailability (staff)
- `GET /api/v1/hr/availability` — view availability requests (manager)
- `PUT /api/v1/hr/availability/:id` — approve/reject (manager)
- `POST /api/v1/hr/attendance/clock-in` — clock in (staff)
- `POST /api/v1/hr/attendance/clock-out` — clock out (staff)
- `GET /api/v1/hr/attendance/variance?week=YYYY-Www` — actual vs scheduled hours (manager)
- `POST /api/v1/hr/leave` — submit leave request (staff)
- `PUT /api/v1/hr/leave/:id` — approve/reject leave (manager), send email notification
- `GET /api/v1/hr/schedule/export?week=YYYY-Www` — PDF export via Puppeteer

**Verification**: Unit test hours variance calculation. Integration test for leave request → approval → email.

---

**Step 9 — Module 5: SOP**

Who can access: `staff`, `manager`, `owner` (read); `manager` (write)

Tables: `sop_documents, sop_videos, document_completions, video_completions, recipes, recipe_ingredients`

`sop_documents`: `id, branch_id, title, category (enum: food_safety/hygiene/opening_procedure/closing_procedure/customer_service/emergency), file_path, file_type, uploaded_by, created_at, updated_at`

`document_completions`: `id, document_id, employee_id, completed_at` — append-only

`sop_videos`: `id, branch_id, title, category, video_url, is_youtube_embed, uploaded_by, created_at`

`video_completions`: `id, video_id, employee_id, completed_at` — append-only

`recipes`: `id, branch_id, name, base_portions (integer), created_by, created_at, updated_at`

`recipe_ingredients`: `id, recipe_id, ingredient_name, amount (decimal), unit, created_at`

Endpoints:
- CRUD for documents and videos (manager/owner for write)
- `POST /api/v1/sop/documents/:id/complete` — mark document as read (staff)
- `POST /api/v1/sop/videos/:id/complete` — mark video as watched (staff)
- Full CRUD for recipes (manager)
- `GET /api/v1/sop/recipes/:id/scale?portions=35` — **Recipe Scaler**:
  - Formula: `new_amount = (base_amount / base_portions) * target_portions`
  - Round to 1 decimal
  - Return full ingredient list with scaled amounts and units

File uploads: store on local filesystem at `./uploads/sop/`. Validate MIME type (PDF, DOCX only). Enforce `FILE_UPLOAD_MAX_MB` from `.env`.

**Verification**: Unit test recipe scaler formula with multiple portion targets. Verify rounding to 1 decimal.

---

**Step 10 — Module 6: Distributor Orders**

Who can access: `staff`, `manager`

Tables: `suppliers, supplier_products, distributor_orders, distributor_order_items, stock_levels`

`suppliers`: `id, branch_id, name, contact_person, email, phone, order_days (text array, e.g. ["monday","thursday"]), lead_time_days, created_at, updated_at`

`supplier_products`: `id, supplier_id, name, unit (enum: kg/liter/stuk), price_per_unit (integer eurocents), min_order_quantity (decimal), created_at`

`stock_levels`: `id, branch_id, supplier_product_id, current_stock (decimal), par_level (decimal), updated_at`

`distributor_orders`: `id, branch_id, supplier_id, status (enum: draft/submitted/received), submitted_at, received_at, created_by, created_at, updated_at`

`distributor_order_items`: `id, distributor_order_id, supplier_product_id, suggested_quantity (decimal), ordered_quantity (decimal), received_quantity (nullable decimal), discrepancy_flagged (boolean default false), created_at`

Endpoints:
- CRUD for suppliers and products (manager)
- `GET /api/v1/distributors/orders/checklist/:supplierId` — returns products with current stock, par level, suggested order quantity (`max(par - current, 0)`)
- `POST /api/v1/distributors/orders` — create order (all products must be reviewed — validate completeness before submit)
- `PUT /api/v1/distributors/orders/:id/submit` — submit order, send email to supplier via Nodemailer
- `PUT /api/v1/distributors/orders/:id/receive` — mark received with actual quantities, auto-flag discrepancies
- `GET /api/v1/distributors/orders` — order history per supplier
- `PUT /api/v1/stock/:id` — update current stock level (manager/staff)

**Cron job (daily at 06:00 Amsterdam)**: check all stock levels below par — collect results for use in Daily Briefing email (Module 9).

**Verification**: Integration test for order creation with incomplete checklist — must be rejected. Test discrepancy auto-flagging.

---

### PHASE 3 — Finance & Reporting

**Step 11 — Module 8: Waste Log**

Who can access: `staff`, `manager`

Table: `waste_log`

`waste_log`: `id, branch_id, date, item_name, quantity (decimal), unit, reason (enum: expired/dropped/overproduced/quality_fail/other), cost_price (nullable integer eurocents), logged_by (FK users), created_at` — **append-only, no DELETE/UPDATE**

Endpoints:
- `POST /api/v1/waste` — log waste entry (staff)
- `PUT /api/v1/waste/:id/cost` — manager adds/updates cost price (this is the only allowed update — to cost_price only; implement as a separate endpoint, not a general UPDATE)
- `GET /api/v1/waste?date=YYYY-MM-DD&branch_id=...` — list with filters (manager)
- `GET /api/v1/waste/totals?period=day|week|month` — aggregated waste costs

**Verification**: Attempt DELETE on waste_log — must return 405. Verify cost price update works but item deletion does not.

---

**Step 12 — Module 7: Finance System**

Who can access: `owner`, `boekhouder` ONLY — 403 for all other roles

Finance reads from other modules' tables. No new write tables except:

`finance_periods`: `id, branch_id, period_start, period_end, is_closed, closed_by, closed_at, created_at`

A "closed period" means the data for that date range is locked for accounting purposes. Implement as a status flag — no data deletion.

Endpoints:
- `GET /api/v1/finance/dashboard` — KPI summary:
  - Daily revenue today vs same day last week (% change)
  - Weekly/monthly revenue per branch
  - Gross profit margin: `(revenue - food_cost - waste_cost) / revenue * 100`
  - Food cost %: `(distributor_costs + waste_costs) / revenue * 100` (target 28–32%)
  - Labour cost %: `payroll_costs / revenue * 100` (target 30–35%)
- `GET /api/v1/finance/transactions` — all transactions, filters: date range, branch, payment method, cashier; paginated
- `GET /api/v1/finance/transactions/export?format=csv|pdf` — CSV or PDF export
- `GET /api/v1/finance/payroll?period_start=&period_end=` — per employee: hours worked × hourly rate = gross pay
- `GET /api/v1/finance/payroll/export` — PDF via Puppeteer
- `GET /api/v1/finance/waste?period=day|week|month` — waste costs + waste as % of revenue (alert if > 5%)
- `GET /api/v1/finance/cogs?period_start=&period_end=` — sum of received distributor orders
- `POST /api/v1/finance/periods` — close a period (owner only)

Labour cost calculation: sum `attendance.actual_hours × employees.hourly_rate` for the period.

**Verification**: Unit test food cost % calculation. Unit test labour cost % calculation. Verify 403 is returned for `manager` role on any finance endpoint.

---

**Step 13 — Module 9: Daily Briefing Email**

Who receives: `owner` (and optionally `partner` if `PARTNER_BRIEFING_ENABLED=true` in `.env`)

Schedule: `cron.schedule('0 7 * * *', sendDailyBriefing, { timezone: 'Europe/Amsterdam' })`

Email content (generate dynamically each morning):
1. **Goedemorgen [naam]** — date in Dutch format (e.g., "donderdag 8 mei 2025")
2. **Gisteren's omzet** — revenue per branch yesterday vs same day last week (% change)
3. **Vandaag rooster** — staff scheduled today per branch (from `shifts` table)
4. **Lage voorraad** — items below par level (from `stock_levels`, collected by Step 10 cron)
5. **Pending approvals** — leave requests with `status: pending`, online orders rejected yesterday
6. **Waste gisteren** — total waste cost yesterday as € and % of revenue
7. **Open reservaties vandaag** — table reservations for today

Template: mobile-friendly HTML email using Podomoro brand colors. Use Nodemailer with SMTP config from `.env`.

**Verification**: Write a unit test that calls the briefing generator function with mock data and validates the HTML output contains all 7 sections.

---

**Step 14 — Module 10: Review Aggregator**

Who can access: `owner`, `partner`

Table: `review_scores`

`review_scores`: `id, branch_id, score (decimal 1.0–5.0), review_count, source (enum: manual/google_api), fetched_at, created_at`

Endpoints:
- `GET /api/v1/reviews` — current score per branch + last 30 entries for chart
- `POST /api/v1/reviews` — manual score entry (owner/manager)
- Score alert: if score drops below 4.0 → send email to owner immediately

Color coding (used in Dashboard widget and this endpoint response):
- ≥ 4.5 → `green`
- 4.0–4.4 → `amber`
- < 4.0 → `red` (+ email alert)

Default to manual entry. README must include instructions for connecting Google Places API as an optional upgrade.

**Verification**: Test that saving a score below 4.0 triggers the alert email function.

---

**Step 15 — Module 11: Owner Dashboard**

Who can access: `owner`, `partner` — 403 for all other roles

Single-page overview. All data comes from existing endpoints.

Layout:
- Branch selector: "Alle vestigingen" or specific branch
- Top KPI cards: today's revenue, yesterday's revenue, current staff on shift, open orders
- Revenue chart: line chart last 7 days, all branches overlaid
- Review scores per branch (color coded from Module 10)
- Quick links: pending leave requests, low stock alerts, unread waste anomalies (waste cost > 5% of revenue)
- Live order feed: last 10 orders across all branches (real-time Socket.IO room `owner:live-feed`)

Endpoints:
- `GET /api/v1/dashboard/kpis` — KPI cards data
- `GET /api/v1/dashboard/revenue?days=7` — revenue chart data
- `GET /api/v1/dashboard/alerts` — pending items count (leave requests, low stock, waste anomalies)
- `GET /api/v1/dashboard/orders/recent` — last 10 orders

**Verification**: Verify 403 for `manager` role on all dashboard endpoints.

---

### PHASE 4 — Testing & Documentation

**Step 16 — Tests**

Write minimum required tests (use Jest + Supertest):

Unit tests:
- Allergen detection logic (given a menu item with allergens, correctly identifies and returns them)
- Recipe scaler formula (test multiple base/target combinations, verify 1-decimal rounding)
- Finance food cost % calculation (given revenue, distributor costs, waste costs — verify formula)
- Finance labour cost % calculation (given hours and rates — verify formula)

Integration tests:
- POS → Finance flow: create order → process payment → verify transaction recorded and finance KPIs updated
- Online Order → POS Socket.IO: simulate Stripe webhook → verify Socket.IO event emitted to correct room
- Auth lockout: 5 failed logins → verify account locked → verify login rejected even with correct password
- RBAC: verify `manager` gets 403 on `/api/v1/finance/*` and `/api/v1/dashboard/*`

Add `"test": "jest --runInBand"` to `package.json`.

---

**Step 17 — README**

The README must include:
1. System overview (one paragraph)
2. Module overview table (name, who can access, key features)
3. Prerequisites (Node.js ≥ 18, PostgreSQL ≥ 14, Chromium for Puppeteer)
4. Setup instructions: clone → `npm install` → copy `.env.example` → fill `.env` → `prisma migrate dev` → `prisma db seed` → `npm run dev`
5. How to add a new branch (via API or seed)
6. How to configure SMTP for daily briefing
7. How to connect Google Places API (optional)
8. API endpoint reference (high-level, grouped by module)
9. Backup recommendations (pg_dump schedule)
10. Troubleshooting common issues (Puppeteer Chromium path, Stripe webhook local testing with Stripe CLI)

---

## DATABASE SCHEMA SUMMARY

All tables (see full definitions per module above):

```
branches, users, sessions, audit_log,
menu_items, tables,
orders, order_items, transactions, allergen_log,
customers,
employees, shifts, attendance, leave_requests, availability,
sop_documents, sop_videos, document_completions, video_completions,
recipes, recipe_ingredients,
suppliers, supplier_products, distributor_orders, distributor_order_items, stock_levels,
waste_log,
finance_periods,
review_scores,
error_log
```

Commit every Prisma migration. Never squash migrations.

---

## FRONTEND DESIGN SYSTEM

Color palette:
- Primary: `#C8371A` (Podomoro red)
- Secondary: `#1A1A1A` (almost black)
- Accent: `#F5A623` (warm amber)
- Background: `#F9F7F4` (warm off-white)
- Success: `#2D7A4F`, Warning: `#D97706`, Danger: `#DC2626`

Font: Inter from Google Fonts

Responsive: works on tablet (1024px) and desktop (1280px+)

POS screen: optimized for touch (large buttons, minimum 44px tap targets)

All UI labels in **Dutch**. All code, comments, and variable names in **English**.

---

## CLAUDE CODE WORKFLOW NOTES

- Use **plan mode** before starting each Phase. Review the plan before switching to implementation mode.
- After completing each Step, run the specified **Verification** before moving to the next step.
- Run `npm run lint` and `npm run typecheck` after each module is complete.
- Use `/clear` between phases to avoid context pollution.
- Never commit `.env`. Verify `.gitignore` includes it before first commit.
- All Prisma migrations must be committed. Run `prisma migrate status` after each migration.
- Use subagents for codebase exploration tasks (e.g., "use a subagent to check if allergen logging is consistent across all order flows").
