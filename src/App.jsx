import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Globe2,
  LayoutDashboard,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import { auth, connectAnonymously, database } from "./firebase";

const STATUSES = ["Noch nichts", "Kontaktiert", "Warte auf Antwort"];
const WEBSITE_STATUSES = ["Keine Webseite", "Alte Webseite"];

const statusMeta = {
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

function StatusBadge({ status }) {
  const meta = statusMeta[status] ?? statusMeta["Noch nichts"];
  return (
    <span className={`status-badge ${meta.className}`}>
      <span className="status-dot" />
      {meta.label}
    </span>
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
              <span>Google Maps Link</span>
              <input name="mapsUrl" type="url" value={form.mapsUrl} onChange={change} placeholder="https://maps.google.com/..." />
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
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [query, setQuery] = useState("");
  const [formLead, setFormLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        return;
      }
      try {
        await connectAnonymously();
      } catch (authError) {
        setError("Firebase-Verbindung fehlgeschlagen. Aktiviere Anonymous Auth in der Firebase Console.");
        setLoading(false);
      }
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
          <p>Deine Leads werden automatisch gespeichert.</p>
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
          <button className="button button-primary add-button" onClick={openNewLead}><Plus size={18} /> Lead hinzufügen</button>
        </header>

        <section className="content" id="dashboard">
          {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div>}

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
