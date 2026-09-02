const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://agrovite_db_user:9WIJZN7uCh9kTalb2u70ogCxX80ipPqM@dpg-daa8fntg1s2s73cfa7kg-a.virginia-postgres.render.com/agrovite_db',
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  location TEXT,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE produce_listings (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES users(id),
  crop_name TEXT,
  grade TEXT,
  quantity NUMERIC,
  unit TEXT,
  price NUMERIC,
  currency TEXT,
  location TEXT,
  photo_url TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES produce_listings(id),
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  sender_id INTEGER REFERENCES users(id),
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES produce_listings(id),
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  quantity NUMERIC,
  agreed_price NUMERIC,
  delivery_date DATE,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount NUMERIC,
  currency TEXT,
  escrow_status TEXT,
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  crop_name TEXT,
  location TEXT,
  price NUMERIC,
  unit TEXT,
  direction TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  crop_name TEXT,
  location TEXT,
  target_price NUMERIC,
  direction TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE waitlist_signups (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

pool.query(sql)
  .then(() => {
    console.log('SUCCESS: all tables created');
    pool.end();
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    pool.end();
  });