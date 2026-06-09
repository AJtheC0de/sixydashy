import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Download,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { onIdTokenChanged } from "firebase/auth";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import { auth, database, loginWithEmail, logout, registerWithEmail, resetPassword } from "./firebase";

const STATUSES = ["Potentieller Lead", "Noch nichts", "Kontaktiert", "Warte auf Antwort"];
const WEBSITE_STATUSES = ["Keine Webseite", "Alte Webseite"];

const statusMeta = {
  "Potentieller Lead": { className: "status-potential", label: "Potentieller Lead" },
  "Noch nichts": { className: "status-new", label: "Noch nichts" },
  Kontaktiert: { className: "status-contacted", label: "Kontaktiert" },
  "Warte auf Antwort": { className: "status-waiting", label: "Warte auf Antwort" },
};

const emptyLead = {
  name: "",
  mapsUrl: "",
  status: "Noch nichts",
  websiteStatus: "Keine Webseite",
  phone: "",
  email: "",
  date: new Date().toISOString().slice(0, 10),
};

function formatDate(value) {
  if (!value) return "Kein Datum";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ";" && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] ?? statusMeta["Noch nichts"];
  return (
    <span className={`status-badge ${meta.className}`}>
      <span className="status-dot" />
      {meta.label}
    </span>
  );
}

const authErrorMessages = {
  "auth/email-already-in-use": "Für diese E-Mail-Adresse existiert bereits ein Konto.",
  "auth/invalid-credential": "E-Mail-Adresse oder Passwort ist nicht korrekt.",
  "auth/invalid-email": "Bitte gib eine gültige E-Mail-Adresse ein.",
  "auth/weak-password": "Das Passwort muss mindestens 6 Zeichen lang sein.",
  "auth/operation-not-allowed": "E-Mail-/Passwort-Login muss zuerst in Firebase aktiviert werden.",
  "auth/too-many-requests": "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
};

function AuthScreen({ anonymousUser }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setAuthError("");
    setMessage("");
    try {
      if (mode === "register") {
        await registerWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (error) {
      setAuthError(authErrorMessages[error.code] ?? "Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestReset() {
    if (!email.trim()) {
      setAuthError("Gib zuerst deine E-Mail-Adresse ein.");
      return;
    }
    setSubmitting(true);
    setAuthError("");
    try {
      await resetPassword(email.trim());
      setMessage("E-Mail zum Zurücksetzen des Passworts wurde versendet.");
    } catch (error) {
      setAuthError(authErrorMessages[error.code] ?? "Die E-Mail konnte nicht versendet werden.");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setAuthError("");
    setMessage("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img className="auth-logo" src="/logo.png" alt="LeadFlow Logo" />
          <div><span className="eyebrow">Lead Management</span><strong>LeadFlow</strong></div>
        </div>
        <div className="auth-heading">
          <span className="auth-icon"><LockKeyhole size={20} /></span>
          <h1>{mode === "register" ? "Konto erstellen" : "Willkommen zurück"}</h1>
          <p>{mode === "register" ? "Erstelle deinen persönlichen Zugang für alle Geräte." : "Melde dich an, um deine Leads auf allen Geräten zu sehen."}</p>
        </div>
        {anonymousUser && mode === "register" && (
          <div className="auth-info">Deine bisherigen Leads auf diesem Gerät werden mit dem neuen Konto verbunden.</div>
        )}
        {authError && <div className="auth-error">{authError}</div>}
        {message && <div className="auth-success">{message}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>E-Mail-Adresse</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@firma.ch" required autoFocus />
          </label>
          <label className="field">
            <span>Passwort</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 6 Zeichen" minLength={6} required />
          </label>
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Bitte warten..." : mode === "register" ? "Konto erstellen" : "Anmelden"}
          </button>
        </form>
        {mode === "login" && <button className="text-button" type="button" onClick={requestReset} disabled={submitting}>Passwort vergessen?</button>}
        <div className="auth-switch">
          <span>{mode === "register" ? "Du hast bereits ein Konto?" : "Noch kein Konto?"}</span>
          <button type="button" onClick={() => switchMode(mode === "register" ? "login" : "register")}>
            {mode === "register" ? "Jetzt anmelden" : "Konto erstellen"}
          </button>
        </div>
      </section>
    </main>
  );
}

function LeadForm({ initialValue, onClose, onSubmit, saving }) {
  const [form, setForm] = useState(initialValue ?? emptyLead);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">{initialValue ? "Lead bearbeiten" : "Neuer Eintrag"}</span>
            <h2 id="lead-modal-title">{initialValue ? initialValue.name : "Lead hinzufügen"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Schließen">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Name des Leads *</span>
              <input name="name" value={form.name} onChange={change} placeholder="z. B. Atelier Nord" required autoFocus />
            </label>
            <label className="field field-wide">
              <span>Google Maps Link <em>(optional)</em></span>
              <input name="mapsUrl" type="url" value={form.mapsUrl} onChange={change} placeholder="Optional: https://maps.google.com/..." />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" value={form.status} onChange={change}>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Webseite</span>
              <select name="websiteStatus" value={form.websiteStatus} onChange={change}>
                {WEBSITE_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Telefon</span>
              <input name="phone" type="tel" value={form.phone} onChange={change} placeholder="+41 79 000 00 00" />
            </label>
            <label className="field">
              <span>E-Mail</span>
              <input name="email" type="email" value={form.email} onChange={change} placeholder="kontakt@firma.ch" />
            </label>
            <label className="field field-wide">
              <span>Datum</span>
              <input name="date" type="date" value={form.date} onChange={change} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Abbrechen</button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Wird gespeichert..." : initialValue ? "Änderungen speichern" : "Lead hinzufügen"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function LeadCard({ lead, onEdit, onDelete, onStatusChange }) {
  return (
    <article className="lead-card">
      <div className="lead-card-head">
        <div className="lead-title-wrap">
          <div className="lead-avatar">{lead.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>{lead.name}</h3>
            <span className="lead-date"><CalendarDays size={14} /> {formatDate(lead.date)}</span>
          </div>
        </div>
        <div className="card-actions">
          <button className="icon-button" onClick={() => onEdit(lead)} aria-label={`${lead.name} bearbeiten`}><Pencil size={16} /></button>
          <button className="icon-button danger" onClick={() => onDelete(lead)} aria-label={`${lead.name} löschen`}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="lead-badges">
        <div className="select-badge-wrap">
          <StatusBadge status={lead.status} />
          <select value={lead.status} onChange={(event) => onStatusChange(lead, event.target.value)} aria-label="Status ändern">
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
          <ChevronDown size={13} />
        </div>
        <span className="website-badge"><Globe2 size={14} /> {lead.websiteStatus}</span>
      </div>

      <div className="lead-contact">
        {lead.phone ? <a href={`tel:${lead.phone}`}><Phone size={16} /><span>{lead.phone}</span></a> : <span className="empty-info"><Phone size={16} /> Kein Telefon</span>}
        {lead.email ? <a href={`mailto:${lead.email}`}><Mail size={16} /><span>{lead.email}</span></a> : <span className="empty-info"><Mail size={16} /> Keine E-Mail</span>}
      </div>

      {lead.mapsUrl ? (
        <a className="maps-link" href={lead.mapsUrl} target="_blank" rel="noreferrer">
          <MapPin size={16} /> Auf Google Maps öffnen <ArrowUpRight size={15} />
        </a>
      ) : (
        <span className="maps-link disabled"><MapPin size={16} /> Kein Maps-Link</span>
      )}
    </article>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [anonymousUser, setAnonymousUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [query, setQuery] = useState("");
  const [formLead, setFormLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    return onIdTokenChanged(auth, (currentUser) => {
      setAnonymousUser(currentUser?.isAnonymous ? currentUser : null);
      setUser(currentUser && !currentUser.isAnonymous ? currentUser : null);
      setAuthReady(true);
      if (!currentUser || currentUser.isAnonymous) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const leadsRef = ref(database, `leads/${user.uid}`);
    return onValue(
      leadsRef,
      (snapshot) => {
        const data = snapshot.val() ?? {};
        setLeads(Object.entries(data).map(([id, lead]) => ({ id, ...lead })).sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      },
      () => {
        setError("Leads konnten nicht geladen werden. Prüfe die Firebase Database Rules.");
        setLoading(false);
      },
    );
  }, [user]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "Alle" || lead.status === statusFilter;
      const matchesQuery = !normalizedQuery || [lead.name, lead.email, lead.phone].some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, leads.filter((lead) => lead.status === status).length])), [leads]);

  function openNewLead() {
    setFormLead(null);
    setModalOpen(true);
  }

  function openEditLead(lead) {
    setFormLead(lead);
    setModalOpen(true);
  }

  async function saveLead(form) {
    if (!user) return;
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      mapsUrl: form.mapsUrl.trim(),
      status: form.status,
      websiteStatus: form.websiteStatus,
      phone: form.phone.trim(),
      email: form.email.trim(),
      date: form.date,
      updatedAt: Date.now(),
    };
    try {
      if (formLead?.id) {
        await update(ref(database, `leads/${user.uid}/${formLead.id}`), payload);
      } else {
        const newLeadRef = push(ref(database, `leads/${user.uid}`));
        await set(newLeadRef, { ...payload, createdAt: Date.now() });
      }
      setModalOpen(false);
    } catch {
      setError("Der Lead konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(lead) {
    if (!user || !window.confirm(`"${lead.name}" wirklich löschen?`)) return;
    try {
      await remove(ref(database, `leads/${user.uid}/${lead.id}`));
    } catch {
      setError("Der Lead konnte nicht gelöscht werden.");
    }
  }

  async function changeStatus(lead, status) {
    if (!user) return;
    try {
      await update(ref(database, `leads/${user.uid}/${lead.id}`), { status, updatedAt: Date.now() });
    } catch {
      setError("Der Status konnte nicht aktualisiert werden.");
    }
  }

  function exportCsv() {
    const headers = ["Name", "Google Maps", "Status", "Webseite", "Telefon", "E-Mail", "Datum"];
    const rows = filteredLeads.map((lead) => [lead.name, lead.mapsUrl, lead.status, lead.websiteStatus, lead.phone, lead.email, lead.date]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    setImporting(true);
    setError("");
    setNotice("");
    try {
      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      const expectedHeaders = ["Name", "Google Maps", "Status", "Webseite", "Telefon", "E-Mail", "Datum"];
      const headers = rows.shift()?.map((header) => header.trim()) ?? [];
      if (expectedHeaders.some((header, index) => headers[index] !== header)) {
        throw new Error("invalid-format");
      }

      const now = Date.now();
      const updates = {};
      let importedCount = 0;
      rows.forEach((row, index) => {
        const [name, mapsUrl, status, websiteStatus, phone, email, date] = row.map((cell) => cell.trim());
        if (!name) return;
        const leadRef = push(ref(database, `leads/${user.uid}`));
        updates[leadRef.key] = {
          name,
          mapsUrl: mapsUrl ?? "",
          status: STATUSES.includes(status) ? status : "Noch nichts",
          websiteStatus: WEBSITE_STATUSES.includes(websiteStatus) ? websiteStatus : "Keine Webseite",
          phone: phone ?? "",
          email: email ?? "",
          date: date || new Date().toISOString().slice(0, 10),
          createdAt: now + index,
          updatedAt: now + index,
        };
        importedCount += 1;
      });

      if (!importedCount) throw new Error("empty-file");
      await update(ref(database, `leads/${user.uid}`), updates);
      setNotice(`${importedCount} ${importedCount === 1 ? "Lead wurde" : "Leads wurden"} erfolgreich importiert.`);
    } catch (importError) {
      setError(importError.message === "invalid-format"
        ? "Die CSV hat nicht das erwartete LeadFlow-Exportformat."
        : "Die CSV konnte nicht importiert werden.");
    } finally {
      setImporting(false);
    }
  }

  if (!authReady) {
    return <main className="auth-page"><div className="loader" /></main>;
  }

  if (!user) {
    return <AuthScreen anonymousUser={anonymousUser} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="brand-logo" src="/logo.png" alt="LeadFlow Logo" /><span>LeadFlow</span></div>
        <nav>
          <a className="nav-item active" href="#dashboard"><LayoutDashboard size={18} /> Übersicht</a>
          <a className="nav-item" href="#leads"><Users size={18} /> Alle Leads <span>{leads.length}</span></a>
        </nav>
        <div className="sidebar-note">
          <span className="sync-indicator"><i /> Firebase Sync</span>
          <p className="account-email">{user.email}</p>
          <button className="logout-button" type="button" onClick={logout}><LogOut size={14} /> Abmelden</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><img className="brand-logo" src="/logo.png" alt="LeadFlow Logo" /> LeadFlow</div>
          <div className="topbar-copy">
            <span className="eyebrow">Lead Management</span>
            <h1>Guten Tag</h1>
            <p>Hier ist der aktuelle Stand deiner Akquise.</p>
          </div>
          <button className="mobile-logout icon-button" type="button" onClick={logout} aria-label="Abmelden"><LogOut size={17} /></button>
          <button className="button button-primary add-button" onClick={openNewLead}><Plus size={18} /> Lead hinzufügen</button>
        </header>

        <section className="content" id="dashboard">
          {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div>}
          {notice && <div className="notice-banner"><span>{notice}</span><button onClick={() => setNotice("")}><X size={17} /></button></div>}

          <div className="stats-grid">
            <button className={`stat-card total ${statusFilter === "Alle" ? "selected" : ""}`} onClick={() => setStatusFilter("Alle")}>
              <span className="stat-icon"><Users size={19} /></span>
              <span><small>Alle Leads</small><strong>{leads.length}</strong></span>
              <ArrowUpRight size={17} className="stat-arrow" />
            </button>
            <button className={`stat-card ${statusFilter === "Noch nichts" ? "selected" : ""}`} onClick={() => setStatusFilter("Noch nichts")}>
              <span className="stat-icon neutral"><MoreHorizontal size={19} /></span>
              <span><small>Noch nichts</small><strong>{counts["Noch nichts"] ?? 0}</strong></span>
            </button>
            <button className={`stat-card ${statusFilter === "Potentieller Lead" ? "selected" : ""}`} onClick={() => setStatusFilter("Potentieller Lead")}>
              <span className="stat-icon potential"><CircleDot size={19} /></span>
              <span><small>Potentieller Lead</small><strong>{counts["Potentieller Lead"] ?? 0}</strong></span>
            </button>
            <button className={`stat-card ${statusFilter === "Kontaktiert" ? "selected" : ""}`} onClick={() => setStatusFilter("Kontaktiert")}>
              <span className="stat-icon blue"><Check size={19} /></span>
              <span><small>Kontaktiert</small><strong>{counts.Kontaktiert ?? 0}</strong></span>
            </button>
            <button className={`stat-card ${statusFilter === "Warte auf Antwort" ? "selected" : ""}`} onClick={() => setStatusFilter("Warte auf Antwort")}>
              <span className="stat-icon amber"><CalendarDays size={19} /></span>
              <span><small>Warte auf Antwort</small><strong>{counts["Warte auf Antwort"] ?? 0}</strong></span>
            </button>
          </div>

          <section className="leads-section" id="leads">
            <div className="section-heading">
              <div><span className="eyebrow">Pipeline</span><h2>Deine Leads</h2></div>
              <span className="result-count">{filteredLeads.length} {filteredLeads.length === 1 ? "Eintrag" : "Einträge"}</span>
            </div>
            <div className="toolbar">
              <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, E-Mail oder Telefon suchen..." /></label>
              <label className="filter-select"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Alle</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={16} /></label>
              <input className="visually-hidden" ref={importInputRef} type="file" accept=".csv,text/csv" onChange={importCsv} />
              <button className="button button-secondary import-button" onClick={() => importInputRef.current?.click()} disabled={importing}><Upload size={17} /> {importing ? "Importiert..." : "CSV Import"}</button>
              <button className="button button-secondary export-button" onClick={exportCsv} disabled={!filteredLeads.length}><Download size={17} /> CSV Export</button>
            </div>

            {loading ? (
              <div className="empty-state"><div className="loader" /><h3>Leads werden geladen</h3><p>Die Verbindung zu Firebase wird hergestellt.</p></div>
            ) : filteredLeads.length ? (
              <div className="lead-grid">{filteredLeads.map((lead) => <LeadCard key={lead.id} lead={lead} onEdit={openEditLead} onDelete={deleteLead} onStatusChange={changeStatus} />)}</div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon"><Users size={25} /></span>
                <h3>{leads.length ? "Keine passenden Leads" : "Noch keine Leads"}</h3>
                <p>{leads.length ? "Passe Suche oder Filter an." : "Füge deinen ersten Lead hinzu und starte deine Pipeline."}</p>
                {!leads.length && <button className="button button-primary" onClick={openNewLead}><Plus size={17} /> Ersten Lead hinzufügen</button>}
              </div>
            )}
          </section>
        </section>
      </main>
      <button className="mobile-add" onClick={openNewLead} aria-label="Lead hinzufügen"><Plus size={23} /></button>
      {modalOpen && <LeadForm initialValue={formLead} onClose={() => setModalOpen(false)} onSubmit={saveLead} saving={saving} />}
    </div>
  );
}
