# Agrovite — Change Log

All notable changes to the project, in chronological order.

---

## v1.0 — 2026-08-27
### Changed
- Extracted all CSS out of `App.js` into a standalone `App.css` file. `App.js` is now pure JavaScript/JSX with a single `import './App.css'`.
- **Known trade-off introduced:** the three screens' stylesheets (Landing, Auth, Dashboard) were originally designed to only ever be mounted one at a time, so identical class names across them (`.logo-mark`, `h1`, `--radius`, etc.) never collided. Combining them into one permanently-loaded file means standard CSS cascade order now applies. Flagged for a future scoping fix.

## v0.9 — 2026-08-23
### Added
- **Email OTP verification** on both login and registration. A 6-digit code is emailed and must be entered correctly (within 5 minutes, max 3 attempts) before a session is granted. Resend is rate-limited to once per 60 seconds.
- **New-listing email notifications**: every user with the `buyer` role is automatically emailed when a new produce listing is created.
- `nodemailer`-based mail sending, with a console-log fallback when SMTP credentials aren't configured (enables local testing without a real email provider).
### Changed
- `/api/login` and `/api/register` no longer return a user session directly — both now trigger the OTP flow, completed via the new `/api/verify-otp` endpoint.

## v0.8 — 2026-08-23
### Added
- **Password strength requirement** at registration (minimum 8 characters, at least one letter and one number).
- **Login lockout**: 5 incorrect password attempts for the same email locks that email out for 15 minutes.

## v0.7 — 2026-08-11
### Added
- Real navigation in the dashboard sidebar. Previously, all sidebar links other than "Overview" did nothing; now each (Produce, Orders, Messages, Price Alerts, Settings) shows its own dedicated full-page view.
- A read-only Account Settings page showing the logged-in user's real profile data.

## v0.6 — 2026-08-11
### Added
- Full three-screen rebuild of the frontend to match the complete mockup set (`1-landing.html`, `2-auth.html`, `3-dashboard.html`): Landing → Auth (login/signup/OTP-style verification/QR/done) → Dashboard (role-based farmer/buyer views).
- `GET /api/public-profile/:id` endpoint — a minimal public lookup (name, role, location only) so the dashboard can display counterpart names in listings, orders, and chats without exposing full account records.
### Changed
- Replaced the previous single-page marketing-site version of the app with the full multi-screen experience.

## v0.5 — 2026-08-10
### Changed
- `App.js` rewired to fetch real data from the API (`produce_listings`, `price_history`) instead of hardcoded arrays.
- Added a login/signup modal calling `/api/login` and `/api/register` directly (later superseded by the dedicated Auth screen in v0.6).

## v0.4 — 2026-08-10
### Added
- `AdminDashboard.js` — password-only admin login plus one tab per database table with list/add/edit/delete forms.
- `Root.js` and updated `index.js` — path-based switch so `/admin` shows the admin dashboard and all other paths show the public app.

## v0.3 — 2026-08-10
### Added
- `server.js` — Express + MySQL API server. Includes `bcryptjs`-hashed registration/login, public read access to 8 of the 9 tables, and admin-token-protected write access to all 9 tables.
- `.env.example` and `package.json` for the server project.

## v0.2 — 2026-08-10
### Added
- `schema.sql` — initial 9-table MySQL schema (`users`, `produce_listings`, `conversations`, `messages`, `orders`, `payments`, `price_history`, `price_alerts`, `waitlist_signups`) with sample data for local testing.

## v0.1 — 2026-08-10
### Added
- Initial conversion of the static landing-page mockup into a React `App.js` component, matching the original HTML/CSS design 1:1.

---

## Planned / Not Yet Built

Tracked here so they aren't lost, not because they're scheduled:
- Server-verified session tokens for regular (non-admin) users
- Farmer-facing "create listing" UI (currently admin-only)
- Password reset via email
- In-app message composition (currently view-only)
- In-app price alert creation (currently view-only)
- Real payment gateway integration
