/**
 * BEATCAVE STUDIO — Form Nuova Prenotazione
 * File: NuovaPrenotazione.tsx
 * - Accetta dataIniziale dal calendario
 */

import { useState } from "react";
import type { TipoSessione } from "./types";

interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefono: string;
  dataCreazioneISO: string;
}

interface SlotOrario {
  label: string;
  inizio: string;
  fine: string;
}

interface Prenotazione {
  clienteId: number;
  clienteNome: string;
  clienteEmail: string;
  data: string;
  oraInizio: string;
  oraFine: string;
  tipo: TipoSessione;
  prezzo: number;
  pagato: boolean;
  note: string;
  pacchettoId?: number | null;
}

const C = {
  orange:      "#E8610A",
  orangeLight: "#FEF0E6",
  dark:        "#0D0D0D",
  green:       "#1D9E75",
  greenLight:  "#E1F5EE",
  greenDark:   "#0F6E56",
  purple:      "#534AB7",
  amber:       "#BA7517",
  amberLight:  "#FAEEDA",
  amberDark:   "#854F0B",
  border:      "rgba(0,0,0,0.10)",
  bg:          "#f5f5f5",
  red:         "#E24B4A",
} as const;

const TARIFFE_DEFAULT: Record<TipoSessione, number> = {
  Registrazione: 80,
  Mixing:        0,
  Produzione:    0,
  Mastering:     0,
};

const TIPI_SESSIONE: { tipo: TipoSessione; colore: string }[] = [
  { tipo: "Registrazione", colore: C.orange  },
  { tipo: "Mixing",        colore: C.green   },
  { tipo: "Produzione",    colore: C.purple  },
  { tipo: "Mastering",     colore: C.amber   },
];

const SLOT_FISSI: SlotOrario[] = [
  { label: "10:00 – 12:00", inizio: "10:00", fine: "12:00" },
  { label: "15:00 – 17:00", inizio: "15:00", fine: "17:00" },
  { label: "17:00 – 19:00", inizio: "17:00", fine: "19:00" },
  { label: "19:00 – 21:00", inizio: "19:00", fine: "21:00" },
  { label: "21:00 – 23:00", inizio: "21:00", fine: "23:00" },
];

function iniziali(nome: string): string {
  return nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

function oggiISO(): string {
  return new Date().toISOString().split("T")[0];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>{children}</div>;
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ fontSize: 11, color: C.red, marginTop: 4, paddingLeft: 2 }}>{msg}</div>;
}

function ModalClienti({ clienti, onSelect, onNuovo, onClose }: {
  clienti: Cliente[]; onSelect: (c: Cliente) => void; onNuovo: () => void; onClose: () => void;
}) {
  const [ricerca, setRicerca] = useState("");
  const filtrati = clienti.filter(c =>
    c.nome.toLowerCase().includes(ricerca.toLowerCase()) ||
    c.email.toLowerCase().includes(ricerca.toLowerCase())
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Seleziona cliente</div>
        <input type="text" placeholder="Cerca per nome o email…" value={ricerca} onChange={e => setRicerca(e.target.value)} autoFocus
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, marginBottom: 12, boxSizing: "border-box" as const, outline: "none" }} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtrati.length === 0 && <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "16px 0" }}>Nessun cliente trovato</div>}
          {filtrati.map(c => (
            <div key={c.id} onClick={() => onSelect(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{iniziali(c.nome)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{c.email}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onNuovo} style={{ marginTop: 14, padding: "12px", borderRadius: 12, border: `1.5px dashed ${C.orange}`, background: C.orangeLight, color: C.orange, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Aggiungi nuovo cliente
        </button>
      </div>
    </div>
  );
}

function ModalNuovoCliente({ onSalva, onClose }: {
  onSalva: (c: { nome: string; email: string; telefono: string }) => void; onClose: () => void;
}) {
  const [nome, setNome]     = useState("");
  const [email, setEmail]   = useState("");
  const [tel, setTel]       = useState("");
  const [errori, setErrori] = useState<{ nome?: string; email?: string }>({});

  const valida = () => {
    const e: typeof errori = {};
    if (!nome.trim()) e.nome = "Il nome è obbligatorio";
    if (!email.trim()) e.email = "L'email è obbligatoria";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email non valida";
    setErrori(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nuovo cliente</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <SectionLabel>Nome completo</SectionLabel>
            <input type="text" placeholder="es. Mario Bianchi" value={nome} onChange={e => setNome(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${errori.nome ? C.red : C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
            <ErrorMsg msg={errori.nome} />
          </div>
          <div>
            <SectionLabel>Email</SectionLabel>
            <input type="email" placeholder="es. mario@email.com" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${errori.email ? C.red : C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
            <ErrorMsg msg={errori.email} />
          </div>
          <div>
            <SectionLabel>Telefono <span style={{ fontWeight: 400, color: "#bbb" }}>(opzionale)</span></SectionLabel>
            <input type="tel" placeholder="es. +39 333 123 4567" value={tel} onChange={e => setTel(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
          </div>
          <button onClick={() => { if (valida()) onSalva({ nome: nome.trim(), email: email.trim(), telefono: tel.trim() }); }}
            style={{ padding: "13px", borderRadius: 12, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
            Salva cliente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────

interface Props {
  clienti: Cliente[];
  dataIniziale?: string;                                                  // ← data preselezionata dal calendario
  onSalva: (p: Prenotazione) => void;
  onClose: () => void;
  onNuovoCliente: (c: { nome: string; email: string; telefono: string }) => Promise<Cliente>;
}

export default function NuovaPrenotazione({ clienti, dataIniziale, onSalva, onClose, onNuovoCliente }: Props) {

  const [clienteSelezionato, setCliente] = useState<Cliente | null>(null);
  const [data, setData]                  = useState(dataIniziale ?? oggiISO());  // ← usa data dal calendario
  const [slotSel, setSlot]               = useState<SlotOrario | null>(null);
  const [orarioLibero, setOrarioLibero]  = useState(false);
  const [oraInizio, setOraInizio]        = useState("10:00");
  const [oraFine, setOraFine]            = useState("12:00");
  const [tipo, setTipo]                  = useState<TipoSessione | null>(null);
  const [prezzo, setPrezzo]              = useState("");
  const [pagato, setPagato]              = useState(false);
  const [note, setNote]                  = useState("");

  const [showModalClienti, setShowModalClienti] = useState(false);
  const [showModalNuovo, setShowModalNuovo]     = useState(false);
  const [showSuccesso, setShowSuccesso]         = useState(false);
  const [salvando, setSalvando]                 = useState(false);
  const [errori, setErrori]                     = useState<Record<string, string>>({});

  const handleTipo = (t: TipoSessione) => {
    setTipo(t);
    const tariffa = TARIFFE_DEFAULT[t];
    setPrezzo(tariffa > 0 ? String(tariffa) : "");
  };

  const handleNuovoCliente = async (dati: { nome: string; email: string; telefono: string }) => {
    setSalvando(true);
    try {
      const nuovoCliente = await onNuovoCliente(dati);
      setCliente(nuovoCliente);
      setShowModalNuovo(false);
      setShowModalClienti(false);
    } catch { alert("Errore nel salvare il cliente. L'email potrebbe già esistere."); }
    finally { setSalvando(false); }
  };

  const valida = (): boolean => {
    const e: Record<string, string> = {};
    if (!clienteSelezionato)                    e.cliente = "Seleziona un cliente";
    if (!data)                                  e.data    = "Seleziona una data";
    if (!orarioLibero && !slotSel)              e.orario  = "Seleziona un orario";
    if (!tipo)                                  e.tipo    = "Seleziona il tipo di sessione";
    if (prezzo === "" || isNaN(Number(prezzo))) e.prezzo  = "Inserisci un importo valido";
    setErrori(e);
    return Object.keys(e).length === 0;
  };

  const handleSalva = () => {
    if (!valida()) return;
    const p: Prenotazione = {
      clienteId:    clienteSelezionato!.id,
      clienteNome:  clienteSelezionato!.nome,
      clienteEmail: clienteSelezionato!.email,
      data,
      oraInizio: orarioLibero ? oraInizio : slotSel!.inizio,
      oraFine:   orarioLibero ? oraFine   : slotSel!.fine,
      tipo:      tipo!,
      prezzo:    Number(prezzo),
      pagato,
      note,
    };
    onSalva(p);
    setShowSuccesso(true);
    setTimeout(() => { setShowSuccesso(false); onClose(); }, 2000);
  };

  return (
    <>
      {showModalClienti && !showModalNuovo && (
        <ModalClienti clienti={clienti} onSelect={c => { setCliente(c); setShowModalClienti(false); }} onNuovo={() => setShowModalNuovo(true)} onClose={() => setShowModalClienti(false)} />
      )}
      {showModalNuovo && <ModalNuovoCliente onSalva={handleNuovoCliente} onClose={() => setShowModalNuovo(false)} />}
      {showSuccesso && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, zIndex: 200, whiteSpace: "nowrap" }}>✓ Prenotazione salvata!</div>}
      {salvando && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, zIndex: 200, whiteSpace: "nowrap" }}>Salvataggio…</div>}

      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>

        <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 16, paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Nuova prenotazione</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Beatcave Studio</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16, paddingBottom: 100 }}>

          {/* CLIENTE */}
          <div>
            <SectionLabel>Cliente</SectionLabel>
            <div onClick={() => setShowModalClienti(true)} style={{ background: "#fff", border: `0.5px solid ${errori.cliente ? C.red : C.border}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              {clienteSelezionato ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{iniziali(clienteSelezionato.nome)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{clienteSelezionato.nome}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{clienteSelezionato.email}</div>
                  </div>
                </div>
              ) : <span style={{ fontSize: 14, color: "#bbb" }}>Seleziona cliente…</span>}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <ErrorMsg msg={errori.cliente} />
          </div>

          {/* DATA */}
          <div>
            <SectionLabel>Data</SectionLabel>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: `0.5px solid ${errori.data ? C.red : C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none", background: "#fff", color: "#222", fontFamily: "inherit" }} />
            <ErrorMsg msg={errori.data} />
          </div>

          {/* ORARIO */}
          <div>
            <SectionLabel>Orario</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, border: errori.orario ? `1px solid ${C.red}` : "none", borderRadius: errori.orario ? 12 : 0, padding: errori.orario ? 8 : 0 }}>
              {SLOT_FISSI.map(slot => {
                const sel = !orarioLibero && slotSel?.label === slot.label;
                return <button key={slot.label} onClick={() => { setSlot(slot); setOrarioLibero(false); }}
                  style={{ background: sel ? C.orange : "#fff", border: `0.5px solid ${sel ? C.orange : C.border}`, borderRadius: 10, padding: "11px 8px", fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? "#fff" : "#555", cursor: "pointer" }}>{slot.label}</button>;
              })}
              <button onClick={() => { setOrarioLibero(true); setSlot(null); }}
                style={{ background: orarioLibero ? C.orangeLight : "#fff", border: `${orarioLibero ? "1.5px solid" : "0.5px dashed"} ${orarioLibero ? C.orange : "#ccc"}`, borderRadius: 10, padding: "11px 8px", fontSize: 12, fontWeight: orarioLibero ? 700 : 400, color: orarioLibero ? C.orange : "#aaa", cursor: "pointer" }}>
                + Orario libero
              </button>
            </div>
            {orarioLibero && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, outline: "none" }} />
                <span style={{ color: "#aaa", fontSize: 14 }}>→</span>
                <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, outline: "none" }} />
              </div>
            )}
            <ErrorMsg msg={errori.orario} />
          </div>

          {/* TIPO */}
          <div>
            <SectionLabel>Tipo sessione</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, border: errori.tipo ? `1px solid ${C.red}` : "none", borderRadius: errori.tipo ? 12 : 0, padding: errori.tipo ? 8 : 0 }}>
              {TIPI_SESSIONE.map(({ tipo: t, colore }) => {
                const sel = tipo === t;
                return <button key={t} onClick={() => handleTipo(t)}
                  style={{ background: sel ? `${colore}18` : "#fff", border: `${sel ? "1.5px" : "0.5px"} solid ${sel ? colore : C.border}`, borderRadius: 10, padding: "11px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: colore, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? colore : "#555" }}>{t}</span>
                </button>;
              })}
            </div>
            <ErrorMsg msg={errori.tipo} />
          </div>

          {/* PREZZO + PAGATO */}
          <div>
            <SectionLabel>Prezzo e pagamento</SectionLabel>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <div style={{ flex: 1, background: "#fff", border: `0.5px solid ${errori.prezzo ? C.red : C.border}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16, color: "#aaa" }}>€</span>
                <input type="number" placeholder="0" value={prezzo} onChange={e => setPrezzo(e.target.value)} min={0}
                  style={{ border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#222", width: "100%", background: "transparent" }} />
              </div>
              <div style={{ display: "flex", borderRadius: 12, border: `0.5px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                <button onClick={() => setPagato(false)} style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: !pagato ? C.amberLight : "#fff", color: !pagato ? C.amberDark : "#bbb" }}>Non pagato</button>
                <button onClick={() => setPagato(true)} style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, border: "none", borderLeft: `0.5px solid ${C.border}`, cursor: "pointer", background: pagato ? C.greenLight : "#fff", color: pagato ? C.greenDark : "#bbb" }}>Pagato</button>
              </div>
            </div>
            <ErrorMsg msg={errori.prezzo} />
          </div>

          {/* NOTE */}
          <div>
            <SectionLabel>Note (opzionale)</SectionLabel>
            <textarea placeholder="Aggiungi una nota…" value={note} onChange={e => setNote(e.target.value)} rows={3}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: `0.5px solid ${C.border}`, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", color: "#333" }} />
          </div>

          <div style={{ background: C.orangeLight, borderRadius: 10, padding: "10px 13px", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <rect x="2" y="4" width="12" height="9" rx="2" stroke={C.orange} strokeWidth="1.2"/>
              <path d="M2 6l6 4 6-4" stroke={C.orange} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 11, color: C.orange, lineHeight: 1.5 }}>
              <strong>Email automatica:</strong> conferma + reminder 24h. Attivazione nella prossima fase.
            </div>
          </div>

        </div>

        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "linear-gradient(to top, #f5f5f5 70%, transparent)", padding: "12px 16px 24px" }}>
          <button onClick={handleSalva}
            style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: C.orange, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${C.orange}55` }}>
            Salva prenotazione
          </button>
        </div>

      </div>
    </>
  );
}
