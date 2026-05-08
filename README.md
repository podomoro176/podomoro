# Podomoro — Restaurant Management Platform

Multi-branch restaurant management platform for the Dutch market. Handles POS, online ordering, HR, SOP, distributor orders, waste logging, finance, reviews, and daily briefings via a single Node.js/Express/PostgreSQL backend.

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Podomoro Platform                        │
├─────────────────────┬───────────────────────────────────────────┤
│  Frontend (React)   │  Backend (Node.js / Express / TypeScript)  │
│  Vite + TypeScript  │  REST API + Socket.IO + Cron Jobs          │
│  Port 5173          │  Port 3000                                  │
├─────────────────────┴───────────────────────────────────────────┤
│            PostgreSQL (Prisma ORM) — single database             │
└─────────────────────────────────────────────────────────────────┘
```

**Auth:** JWT access tokens (8 h) + refresh tokens (30 d) with bcrypt-12 password hashing.  
**Roles:** `owner`, `partner`, `boekhouder`, `manager`, `cashier`, `staff`, `customer`  
**Money:** All monetary values stored as integer eurocents.  
**Locale:** All UI labels in Dutch; all code, comments, and variables in English.

---

## 2. Module Overview

| # | Module | Path | Roles |
|---|--------|------|-------|
| 1 | Auth | `/api/v1/auth` | public / all |
| 2 | Branches | `/api/v1/branches` | owner, manager |
| 3 | Menu | `/api/v1/menu` | owner, manager / public read |
| 4 | POS | `/api/v1/pos` | cashier, manager, owner |
| 5 | Online Orders | `/api/v1/online` | public + Stripe webhook |
| 6 | HR | `/api/v1/hr` | manager, owner, staff |
| 7 | SOP | `/api/v1/sop` | all staff roles |
| 8 | Distributor Orders | `/api/v1/distributors` | manager, owner |
| 9 | Stock Levels | `/api/v1/stock/:id` | manager, owner, staff |
| 10 | Waste Log | `/api/v1/waste` | staff, manager, owner |
| 11 | Finance | `/api/v1/finance` | **owner, boekhouder only** |
| 12 | Reviews | `/api/v1/reviews` | owner, partner, manager |
| 13 | Dashboard | `/api/v1/dashboard` | **owner, partner only** |
| — | Daily Briefing | cron `0 7 * * *` | email to owner / partners |

---

## 3. Prerequisites

- **Node.js** ≥ 20 LTS
- **npm** ≥ 10
- **PostgreSQL** ≥ 15 (must have `gen_random_uuid()` — comes from `pgcrypto`)
- **Puppeteer** dependencies (for PDF export): Chromium is downloaded automatically on `npm install`
- **Stripe CLI** (optional, for local webhook testing)

---

## 4. Setup

### Backend

```bash
git clone https://github.com/podomoro176/podomoro
cd podomoro/backend
npm install
cp .env.example .env        # fill in required values — see section below
npx prisma migrate deploy
npm run prisma:seed          # creates 2 branches, 6 users, 5 menu items
npm run dev                  # http://localhost:3000
npm test                     # 71 integration tests
```

### Frontend

```bash
cd podomoro/frontend
npm install
# create frontend/.env:
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `localhost:3000` automatically.

### Test credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Owner | eigenaar@podomoro.nl | Owner@1234 |
| Partner | partner@podomoro.nl | Partner@1234 |
| Manager | manager@podomoro.nl | Manager@1234 |
| Cashier | kassa@podomoro.nl | Cashier@1234 |
| Staff | medewerker1@podomoro.nl | Staff@1234 |
| Boekhouder | boekhouder@podomoro.nl | Boekhouder@1234 |

### Required environment variables (`backend/.env`)

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/podomoro
JWT_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<different random 64-char string>
STRIPE_SECRET_KEY=sk_live_...           # or sk_test_... for development
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://your-frontend.nl
PORT=3000
```

### Optional environment variables

```
OWNER_EMAIL=eigenaar@restaurant.nl      # receives daily briefing + score alerts
PARTNER_BRIEFING_ENABLED=true           # send briefing to all partner users too
SMTP_HOST=smtp.yourprovider.nl
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@restaurant.nl
FILE_UPLOAD_MAX_MB=10                   # max size for SOP document uploads
```

---

## 5. How to Add a New Branch

1. Log in as `owner`.
2. `POST /api/v1/branches` with `{ name, address, city, phone, email }`.
3. Note the returned `id` (UUID) — this is the `branchId` for all subsequent operations.
4. Create users for that branch: `POST /api/v1/auth/register` (or seed directly in the database) with `role` and `branchId` set.
5. Add menu items: `POST /api/v1/menu` with `branchId`.
6. Add restaurant tables: `POST /api/v1/pos/tables` with `branchId`.
7. Add suppliers and stock levels via `/api/v1/distributors`.

---

## 6. SMTP Configuration

The mailer (`backend/src/lib/mailer.ts`) uses **Nodemailer**. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env`.

When `SMTP_HOST` equals `smtp.example.com` (the default placeholder), the mailer silently skips sending — useful for running tests without an SMTP server.

Emails sent by the system:
- **Online order confirmation** — to the customer after successful Stripe payment
- **Reservation confirmation** — to the guest after booking
- **Daily briefing** — to `OWNER_EMAIL` every day at 07:00 Amsterdam time
- **Score alert** — to `OWNER_EMAIL` when a review score < 4.0 is entered

---

## 7. Google Places API (Optional)

The Review Aggregator module (`/api/v1/reviews`) currently supports **manual** score entry only. To enable automatic Google Places score fetching:

1. Obtain a Google Places API key from the Google Cloud Console.
2. Add `GOOGLE_PLACES_API_KEY=<key>` to `.env`.
3. Add a scheduled job that calls `POST /api/v1/reviews` with `source: 'google_api'` and the fetched score.

The `ReviewScore` model already has a `source` field (`manual` | `google_api`) and a `fetchedAt` timestamp for this purpose.

---

## 8. API Endpoint Reference

### Auth — `/api/v1/auth`
| Method | Path | Notes |
|--------|------|-------|
| POST | `/login` | returns `accessToken`, `refreshToken` |
| POST | `/refresh` | exchange refresh token for new access token |
| POST | `/logout` | invalidate refresh token |

### POS — `/api/v1/pos`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/menu` | search menu items |
| GET | `/orders` | list orders (paginated) |
| POST | `/orders` | create order |
| PUT | `/orders/:id` | update order items |
| POST | `/orders/:id/payment` | process cash/pin payment |
| POST | `/orders/:id/discount` | apply discount (manager/owner) |
| GET | `/allergens/:menuItemId` | get allergen info |
| POST | `/allergens/confirm` | log allergen confirmation (NVWA legal requirement) |
| GET | `/tables` | list tables |
| PUT | `/tables/:id` | update table status |

### Online — `/api/v1/online`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/menu` | public menu (paginated) |
| POST | `/checkout` | create Stripe PaymentIntent |
| GET | `/order/:id/status` | order status polling |
| POST | `/reservations` | create reservation |
| POST | `/api/v1/webhooks/stripe` | Stripe webhook (raw body) |

### HR — `/api/v1/hr`
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/employees` | list / create employees |
| GET/PUT | `/employees/:id` | get / update employee |
| GET/POST | `/shifts` | list / create shifts |
| POST | `/attendance/clock-in` | clock in |
| POST | `/attendance/clock-out` | clock out |
| GET/POST | `/leave` | leave requests |
| PUT | `/leave/:id` | approve/reject leave |
| GET/PUT | `/availability` | employee availability |

### Waste — `/api/v1/waste`
| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | log waste entry (staff/manager) |
| PUT | `/:id/cost` | update cost price only (manager) — **no DELETE** |
| GET | `/` | list entries with filters |
| GET | `/totals` | aggregated costs `?period=day\|week\|month` |

### Finance — `/api/v1/finance` _(owner, boekhouder only)_
| Method | Path | Notes |
|--------|------|-------|
| GET | `/dashboard` | KPI summary |
| GET | `/transactions` | paginated with filters |
| GET | `/transactions/export` | `?format=csv\|pdf` |
| GET | `/payroll` | per employee `?period_start=&period_end=` |
| GET | `/payroll/export` | PDF |
| GET | `/waste` | waste costs `?period=day\|week\|month` |
| GET | `/cogs` | cost of goods sold |
| POST | `/periods` | close accounting period (owner only) |

### Reviews — `/api/v1/reviews`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | scores per branch + history |
| POST | `/` | manual score entry; score < 4.0 triggers alert email |

### Dashboard — `/api/v1/dashboard` _(owner, partner only)_
| Method | Path | Notes |
|--------|------|-------|
| GET | `/kpis` | today's revenue, staff on shift, open orders |
| GET | `/revenue` | revenue chart `?days=7` |
| GET | `/alerts` | pending leave, low stock, waste anomalies |
| GET | `/orders/recent` | last 10 orders |

---

## 9. Backup Recommendations

1. **Daily PostgreSQL dump:**
   ```bash
   pg_dump -U postgres podomoro | gzip > /backups/podomoro_$(date +%Y%m%d).sql.gz
   ```
2. Store backups off-site (S3, Backblaze B2, or similar).
3. Retain at least 30 daily + 12 monthly backups.
4. Test restores monthly: `psql -U postgres podomoro_test < dump.sql`
5. **SOP uploads** (stored at `FILE_UPLOAD_DIR`): sync this directory to your backup destination alongside database dumps.

---

## 10. Troubleshooting

### Puppeteer / Chromium not found

Puppeteer downloads Chromium on `npm install`. If it fails (e.g., in Docker):

```bash
npx puppeteer browsers install chrome
```

Or install system Chromium and set:
```
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

In Docker, add `--no-sandbox` (already configured in the PDF export controllers):
```ts
puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
```

### Stripe webhook signature verification fails

1. Ensure the Stripe webhook route is mounted **before** `express.json()` in `app.ts` (already done).
2. Copy the webhook signing secret from the Stripe Dashboard → Webhooks → your endpoint → "Signing secret".
3. For local testing, use the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
   ```
   The CLI prints a `whsec_...` secret — use that as `STRIPE_WEBHOOK_SECRET` in `.env`.

### Jest tests fail with "Cannot connect to database"

Ensure PostgreSQL is running and `backend/.env` contains the correct `DATABASE_URL`. The test suite uses the same database as development — there is no separate test database by default.

### Account locked after too many failed logins

Accounts lock for 15 minutes after 5 failed login attempts. To unlock manually:
```sql
UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = 'user@example.nl';
```
