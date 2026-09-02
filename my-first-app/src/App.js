import React, { useState, useEffect, useRef, useCallback } from "react";
import './App.css';

/* ------------------------------------------------------------------
   Agrovite — full app
   Three screens ported 1:1 from your mockups:
     1-landing.html   -> LandingScreen
     2-auth.html      -> AuthScreen   (login / signup / verify / QR / done)
     3-dashboard.html -> DashboardScreen (farmer / buyer views)
   App() switches between them with simple internal state — no
   react-router involved, matching how the mockups link to each other
   (2-auth.html links to 3-dashboard.html, etc).
------------------------------------------------------------------- */

const API_BASE = "https://agrovite-server.onrender.com/api";
const SESSION_KEY = "agrovite_user";

const CARD_BG_PALETTE = ["#FDEBD3", "#FCE1DA", "#F4EAC7", "#FBE3B8", "#E4EFD8", "#E8DCC8"];
const ARROW = { up: "▲", down: "▼" };

function formatPrice(price, unit) {
  const num = Number(price);
  const display = Number.isFinite(num) ? num.toLocaleString() : price;
  return `₦${display}${unit ? "/" + unit : ""}`;
}
function formatMoney(amount) {
  const num = Number(amount) || 0;
  return `₦${num.toLocaleString()}`;
}

/* ==================================================================
   LANDING SCREEN  (1-landing.html)
   ================================================================== */

function useReveal() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function Reveal({ as: Tag = "div", className = "", style, children }) {
  const [ref, inView] = useReveal();
  return (
    <Tag ref={ref} className={`reveal${inView ? " in" : ""}${className ? " " + className : ""}`} style={style}>
      {children}
    </Tag>
  );
}

const STEPS = [
  { num: "01", title: "List your produce", body: "Add what you have, set your price, add photos — takes under two minutes." },
  { num: "02", title: "Get matched nearby", body: "Buyers and transporters in your area see your listing instantly." },
  { num: "03", title: "Chat and agree", body: "Talk price, quantity, and delivery directly — no go-between." },
  { num: "04", title: "Get paid, safely", body: "Payment is held securely until delivery is confirmed by both sides." },
];

const FEATURES = [
  { ic: "💬", title: "Direct chat", body: "Message buyers or sellers instantly, no middleman relaying offers." },
  { ic: "📊", title: "Price comparison", body: "See what similar produce is selling for nearby before you agree." },
  { ic: "🔔", title: "Price alerts", body: "Get notified the moment prices shift for crops you care about." },
  { ic: "🔒", title: "Secure payment", body: "Funds are held safely until the buyer confirms delivery." },
];

function LandingScreen({ onGoAuth }) {
  const [navOpen, setNavOpen] = useState(false);
  const [phoneIdx, setPhoneIdx] = useState(0);
  const [listings, setListings] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/produce_listings`)
      .then((r) => r.json())
      .then((data) => setListings(Array.isArray(data) ? data : []))
      .catch(() => setListings([]));
    fetch(`${API_BASE}/price_history`)
      .then((r) => r.json())
      .then((data) => setPriceHistory(Array.isArray(data) ? data : []))
      .catch(() => setPriceHistory([]));
  }, []);

  useEffect(() => {
    if (listings.length === 0) return;
    const id = setInterval(() => setPhoneIdx((i) => (i + 1) % listings.length), 3200);
    return () => clearInterval(id);
  }, [listings]);

  const shownCards =
    listings.length > 0 ? [0, 1, 2].map((offset) => listings[(phoneIdx + offset) % listings.length]) : [];

  const closeNav = useCallback(() => setNavOpen(false), []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setWaitlistError("");
    try {
      const res = await fetch(`${API_BASE}/waitlist_signups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not join the waitlist");
      setSubscribed(true);
    } catch (err) {
      setWaitlistError(err.message);
    }
  };

  return (
    <>
      <header>
        <nav className="wrap">
          <div className="logo">
            <span className="logo-mark">A</span>Agrovite
          </div>
          <div className={`nav-links${navOpen ? " open" : ""}`}>
            <a href="#how" onClick={closeNav}>How it works</a>
            <a href="#features" onClick={closeNav}>Features</a>
            <a href="#stats" onClick={closeNav}>Why now</a>
            <a href="#join" onClick={closeNav}>Beta access</a>
          </div>
          <div className="nav-actions">
            <button className="btn btn-ghost" onClick={() => onGoAuth("login")}>Log in</button>
            <button className="btn btn-primary" onClick={() => onGoAuth("signup")}>Join the beta</button>
            <button className="burger" aria-label="Toggle menu" aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="eyebrow">Direct farm-to-market</div>
              <h1>Sell your harvest.<br /><em>Skip the middleman.</em></h1>
              <p className="lead">
                Agrovite connects farmers straight to buyers, retailers, and transporters —
                real prices, real conversations, no unfair cuts along the way.
              </p>
              <div className="hero-ctas">
                <button className="btn btn-primary" onClick={() => onGoAuth("signup")}>Get early access →</button>
                <a href="#how" className="btn btn-ghost">See how it works</a>
              </div>
              <div className="trust-row">
                <div><b>4.0/5</b>average interest</div>
                <div><b>86%</b>want early access</div>
                <div><b>21+</b>farmers &amp; buyers surveyed</div>
              </div>
            </div>

            <div className="phone-stage">
              <div className="blob" aria-hidden="true"></div>
              <div className="float-tag top"><span className="dot"></span> Order confirmed — Kano</div>
              <div className="phone">
                <div className="phone-notch"></div>
                <div className="phone-screen">
                  <div className="ph-topbar"><span>9:41</span><span>●●● 4G</span></div>
                  <div className="ph-header">
                    <div className="greet">Good morning, Halima 👋</div>
                    <div className="sub">3 buyers near you are looking for produce</div>
                  </div>
                  <div className="ph-search">🔍 Search pineapple, maize, tomatoes…</div>
                  <div className="ph-cards">
                    {shownCards.length === 0 ? (
                      <div className="ph-card"><div className="info"><div className="name">Loading listings…</div></div></div>
                    ) : (
                      shownCards.map((p, i) => (
                        <div className="ph-card" key={`${p.id}-${i}`}>
                          <div className="thumb" style={{ background: CARD_BG_PALETTE[i % CARD_BG_PALETTE.length] }}>{p.photo_url || "🌱"}</div>
                          <div className="info">
                            <div className="name">{p.crop_name}{p.grade ? `, ${p.grade}` : ""}</div>
                            <div className="loc">{p.location}</div>
                          </div>
                          <div className="price">{formatPrice(p.price, p.unit)}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="ph-chat">
                    <div className="av">🧑🏾</div>
                    <div className="txt"><b>Tunde (Buyer)</b>Can you deliver 20 bags by Friday?</div>
                  </div>
                </div>
              </div>
              <div className="float-tag bottom"><span className="dot"></span> Payment released ✓</div>
            </div>
          </div>
        </section>

        <section className="ticker-wrap" aria-label="Live market prices">
          <div className="ticker">
            {priceHistory.length === 0 ? (
              <span>Loading live market prices…</span>
            ) : (
              [...priceHistory, ...priceHistory].map((t, i) => (
                <span key={i}>
                  <b>{t.crop_name}</b> · {t.location} · {formatPrice(t.price, t.unit)}{" "}
                  <span className={t.direction}>{ARROW[t.direction]}</span>
                </span>
              ))
            )}
          </div>
        </section>

        <section className="stats" id="stats">
          <div className="wrap">
            <Reveal className="stat"><b>43%</b><span>struggle most with finding buyers or sellers</span></Reveal>
            <Reveal className="stat"><b>81%</b><span>face that struggle on every transaction or often</span></Reveal>
            <Reveal className="stat"><b>57%</b><span>would pay — once they see the value</span></Reveal>
          </div>
          <div className="stats-note">Source: Agrovite market validation survey, 21 respondents</div>
        </section>

        <section id="how">
          <div className="wrap">
            <Reveal className="section-head">
              <div className="eyebrow">The process</div>
              <h2>From farm gate to buyer, in four steps</h2>
              <p>No stops in between. Every step happens inside one conversation, on one app.</p>
            </Reveal>
            <div className="steps">
              {STEPS.map((s) => (
                <Reveal as="div" className="step" key={s.num}>
                  <div className="num">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="features">
          <div className="wrap">
            <Reveal className="features">
              <div className="section-head">
                <div className="eyebrow" style={{ color: "var(--ochre)" }}>Built from real feedback</div>
                <h2>What farmers and buyers actually asked for</h2>
                <p>Every feature below came directly from our market survey — not a guess.</p>
              </div>
              <div className="feat-grid">
                {FEATURES.map((f) => (
                  <div className="feat" key={f.title}>
                    <div className="ic">{f.ic}</div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section>
          <div className="wrap">
            <Reveal className="quote-card">
              <div className="quote-avatar">H</div>
              <div>
                <blockquote>"For the first time, I know exactly who is buying my tomatoes and what they're really paying for them."</blockquote>
                <cite>— Halima, tomato farmer, Kano State</cite>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="join">
          <div className="wrap">
            <Reveal className="cta-band">
              <h2>Be one of our first 100 users</h2>
              <p>We're opening early access to a small group of farmers and buyers before public launch.</p>
              <form className="cta-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  aria-label="Email address"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  disabled={subscribed}
                />
                <button className="btn btn-primary" type="submit" disabled={subscribed}>
                  {subscribed ? "You're on the list ✓" : "Request access"}
                </button>
              </form>
              {waitlistError && <p className="form-error">{waitlistError}</p>}
            </Reveal>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="logo"><span className="logo-mark">A</span>Agrovite</div>
              <h1>PROUDLY MADE&OWNED BY: OGUNTOYE-ELIZABETH.A.</h1>
              <p>A direct line between farms and the markets that need them.</p>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#stats">Why now</a>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="foot-col">
              <h4>Get started</h4>
              <a href="#join">Join the beta</a>
              <a href="#">Become a seller</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Agrovite. All rights reserved.</span>
            <span>Made for farmers, by design.</span>
          </div>
        </div>
      </footer>
    </>
  );
}


/* ==================================================================
   AUTH SCREEN  (2-auth.html)
   ================================================================== */

function AuthScreen({ initialTab, onAuthed, onBack }) {
  const [tab, setTab] = useState(initialTab || "login");
  const [step, setStep] = useState("auth"); // auth | otp | qr | done
  const [fullName, setFullName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [qrTimer, setQrTimer] = useState(60);

  // OTP step state
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (step !== "qr") return;
    setQrTimer(60);
    const id = setInterval(() => setQrTimer((t) => (t > 0 ? t - 1 : 60)), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const submitAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = tab === "login" ? `${API_BASE}/login` : `${API_BASE}/register`;
      const body =
        tab === "login"
          ? { email: emailOrPhone, password: pw }
          : { full_name: fullName, email: emailOrPhone, password: pw };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (tab === "login" ? "Login failed" : "Registration failed"));

      // Password/account is valid — a 6-digit code was just emailed
      // to prove this is really that person's inbox.
      setPendingEmail(data.email || emailOrPhone);
      setOtpCode("");
      setOtpError("");
      setResendMessage("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS_CLIENT);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify that code");
      setPendingUser(data.user);
      setStep("done");
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setOtpError("");
    setResendMessage("");
    try {
      const res = await fetch(`${API_BASE}/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend code");
      setResendMessage("A new code was sent.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS_CLIENT);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const authTitle = tab === "signup" ? "Create your account" : "Welcome back";
  const authSub =
    tab === "signup"
      ? "List produce or start buying in under two minutes."
      : "Log in to see your listings, chats, and orders.";
  const submitLabel = loading ? "Please wait…" : tab === "signup" ? "Create account →" : "Continue →";

  return (
    <>
      <div className="shell">
        <div className="brand-panel">
          <div className="blob" aria-hidden="true"></div>
          <div className="logo"><span className="logo-mark">A</span>Agrovite</div>
          <div className="brand-copy">
            <div className="eyebrow">Direct farm-to-market</div>
            <h1>Sell your harvest.<br />Skip the middleman.</h1>
            <p>Join thousands of farmers, buyers, and transporters trading directly — real prices, real conversations, real trust.</p>
          </div>
          <div className="brand-stats">
            <div><b>4.0/5</b><span>average interest</span></div>
            <div><b>86%</b><span>want early access</span></div>
            <div><b>21+</b><span>farmers &amp; buyers surveyed</span></div>
          </div>
        </div>

        <div className="form-panel">
          <div className="form-box">
            <div className="mobile-logo"><span className="logo-mark" style={{ width: 32, height: 32, borderRadius: 8 }}>A</span>Agrovite</div>

            {step === "auth" && (
              <div className="step active">
                <button className="back-btn" onClick={onBack}>← Back to site</button>
                <div className="tabs">
                  <button className={`tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>Log in</button>
                  <button className={`tab${tab === "signup" ? " active" : ""}`} onClick={() => { setTab("signup"); setError(""); }}>Sign up</button>
                </div>

                <div className="welcome-msg">
                  <div className="av">A</div>
                  <p><b>Hi, I am Agrovite.</b><br />Nice meeting you — let's get you set up.</p>
                </div>

                <h2>{authTitle}</h2>
                <p className="sub">{authSub}</p>

                <form onSubmit={submitAuth}>
                  {tab === "signup" && (
                    <div className="field">
                      <label htmlFor="fullName">Full name</label>
                      <input id="fullName" type="text" placeholder="Halima Suleiman" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="email">Email or phone number</label>
                    <input id="email" type="text" placeholder="you@example.com" required value={emailOrPhone} onChange={(e) => setEmailOrPhone(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="pw">Password</label>
                    <input id="pw" type="password" placeholder="••••••••" required value={pw} onChange={(e) => setPw(e.target.value)} />
                  </div>
                  {error && <p className="auth-error">{error}</p>}
                  <button className="btn btn-primary" type="submit" disabled={loading}>{submitLabel}</button>
                  <button className="btn btn-qr" type="button" onClick={() => setStep("qr")}>▦ Scan QR code instead</button>
                </form>

                <div className="foot-link">
                  {tab === "signup" ? (
                    <>Already have an account? <button onClick={() => { setTab("login"); setError(""); }}>Log in</button></>
                  ) : (
                    <>New to Agrovite? <button onClick={() => { setTab("signup"); setError(""); }}>Create an account</button></>
                  )}
                </div>
              </div>
            )}

            {step === "otp" && (
              <div className="step active">
                <button className="back-btn" onClick={() => setStep("auth")}>← Back</button>
                <h2>Check your email</h2>
                <p className="sub">Enter the 6-digit code we sent to <b>{pendingEmail}</b>. It expires in 5 minutes.</p>

                <form onSubmit={submitOtp}>
                  <div className="field">
                    <label htmlFor="otp">Verification code</label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      style={{ letterSpacing: "6px", fontSize: "20px", textAlign: "center" }}
                    />
                  </div>
                  {otpError && <p className="auth-error">{otpError}</p>}
                  {resendMessage && !otpError && <p className="auth-note">{resendMessage}</p>}
                  <button className="btn btn-primary" type="submit" disabled={otpLoading || otpCode.length !== 6}>
                    {otpLoading ? "Verifying…" : "Verify & continue →"}
                  </button>
                </form>

                <div className="foot-link">
                  {resendCooldown > 0 ? (
                    <>Resend available in {resendCooldown}s</>
                  ) : (
                    <>Didn't get it? <button onClick={resendOtp} disabled={resendLoading}>{resendLoading ? "Sending…" : "Resend code"}</button></>
                  )}
                </div>
              </div>
            )}

            {step === "qr" && (
              <div className="step active">
                <button className="back-btn" onClick={() => setStep("auth")}>← Back</button>
                <h2>Scan to sign in</h2>
                <p className="sub">Open the Agrovite mobile app and scan this code.</p>
                <div className="qr-box">
                  <div className="qr-square" aria-hidden="true"></div>
                  <p>Code refreshes automatically · expires in <span>{qrTimer}</span>s</p>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="step active">
                <div className="done-wrap">
                  <div className="done-check">✓</div>
                  <h2>You're verified</h2>
                  <p className="sub">Access granted to the Agrovite marketplace.</p>
                  <button className="btn btn-primary" onClick={() => onAuthed(pendingUser)}>Go to my dashboard →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const RESEND_COOLDOWN_SECONDS_CLIENT = 60; // mirrors RESEND_COOLDOWN_SECONDS in server.js



/* ==================================================================
   DASHBOARD SCREEN  (3-dashboard.html)
   ================================================================== */

function DashboardScreen({ user, onLogout }) {
  const [role, setRole] = useState(user.role === "farmer" ? "farmer" : "buyer");
  const [view, setView] = useState("overview"); // overview | produce | orders | messages | alerts | settings
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/produce_listings`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/orders`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/conversations`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/messages`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/payments`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/price_alerts`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/price_history`).then((r) => r.json()).catch(() => []),
    ]).then(([l, o, c, m, pay, pa, ph]) => {
      setListings(Array.isArray(l) ? l : []);
      setOrders(Array.isArray(o) ? o : []);
      setConversations(Array.isArray(c) ? c : []);
      setMessages(Array.isArray(m) ? m : []);
      setPayments(Array.isArray(pay) ? pay : []);
      setPriceAlerts(Array.isArray(pa) ? pa : []);
      setPriceHistory(Array.isArray(ph) ? ph : []);
    });
  }, []);

  // Resolve names for other users referenced in listings/orders/conversations
  // via GET /api/public-profile/:id (name + role + location only).
  useEffect(() => {
    const ids = new Set();
    listings.forEach((l) => ids.add(l.seller_id));
    orders.forEach((o) => { ids.add(o.buyer_id); ids.add(o.seller_id); });
    conversations.forEach((c) => { ids.add(c.buyer_id); ids.add(c.seller_id); });
    ids.delete(user.id);
    const toFetch = [...ids].filter((id) => id != null && !(id in profiles));
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map((id) =>
        fetch(`${API_BASE}/public-profile/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setProfiles((prev) => {
        const next = { ...prev };
        toFetch.forEach((id, i) => { next[id] = results[i]; });
        return next;
      });
    });
  }, [listings, orders, conversations, user.id, profiles]);

  const nameFor = (id) => (id === user.id ? user.full_name : profiles[id]?.full_name || `User #${id}`);

  /* ---- derived, real data (no fabricated numbers) ---- */
  const myListings = listings.filter((l) => l.seller_id === user.id);
  const browseListings = listings.filter((l) => l.seller_id !== user.id && l.status === "available");

  const myOrdersAsSeller = orders.filter((o) => o.seller_id === user.id);
  const myOrdersAsBuyer = orders.filter((o) => o.buyer_id === user.id);

  const myConversations = conversations.filter((c) => c.buyer_id === user.id || c.seller_id === user.id);
  const chatRows = myConversations
    .map((c) => {
      const msgs = messages.filter((m) => m.conversation_id === c.id).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
      const last = msgs[0];
      const counterpartId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
      return { conversation: c, last, counterpartId, needsReply: last && last.sender_id !== user.id };
    })
    .filter((r) => r.last)
    .sort((a, b) => new Date(b.last.sent_at) - new Date(a.last.sent_at));

  const myAlerts = priceAlerts.filter((a) => a.user_id === user.id);

  function currentPriceFor(cropName, location) {
    const matches = priceHistory.filter((p) => p.crop_name === cropName && (!location || p.location === location));
    if (matches.length === 0) return null;
    return matches.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0];
  }

  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const paymentsThisMonthFor = (orderIds) =>
    payments.filter((p) => orderIds.includes(p.order_id) && String(p.held_at || "").slice(0, 7) === thisMonth);

  const sellerOrderIds = myOrdersAsSeller.map((o) => o.id);
  const buyerOrderIds = myOrdersAsBuyer.map((o) => o.id);
  const earningsThisMonth = paymentsThisMonthFor(sellerOrderIds)
    .filter((p) => p.escrow_status === "released")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const spentThisMonth = paymentsThisMonthFor(buyerOrderIds).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const distinctSellersContacted = new Set([
    ...myOrdersAsBuyer.map((o) => o.seller_id),
    ...myConversations.filter((c) => c.buyer_id === user.id).map((c) => c.seller_id),
  ]).size;

  const unreadCount = chatRows.filter((r) => r.needsReply).length;

  function statusBadge(kind, status, orderId) {
    if (kind === "listing") {
      if (status === "available") return { cls: "green", label: "Active" };
      if (status === "reserved") return { cls: "amber", label: "Reserved" };
      return { cls: "red", label: "Sold out" };
    }
    const pay = payments.find((p) => p.order_id === orderId);
    if (status === "confirmed" && pay && pay.escrow_status === "held") return { cls: "green", label: "Paid, in escrow" };
    if (status === "delivered") return { cls: "green", label: "Delivered" };
    if (status === "pending") return { cls: "amber", label: "Awaiting confirmation" };
    if (status === "confirmed") return { cls: "amber", label: "Awaiting pickup" };
    return { cls: "red", label: "Cancelled" };
  }

  function relTime(iso) {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const h = Math.round(diffMs / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24)}d`;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  const navPrimary = role === "farmer" ? { ic: "🌾", label: "My produce" } : { ic: "🛒", label: "Browse produce" };
  const avatarInitial = user.full_name?.charAt(0)?.toUpperCase() || "?";

  /* ---- reusable section cards (shared between Overview and their own dedicated pages) ---- */

  const produceCard =
    role === "farmer" ? (
      <div className="card">
        <div className="card-head"><h3>Your produce</h3></div>
        {myListings.length === 0 ? (
          <p className="empty-note">No listings yet.</p>
        ) : (
          <table>
            <thead><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {myListings.map((l, i) => {
                const badge = statusBadge("listing", l.status);
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="prod-cell">
                        <div className="prod-thumb" style={{ background: CARD_BG_PALETTE[i % CARD_BG_PALETTE.length] }}>{l.photo_url || "🌱"}</div>
                        <div><div className="n">{l.crop_name}{l.grade ? `, ${l.grade}` : ""}</div><div className="s">{l.location}</div></div>
                      </div>
                    </td>
                    <td>{l.quantity} {l.unit}</td>
                    <td className="price-cell">{formatPrice(l.price, l.unit)}</td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    ) : (
      <div className="card">
        <div className="card-head"><h3>Produce near you</h3></div>
        {browseListings.length === 0 ? (
          <p className="empty-note">No listings available right now.</p>
        ) : (
          <div className="browse-grid">
            {browseListings.map((l, i) => (
              <div className="produce-card" key={l.id}>
                <div className="top" style={{ background: CARD_BG_PALETTE[i % CARD_BG_PALETTE.length] }}>{l.photo_url || "🌱"}</div>
                <div className="body">
                  <div className="n">{l.crop_name}{l.grade ? `, ${l.grade}` : ""}</div>
                  <div className="s">{l.location} · {nameFor(l.seller_id)}</div>
                  <div className="row"><span className="price">{formatPrice(l.price, l.unit)}</span><button>Message</button></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

  const ordersCard =
    role === "farmer" ? (
      <div className="card">
        <div className="card-head"><h3>Orders</h3></div>
        {myOrdersAsSeller.length === 0 ? (
          <p className="empty-note">No orders yet.</p>
        ) : (
          <table>
            <thead><tr><th>Buyer</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {myOrdersAsSeller.map((o) => {
                const badge = statusBadge("order", o.status, o.id);
                const total = Number(o.quantity) * Number(o.agreed_price);
                return (
                  <tr key={o.id}>
                    <td>{nameFor(o.buyer_id)}</td>
                    <td>{o.quantity}</td>
                    <td className="price-cell">{formatMoney(total)}</td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    ) : (
      <div className="card">
        <div className="card-head"><h3>Your orders</h3></div>
        {myOrdersAsBuyer.length === 0 ? (
          <p className="empty-note">No orders yet.</p>
        ) : (
          <table>
            <thead><tr><th>Seller</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {myOrdersAsBuyer.map((o) => {
                const badge = statusBadge("order", o.status, o.id);
                const total = Number(o.quantity) * Number(o.agreed_price);
                return (
                  <tr key={o.id}>
                    <td>{nameFor(o.seller_id)}</td>
                    <td>{o.quantity}</td>
                    <td className="price-cell">{formatMoney(total)}</td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );

  const messagesCard = (
    <div className="card">
      <div className="card-head"><h3>Messages</h3></div>
      {chatRows.length === 0 ? (
        <p className="empty-note">No conversations yet.</p>
      ) : (
        chatRows.map((r) => (
          <div className="chat-row" key={r.conversation.id}>
            <div className="av">{nameFor(r.counterpartId).charAt(0).toUpperCase()}</div>
            <div className="info"><div className="n">{nameFor(r.counterpartId)}</div><div className="m">{r.last.body}</div></div>
            {r.needsReply ? <div className="unread"></div> : <div className="time">{relTime(r.last.sent_at)}</div>}
          </div>
        ))
      )}
    </div>
  );

  const alertsCard = (
    <div className="card">
      <div className="card-head"><h3>{role === "farmer" ? "Market price alerts" : "Price watch"}</h3></div>
      {myAlerts.length === 0 ? (
        <p className="empty-note">No price alerts set.</p>
      ) : (
        myAlerts.map((a) => {
          const cur = currentPriceFor(a.crop_name, a.location);
          return (
            <div className="alert-row" key={a.id}>
              <div><div className="crop">{a.crop_name}</div><div className="loc">{a.location || "Any location"}</div></div>
              {cur ? (
                <div className="price-cell" style={{ color: cur.direction === "up" ? "#2E9E5B" : "#C4471C" }}>
                  {formatPrice(cur.price, null)} {ARROW[cur.direction]}
                </div>
              ) : (
                <div className="price-cell">Target {formatPrice(a.target_price, null)}</div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const settingsCard = (
    <div className="card">
      <div className="card-head"><h3>Account settings</h3></div>
      <div className="settings-row"><span className="k">Full name</span><span className="v">{user.full_name}</span></div>
      <div className="settings-row"><span className="k">Email</span><span className="v">{user.email}</span></div>
      <div className="settings-row"><span className="k">Role</span><span className="v" style={{ textTransform: "capitalize" }}>{user.role}</span></div>
      <div className="settings-row"><span className="k">Location</span><span className="v">{user.location || "Not set"}</span></div>
      <div className="settings-row"><span className="k">Member since</span><span className="v">{fmtDate(user.created_at)}</span></div>
    </div>
  );

  /* ---- topbar (role-dependent, shown on every view) ---- */
  const topbar = (
    <div className="topbar">
      <div>
        <h1>Good morning, {user.full_name?.split(" ")[0]} 👋</h1>
        <div className="sub">
          {role === "farmer"
            ? `${myOrdersAsSeller.filter((o) => o.status === "pending").length} orders awaiting your confirmation`
            : `${browseListings.length} listings available near you`}
        </div>
      </div>
      <div className="top-actions">
        <div className="search-box">🔍 {role === "farmer" ? "Search your listings…" : "Search pineapple, maize, tomatoes…"}</div>
        <button className="icon-btn">🔔<span className="dot"></span></button>
        <button className="btn btn-primary">{role === "farmer" ? "+ Add produce" : "+ Post a request"}</button>
      </div>
    </div>
  );

  const navItems = [
    { key: "overview", ic: "▦", label: "Overview" },
    { key: "produce", ic: navPrimary.ic, label: navPrimary.label },
    { key: "orders", ic: "📦", label: "Orders" },
    { key: "messages", ic: "💬", label: "Messages" },
    { key: "alerts", ic: "🔔", label: "Price alerts" },
  ];

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="logo"><span className="logo-mark">A</span>Agrovite</div>

          <div className="role-switch">
            <button className={`role-btn${role === "farmer" ? " active" : ""}`} onClick={() => setRole("farmer")}>Farmer view</button>
            <button className={`role-btn${role === "buyer" ? " active" : ""}`} onClick={() => setRole("buyer")}>Buyer view</button>
          </div>

          <div className="nav-group">
            <div className="grp-label">Menu</div>
            {navItems.map((item) => (
              <div
                key={item.key}
                className={`nav-item${view === item.key ? " active" : ""}`}
                onClick={() => setView(item.key)}
              >
                <span className="ic">{item.ic}</span>{item.label}
              </div>
            ))}
          </div>
          <div className="nav-group">
            <div className="grp-label">Account</div>
            <div className={`nav-item${view === "settings" ? " active" : ""}`} onClick={() => setView("settings")}>
              <span className="ic">⚙️</span>Settings
            </div>
            <div className="nav-item" onClick={onLogout}><span className="ic">↩</span>Log out</div>
          </div>

          <div className="sidebar-foot">
            <div className="avatar">{avatarInitial}</div>
            <div>
              <div className="name">{user.full_name}</div>
              <div className="role">{user.role}{user.location ? ` · ${user.location}` : ""}</div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="view active">
            {topbar}

            {view === "overview" && (
              <>
                <div className="stat-grid">
                  {role === "farmer" ? (
                    <>
                      <div className="stat-card"><div className="lbl">Active listings</div><div className="val">{myListings.filter((l) => l.status === "available").length}</div><div className="delta up">of {myListings.length} total</div></div>
                      <div className="stat-card"><div className="lbl">Pending orders</div><div className="val">{myOrdersAsSeller.filter((o) => o.status === "pending").length}</div><div className="delta amber" style={{ color: "#B4791F" }}>Awaiting confirmation</div></div>
                      <div className="stat-card"><div className="lbl">This month earnings (released)</div><div className="val">{formatMoney(earningsThisMonth)}</div><div className="delta up">From released payments</div></div>
                      <div className="stat-card"><div className="lbl">Unread messages</div><div className="val">{unreadCount}</div><div className="delta down">Need a reply</div></div>
                    </>
                  ) : (
                    <>
                      <div className="stat-card"><div className="lbl">Active orders</div><div className="val">{myOrdersAsBuyer.filter((o) => ["pending", "confirmed"].includes(o.status)).length}</div><div className="delta amber" style={{ color: "#B4791F" }}>In progress</div></div>
                      <div className="stat-card"><div className="lbl">Sellers contacted</div><div className="val">{distinctSellersContacted}</div><div className="delta up">Via orders &amp; chats</div></div>
                      <div className="stat-card"><div className="lbl">Total spent</div><div className="val">{formatMoney(spentThisMonth)}</div><div className="delta up">This month</div></div>
                      <div className="stat-card"><div className="lbl">Unread messages</div><div className="val">{unreadCount}</div><div className="delta down">Need a reply</div></div>
                    </>
                  )}
                </div>

                <div className="content-grid">
                  <div>{produceCard}{ordersCard}</div>
                  <div>{messagesCard}{alertsCard}</div>
                </div>
              </>
            )}

            {view === "produce" && <div className="full-width">{produceCard}</div>}
            {view === "orders" && <div className="full-width">{ordersCard}</div>}
            {view === "messages" && <div className="full-width">{messagesCard}</div>}
            {view === "alerts" && <div className="full-width">{alertsCard}</div>}
            {view === "settings" && <div className="full-width">{settingsCard}</div>}
          </div>
        </main>
      </div>
    </>
  );
}


/* ==================================================================
   ROOT APP — switches between the three screens
   ================================================================== */

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | auth | dashboard
  const [currentUser, setCurrentUser] = useState(null);
  const [authTab, setAuthTab] = useState("login");

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
        setScreen("dashboard");
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const goAuth = (tabName) => {
    setAuthTab(tabName);
    setScreen("auth");
  };
  const handleAuthed = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setScreen("dashboard");
  };
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setScreen("landing");
  };

  if (screen === "dashboard" && currentUser) {
    return <DashboardScreen user={currentUser} onLogout={handleLogout} />;
  }
  if (screen === "auth") {
    return <AuthScreen initialTab={authTab} onAuthed={handleAuthed} onBack={() => setScreen("landing")} />;
  }
  return <LandingScreen onGoAuth={goAuth} />;
}