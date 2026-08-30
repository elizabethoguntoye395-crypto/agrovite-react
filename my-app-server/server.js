// ============================================================
// Agrovite API — Express + MySQL (mysql2) server
// ============================================================
require('dotenv').config(); 

const express = require('express');
const {Pool} = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({origin:"https://agrovite-new-2.onrender.com"}));
app.use(express.json());



// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test it
pool.query('SELECT NOW()')
  .then(() => console.log('Postgres connected'))
  .catch(err => console.error('DB Error:', err));

// ------------------------------------------------------------
// Admin auth
// Simple in-memory token store — POST /api/admin/login checks
// ADMIN_PASSWORD and hands back a random token. Send it back on
// protected routes as:  Authorization: Bearer <token>
// (or the x-admin-token header). Tokens reset on server restart.
// ------------------------------------------------------------
const adminTokens = new Set();

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.headers['x-admin-token'];

  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin token missing or invalid' });
  }
  next();
}

// ------------------------------------------------------------
// Login-attempt lockout (brute-force protection)
// In-memory, keyed by email — same simple pattern as adminTokens
// above. After MAX_FAILED_ATTEMPTS wrong passwords in a row, that
// email is locked out for LOCKOUT_MINUTES. Resets on server restart
// (fine for this scale — a real production system would move this
// to the database or a store like Redis so it survives restarts and
// works across multiple server instances).
// ------------------------------------------------------------
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const loginAttempts = new Map(); // email -> { count, lockedUntil }

function checkLockout(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return { locked: false };
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return { locked: true, minutesLeft };
  }
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(email); // lockout expired — start fresh
  }
  return { locked: false };
}

function recordFailedAttempt(email) {
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60000;
  }
  loginAttempts.set(email, entry);
  return entry;
}

function clearFailedAttempts(email) {
  loginAttempts.delete(email);
}

// ------------------------------------------------------------
// Password strength check — used on registration.
// Minimum 8 characters, at least one letter and one number.
// ------------------------------------------------------------
function isPasswordStrongEnough(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

// ------------------------------------------------------------
// Email OTP verification
// After a correct password (login) or a successful signup, the
// user must enter a 6-digit code sent to their real inbox before
// they get a session — this is what actually proves the account
// belongs to that email address.
//
// In-memory store, same pattern as adminTokens/loginAttempts above:
// email -> { code, expiresAt, attempts, lastSentAt }
// Resets on server restart — fine at this scale; a production
// system would move this to the database or Redis.
// ------------------------------------------------------------
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;
const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits, no leading zero issues
}

// Mailer — uses real SMTP if configured in .env, otherwise falls back
// to printing the code to the server console so you can still test
// the flow locally before setting up a real email provider.
const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// Generic mail sender — falls back to console logging if SMTP isn't
// configured, same as the OTP path, so this is testable with zero
// email setup.
async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`[DEV — no SMTP configured] Email to ${to} — ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
}

async function sendOtpEmail(email, code) {
  await sendMail({
    to: email,
    subject: 'Your Agrovite verification code',
    text: `Your Agrovite verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your Agrovite verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

async function issueOtp(email) {
  const code = generateOtp();
  otpStore.set(email, {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60000,
    attempts: 0,
    lastSentAt: Date.now(),
  });
  await sendOtpEmail(email, code);
}

// Notify every buyer by email when a new produce listing is created.
// Failures for individual recipients are logged but never fail the
// request that created the listing — a bad email address shouldn't
// block the listing itself from being saved.
async function notifyBuyersOfNewListing(listing) {
  const [buyers] = await pool.query('SELECT email, full_name FROM users WHERE role = ?', ['buyer']);
  const subject = `New on Agrovite: ${listing.crop_name}${listing.grade ? ', ' + listing.grade : ''}`;
  const priceLine = `${listing.price} ${listing.currency || 'NGN'} / ${listing.unit}`;
  const text = `A new listing was just posted on Agrovite:\n\n${listing.crop_name}${listing.grade ? ', ' + listing.grade : ''}\nLocation: ${listing.location}\nPrice: ${priceLine}\n\nLog in to view it and message the seller.`;
  const html = `<p>A new listing was just posted on Agrovite:</p>
    <h3>${listing.crop_name}${listing.grade ? ', ' + listing.grade : ''}</h3>
    <p>Location: ${listing.location}<br>Price: ${priceLine}</p>
    <p>Log in to view it and message the seller.</p>`;

  const results = await Promise.allSettled(
    buyers.map((b) => sendMail({ to: b.email, subject, text, html }))
  );
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Failed to notify buyer ${buyers[i].email}:`, r.reason);
    }
  });
}

// ------------------------------------------------------------
// Table config — drives the generic public GET / admin
// POST-PUT-DELETE routes below. Keeping column names in one
// hardcoded place (not taken from user input) is what keeps the
// dynamic SQL below injection-safe.
// ------------------------------------------------------------
const TABLES = {
  produce_listings: {
    insertable: ['seller_id', 'crop_name', 'grade', 'quantity', 'unit', 'price', 'currency', 'location', 'photo_url', 'status'],
  },
  conversations: {
    insertable: ['listing_id', 'buyer_id', 'seller_id'],
  },
  messages: {
    insertable: ['conversation_id', 'sender_id', 'body'],
  },
  orders: {
    insertable: ['listing_id', 'buyer_id', 'seller_id', 'quantity', 'agreed_price', 'delivery_date', 'status'],
  },
  payments: {
    insertable: ['order_id', 'amount', 'currency', 'escrow_status', 'released_at'],
  },
  price_history: {
    insertable: ['crop_name', 'location', 'price', 'unit', 'direction'],
  },
  price_alerts: {
    insertable: ['user_id', 'crop_name', 'location', 'target_price', 'direction'],
  },
  waitlist_signups: {
    insertable: ['email'],
  },
  // users is admin-writable too (POST/PUT/DELETE), but has NO public
  // GET route — see registerPublicGet() below, which skips it.
  users: {
    insertable: ['full_name', 'email', 'role', 'location'], // password handled separately (hashed)
    hasPassword: true,
  },
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function pickFields(body, allowedFields) {
  const out = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

function buildInsert(table, data) {
  const cols = Object.keys(data);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
  const values = cols.map((c) => data[c]);
  return { sql, values };
}

function buildUpdate(table, data, id) {
  const cols = Object.keys(data);
  const setClause = cols.map((c) => `${c} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  const values = [...cols.map((c) => data[c]), id];
  return { sql, values };
}

// ============================================================
// AUTH — user register / login
// ============================================================

// POST /api/register
app.post('/api/register', async (req, res) => {
  try {
    const { full_name, email, password, role, location } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required' });
    }
    if (!isPasswordStrongEnough(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include a letter and a number' });
    }
    if (role && !['farmer', 'buyer', 'transporter'].includes(role)) {
      return res.status(400).json({ error: 'role must be farmer, buyer, or transporter' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role, location) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, password_hash, role || 'buyer', location || null]
    );

    await issueOtp(email);
    res.status(201).json({ message: 'Account created. A verification code has been sent to your email.', email, requiresOtp: true });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const lockout = checkLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${lockout.minutesLeft} minute${lockout.minutesLeft === 1 ? '' : 's'}.`,
      });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const entry = recordFailedAttempt(email);
      const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - entry.count);
      const message =
        remaining > 0
          ? `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lockout.`
          : `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`;
      return res.status(401).json({ error: message });
    }

    clearFailedAttempts(email);
    await issueOtp(email);
    res.json({ message: 'Password correct. A verification code has been sent to your email.', email, requiresOtp: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// POST /api/verify-otp — completes login/registration once the
// correct 6-digit code (sent by issueOtp above) is entered.
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'email and code are required' });
    }

    const entry = otpStore.get(email);
    if (!entry) {
      return res.status(400).json({ error: 'No verification code pending for this email. Please request a new one.' });
    }
    if (entry.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'That code has expired. Please request a new one.' });
    }

    if (String(code) !== entry.code) {
      entry.attempts += 1;
      if (entry.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(email);
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      }
      otpStore.set(email, entry);
      const remaining = MAX_OTP_ATTEMPTS - entry.attempts;
      return res.status(401).json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
    }

    otpStore.delete(email);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, location, created_at FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/resend-otp — rate limited to one resend per
// RESEND_COOLDOWN_SECONDS per email.
app.post('/api/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const entry = otpStore.get(email);
    if (entry) {
      const secondsSinceLastSend = (Date.now() - entry.lastSentAt) / 1000;
      if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
        return res.status(429).json({ error: `Please wait ${wait}s before requesting another code.` });
      }
    }

    await issueOtp(email);
    res.json({ message: 'A new verification code has been sent.', email });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});



// ============================================================
// ADMIN LOGIN
// ============================================================

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  }
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  adminTokens.add(token);

  res.json({ token });
});

// GET /api/users — admin-only (no public route exists for user accounts)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, location, created_at FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, location, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/users/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/public-profile/:id — PUBLIC, minimal lookup so the dashboard
// can show a counterpart's name in listings/orders/chats without
// exposing the full users table (no email, no password_hash).
app.get('/api/public-profile/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, role, location FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/public-profile/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================
// PUBLIC GET ROUTES — every table except users
// ============================================================
for (const table of Object.keys(TABLES)) {
  if (table === 'users') continue; // no public read access to user accounts

  // GET /api/<table>
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
      res.json(rows);
    } catch (err) {
      console.error(`GET /api/${table} error:`, err);
      res.status(500).json({ error: `Failed to fetch ${table}` });
    }
  });

  // GET /api/<table>/:id
  app.get(`/api/${table}/:id`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(`GET /api/${table}/:id error:`, err);
      res.status(500).json({ error: `Failed to fetch ${table}` });
    }
  });
}

// ============================================================
// ADMIN-PROTECTED WRITE ROUTES — POST / PUT / DELETE for every
// table, including users.
// ============================================================
for (const [table, config] of Object.entries(TABLES)) {
  // POST /api/<table>
  app.post(`/api/${table}`, requireAdmin, async (req, res) => {
    try {
      const data = pickFields(req.body, config.insertable);

      if (config.hasPassword) {
        if (!req.body.password) {
          return res.status(400).json({ error: 'password is required' });
        }
        data.password_hash = await bcrypt.hash(req.body.password, 10);
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const { sql, values } = buildInsert(table, data);
      const [result] = await pool.query(sql, values);
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);

      if (table === 'users') delete rows[0].password_hash;
      res.status(201).json(rows[0]);

      // Fire the buyer-notification email AFTER responding — a slow
      // or failing email send should never delay or break the API
      // response for the person who just created the listing.
      if (table === 'produce_listings') {
        notifyBuyersOfNewListing(rows[0]).catch((err) =>
          console.error('notifyBuyersOfNewListing failed:', err)
        );
      }
    } catch (err) {
      console.error(`POST /api/${table} error:`, err);
      res.status(500).json({ error: `Failed to create ${table} row` });
    }
  });

  // PUT /api/<table>/:id
  app.put(`/api/${table}/:id`, requireAdmin, async (req, res) => {
    try {
      const data = pickFields(req.body, config.insertable);

      if (config.hasPassword && req.body.password) {
        data.password_hash = await bcrypt.hash(req.body.password, 10);
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const { sql, values } = buildUpdate(table, data, req.params.id);
      const [result] = await pool.query(sql, values);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });

      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (table === 'users') delete rows[0].password_hash;
      res.json(rows[0]);
    } catch (err) {
      console.error(`PUT /api/${table}/:id error:`, err);
      res.status(500).json({ error: `Failed to update ${table} row` });
    }
  });

  // DELETE /api/<table>/:id
  app.delete(`/api/${table}/:id`, requireAdmin, async (req, res) => {
    try {
      const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      console.error(`DELETE /api/${table}/:id error:`, err);
      res.status(500).json({ error: `Failed to delete ${table} row` });
    }
  });
}

// ------------------------------------------------------------
// Health check + 404
// ------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ------------------------------------------------------------
// Start
// ------------------------------------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Agrovite API listening on port ${PORT}`);
});
