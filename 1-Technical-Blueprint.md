# Agrovite — Technical Blueprint

**Version:** 1.0
**Last updated:** See Change Log document

---

## 1. What Agrovite Is

Agrovite is a direct farm-to-market web application connecting farmers, buyers, and transporters. It removes intermediary markups by letting farmers list produce directly, buyers browse and message sellers, and both sides track orders and payments through the platform.

---

## 2. Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────┐
│   React Frontend     │  HTTP   │  Express API Server   │  SQL    │   MySQL     │
│   (localhost:3000)   │ ──────► │   (localhost:4000)    │ ──────► │  Database   │
└─────────────────────┘         └──────────────────────┘         └─────────────┘
                                          │
                                          │ SMTP (or console
                                          │ fallback if unset)
                                          ▼
                                   ┌─────────────┐
                                   │ Email (OTP, │
                                   │ new-listing │
                                   │ alerts)     │
                                   └─────────────┘
```

Two independent processes must run simultaneously in development:
- `npm start` inside the React project folder → serves the frontend on port 3000
- `node server.js` inside the server project folder → serves the API on port 4000

The frontend calls the API via a hardcoded `API_BASE = "http://localhost:4000/api"` constant. **This must be changed to a real deployed URL before the frontend is deployed publicly** — a deployed frontend cannot reach `localhost` on visitors' machines.

---

## 3. Frontend

| File | Purpose |
|---|---|
| `index.js` | Entry point. Renders `<Root />` into the DOM. |
| `Root.js` | Path-based switch: renders `AdminDashboard` if the URL starts with `/admin`, otherwise renders `App`. Listens for browser back/forward navigation. |
| `App.js` | The public-facing app. Contains three internal screens, switched via component state (not a routing library): `LandingScreen`, `AuthScreen`, `DashboardScreen`. |
| `App.css` | All styling for the three screens above (extracted from inline `<style>` tags). |
| `AdminDashboard.js` | Password-gated internal tool. One tab per database table, each with list + add/edit/delete forms. |

### 3.1 App.js — Screen Flow

```
LandingScreen  →  AuthScreen  →  DashboardScreen
 (marketing)      (login/         (role-based:
                   signup/OTP)     farmer or buyer view)
```

- **LandingScreen**: static marketing content, live phone-mockup preview of real produce listings (fetched from the API), live scrolling price ticker, waitlist signup form.
- **AuthScreen**: tabbed login/signup form → email OTP verification step → confirmation screen → hands off to Dashboard. See §5 for the full auth sequence.
- **DashboardScreen**: sidebar navigation with dedicated pages (Overview, Produce, Orders, Messages, Price Alerts, Settings). Content is role-conditional (`farmer` vs `buyer`) based on the logged-in user's `role`.

### 3.2 Session handling

The logged-in user object is stored in `sessionStorage` under the key `agrovite_user` so a page refresh doesn't log the user out. **This is client-side state only — there is no server-verified session token for regular users** (see §8, Known Limitations).

---

## 4. Backend (`server.js`)

Stack: Node.js, Express, `mysql2` (promise pool), `bcryptjs`, `nodemailer`, `dotenv`, `cors`.

### 4.1 Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `ADMIN_PASSWORD` | Password checked by admin login |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email sending (OTP + notifications). If left blank, emails are printed to the server console instead — usable for local testing without a real mail provider. |
| `PORT` | API server port (default 4000) |

### 4.2 API Endpoints

**Authentication**
| Method & Path | Auth required | Description |
|---|---|---|
| `POST /api/register` | none | Creates account (bcrypt-hashed password), sends OTP |
| `POST /api/login` | none | Verifies password, sends OTP (does not return a session) |
| `POST /api/verify-otp` | none | Completes login/registration; returns the user object |
| `POST /api/resend-otp` | none | Resends OTP, rate-limited to 1 per 60 seconds per email |
| `POST /api/admin/login` | `ADMIN_PASSWORD` | Returns a random admin token |

**Public reads** (no auth) — `GET /api/<table>` and `GET /api/<table>/:id` for: `produce_listings`, `conversations`, `messages`, `orders`, `payments`, `price_history`, `price_alerts`, `waitlist_signups`.

**Admin-only** (`x-admin-token` header or `Authorization: Bearer <token>`)
- `GET /api/users`, `GET /api/users/:id` — full user records (no public equivalent)
- `POST` / `PUT` / `DELETE /api/<table>` — for all 9 tables, including `users`

**Other**
- `GET /api/public-profile/:id` — public, minimal (name/role/location only, no email/password), used by the dashboard to display counterpart names in listings/orders/chats
- `GET /api/health` — liveness check

### 4.3 Side effects on write

- Creating a `produce_listings` row triggers an email to every user with `role = 'buyer'` (fire-and-forget; a failed send never blocks or fails the listing creation itself).

---

## 5. Authentication & Security

| Feature | How it works |
|---|---|
| Password storage | Hashed with `bcryptjs` (10 salt rounds). Plaintext passwords are never stored or logged. |
| Password strength | Enforced at registration: minimum 8 characters, at least one letter and one number. |
| Email OTP verification | After a correct password (login) or successful account creation (signup), a 6-digit code is emailed. The user must enter it correctly to receive their session. Code expires after 5 minutes, allows 3 wrong attempts before requiring a resend, and resends are capped at 1 per 60 seconds. |
| Login lockout | 5 wrong passwords for the same email locks that email out for 15 minutes. |
| Admin auth | Single shared password (`ADMIN_PASSWORD`) issues a random 64-character token, required on all admin write routes. |
| SQL injection protection | All queries use parameterized statements; dynamic table/column names come only from a hardcoded server-side config, never from user input. |

**In-memory stores**: admin tokens, login-attempt counters, and pending OTP codes are all held in server memory (`Map`/`Set`), not the database. This means they reset on every server restart, and would not work correctly if the API were ever run as multiple server instances behind a load balancer. Fine for current scale; would need to move to the database or a store like Redis before scaling horizontally.

---

## 6. Database Schema

9 tables (see `schema.sql` for full DDL and sample data):

| Table | Key columns |
|---|---|
| `users` | id, full_name, email, password_hash, role (`farmer`/`buyer`/`transporter`), location, created_at |
| `produce_listings` | id, seller_id → users, crop_name, grade, quantity, unit, price, currency, location, photo_url, status (`available`/`reserved`/`sold`) |
| `conversations` | id, listing_id, buyer_id, seller_id |
| `messages` | id, conversation_id, sender_id, body, sent_at |
| `orders` | id, listing_id, buyer_id, seller_id, quantity, agreed_price (per unit), delivery_date, status (`pending`/`confirmed`/`delivered`/`cancelled`) |
| `payments` | id, order_id, amount (total), currency, escrow_status (`held`/`released`/`refunded`), held_at, released_at |
| `price_history` | id, crop_name, location, price, unit, direction (`up`/`down`), recorded_at |
| `price_alerts` | id, user_id, crop_name, location, target_price, direction (`above`/`below`) |
| `waitlist_signups` | id, email, signed_up_at |

---

## 7. Admin Dashboard

Accessed at `/admin`. Password-only login (checked against `ADMIN_PASSWORD`), then one tab per table with a list view and add/edit/delete forms. All writes go through the same admin-protected routes as above.

---

## 8. Known Limitations (as of this version)

These are real, current gaps — not hidden — so they can be prioritized deliberately:

- **No session tokens for regular users.** Only the admin gets a verifiable token. A logged-in buyer/farmer's session is just an object sitting in `sessionStorage`, unverified by the server on later requests. This is fine for a demo but is **not secure enough for handling real user data or money in production.**
- **Farmers cannot create their own listings yet.** The "+ Add produce" button in the dashboard isn't wired to anything. Listings can currently only be created via the admin dashboard. Fixing this properly requires building real user sessions first (see above).
- **No password reset flow.** OTP exists for login/signup verification, but there's no "forgot password" path yet.
- **No real payment processing.** The `payments` table tracks escrow status manually; there is no integration with an actual payment gateway (Paystack, Flutterwave, etc.).
- **Messaging is read-only from the UI.** Conversations and messages can be viewed, but there's no "send a new message" form yet.
- **Price alerts are view-only from the UI.** Buyers can see alerts (seeded via admin), but can't create their own yet.
- **Distance/"Xkm" figures shown in early mockups were removed** since there's no real geolocation data backing them.

---

## 9. Deployment Notes

- The database and API server must be deployed separately from the React frontend, and `API_BASE` in `App.js`/`AdminDashboard.js` updated to point to the deployed API's real URL.
- `ADMIN_PASSWORD` should be changed from any placeholder before going live.
- Real SMTP credentials are required for OTP/notification emails to actually reach users in production (the console-log fallback is for local development only).
