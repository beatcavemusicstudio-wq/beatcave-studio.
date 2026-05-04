/**
 * BEATCAVE STUDIO — App principale
 * File: App.tsx
 */

import { useState, useEffect } from "react";
import type { SessioneCompleta, Prenotazione, TabId, Schermata, Cliente } from "./types";
import {
  fetchSessioni, fetchClienti, inserisciSessione, aggiornaSessione,
  eliminaSessione, inserisciCliente, aggiornaCliente,
  dbToSessione, dbToCliente,
} from "./supabase";
import NuovaPrenotazione from "./NuovaPrenotazione";
import SchedaSessione from "./SchedaSessione";
import SezioneClienti from "./SchedaCliente";
import SezioneFatture from "./SezioneFatture";

const C = {
  orange:     "#E8610A",
  orangeMid:  "#F97316",
  dark:       "#0D0D0D",
  green:      "#1D9E75",
  greenLight: "#E1F5EE",
  greenDark:  "#0F6E56",
  purple:     "#534AB7",
  amber:      "#BA7517",
  amberLight: "#FAEEDA",
  amberDark:  "#854F0B",
  border:     "rgba(0,0,0,0.08)",
  bg:         "#f5f5f5",
  surface:    "rgba(0,0,0,0.04)",
} as const;

type TipoSessione = "Registrazione" | "Mixing" | "Produzione" | "Mastering";
type StatoSessione = "in_corso" | "confermata" | "da_confermare";

const SESSION_COLORS: Record<TipoSessione, string> = {
  Registrazione: C.orange, Mixing: C.green, Produzione: C.purple, Mastering: C.amber,
};

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const GIORNI_BREVI = ["L","M","M","G","V","S","D"];

function giornoISO(d: Date): number { return (d.getDay() + 6) % 7; }
interface Cella { giorno: number; corrente: boolean; }

function generaGriglia(anno: number, mese: number): Cella[] {
  const primo  = new Date(anno, mese, 1);
  const ultimo = new Date(anno, mese + 1, 0);
  const offset = giornoISO(primo);
  const prec   = new Date(anno, mese, 0);
  const celle: Cella[] = [];
  for (let i = offset - 1; i >= 0; i--) celle.push({ giorno: prec.getDate() - i, corrente: false });
  for (let g = 1; g <= ultimo.getDate(); g++) celle.push({ giorno: g, corrente: true });
  let ex = 1;
  while (celle.length % 7 !== 0) celle.push({ giorno: ex++, corrente: false });
  return celle;
}

function badgeConfig(stato: StatoSessione) {
  switch (stato) {
    case "in_corso":      return { label: "In corso",      bg: "#FEF0E6",    color: C.orange    };
    case "confermata":    return { label: "Confermata",    bg: C.greenLight, color: C.greenDark };
    case "da_confermare": return { label: "Da confermare", bg: C.amberLight, color: C.amberDark };
  }
}

function oggiISO(): string { return new Date().toISOString().split("T")[0]; }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 10 }}>{children}</div>;
}
function Divider() { return <div style={{ height: "0.5px", background: C.border, margin: "14px 16px 0" }} />; }

function LoadingScreen() {
  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 16 }}>
        Beat<span style={{ color: C.orangeMid }}>cave</span>
      </div>
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

function Topbar() {
  const d = new Date();
  const gg = d.toLocaleDateString("it-IT", { weekday: "long" });
  const data = `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
  return (
    <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          Beat<span style={{ color: C.orangeMid }}>cave</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{data}</div>
      </div>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>VS</div>
    </div>
  );
}

function StatCards({ sessioni, clienti }: { sessioni: SessioneCompleta[]; clienti: Cliente[] }) {
  const incasso = sessioni.filter(s => s.pagato).reduce((acc, s) => acc + s.prezzo, 0);
  const items = [
    { valore: String(sessioni.length), label: "Sessioni oggi", colore: C.orange },
    { valore: `€${incasso}`,           label: "Incasso oggi",  colore: C.green  },
    { valore: String(clienti.length),  label: "Clienti",       colore: null      },
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

function CalendarioMini({ giorniConSessioni }: { giorniConSessioni: number[] }) {
  const now = new Date();
  const [anno, setAnno] = useState(now.getFullYear());
  const [mese, setMese] = useState(now.getMonth());
  const prev = () => mese === 0 ? (setAnno(a => a - 1), setMese(11)) : setMese(m => m - 1);
  const next = () => mese === 11 ? (setAnno(a => a + 1), setMese(0)) : setMese(m => m + 1);
  const celle = generaGriglia(anno, mese);
  const èMeseOggi = anno === now.getFullYear() && mese === now.getMonth();
  return (
    <div style={{ padding: "10px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{MESI[mese]} {anno}</div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["‹","›"] as const).map((ch, i) => (
            <button key={i} onClick={i === 0 ? prev : next} style={{ width: 26, height: 26, borderRadius: 6, border: `0.5px solid ${C.border}`, background: C.surface, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>{ch}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {GIORNI_BREVI.map((g, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#aaa" }}>{g}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {celle.map((cella, i) => {
          const èOggi      = èMeseOggi && cella.corrente && cella.giorno === now.getDate();
          const haSessione = cella.corrente && giorniConSessioni.includes(cella.giorno);
          return (
            <div key={i} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, borderRadius: 6, position: "relative", background: èOggi ? C.orange : "transparent", color: èOggi ? "#fff" : cella.corrente ? "inherit" : "#ccc", fontWeight: èOggi ? 700 : 400 }}>
              {cella.giorno}
              {haSessione && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: èOggi ? "rgba(255,255,255,0.8)" : C.orange }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessioneCard({ sessione, onTap }: { sessione: SessioneCompleta; onTap: () => void }) {
  const badge = badgeConfig(sessione.stato as StatoSessione);
  return (
    <div onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
      <div style={{ width: 3, height: 36, borderRadius: 2, background: SESSION_COLORS[sessione.tipo as TipoSessione], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sessione.cliente}</div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
          {sessione.oraInizio} – {sessione.oraFine} · {sessione.tipo}
          {sessione.pagato && <span style={{ marginLeft: 6, color: C.green }}>· €{sessione.prezzo} ✓</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l4 5-4 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: (a: boolean) => JSX.Element }[] = [
    { id: "home",       label: "Home",       icon: (a) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill={a ? C.orange : "#ccc"}/><rect x="12" y="3" width="7" height="7" rx="2" fill={a ? C.orange+"88" : "#e5e5e5"}/><rect x="3" y="12" width="7" height="7" rx="2" fill={a ? C.orange+"88" : "#e5e5e5"}/><rect x="12" y="12" width="7" height="7" rx="2" fill={a ? C.orange+"44" : "#ebebeb"}/></svg> },
    { id: "calendario", label: "Calendario", icon: (a) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="14" rx="2.5" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5"/><path d="M8 3v4M14 3v4M3 10h16" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: "clienti",    label: "Clienti",    icon: (a) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8" r="4" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5"/><path d="M3 19c0-3.866 3.582-7 8-7s8 3.134 8 7" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: "fatture",    label: "Fatture",    icon: (a) => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="2" width="14" height="18" rx="2.5" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5"/><path d="M8 8h6M8 11.5h6M8 15h4" stroke={a ? C.orange : "#ccc"} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: `0.5px solid ${C.border}`, background: "#fff", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{ padding: "9px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
          {tab.icon(tab.id === active)}
          <span style={{ fontSize: 10, fontWeight: tab.id === active ? 700 : 400, color: tab.id === active ? C.orange : "#bbb" }}>{tab.label}</span>
        </button>
      ))}
    </div>
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

  const caricaDati = async () => {
    setLoading(true);
    setErrore(null);
    try {
      const [righeSessioni, righeClienti] = await Promise.all([
        fetchSessioni(oggiISO()),
        fetchClienti(),
      ]);
      setSessioni(righeSessioni.map(dbToSessione));
      setClienti(righeClienti.map(dbToCliente));
    } catch {
      setErrore("Impossibile connettersi al database. Controlla la connessione.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { caricaDati(); }, []);

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
      if (p.data === oggiISO()) {
        setSessioni(prev => [...prev, dbToSessione(row)].sort((a, b) => a.oraInizio.localeCompare(b.oraInizio)));
      }
    } catch { alert("Errore nel salvare la prenotazione. Riprova."); }
    setSchermata("home");
    setActiveTab("home");
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
      if (duplicata.data === oggiISO()) {
        setSessioni(prev => [...prev, dbToSessione(row)].sort((a, b) => a.oraInizio.localeCompare(b.oraInizio)));
      }
    } catch { alert("Errore nella duplicazione."); }
  };

  const handleAggiungiCliente = async (dati: Omit<Cliente, "id" | "dataCreazioneISO">) => {
    try { await handleNuovoCliente(dati); }
    catch { alert("Errore nell'aggiungere il cliente. L'email potrebbe già esistere."); }
  };

  const handleModificaCliente = async (aggiornato: Cliente) => {
    try {
      await aggiornaCliente(aggiornato.id, { nome: aggiornato.nome, email: aggiornato.email, telefono: aggiornato.telefono });
      setClienti(prev => prev.map(c => c.id === aggiornato.id ? aggiornato : c));
    } catch { alert("Errore nell'aggiornare il cliente."); }
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "clienti") setSchermata("clienti");
    else if (tab === "fatture") setSchermata("fatture");
    else setSchermata("home");
  };

  const baseStyle: React.CSSProperties = {
    width: "100%", minHeight: "100dvh", background: C.bg,
    display: "flex", flexDirection: "column",
    fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif",
    WebkitFontSmoothing: "antialiased",
  };

  if (loading) return <LoadingScreen />;
  if (errore)  return <ErrorScreen msg={errore} onRetry={caricaDati} />;

  if (schermata === "nuova-prenotazione") {
    return <NuovaPrenotazione clienti={clienti} onSalva={handleNuovaPrenotazione} onClose={() => setSchermata("home")} onNuovoCliente={handleNuovoCliente} />;
  }

  if (schermata === "scheda-sessione" && sessioneAttiva) {
    return (
      <SchedaSessione
        sessione={sessioneAttiva}
        onClose={() => { setSchermata("home"); setSessioneAttiva(null); }}
        onAggiorna={handleAggiornaSessione}
        onElimina={handleEliminaSessione}
        onDuplica={handleDuplicaSessione}
      />
    );
  }

  if (schermata === "clienti") {
    return (
      <div style={baseStyle}>
        <SezioneClienti
          clienti={clienti} sessioni={sessioni}
          onClose={() => { setSchermata("home"); setActiveTab("home"); }}
          onAggiungiCliente={handleAggiungiCliente}
          onModificaCliente={handleModificaCliente}
          onNuovaPrenotazione={(_id) => setSchermata("nuova-prenotazione")}
        />
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
          <TabBar active={activeTab} onChange={handleTabChange} />
        </div>
      </div>
    );
  }

  if (schermata === "fatture") {
    return (
      <div style={baseStyle}>
        <SezioneFatture clienti={clienti} sessioniOggi={sessioni} />
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
          <TabBar active={activeTab} onChange={handleTabChange} />
        </div>
      </div>
    );
  }

  const giorniConSessioni = sessioni
    .filter(s => { const d = new Date(s.data + "T12:00:00"); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .map(s => new Date(s.data + "T12:00:00").getDate());

  return (
    <div style={baseStyle}>
      <Topbar />
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}>
        <StatCards sessioni={sessioni} clienti={clienti} />
        <Divider />
        <CalendarioMini giorniConSessioni={giorniConSessioni} />
        <Divider />
        <div style={{ paddingTop: 12 }}>
          <div style={{ padding: "0 16px 8px" }}><SectionLabel>Sessioni di oggi</SectionLabel></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
            {sessioni.length === 0
              ? <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "20px 0" }}>Nessuna sessione oggi</div>
              : sessioni.map(s => <SessioneCard key={s.id} sessione={s} onTap={() => { setSessioneAttiva(s); setSchermata("scheda-sessione"); }} />)
            }
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 10px" }}>
          <button onClick={() => setSchermata("nuova-prenotazione")} style={{ width: 52, height: 52, borderRadius: "50%", background: C.orange, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${C.orange}55` }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <TabBar active={activeTab} onChange={handleTabChange} />
      </div>
    </div>
  );
}
