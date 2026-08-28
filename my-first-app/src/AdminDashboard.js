import React, { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------
   Agrovite — Admin Dashboard
   Password-only login (POST /api/admin/login) then one tab per
   table in schema.sql, each with a list + add/edit/delete form.
   All writes send the admin token via the x-admin-token header.
------------------------------------------------------------------- */

const API_BASE = "http://localhost:4000/api";
const TOKEN_KEY = "agrovite_admin_token";

/* Column list (for the table view) + field list (for the add/edit
   form) per table — mirrors the `insertable` config in server.js
   and the columns in schema.sql. */
const TABLE_CONFIG = {
  users: {
    label: "Users",
    columns: ["id", "full_name", "email", "role", "location", "created_at"],
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", hint: "Leave blank to keep the current password when editing" },
      { name: "role", label: "Role", type: "select", options: ["farmer", "buyer", "transporter"] },
      { name: "location", label: "Location", type: "text" },
    ],
  },
  produce_listings: {
    label: "Produce Listings",
    columns: ["id", "seller_id", "crop_name", "grade", "quantity", "unit", "price", "currency", "location", "photo_url", "status", "created_at"],
    fields: [
      { name: "seller_id", label: "Seller ID", type: "number", required: true },
      { name: "crop_name", label: "Crop name", type: "text", required: true },
      { name: "grade", label: "Grade", type: "text" },
      { name: "quantity", label: "Quantity", type: "number", required: true },
      { name: "unit", label: "Unit", type: "text", required: true },
      { name: "price", label: "Price", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text" },
      { name: "location", label: "Location", type: "text", required: true },
      { name: "photo_url", label: "Photo URL / emoji", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["available", "reserved", "sold"] },
    ],
  },
  conversations: {
    label: "Conversations",
    columns: ["id", "listing_id", "buyer_id", "seller_id", "created_at"],
    fields: [
      { name: "listing_id", label: "Listing ID", type: "number", required: true },
      { name: "buyer_id", label: "Buyer ID", type: "number", required: true },
      { name: "seller_id", label: "Seller ID", type: "number", required: true },
    ],
  },
  messages: {
    label: "Messages",
    columns: ["id", "conversation_id", "sender_id", "body", "sent_at"],
    fields: [
      { name: "conversation_id", label: "Conversation ID", type: "number", required: true },
      { name: "sender_id", label: "Sender ID", type: "number", required: true },
      { name: "body", label: "Message", type: "textarea", required: true },
    ],
  },
  orders: {
    label: "Orders",
    columns: ["id", "listing_id", "buyer_id", "seller_id", "quantity", "agreed_price", "delivery_date", "status", "created_at"],
    fields: [
      { name: "listing_id", label: "Listing ID", type: "number", required: true },
      { name: "buyer_id", label: "Buyer ID", type: "number", required: true },
      { name: "seller_id", label: "Seller ID", type: "number", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true },
      { name: "agreed_price", label: "Agreed price", type: "number", required: true },
      { name: "delivery_date", label: "Delivery date", type: "date" },
      { name: "status", label: "Status", type: "select", options: ["pending", "confirmed", "delivered", "cancelled"] },
    ],
  },
  payments: {
    label: "Payments",
    columns: ["id", "order_id", "amount", "currency", "escrow_status", "held_at", "released_at"],
    fields: [
      { name: "order_id", label: "Order ID", type: "number", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text" },
      { name: "escrow_status", label: "Escrow status", type: "select", options: ["held", "released", "refunded"] },
      { name: "released_at", label: "Released at", type: "datetime-local" },
    ],
  },
  price_history: {
    label: "Price History",
    columns: ["id", "crop_name", "location", "price", "unit", "direction", "recorded_at"],
    fields: [
      { name: "crop_name", label: "Crop name", type: "text", required: true },
      { name: "location", label: "Location", type: "text", required: true },
      { name: "price", label: "Price", type: "number", required: true },
      { name: "unit", label: "Unit", type: "text", required: true },
      { name: "direction", label: "Direction", type: "select", options: ["up", "down"] },
    ],
  },
  price_alerts: {
    label: "Price Alerts",
    columns: ["id", "user_id", "crop_name", "location", "target_price", "direction", "created_at"],
    fields: [
      { name: "user_id", label: "User ID", type: "number", required: true },
      { name: "crop_name", label: "Crop name", type: "text", required: true },
      { name: "location", label: "Location", type: "text" },
      { name: "target_price", label: "Target price", type: "number", required: true },
      { name: "direction", label: "Direction", type: "select", options: ["above", "below"] },
    ],
  },
  waitlist_signups: {
    label: "Waitlist Signups",
    columns: ["id", "email", "signed_up_at"],
    fields: [{ name: "email", label: "Email", type: "email", required: true }],
  },
};

const TABLE_NAMES = Object.keys(TABLE_CONFIG);

function emptyFormValues(table) {
  const out = {};
  TABLE_CONFIG[table].fields.forEach((f) => (out[f.name] = ""));
  return out;
}

export default function AdminDashboard() {
  /* ---------- Auth ---------- */
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  /* ---------- Table data ---------- */
  const [activeTab, setActiveTab] = useState(TABLE_NAMES[0]);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const fetchList = useCallback(
    async (table, currentToken) => {
      setListLoading(true);
      setListError("");
      try {
        const res = await fetch(`${API_BASE}/${table}`, {
          headers: { "x-admin-token": currentToken },
        });
        if (res.status === 401) {
          handleLogout();
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to load ${table}`);
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setListError(err.message);
        setRows([]);
      } finally {
        setListLoading(false);
      }
    },
    [handleLogout]
  );

  useEffect(() => {
    if (token) fetchList(activeTab, token);
  }, [token, activeTab, fetchList]);

  /* ---------- Add / edit form ---------- */
  const [formValues, setFormValues] = useState(emptyFormValues(activeTab));
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const resetForm = useCallback(() => {
    setFormValues(emptyFormValues(activeTab));
    setEditingId(null);
    setFormError("");
  }, [activeTab]);

  useEffect(() => {
    resetForm();
  }, [activeTab, resetForm]);

  const startEdit = (row) => {
    const fields = TABLE_CONFIG[activeTab].fields;
    const next = {};
    fields.forEach((f) => {
      if (f.type === "password") {
        next[f.name] = ""; // never prefill password
      } else {
        next[f.name] = row[f.name] ?? "";
      }
    });
    setFormValues(next);
    setEditingId(row.id);
    setFormError("");
  };

  const handleFieldChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      // Drop empty optional fields (esp. blank "password" on edit)
      // so we don't overwrite existing values with empty strings.
      const payload = {};
      TABLE_CONFIG[activeTab].fields.forEach((f) => {
        const val = formValues[f.name];
        if (val !== "" && val !== undefined) payload[f.name] = val;
      });

      const url = editingId ? `${API_BASE}/${activeTab}/${editingId}` : `${API_BASE}/${activeTab}`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");

      resetForm();
      fetchList(activeTab, token);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete row #${id} from ${TABLE_CONFIG[activeTab].label}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/${activeTab}/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      if (editingId === id) resetForm();
      fetchList(activeTab, token);
    } catch (err) {
      setListError(err.message);
    }
  };

  /* ---------- Render ---------- */
  if (!token) {
    return (
      <>
        <style>{CSS}</style>
        <div className="admin-login-screen">
          <form className="admin-login-card" onSubmit={handleLogin}>
            <div className="admin-logo"><span className="admin-logo-mark">A</span>Agrovite Admin</div>
            <p className="admin-login-sub">Enter the admin password to continue.</p>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            {loginError && <p className="admin-error">{loginError}</p>}
            <button className="admin-btn admin-btn-primary" type="submit" disabled={loginLoading}>
              {loginLoading ? "Checking…" : "Log in"}
            </button>
          </form>
        </div>
      </>
    );
  }

  const config = TABLE_CONFIG[activeTab];

  return (
    <>
      <style>{CSS}</style>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-logo"><span className="admin-logo-mark">A</span>Agrovite Admin</div>
          <nav className="admin-tabs">
            {TABLE_NAMES.map((name) => (
              <button
                key={name}
                className={`admin-tab${activeTab === name ? " active" : ""}`}
                onClick={() => setActiveTab(name)}
              >
                {TABLE_CONFIG[name].label}
              </button>
            ))}
          </nav>
          <button className="admin-btn admin-btn-ghost admin-logout" onClick={handleLogout}>
            Log out
          </button>
        </aside>

        <main className="admin-main">
          <h1>{config.label}</h1>

          {/* -------- Add / edit form -------- */}
          <form className="admin-form" onSubmit={handleSubmit}>
            <h2>{editingId ? `Edit #${editingId}` : "Add new"}</h2>
            <div className="admin-form-grid">
              {config.fields.map((f) => (
                <label key={f.name} className="admin-field">
                  <span>{f.label}{f.required && !editingId ? " *" : ""}</span>
                  {f.type === "select" ? (
                    <select
                      value={formValues[f.name] ?? ""}
                      onChange={(e) => handleFieldChange(f.name, e.target.value)}
                      required={f.required && !editingId}
                    >
                      <option value="">— select —</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={formValues[f.name] ?? ""}
                      onChange={(e) => handleFieldChange(f.name, e.target.value)}
                      required={f.required && !editingId}
                    />
                  ) : (
                    <input
                      type={f.type}
                      value={formValues[f.name] ?? ""}
                      onChange={(e) => handleFieldChange(f.name, e.target.value)}
                      required={f.required && !editingId}
                      step={f.type === "number" ? "any" : undefined}
                    />
                  )}
                  {f.hint && <small>{f.hint}</small>}
                </label>
              ))}
            </div>
            {formError && <p className="admin-error">{formError}</p>}
            <div className="admin-form-actions">
              <button className="admin-btn admin-btn-primary" type="submit" disabled={formLoading}>
                {formLoading ? "Saving…" : editingId ? "Save changes" : "Add"}
              </button>
              {editingId && (
                <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* -------- List -------- */}
          <div className="admin-list-head">
            <h2>All rows</h2>
            <button className="admin-btn admin-btn-ghost" onClick={() => fetchList(activeTab, token)}>
              Refresh
            </button>
          </div>

          {listLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : listError ? (
            <p className="admin-error">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="admin-muted">No rows yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {config.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {config.columns.map((c) => (
                        <td key={c}>{String(row[c] ?? "")}</td>
                      ))}
                      <td className="admin-row-actions">
                        <button className="admin-link" onClick={() => startEdit(row)}>Edit</button>
                        <button className="admin-link admin-link-danger" onClick={() => handleDelete(row.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
   CSS — self-contained (this component can mount standalone at
   /admin), reusing Agrovite's brand colors in a simpler, utilitarian
   dashboard layout.
------------------------------------------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root{
  --forest:#1F4D3A;
  --forest-deep:#153529;
  --cream:#F6F1E4;
  --cream-soft:#FBF8F0;
  --ochre:#E8A33D;
  --pepper:#C4471C;
  --ink:#22261F;
  --ink-soft:#5B5F52;
  --line: rgba(34,38,31,0.14);
}
*{box-sizing:border-box;}
body{ margin:0; }
.admin-login-screen, .admin-shell{
  font-family:'Inter', sans-serif;
  color:var(--ink);
  background:var(--cream-soft);
  min-height:100vh;
}
.admin-logo{ display:flex; align-items:center; gap:10px; font-family:'Fraunces', serif; font-weight:700; font-size:18px; color:var(--forest-deep); }
.admin-logo-mark{
  width:30px; height:30px; border-radius:8px;
  background:linear-gradient(155deg, var(--forest) 0%, var(--forest-deep) 100%);
  display:flex; align-items:center; justify-content:center;
  color:var(--ochre); font-size:15px; flex-shrink:0;
}

/* ---- login screen ---- */
.admin-login-screen{ display:flex; align-items:center; justify-content:center; padding:20px; }
.admin-login-card{
  background:#fff; border:1px solid var(--line); border-radius:18px; padding:36px;
  width:100%; max-width:340px; display:flex; flex-direction:column; gap:14px;
  box-shadow:0 20px 50px -20px rgba(21,53,41,0.25);
}
.admin-login-sub{ font-size:13.5px; color:var(--ink-soft); margin:0; }

/* ---- shell / sidebar ---- */
.admin-shell{ display:flex; }
.admin-sidebar{
  width:230px; flex-shrink:0; background:var(--forest-deep); color:var(--cream);
  min-height:100vh; padding:24px 18px; display:flex; flex-direction:column; gap:24px;
}
.admin-sidebar .admin-logo{ color:var(--cream); }
.admin-tabs{ display:flex; flex-direction:column; gap:4px; flex:1; }
.admin-tab{
  text-align:left; background:none; border:none; color:rgba(246,241,228,0.75);
  padding:10px 12px; border-radius:9px; font-size:13.5px; font-weight:500; cursor:pointer;
}
.admin-tab:hover{ background:rgba(246,241,228,0.08); color:var(--cream); }
.admin-tab.active{ background:var(--ochre); color:var(--forest-deep); font-weight:700; }
.admin-logout{ align-self:flex-start; }

/* ---- main ---- */
.admin-main{ flex:1; padding:32px 40px; max-width:1000px; }
.admin-main h1{ font-family:'Fraunces', serif; font-size:26px; color:var(--forest-deep); margin:0 0 20px; }
.admin-main h2{ font-family:'Inter', sans-serif; font-size:15px; margin:0 0 12px; color:var(--forest-deep); }

.admin-form{ background:#fff; border:1px solid var(--line); border-radius:16px; padding:22px 24px; margin-bottom:32px; }
.admin-form-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:14px; }
.admin-field{ display:flex; flex-direction:column; gap:6px; font-size:12.5px; font-weight:600; color:var(--ink-soft); }
.admin-field input, .admin-field select, .admin-field textarea{
  font-family:'Inter', sans-serif; font-size:14px; font-weight:400; color:var(--ink);
  padding:9px 11px; border-radius:9px; border:1px solid var(--line); background:var(--cream-soft);
}
.admin-field textarea{ min-height:70px; resize:vertical; }
.admin-field small{ font-weight:400; color:var(--ink-soft); font-size:11.5px; }
.admin-form-actions{ display:flex; gap:10px; margin-top:18px; }

.admin-btn{
  font-family:'Inter', sans-serif; font-weight:600; font-size:13.5px;
  padding:9px 18px; border-radius:999px; border:none; cursor:pointer;
}
.admin-btn-primary{ background:var(--forest-deep); color:var(--cream); }
.admin-btn-primary:disabled{ opacity:0.6; cursor:default; }
.admin-btn-ghost{ background:transparent; color:var(--forest-deep); border:1.5px solid var(--line); }

.admin-list-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.admin-muted{ color:var(--ink-soft); font-size:13.5px; }
.admin-error{ color:var(--pepper); font-size:13px; margin:6px 0 0; }

.admin-table-wrap{ overflow-x:auto; border:1px solid var(--line); border-radius:14px; background:#fff; }
.admin-table{ width:100%; border-collapse:collapse; font-size:13px; }
.admin-table th, .admin-table td{ text-align:left; padding:10px 14px; border-bottom:1px solid var(--line); white-space:nowrap; }
.admin-table th{ font-family:'IBM Plex Mono', monospace; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-soft); background:var(--cream-soft); }
.admin-row-actions{ display:flex; gap:12px; }
.admin-link{ background:none; border:none; color:var(--forest-deep); font-weight:600; font-size:12.5px; cursor:pointer; padding:0; }
.admin-link-danger{ color:var(--pepper); }

@media (max-width: 760px){
  .admin-shell{ flex-direction:column; }
  .admin-sidebar{ width:100%; min-height:auto; flex-direction:row; flex-wrap:wrap; align-items:center; }
  .admin-tabs{ flex-direction:row; flex-wrap:wrap; }
  .admin-main{ padding:24px 18px; }
}
`;
