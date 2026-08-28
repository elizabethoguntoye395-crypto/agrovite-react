import React, { useState, useEffect, useRef, useCallback } from "react";

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

const API_BASE = "http://localhost:4000/api";
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
      <style>{LANDING_CSS}</style>

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

const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');
:root{
  --forest:#1F4D3A; --forest-deep:#153529; --cream:#F6F1E4; --cream-soft:#FBF8F0;
  --ochre:#E8A33D; --pepper:#C4471C; --ink:#22261F; --ink-soft:#5B5F52;
  --sage:#C9D3BE; --line: rgba(34,38,31,0.12); --radius: 18px; --max: 1180px;
}
*{box-sizing:border-box; margin:0; padding:0;}
html{scroll-behavior:smooth;}
body{ font-family:'Inter', sans-serif; color:var(--ink); background:var(--cream-soft); line-height:1.5; -webkit-font-smoothing:antialiased; }
img{max-width:100%; display:block;}
a{color:inherit; text-decoration:none;}
.wrap{max-width:var(--max); margin:0 auto; padding:0 24px;}
h1,h2,h3{font-family:'Fraunces', serif; font-weight:600; letter-spacing:-0.01em; color:var(--forest-deep);}
.eyebrow{ font-family:'IBM Plex Mono', monospace; font-size:12.5px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--pepper); display:flex; align-items:center; gap:8px; margin-bottom:14px; }
.eyebrow::before{content:""; width:18px; height:2px; background:var(--pepper); display:inline-block;}
:focus-visible{outline:3px solid var(--ochre); outline-offset:3px;}
@media (prefers-reduced-motion: reduce){ *{animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; scroll-behavior:auto !important;} }
header{ position:sticky; top:0; z-index:50; background:rgba(251,248,240,0.86); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
nav.wrap{ display:flex; align-items:center; justify-content:space-between; height:74px; }
.logo{ display:flex; align-items:center; gap:10px; font-family:'Fraunces', serif; font-weight:700; font-size:21px; color:var(--forest-deep); }
.logo-mark{ width:34px; height:34px; border-radius:9px; background:linear-gradient(155deg, var(--forest) 0%, var(--forest-deep) 100%); display:flex; align-items:center; justify-content:center; color:var(--ochre); font-size:18px; flex-shrink:0; }
.nav-links{ display:flex; gap:36px; font-size:14.5px; font-weight:500; }
.nav-links a{ color:var(--ink-soft); transition:color .2s; position:relative; }
.nav-links a:hover{ color:var(--forest-deep); }
.nav-actions{ display:flex; align-items:center; gap:14px; }
.btn{ font-family:'Inter', sans-serif; font-weight:600; font-size:14.5px; padding:11px 22px; border-radius:999px; border:none; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease, background .2s; display:inline-flex; align-items:center; gap:8px; }
.btn-primary{ background:var(--forest-deep); color:var(--cream); }
.btn-primary:hover{ transform:translateY(-2px); box-shadow:0 10px 24px rgba(21,53,41,0.28); }
.btn-ghost{ background:transparent; color:var(--forest-deep); border:1.5px solid var(--line); }
.btn-ghost:hover{ border-color:var(--forest-deep); }
.burger{ display:none; background:none; border:none; cursor:pointer; padding:6px; }
.burger span{ display:block; width:22px; height:2px; background:var(--forest-deep); margin:5px 0; transition:.25s; }
.hero{ padding:64px 0 40px; overflow:hidden; }
.hero-grid{ display:grid; grid-template-columns:1.05fr 0.95fr; gap:56px; align-items:center; }
.hero h1{ font-size:clamp(34px, 5vw, 58px); line-height:1.04; margin-bottom:22px; }
.hero h1 em{ font-style:italic; color:var(--pepper); }
.hero p.lead{ font-size:18px; color:var(--ink-soft); max-width:460px; margin-bottom:32px; }
.hero-ctas{ display:flex; gap:14px; flex-wrap:wrap; margin-bottom:34px; }
.trust-row{ display:flex; gap:26px; flex-wrap:wrap; font-family:'IBM Plex Mono', monospace; font-size:12.5px; color:var(--ink-soft); }
.trust-row b{ color:var(--forest-deep); font-size:15px; display:block; font-family:'Fraunces', serif; font-weight:700; }
.phone-stage{ position:relative; display:flex; justify-content:center; }
.phone{ width:300px; background:var(--forest-deep); border-radius:38px; padding:14px; box-shadow:0 30px 70px -20px rgba(21,53,41,0.45), 0 0 0 1px rgba(21,53,41,0.06); position:relative; z-index:2; }
.phone-notch{ width:80px; height:18px; background:var(--forest-deep); border-radius:0 0 14px 14px; position:absolute; top:0; left:50%; transform:translateX(-50%); z-index:3; }
.phone-screen{ background:var(--cream); border-radius:26px; overflow:hidden; padding-bottom:6px; }
.ph-topbar{ display:flex; justify-content:space-between; align-items:center; padding:16px 16px 10px; font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--ink-soft);}
.ph-header{ padding:2px 16px 14px; }
.ph-header .greet{ font-family:'Fraunces', serif; font-size:19px; font-weight:600; color:var(--forest-deep);}
.ph-header .sub{ font-size:12.5px; color:var(--ink-soft); margin-top:2px;}
.ph-search{ margin:0 16px 14px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:10px 12px; font-size:12.5px; color:var(--ink-soft); display:flex; align-items:center; gap:8px;}
.ph-cards{ padding:0 16px 16px; display:flex; flex-direction:column; gap:10px; }
.ph-card{ background:#fff; border-radius:14px; padding:12px; display:flex; gap:10px; align-items:center; border:1px solid var(--line); }
.ph-card .thumb{ width:46px; height:46px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; }
.ph-card .info{ flex:1; min-width:0; }
.ph-card .name{ font-size:13.5px; font-weight:600; color:var(--forest-deep); }
.ph-card .loc{ font-size:11px; color:var(--ink-soft); }
.ph-card .price{ font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:600; color:var(--pepper); white-space:nowrap; }
.ph-chat{ margin:2px 16px 16px; background:var(--forest); border-radius:14px; padding:12px; display:flex; align-items:center; gap:10px; }
.ph-chat .av{ width:30px; height:30px; border-radius:50%; background:var(--ochre); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px;}
.ph-chat .txt{ color:var(--cream); font-size:12px; }
.ph-chat .txt b{ display:block; font-size:12.5px; }
.float-tag{ position:absolute; z-index:1; background:#fff; border-radius:14px; padding:10px 14px; box-shadow:0 16px 34px -12px rgba(21,53,41,0.3); font-family:'IBM Plex Mono', monospace; font-size:12px; display:flex; align-items:center; gap:8px; border:1px solid var(--line); }
.float-tag.top{ top:6%; left:-6%; animation:float1 5s ease-in-out infinite; }
.float-tag.bottom{ bottom:8%; right:-8%; animation:float2 6s ease-in-out infinite; }
.float-tag .dot{ width:8px; height:8px; border-radius:50%; background:#2E9E5B; }
@keyframes float1{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-10px);} }
@keyframes float2{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(10px);} }
.blob{ position:absolute; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle, rgba(232,163,61,0.35), transparent 70%); top:-80px; right:-120px; z-index:0; filter:blur(10px);}
.stats{ background:var(--forest-deep); padding:52px 0; margin-top:20px; }
.stats .wrap{ display:grid; grid-template-columns:repeat(3,1fr); gap:32px; text-align:center; }
.stat b{ display:block; font-family:'Fraunces', serif; font-size:clamp(30px,4vw,44px); color:var(--ochre); font-weight:700; }
.stat span{ font-size:13.5px; color:rgba(246,241,228,0.75); }
.stats-note{ text-align:center; margin-top:26px; font-size:12px; color:rgba(246,241,228,0.5); font-family:'IBM Plex Mono', monospace; }
section{ padding:88px 0; }
.section-head{ max-width:600px; margin-bottom:52px; }
.section-head h2{ font-size:clamp(28px,3.4vw,40px); margin-bottom:14px; }
.section-head p{ color:var(--ink-soft); font-size:16.5px; }
.steps{ display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }
.step{ background:var(--cream-soft); border:1px solid var(--line); border-radius:var(--radius); padding:26px 22px; position:relative; }
.step .num{ font-family:'IBM Plex Mono', monospace; font-size:13px; color:var(--pepper); font-weight:600; margin-bottom:18px; }
.step h3{ font-size:18px; margin-bottom:8px; }
.step p{ font-size:14px; color:var(--ink-soft); }
.features{ background:var(--forest); border-radius:28px; padding:64px 40px; color:var(--cream); }
.features .section-head h2, .features .section-head p{ color:var(--cream); }
.features .section-head p{ color:rgba(246,241,228,0.75); }
.feat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(246,241,228,0.14); border-radius:16px; overflow:hidden; }
.feat{ background:var(--forest); padding:28px 22px; }
.feat .ic{ font-size:22px; margin-bottom:16px; }
.feat h3{ font-family:'Inter',sans-serif; font-size:15.5px; font-weight:700; color:var(--cream); margin-bottom:8px; }
.feat p{ font-size:13.5px; color:rgba(246,241,228,0.7); }
.ticker-wrap{ border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--cream); overflow:hidden; padding:14px 0; }
.ticker{ display:flex; gap:44px; white-space:nowrap; font-family:'IBM Plex Mono', monospace; font-size:13px; color:var(--ink-soft); animation:scroll 28s linear infinite; width:max-content; }
.ticker span b{ color:var(--forest-deep); }
.ticker span.up{ color:#2E9E5B; }
.ticker span.down{ color:var(--pepper); }
@keyframes scroll{ from{transform:translateX(0);} to{transform:translateX(-50%);} }
.quote-card{ background:var(--cream-soft); border:1px solid var(--line); border-radius:var(--radius); padding:48px; display:grid; grid-template-columns:auto 1fr; gap:28px; align-items:center; }
.quote-avatar{ width:64px; height:64px; border-radius:50%; background:linear-gradient(155deg, var(--ochre), var(--pepper)); flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#fff; font-family:'Fraunces',serif; font-size:24px; font-weight:600; }
.quote-card blockquote{ font-family:'Fraunces', serif; font-size:clamp(18px,2.2vw,24px); font-style:italic; color:var(--forest-deep); line-height:1.4; margin-bottom:14px; }
.quote-card cite{ font-style:normal; font-size:13.5px; color:var(--ink-soft); }
.cta-band{ background:var(--pepper); border-radius:28px; padding:64px 48px; text-align:center; color:var(--cream); }
.cta-band h2{ color:var(--cream); font-size:clamp(26px,3.6vw,38px); margin-bottom:14px; }
.cta-band p{ color:rgba(246,241,228,0.85); margin-bottom:30px; max-width:460px; margin-left:auto; margin-right:auto; }
.cta-band .btn-primary{ background:var(--cream); color:var(--forest-deep); }
.cta-band .btn-primary:hover{ box-shadow:0 10px 24px rgba(0,0,0,0.25); }
.cta-form{ display:flex; gap:10px; max-width:420px; margin:0 auto; flex-wrap:wrap; justify-content:center; }
.cta-form input{ flex:1; min-width:200px; padding:13px 16px; border-radius:999px; border:none; font-family:'Inter',sans-serif; font-size:14.5px; }
.form-error{ color:var(--cream); font-size:13px; margin-top:10px; }
footer{ padding:54px 0 34px; }
.foot-grid{ display:grid; grid-template-columns:1.4fr repeat(3,1fr); gap:40px; margin-bottom:40px; }
.foot-brand p{ font-size:13.5px; color:var(--ink-soft); margin-top:12px; max-width:240px; }
.foot-col h4{ font-size:13px; font-weight:700; margin-bottom:14px; color:var(--forest-deep); }
.foot-col a{ display:block; font-size:13.5px; color:var(--ink-soft); margin-bottom:10px; }
.foot-col a:hover{ color:var(--forest-deep); }
.foot-bottom{ border-top:1px solid var(--line); padding-top:22px; display:flex; justify-content:space-between; font-size:12.5px; color:var(--ink-soft); flex-wrap:wrap; gap:10px; }
.reveal{ opacity:0; transform:translateY(18px); transition:opacity .7s ease, transform .7s ease; }
.reveal.in{ opacity:1; transform:translateY(0); }
@media (max-width: 980px){
  .hero-grid{ grid-template-columns:1fr; } .phone-stage{ order:-1; margin-bottom:10px; }
  .stats .wrap{ grid-template-columns:1fr; gap:26px; } .steps{ grid-template-columns:1fr 1fr; }
  .feat-grid{ grid-template-columns:1fr 1fr; } .foot-grid{ grid-template-columns:1fr 1fr; }
  .quote-card{ grid-template-columns:1fr; text-align:center; justify-items:center; }
}
@media (max-width: 720px){
  .nav-links{ position:fixed; top:74px; left:0; right:0; background:var(--cream-soft); flex-direction:column; padding:20px 24px; gap:18px; border-bottom:1px solid var(--line); transform:translateY(-130%); transition:transform .3s ease; }
  .nav-links.open{ transform:translateY(0); }
  .nav-actions .btn-ghost{ display:none; }
  .burger{ display:block; }
  section{ padding:60px 0; } .features{ padding:44px 22px; } .cta-band{ padding:48px 24px; }
  .steps{ grid-template-columns:1fr; } .feat-grid{ grid-template-columns:1fr; }
  .foot-grid{ grid-template-columns:1fr; gap:28px; } .phone{ width:100%; max-width:300px; } .float-tag{ display:none; }
}
`;

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
      <style>{AUTH_CSS}</style>
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


const AUTH_CSS = `
:root{ --forest:#1F4D3A; --forest-deep:#153529; --cream:#F6F1E4; --cream-soft:#FBF8F0; --ochre:#E8A33D; --pepper:#C4471C; --ink:#22261F; --ink-soft:#5B5F52; --line: rgba(34,38,31,0.12); }
*{box-sizing:border-box; margin:0; padding:0;}
body{ font-family:'Inter',sans-serif; color:var(--ink); background:var(--cream-soft); min-height:100vh; }
h1,h2,h3{ font-family:'Fraunces',serif; font-weight:600; letter-spacing:-0.01em; color:var(--forest-deep); }
:focus-visible{ outline:3px solid var(--ochre); outline-offset:2px; }
.shell{ display:grid; grid-template-columns:1fr 1fr; min-height:100vh; }
.brand-panel{ background:linear-gradient(165deg, var(--forest) 0%, var(--forest-deep) 100%); color:var(--cream); padding:56px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; }
.brand-panel .blob{ position:absolute; width:480px; height:480px; border-radius:50%; background:radial-gradient(circle, rgba(232,163,61,0.28), transparent 70%); top:-140px; right:-160px; }
.logo{ display:flex; align-items:center; gap:10px; font-family:'Fraunces',serif; font-weight:700; font-size:21px; position:relative; z-index:1;}
.logo-mark{ width:34px; height:34px; border-radius:9px; background:rgba(246,241,228,0.12); border:1px solid rgba(246,241,228,0.25); display:flex; align-items:center; justify-content:center; color:var(--ochre); font-size:18px; flex-shrink:0;}
.brand-copy{ position:relative; z-index:1; max-width:420px; }
.brand-copy .eyebrow{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ochre); margin-bottom:18px; }
.brand-copy h1{ color:var(--cream); font-size:clamp(28px,3vw,38px); line-height:1.15; margin-bottom:18px; }
.brand-copy p{ color:rgba(246,241,228,0.78); font-size:15.5px; line-height:1.6; }
.brand-stats{ display:flex; gap:36px; position:relative; z-index:1; }
.brand-stats div b{ display:block; font-family:'Fraunces',serif; font-size:26px; color:var(--ochre); }
.brand-stats div span{ font-size:12px; color:rgba(246,241,228,0.65); }
.form-panel{ display:flex; align-items:center; justify-content:center; padding:40px 32px; }
.form-box{ width:100%; max-width:400px; }
.form-box > .mobile-logo{ display:none; }
.tabs{ display:flex; background:var(--cream); border-radius:999px; padding:4px; margin-bottom:32px; border:1px solid var(--line); }
.tab{ flex:1; text-align:center; padding:10px 0; border-radius:999px; font-size:14px; font-weight:600; color:var(--ink-soft); cursor:pointer; transition:.2s; border:none; background:none; font-family:'Inter',sans-serif;}
.tab.active{ background:var(--forest-deep); color:var(--cream); }
.welcome-msg{ background:var(--cream); border:1px solid var(--line); border-radius:14px; padding:16px 18px; display:flex; gap:12px; align-items:flex-start; margin-bottom:26px; }
.welcome-msg .av{ width:34px; height:34px; border-radius:50%; background:var(--forest-deep); flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--ochre); font-size:16px; }
.welcome-msg p{ font-size:13.5px; color:var(--ink-soft); }
.welcome-msg p b{ color:var(--forest-deep); font-family:'Fraunces',serif; font-weight:600; }
.form-box h2{ font-size:26px; margin-bottom:8px; }
.form-box > p.sub{ color:var(--ink-soft); font-size:14.5px; margin-bottom:28px; }
.field{ margin-bottom:18px; }
.field label{ display:block; font-size:13px; font-weight:600; color:var(--forest-deep); margin-bottom:7px; }
.field input{ width:100%; padding:13px 14px; border-radius:12px; border:1.5px solid var(--line); font-family:'Inter',sans-serif; font-size:14.5px; background:var(--cream-soft); transition:border-color .2s; }
.field input:focus{ border-color:var(--forest); outline:none; }
.auth-error{ color:var(--pepper); font-size:13px; margin-bottom:14px; }
.auth-note{ color:var(--forest); font-size:13px; margin-bottom:14px; }
.verify-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:22px; }
.verify-opt{ border:1.5px solid var(--line); border-radius:14px; padding:16px 12px; text-align:center; cursor:pointer; transition:.2s; background:var(--cream-soft); }
.verify-opt:hover{ border-color:var(--forest); }
.verify-opt.selected{ border-color:var(--forest-deep); background:var(--cream); box-shadow:0 0 0 3px rgba(31,77,58,0.1); }
.verify-opt .ic{ font-size:22px; margin-bottom:8px; }
.verify-opt .lbl{ font-size:12.5px; font-weight:600; color:var(--forest-deep); }
.btn{ font-family:'Inter',sans-serif; font-weight:600; font-size:15px; padding:13px 22px; border-radius:999px; border:none; cursor:pointer; transition:transform .15s, box-shadow .15s; width:100%; }
.btn-primary{ background:var(--forest-deep); color:var(--cream); }
.btn-primary:hover{ transform:translateY(-2px); box-shadow:0 10px 22px rgba(21,53,41,0.25); }
.btn-primary:disabled{ opacity:0.65; }
.btn-qr{ background:transparent; border:1.5px solid var(--line); color:var(--forest-deep); display:flex; align-items:center; justify-content:center; gap:8px; margin-top:12px;}
.btn-qr:hover{ border-color:var(--forest-deep); }
.qr-box{ text-align:center; padding:20px 0; }
.qr-square{ width:170px; height:170px; margin:0 auto 18px; background: repeating-linear-gradient(0deg, var(--forest-deep) 0 8px, transparent 8px 16px), repeating-linear-gradient(90deg, var(--forest-deep) 0 8px, transparent 8px 16px); background-blend-mode:multiply; background-color:#fff; border-radius:14px; border:1.5px solid var(--line); position:relative; }
.qr-square::after{ content:"⬛"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:54px; color:var(--forest-deep); opacity:.85;}
.qr-box p{ font-size:13.5px; color:var(--ink-soft); }
.foot-link{ text-align:center; margin-top:24px; font-size:13.5px; color:var(--ink-soft); }
.foot-link button{ background:none; border:none; color:var(--pepper); font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; font-size:13.5px; padding:0;}
.back-btn{ display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--ink-soft); background:none; border:none; cursor:pointer; margin-bottom:20px; font-family:'Inter',sans-serif;}
.back-btn:hover{ color:var(--forest-deep); }
.done-wrap{ text-align:center; padding:20px 0 10px; }
.done-check{ width:64px; height:64px; border-radius:50%; background:var(--forest-deep); color:var(--ochre); display:flex; align-items:center; justify-content:center; font-size:30px; margin:0 auto 22px; }
@media (max-width: 900px){
  .shell{ grid-template-columns:1fr; } .brand-panel{ display:none; }
  .form-box > .mobile-logo{ display:flex; align-items:center; gap:10px; font-family:'Fraunces',serif; font-weight:700; font-size:20px; color:var(--forest-deep); margin-bottom:34px; }
  .mobile-logo .logo-mark{ background:var(--forest-deep); } .form-panel{ padding:34px 24px; }
}
`;

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
      <style>{DASHBOARD_CSS}</style>
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

const DASHBOARD_CSS = `
:root{ --forest:#1F4D3A; --forest-deep:#153529; --cream:#F6F1E4; --cream-soft:#FBF8F0; --ochre:#E8A33D; --pepper:#C4471C; --ink:#22261F; --ink-soft:#5B5F52; --sage:#C9D3BE; --line: rgba(34,38,31,0.12); --radius:16px; --green-up:#2E9E5B; }
*{box-sizing:border-box; margin:0; padding:0;}
body{ font-family:'Inter',sans-serif; color:var(--ink); background:var(--cream-soft); }
h1,h2,h3{ font-family:'Fraunces',serif; font-weight:600; letter-spacing:-0.01em; color:var(--forest-deep); }
button{ font-family:'Inter',sans-serif; cursor:pointer; }
:focus-visible{ outline:3px solid var(--ochre); outline-offset:2px; }
.app{ display:grid; grid-template-columns:250px 1fr; min-height:100vh; }
.sidebar{ background:var(--forest-deep); color:var(--cream); padding:26px 18px; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; }
.logo{ display:flex; align-items:center; gap:10px; font-family:'Fraunces',serif; font-weight:700; font-size:19px; padding:0 8px 26px; }
.logo-mark{ width:30px; height:30px; border-radius:8px; background:rgba(246,241,228,0.12); border:1px solid rgba(246,241,228,0.22); display:flex; align-items:center; justify-content:center; color:var(--ochre); font-size:16px; flex-shrink:0;}
.role-switch{ display:flex; background:rgba(246,241,228,0.08); border-radius:999px; padding:4px; margin-bottom:26px; }
.role-btn{ flex:1; background:none; border:none; color:rgba(246,241,228,0.7); font-size:12.5px; font-weight:600; padding:8px 6px; border-radius:999px; transition:.2s;}
.role-btn.active{ background:var(--ochre); color:var(--forest-deep); }
.nav-group{ margin-bottom:22px; }
.nav-group .grp-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(246,241,228,0.4); padding:0 10px; margin-bottom:8px; }
.nav-item{ display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:10px; font-size:14px; color:rgba(246,241,228,0.82); text-decoration:none; margin-bottom:2px; cursor:pointer; transition:.15s; }
.nav-item:hover{ background:rgba(246,241,228,0.06); }
.nav-item.active{ background:rgba(246,241,228,0.12); color:var(--cream); font-weight:600; }
.nav-item .ic{ font-size:16px; width:18px; text-align:center; }
.sidebar-foot{ margin-top:auto; display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; background:rgba(246,241,228,0.06); }
.avatar{ width:36px; height:36px; border-radius:50%; background:var(--ochre); display:flex; align-items:center; justify-content:center; color:var(--forest-deep); font-weight:700; font-family:'Fraunces',serif; flex-shrink:0;}
.sidebar-foot .name{ font-size:13.5px; font-weight:600; }
.sidebar-foot .role{ font-size:11.5px; color:rgba(246,241,228,0.55); text-transform:capitalize; }
.main{ padding:28px 36px 60px; }
.topbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; gap:20px; flex-wrap:wrap;}
.topbar h1{ font-size:26px; }
.topbar .sub{ font-size:13.5px; color:var(--ink-soft); margin-top:2px; font-family:'Inter',sans-serif; }
.top-actions{ display:flex; gap:12px; align-items:center; }
.search-box{ display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid var(--line); border-radius:999px; padding:9px 16px; font-size:13.5px; color:var(--ink-soft); min-width:230px;}
.icon-btn{ width:38px; height:38px; border-radius:50%; background:#fff; border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:15px; position:relative;}
.icon-btn .dot{ position:absolute; top:6px; right:7px; width:7px; height:7px; border-radius:50%; background:var(--pepper); }
.btn{ font-weight:600; font-size:14px; padding:10px 18px; border-radius:999px; border:none; transition:.15s;}
.btn-primary{ background:var(--forest-deep); color:var(--cream); }
.btn-primary:hover{ transform:translateY(-2px); box-shadow:0 8px 18px rgba(21,53,41,0.25); }
.stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:30px; }
.stat-card{ background:#fff; border:1px solid var(--line); border-radius:var(--radius); padding:20px; }
.stat-card .lbl{ font-size:12.5px; color:var(--ink-soft); margin-bottom:10px; }
.stat-card .val{ font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:var(--forest-deep); }
.stat-card .delta{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; margin-top:6px; }
.delta.up{ color:var(--green-up); } .delta.down{ color:var(--pepper); }
.content-grid{ display:grid; grid-template-columns:1.6fr 1fr; gap:22px; align-items:start; }
.full-width{ max-width:760px; }
.settings-row{ display:flex; justify-content:space-between; align-items:center; padding:13px 4px; border-top:1px solid var(--line); font-size:13.5px; }
.settings-row:first-child{ border-top:none; }
.settings-row .k{ color:var(--ink-soft); font-weight:600; }
.settings-row .v{ color:var(--forest-deep); font-weight:600; }
.card{ background:#fff; border:1px solid var(--line); border-radius:var(--radius); padding:22px; margin-bottom:22px; }
.card-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.card-head h3{ font-size:17px; }
.empty-note{ font-size:13px; color:var(--ink-soft); }
table{ width:100%; border-collapse:collapse; }
th{ text-align:left; font-size:11.5px; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-soft); font-weight:600; padding:0 10px 10px; font-family:'IBM Plex Mono',monospace; }
td{ padding:12px 10px; font-size:13.5px; border-top:1px solid var(--line); }
tr:hover td{ background:var(--cream-soft); }
.prod-cell{ display:flex; align-items:center; gap:10px; }
.prod-thumb{ width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;}
.prod-cell .n{ font-weight:600; color:var(--forest-deep); }
.prod-cell .s{ font-size:11.5px; color:var(--ink-soft); }
.badge{ font-size:11px; font-weight:600; padding:4px 10px; border-radius:999px; display:inline-block; font-family:'Inter',sans-serif;}
.badge.green{ background:#E4F4EA; color:var(--green-up); }
.badge.amber{ background:#FDF1DD; color:#B4791F; }
.badge.red{ background:#FBE6DE; color:var(--pepper); }
.price-cell{ font-family:'IBM Plex Mono',monospace; font-weight:600; color:var(--forest-deep); }
.chat-row{ display:flex; align-items:center; gap:12px; padding:12px 4px; border-top:1px solid var(--line); }
.chat-row:first-child{ border-top:none; }
.chat-row .av{ width:38px; height:38px; border-radius:50%; background:var(--forest); color:var(--ochre); display:flex; align-items:center; justify-content:center; font-weight:700; font-family:'Fraunces',serif; flex-shrink:0;}
.chat-row .info{ flex:1; min-width:0; }
.chat-row .info .n{ font-size:13.5px; font-weight:600; color:var(--forest-deep); }
.chat-row .info .m{ font-size:12px; color:var(--ink-soft); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.chat-row .time{ font-size:11px; color:var(--ink-soft); font-family:'IBM Plex Mono',monospace; flex-shrink:0;}
.unread{ width:8px; height:8px; border-radius:50%; background:var(--pepper); flex-shrink:0;}
.alert-row{ display:flex; justify-content:space-between; align-items:center; padding:11px 4px; border-top:1px solid var(--line); font-size:13px;}
.alert-row:first-child{ border-top:none; }
.alert-row .crop{ font-weight:600; color:var(--forest-deep); }
.alert-row .loc{ color:var(--ink-soft); font-size:11.5px; }
.browse-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.produce-card{ border:1px solid var(--line); border-radius:14px; overflow:hidden; background:#fff; }
.produce-card .top{ height:96px; display:flex; align-items:center; justify-content:center; font-size:38px; }
.produce-card .body{ padding:14px; }
.produce-card .n{ font-weight:600; font-size:14px; color:var(--forest-deep); }
.produce-card .s{ font-size:11.5px; color:var(--ink-soft); margin:2px 0 10px; }
.produce-card .row{ display:flex; justify-content:space-between; align-items:center; }
.produce-card .price{ font-family:'IBM Plex Mono',monospace; font-weight:700; color:var(--pepper); font-size:13.5px; }
.produce-card button{ font-size:11.5px; font-weight:600; background:var(--forest-deep); color:var(--cream); border:none; border-radius:999px; padding:6px 12px; }
@media (max-width: 1080px){ .content-grid{ grid-template-columns:1fr; } .stat-grid{ grid-template-columns:1fr 1fr; } .browse-grid{ grid-template-columns:1fr 1fr; } }
@media (max-width: 860px){
  .app{ grid-template-columns:1fr; }
  .sidebar{ position:static; height:auto; flex-direction:row; align-items:center; overflow-x:auto; padding:14px 16px; gap:16px;}
  .logo{ padding:0; margin-right:auto; flex-shrink:0;} .role-switch{ margin:0; flex-shrink:0; width:170px; }
  .nav-group{ display:none; } .sidebar-foot{ margin:0; flex-shrink:0; }
  .main{ padding:22px 18px 50px; } .stat-grid{ grid-template-columns:1fr 1fr; gap:12px; }
  .search-box{ min-width:0; flex:1; } .browse-grid{ grid-template-columns:1fr; } table{ font-size:12px; }
}
`;

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
