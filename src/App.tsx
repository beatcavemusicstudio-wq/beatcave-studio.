/**
 * BEATCAVE STUDIO — App principale
 * File: App.tsx
 */

import { useState, useEffect } from "react";
import type { SessioneCompleta, Prenotazione, TabId, Schermata, Cliente } from "./types";
import {
  fetchSessioniFuture, fetchClienti, inserisciSessione, aggiornaSessione,
  eliminaSessione, inserisciCliente, aggiornaCliente,
  dbToSessione, dbToCliente,
} from "./supabase";
import NuovaPrenotazione from "./NuovaPrenotazione";
import SchedaSessione from "./SchedaSessione";
import SezioneClienti from "./SchedaCliente";
import SezioneFatture from "./SezioneFatture";
import SezioneCalendario from "./SezioneCalendario";
import SezioneDisponibilita from "./SezioneDisponibilita";
import SezioneRichieste from "./SezioneRichieste";
import SezioneStorage from "./SezioneStorage";

const C = {
  orange:      "#E8610A",
  orangeMid:   "#F97316",
  orangeLight: "#FEF0E6",
  dark:        "#0D0D0D",
  green:       "#1D9E75",
  greenLight:  "#E1F5EE",
  greenDark:   "#0F6E56",
  purple:      "#534AB7",
  amber:       "#BA7517",
  amberLight:  "#FAEEDA",
  amberDark:   "#854F0B",
  border:      "rgba(0,0,0,0.08)",
  bg:          "#f5f5f5",
  surface:     "rgba(0,0,0,0.04)",
} as const;

type TipoSessione  = "Registrazione" | "Mixing" | "Produzione" | "Mastering";
type StatoSessione = "in_corso" | "confermata" | "da_confermare";

const SESSION_COLORS: Record<TipoSessione, string> = {
  Registrazione: C.orange, Mixing: C.green, Produzione: C.purple, Mastering: C.amber,
};

const MESI       = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const BASE = "https://lpznonwpofwywtvikgfm.supabase.co/rest/v1";
const KEY  = "sb_publishable_BGd9aD4jqt6K6txVpDCifA_C-IvCaP_";
const H    = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };

async function fetchRichiesteInAttesa(): Promise<number> {
  try {
    const res = await fetch(`${BASE}/richieste?stato=eq.in_attesa&select=id`, { headers: H });
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  } catch { return 0; }
}

function oggiISO(): string { return new Date().toISOString().split("T")[0]; }

function formatDataBreve(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const gg = d.toLocaleDateString("it-IT", { weekday: "short" });
  const isOggi = iso === oggiISO();
  const domani = new Date(); domani.setDate(domani.getDate() + 1);
  const isDomani = iso === domani.toISOString().split("T")[0];
  if (isOggi) return "Oggi";
  if (isDomani) return "Domani";
  return `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

function badgeConfig(stato: StatoSessione) {
  switch (stato) {
    case "in_corso":      return { label: "In corso",      bg: "#FEF0E6",    color: C.orange    };
    case "confermata":    return { label: "Confermata",    bg: C.greenLight, color: C.greenDark };
    case "da_confermare": return { label: "Da confermare", bg: C.amberLight, color: C.amberDark };
  }
}

const RESPONSIVE_CSS = `
  .bc-app { display: flex; width: 100%; min-height: 100dvh; }
  .bc-sidebar { display: none; }
  .bc-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .bc-tabbar { display: block; }
  .bc-mobile-header { display: block; }
  .bc-sidebar-spacer { display: none; }
  @media (min-width: 768px) {
    .bc-sidebar { display: flex; flex-direction: column; width: 220px; background: #0D0D0D; flex-shrink: 0; position: fixed; top: 0; left: 0; height: 100vh; z-index: 10; }
    .bc-main { margin-left: 220px; }
    .bc-tabbar { display: none !important; }
    .bc-mobile-header { display: none !important; }
    .bc-sidebar-spacer { display: block; width: 220px; flex-shrink: 0; }
  }
`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 10 }}>{children}</div>;
}
function Divider() { return <div style={{ height: "0.5px", background: C.border, margin: "14px 16px 0" }} />; }

function LoadingScreen() {
  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif" }}>
      <img src="/logo.png" alt="Beatcave Studio" style={{ height: 36, width: "auto", filter: "brightness(0) invert(1)", marginBottom: 24 }} />
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.orange, opacity: 0.3 + i * 0.3 }} />)}
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 8 }}>Errore di connessione</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 24, textAlign: "center" }}>{msg}</div>
      <button onClick={onRetry} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Riprova</button>
    </div>
  );
}

// ── MENU "ALTRO" MOBILE ──
function MenuAltro({ onClose, onChange, richiesteInAttesa }: { onClose: () => void; onChange: (t: TabId) => void; richiesteInAttesa: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 70, left: 0, right: 0, background: "#fff", borderRadius: "16px 16px 0 0", padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingLeft: 4 }}>Altro</div>
        {[
          { id: "fatture"       as TabId, label: "Fatture",       emoji: "📄" },
          { id: "disponibilita" as TabId, label: "Disponibilità", emoji: "📅" },
          { id: "richieste"     as TabId, label: "Richieste",     emoji: "📬", badge: richiesteInAttesa },
      { id: "storage" as TabId, label: "Beatcave Cloud", emoji: "☁️" },
        ].map(item => (
          <button key={item.id} onClick={() => { onChange(item.id); onClose(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 12px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", marginBottom: 4, position: "relative" }}>
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#222" }}>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <div style={{ marginLeft: "auto", background: "#E24B4A", color: "#fff", fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.badge}
              </div>
            )}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: item.badge ? 8 : "auto" }}><path d="M5 2l4 5-4 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ activeTab, onChange, richiesteInAttesa }: { activeTab: TabId; onChange: (t: TabId) => void; richiesteInAttesa: number }) {
  const d = new Date();
  const gg = d.toLocaleDateString("it-IT", { weekday: "long" });
  const data = `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI[d.getMonth()]}`;
  const tabs: { id: TabId; label: string; badge?: number; icon: (a: boolean) => JSX.Element }[] = [
    { id: "home",          label: "Dashboard",    icon: (a) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" fill={a ? C.orange : "rgba(255,255,255,0.4)"}/><rect x="9" y="2" width="5" height="5" rx="1.5" fill={a ? C.orange+"88" : "rgba(255,255,255,0.2)"}/><rect x="2" y="9" width="5" height="5" rx="1.5" fill={a ? C.orange+"88" : "rgba(255,255,255,0.2)"}/><rect x="9" y="9" width="5" height="5" rx="1.5" fill={a ? C.orange+"44" : "rgba(255,255,255,0.1)"}/></svg> },
    { id: "calendario",    label: "Calendario",   icon: (a) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="10" rx="2" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2"/><path d="M5 2v3M11 2v3M2 7h12" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { id: "clienti",       label: "Clienti",      icon: (a) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2"/><path d="M2 14c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { id: "fatture",       label: "Fatture",      icon: (a) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="13" rx="2" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2"/><path d="M5 6h6M5 9h6M5 12h3" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { id: "disponibilita", label: "Disponibilità",icon: (a) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2"/><path d="M5 8h6M8 5v6" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { id: "richieste",     label: "Richieste",    badge: richiesteInAttesa, icon: (a) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2"/><path d="M8 5v4M8 11v.5" stroke={a ? C.orange : "rgba(255,255,255,0.4)"} strokeWidth="1.2" strokeLinecap="round"/></svg> },
  ];
  return (
    <div className="bc-sidebar">
      <div style={{ padding: "20px 20px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
        <img src="/logo.png" alt="Beatcave Studio" style={{ height: 26, width: "auto", filter: "brightness(0) invert(1)", display: "block" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{data}</div>
      </div>
      <div style={{ padding: "12px 10px", flex: 1 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === tab.id ? "rgba(232,97,10,0.15)" : "transparent", marginBottom: 2 }}>
            {tab.icon(activeTab === tab.id)}
            <span style={{ fontSize: 13, fontWeight: 500, color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.5)", flex: 1, textAlign: "left" }}>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <div style={{ background: "#E24B4A", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{tab.badge}</div>
            )}
          </button>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: "0.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>VS</div>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Admin</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Beatcave Studio</div>
        </div>
      </div>
    </div>
  );
}

function MobileTopbar() {
  return (
    <div className="bc-mobile-header" style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <img src="/logo.png" alt="Beatcave Studio" style={{ height: 28, width: "auto", filter: "brightness(0) invert(1)", display: "block" }} />
    </div>
  );
}

function StatCards({ sessioni, clienti }: { sessioni: SessioneCompleta[]; clienti: Cliente[] }) {
  const oggi = oggiISO();
  const sessioniOggi = sessioni.filter(s => s.data === oggi);
  const incassoOggi = sessioniOggi.filter(s => s.pagato).reduce((acc, s) => acc + s.prezzo, 0);
  const items = [
    { valore: String(sessioniOggi.length), label: "Sessioni oggi", colore: C.orange },
    { valore: `€${incassoOggi}`,           label: "Incasso oggi",  colore: C.green  },
    { valore: String(clienti.length),      label: "Clienti",       colore: null      },
  ];
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <SectionLabel>Panoramica</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: item.colore ?? "inherit" }}>{item.valore}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessioniFuture({ sessioni, onTap }: { sessioni: SessioneCompleta[]; onTap: (s: SessioneCompleta) => void }) {
  const oggi = oggiISO();
  const perGiorno = sessioni.reduce((acc, s) => {
    if (!acc[s.data]) acc[s.data] = [];
    acc[s.data].push(s);
    return acc;
  }, {} as Record<string, SessioneCompleta[]>);
  const date = Object.keys(perGiorno).sort();

  if (sessioni.length === 0) {
    return <div style={{ textAlign: "center", padding: "32px 0" }}><div style={{ fontSize: 13, color: "#aaa" }}>Nessuna sessione in programma</div></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {date.map(data => (
        <div key={data}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: data === oggi ? C.orange : "#555", background: data === oggi ? C.orangeLight : "transparent", padding: data === oggi ? "3px 10px" : "3px 0", borderRadius: 20 }}>
              {formatDataBreve(data)}
            </div>
            <div style={{ flex: 1, height: "0.5px", background: C.border }} />
            <div style={{ fontSize: 11, color: "#aaa" }}>{perGiorno[data].length} sess.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {perGiorno[data].map(s => {
              const badge = badgeConfig(s.stato as StatoSessione);
              return (
                <div key={s.id} onClick={() => onTap(s)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: SESSION_COLORS[s.tipo as TipoSessione], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.cliente}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      {s.oraInizio} – {s.oraFine} · {s.tipo}
                      {s.pagato && <span style={{ marginLeft: 6, color: C.green }}>· €{s.prezzo} ✓</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l4 5-4 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TAB BAR MOBILE con tab "Altro" ──
function TabBar({ active, onChange, richiesteInAttesa }: { active: TabId; onChange: (t: TabId) => void; richiesteInAttesa: number }) {
  const [showAltro, setShowAltro] = useState(false);

  const isAltroActive = ["fatture","disponibilita","richieste"].includes(active);
  const hasBadge = richiesteInAttesa > 0;

  const tabs = [
    { id: "home"       as TabId, label: "Home",       icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill={a ? C.orange : "#ccc"}/><rect x="12" y="3" width="7" height="7" rx="2" fill={a ? C.orange+"88" : "#e5e5e5"}/><rect x="3" y="12" width="7" height="7" rx="2" fill={a ? C.orange+"88" : "#e5e5e5"}/><rect x="12" y="12" width="7" height="7" rx="2" fill={a ? C.orange+"44" : "#ebebeb"}/></svg> },
    { id: "calendario" as TabId, label: "Calendario", icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="14" rx="2.5" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5"/><path d="M8 3v4M14 3v4M3 10h16" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: "clienti"    as TabId, label: "Clienti",    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8" r="4" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5"/><path d="M3 19c0-3.866 3.582-7 8-7s8 3.134 8 7" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ];

  return (
    <>
      {showAltro && <MenuAltro onClose={() => setShowAltro(false)} onChange={id => { onChange(id); setShowAltro(false); }} richiesteInAttesa={richiesteInAttesa} />}
      <div className="bc-tabbar" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: `0.5px solid ${C.border}`, background: "#fff", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{ padding: "9px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
            {tab.icon(tab.id === active)}
            <span style={{ fontSize: 10, fontWeight: tab.id === active ? 700 : 400, color: tab.id === active ? C.orange : "#bbb" }}>{tab.label}</span>
          </button>
        ))}
        {/* Tab ALTRO */}
        <button onClick={() => setShowAltro(true)} style={{ padding: "9px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", position: "relative" }}>
          {hasBadge && (
            <div style={{ position: "absolute", top: 6, right: "50%", transform: "translateX(8px)", background: "#E24B4A", width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #fff" }} />
          )}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="6" cy="11" r="1.5" fill={isAltroActive ? C.orange : "#ccc"}/>
            <circle cx="11" cy="11" r="1.5" fill={isAltroActive ? C.orange : "#ccc"}/>
            <circle cx="16" cy="11" r="1.5" fill={isAltroActive ? C.orange : "#ccc"}/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: isAltroActive ? 700 : 400, color: isAltroActive ? C.orange : "#bbb" }}>Altro</span>
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// APP PRINCIPALE
// ─────────────────────────────────────────────────────────

export default function App() {
  const [schermata, setSchermata]           = useState<Schermata>("home");
  const [activeTab, setActiveTab]           = useState<TabId>("home");
  const [sessioni, setSessioni]             = useState<SessioneCompleta[]>([]);
  const [clienti, setClienti]               = useState<Cliente[]>([]);
  const [sessioneAttiva, setSessioneAttiva] = useState<SessioneCompleta | null>(null);
  const [loading, setLoading]               = useState(true);
  const [errore, setErrore]                 = useState<string | null>(null);
  const [dataPreselezionata, setDataPresel] = useState<string | undefined>(undefined);
  const [richiesteInAttesa, setRichieste]   = useState(0);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = RESPONSIVE_CSS;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const caricaDati = async () => {
    setLoading(true);
    setErrore(null);
    try {
      const [righeSessioni, righeClienti, numRichieste] = await Promise.all([
        fetchSessioniFuture(),
        fetchClienti(),
        fetchRichiesteInAttesa(),
      ]);
      setSessioni(righeSessioni.map(dbToSessione));
      setClienti(righeClienti.map(dbToCliente));
      setRichieste(numRichieste);
    } catch {
      setErrore("Impossibile connettersi al database. Controlla la connessione.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { caricaDati(); }, []);

  // Ricarica il badge ogni 30 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRichiesteInAttesa().then(setRichieste);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNuovoCliente = async (dati: { nome: string; email: string; telefono: string }): Promise<Cliente> => {
    const row = await inserisciCliente(dati);
    const nuovoCliente = dbToCliente(row);
    setClienti(prev => [...prev, nuovoCliente].sort((a, b) => a.nome.localeCompare(b.nome)));
    return nuovoCliente;
  };

  const handleNuovaPrenotazione = async (p: Prenotazione) => {
    try {
      const row = await inserisciSessione({
        cliente_nome: p.clienteNome, cliente_email: p.clienteEmail,
        data: p.data, ora_inizio: p.oraInizio, ora_fine: p.oraFine,
        tipo: p.tipo, stato: "confermata", prezzo: p.prezzo, pagato: p.pagato,
        note: p.note, pacchetto_id: p.pacchettoId ?? null,
      });
      const nuova = dbToSessione(row);
      if (nuova.data >= oggiISO()) {
        setSessioni(prev => [...prev, nuova].sort((a, b) => a.data.localeCompare(b.data) || a.oraInizio.localeCompare(b.oraInizio)));
      }
    } catch { alert("Errore nel salvare la prenotazione. Riprova."); }
    setDataPresel(undefined);
    if (activeTab === "calendario") setSchermata("calendario");
    else { setSchermata("home"); setActiveTab("home"); }
  };

  const handleAggiornaSessione = async (aggiornata: SessioneCompleta) => {
    try {
      await aggiornaSessione(aggiornata.id, {
        cliente_nome: aggiornata.cliente, cliente_email: aggiornata.clienteEmail,
        data: aggiornata.data, ora_inizio: aggiornata.oraInizio, ora_fine: aggiornata.oraFine,
        tipo: aggiornata.tipo, stato: aggiornata.stato, prezzo: aggiornata.prezzo,
        pagato: aggiornata.pagato, note: aggiornata.note,
      });
      setSessioni(prev => prev.map(s => s.id === aggiornata.id ? aggiornata : s));
      setSessioneAttiva(aggiornata);
    } catch { alert("Errore nell'aggiornare la sessione."); }
  };

  const handleEliminaSessione = async (id: number) => {
    try {
      await eliminaSessione(id);
      setSessioni(prev => prev.filter(s => s.id !== id));
    } catch { alert("Errore nell'eliminare la sessione."); }
  };

  const handleDuplicaSessione = async (duplicata: SessioneCompleta) => {
    try {
      const row = await inserisciSessione({
        cliente_nome: duplicata.cliente, cliente_email: duplicata.clienteEmail,
        data: duplicata.data, ora_inizio: duplicata.oraInizio, ora_fine: duplicata.oraFine,
        tipo: duplicata.tipo, stato: "confermata", prezzo: duplicata.prezzo,
        pagato: false, note: duplicata.note, pacchetto_id: null,
      });
      const nuova = dbToSessione(row);
      if (nuova.data >= oggiISO()) {
        setSessioni(prev => [...prev, nuova].sort((a, b) => a.data.localeCompare(b.data) || a.oraInizio.localeCompare(b.oraInizio)));
      }
    } catch { alert("Errore nella duplicazione."); }
  };

  const handleAggiungiCliente = async (dati: Omit<Cliente, "id" | "dataCreazioneISO">) => {
    try { await handleNuovoCliente(dati); }
    catch { alert("Errore nell'aggiungere il cliente."); }
  };

  const handleModificaCliente = async (aggiornato: Cliente) => {
    try {
      await aggiornaCliente(aggiornato.id, { nome: aggiornato.nome, email: aggiornato.email, telefono: aggiornato.telefono });
      setClienti(prev => prev.map(c => c.id === aggiornato.id ? aggiornato : c));
    } catch { alert("Errore nell'aggiornare il cliente."); }
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "clienti")         setSchermata("clienti");
    else if (tab === "fatture")    setSchermata("fatture");
    else if (tab === "calendario") setSchermata("calendario");
    else if (tab === "disponibilita") setSchermata("disponibilita");
    else if (tab === "richieste")  { setSchermata("richieste"); fetchRichiesteInAttesa().then(setRichieste); }
    else if (tab === "storage")    setSchermata("storage");
    else setSchermata("home");
  };

  const aprireNuovaPrenotazione = (data?: string) => {
    setDataPresel(data);
    setSchermata("nuova-prenotazione");
  };

  if (loading) return <LoadingScreen />;
  if (errore)  return <ErrorScreen msg={errore} onRetry={caricaDati} />;

  if (schermata === "nuova-prenotazione") {
    return (
      <NuovaPrenotazione
        clienti={clienti}
        dataIniziale={dataPreselezionata}
        onSalva={handleNuovaPrenotazione}
        onClose={() => {
          setDataPresel(undefined);
          if (activeTab === "calendario") setSchermata("calendario");
          else setSchermata("home");
        }}
        onNuovoCliente={handleNuovoCliente}
      />
    );
  }

  if (schermata === "scheda-sessione" && sessioneAttiva) {
    return (
      <div style={{ display: "flex", width: "100%", minHeight: "100dvh", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
        <Sidebar activeTab={activeTab} onChange={handleTabChange} richiesteInAttesa={richiesteInAttesa} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SchedaSessione
            sessione={sessioneAttiva}
            onClose={() => {
              if (activeTab === "calendario") setSchermata("calendario");
              else { setSchermata("home"); setSessioneAttiva(null); }
            }}
            onAggiorna={handleAggiornaSessione}
            onElimina={handleEliminaSessione}
            onDuplica={handleDuplicaSessione}
          />
        </div>
      </div>
    );
  }

  const wrapWithLayout = (content: JSX.Element) => (
    <div className="bc-app" style={{ fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <Sidebar activeTab={activeTab} onChange={handleTabChange} richiesteInAttesa={richiesteInAttesa} />
      <div className="bc-main" style={{ background: C.bg }}>
        {content}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
          <TabBar active={activeTab} onChange={handleTabChange} richiesteInAttesa={richiesteInAttesa} />
        </div>
      </div>
    </div>
  );

  if (schermata === "calendario")    return wrapWithLayout(<SezioneCalendario onApriSessione={s => { setSessioneAttiva(s); setSchermata("scheda-sessione"); }} onNuovaPrenotazione={aprireNuovaPrenotazione} />);
  if (schermata === "clienti")       return wrapWithLayout(<SezioneClienti clienti={clienti} sessioni={sessioni} onClose={() => { setSchermata("home"); setActiveTab("home"); }} onAggiungiCliente={handleAggiungiCliente} onModificaCliente={handleModificaCliente} onNuovaPrenotazione={(_id) => aprireNuovaPrenotazione()} />);
  if (schermata === "fatture")       return wrapWithLayout(<SezioneFatture clienti={clienti} sessioniOggi={sessioni} />);
  if (schermata === "disponibilita") return wrapWithLayout(<SezioneDisponibilita />);
  if (schermata === "richieste")     return wrapWithLayout(<SezioneRichieste />);
  if (schermata === "storage") return wrapWithLayout(<SezioneStorage />);

  // ── HOME ──
  return (
    <div className="bc-app" style={{ fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <Sidebar activeTab={activeTab} onChange={handleTabChange} richiesteInAttesa={richiesteInAttesa} />
      <div className="bc-main" style={{ background: C.bg }}>
        <MobileTopbar />
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}>
          <StatCards sessioni={sessioni} clienti={clienti} />
          <Divider />
          <div style={{ paddingTop: 14, padding: "14px 16px 0" }}>
            <SectionLabel>Prossime sessioni</SectionLabel>
            <SessioniFuture sessioni={sessioni} onTap={s => { setSessioneAttiva(s); setSchermata("scheda-sessione"); }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 10px" }}>
            <button onClick={() => aprireNuovaPrenotazione()} style={{ width: 52, height: 52, borderRadius: "50%", background: C.orange, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${C.orange}55` }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
          <TabBar active={activeTab} onChange={handleTabChange} richiesteInAttesa={richiesteInAttesa} />
        </div>
      </div>
    </div>
  );
}
