/**
 * BEATCAVE STUDIO — Sezione Fatture
 * File: SezioneFatture.tsx
 *
 * Funzionalità:
 *  - Vista mensile di tutte le sessioni
 *  - Gestione pacchetti (crea, modifica, collega sessioni)
 *  - Riepilogo fatturato / incassato / da incassare
 *  - Export PDF per inserimento manuale su Tic Zucchetti
 */

import { useState, useEffect } from "react";
import type { SessioneCompleta, Cliente, Pacchetto } from "./types";
import {
  fetchSessioniMese, fetchPacchetti, fetchSessioniPacchetto,
  inserisciPacchetto, aggiornaPacchetto, eliminaPacchetto,
  collegaSessioneAPacchetto, dbToSessione, dbToPacchetto,
} from "./supabase";

// ─────────────────────────────────────────────────────────
// DESIGN SYSTEM
// ─────────────────────────────────────────────────────────

const C = {
  orange:      "#E8610A",
  orangeLight: "#FEF0E6",
  dark:        "#0D0D0D",
  green:       "#1D9E75",
  greenLight:  "#E1F5EE",
  greenDark:   "#0F6E56",
  purple:      "#534AB7",
  purpleLight: "#EEEDFE",
  amber:       "#BA7517",
  amberLight:  "#FAEEDA",
  amberDark:   "#854F0B",
  red:         "#A32D2D",
  redLight:    "#FCEBEB",
  border:      "rgba(0,0,0,0.08)",
  bg:          "#f5f5f5",
} as const;

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

function formatDataBreve(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const gg = d.toLocaleDateString("it-IT", { weekday: "short" });
  return `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>{children}</div>;
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>{msg}</div>;
}

// ─────────────────────────────────────────────────────────
// MODAL: Nuovo / Modifica Pacchetto
// ─────────────────────────────────────────────────────────

function ModalPacchetto({
  pacchetto,
  clienti,
  onSalva,
  onClose,
}: {
  pacchetto?: Pacchetto;
  clienti: Cliente[];
  onSalva: (dati: { clienteNome: string; clienteEmail: string; nome: string; numSessioni: number; prezzoTotale: number; pagato: boolean; note: string }) => void;
  onClose: () => void;
}) {
  const [clienteId, setClienteId]       = useState<number | null>(pacchetto ? clienti.find(c => c.email === pacchetto.clienteEmail)?.id ?? null : null);
  const [nome, setNome]                 = useState(pacchetto?.nome ?? "");
  const [numSessioni, setNumSessioni]   = useState(pacchetto?.numSessioni ?? 4);
  const [prezzo, setPrezzo]             = useState(String(pacchetto?.prezzoTotale ?? ""));
  const [pagato, setPagato]             = useState(pacchetto?.pagato ?? false);
  const [note, setNote]                 = useState(pacchetto?.note ?? "");
  const [errori, setErrori]             = useState<Record<string, string>>({});

  const valida = () => {
    const e: Record<string, string> = {};
    if (!clienteId)    e.cliente = "Seleziona un cliente";
    if (!nome.trim())  e.nome    = "Inserisci un nome per il pacchetto";
    if (!prezzo || isNaN(Number(prezzo))) e.prezzo = "Inserisci un importo valido";
    setErrori(e);
    return Object.keys(e).length === 0;
  };

  const cliente = clienti.find(c => c.id === clienteId);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>{pacchetto ? "Modifica pacchetto" : "Nuovo pacchetto"}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* CLIENTE */}
          <div>
            <SectionLabel>Cliente</SectionLabel>
            <select value={clienteId ?? ""} onChange={e => setClienteId(Number(e.target.value))}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${errori.cliente ? C.orange : C.border}`, fontSize: 14, outline: "none", background: "#fff", color: clienteId ? "#222" : "#bbb" }}>
              <option value="">Seleziona cliente…</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <ErrorMsg msg={errori.cliente} />
          </div>

          {/* NOME PACCHETTO */}
          <div>
            <SectionLabel>Nome pacchetto</SectionLabel>
            <input type="text" placeholder="es. Pacchetto 4 sessioni maggio" value={nome} onChange={e => setNome(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${errori.nome ? C.orange : C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
            <ErrorMsg msg={errori.nome} />
          </div>

          {/* NUMERO SESSIONI */}
          <div>
            <SectionLabel>Numero sessioni totali</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4, 5, 6, 8, 10].map(n => (
                <button key={n} onClick={() => setNumSessioni(n)}
                  style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `0.5px solid ${numSessioni === n ? C.orange : C.border}`, background: numSessioni === n ? C.orangeLight : "#fff", color: numSessioni === n ? C.orange : "#555", fontSize: 13, fontWeight: numSessioni === n ? 700 : 400, cursor: "pointer" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* PREZZO + PAGATO */}
          <div>
            <SectionLabel>Prezzo pacchetto e pagamento</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "#fff", border: `0.5px solid ${errori.prezzo ? C.orange : C.border}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16, color: "#aaa" }}>€</span>
                <input type="number" placeholder="0" value={prezzo} onChange={e => setPrezzo(e.target.value)} min={0}
                  style={{ border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#222", width: "100%", background: "transparent" }} />
              </div>
              <div style={{ display: "flex", borderRadius: 12, border: `0.5px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                <button onClick={() => setPagato(false)} style={{ padding: "0 10px", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", background: !pagato ? C.amberLight : "#fff", color: !pagato ? C.amberDark : "#bbb" }}>Non pag.</button>
                <button onClick={() => setPagato(true)} style={{ padding: "0 10px", fontSize: 11, fontWeight: 700, border: "none", borderLeft: `0.5px solid ${C.border}`, cursor: "pointer", background: pagato ? C.greenLight : "#fff", color: pagato ? C.greenDark : "#bbb" }}>Pagato</button>
              </div>
            </div>
            <ErrorMsg msg={errori.prezzo} />
          </div>

          {/* NOTE */}
          <div>
            <SectionLabel>Note (opzionale)</SectionLabel>
            <textarea placeholder="es. Pagato in contanti il 5/5" value={note} onChange={e => setNote(e.target.value)} rows={2}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: `0.5px solid ${C.border}`, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
          </div>

          <button onClick={() => {
            if (!valida()) return;
            onSalva({ clienteNome: cliente!.nome, clienteEmail: cliente!.email, nome: nome.trim(), numSessioni, prezzoTotale: Number(prezzo), pagato, note });
          }}
            style={{ padding: "13px", borderRadius: 12, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            {pacchetto ? "Salva modifiche" : "Crea pacchetto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MODAL: Collega sessione a pacchetto
// ─────────────────────────────────────────────────────────

function ModalCollegaSessione({
  sessioni,
  pacchetto,
  sessioniGiaCollegate,
  onCollega,
  onClose,
}: {
  sessioni: SessioneCompleta[];
  pacchetto: Pacchetto;
  sessioniGiaCollegate: number[];
  onCollega: (sessioneId: number) => void;
  onClose: () => void;
}) {
  // Mostra solo sessioni dello stesso cliente non ancora collegate
  const disponibili = sessioni.filter(s =>
    s.clienteEmail === pacchetto.clienteEmail &&
    !sessioniGiaCollegate.includes(s.id) &&
    s.pacchettoId === null
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Aggiungi sessione</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>Seleziona una sessione di {pacchetto.clienteNome} da aggiungere al pacchetto</div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {disponibili.length === 0 ? (
            <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "20px 0" }}>Nessuna sessione disponibile da collegare</div>
          ) : (
            disponibili.map(s => (
              <div key={s.id} onClick={() => onCollega(s.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderBottom: `0.5px solid rgba(0,0,0,0.06)`, cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{s.tipo}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{formatDataBreve(s.data)} · {s.oraInizio}–{s.oraFine}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.orange }}>+ Aggiungi</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CARD PACCHETTO
// ─────────────────────────────────────────────────────────

function CardPacchetto({
  pacchetto,
  tutteLeSessioni,
  onModifica,
  onElimina,
  onCollegaSessione,
  onScollegaSessione,
}: {
  pacchetto: Pacchetto;
  tutteLeSessioni: SessioneCompleta[];
  onModifica: (p: Pacchetto) => void;
  onElimina: (id: number) => void;
  onCollegaSessione: (p: Pacchetto) => void;
  onScollegaSessione: (sessioneId: number, pacchettoId: number) => void;
}) {
  const [espanso, setEspanso] = useState(false);
  const sessioniCollegate = tutteLeSessioni.filter(s => s.pacchettoId === pacchetto.id);
  const completate = sessioniCollegate.length;
  const totale = pacchetto.numSessioni;
  const percentuale = Math.round((completate / totale) * 100);

  return (
    <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pacchetto.nome}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{pacchetto.clienteNome}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: pacchetto.pagato ? C.greenLight : C.amberLight, color: pacchetto.pagato ? C.greenDark : C.amberDark }}>
            {pacchetto.pagato ? "Pagato" : "Non pagato"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>€{pacchetto.prezzoTotale}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Sessioni completate</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: completate === totale ? C.green : C.orange }}>{completate}/{totale}</span>
        </div>
        <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${percentuale}%`, background: completate === totale ? C.green : C.orange, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Sessioni collegate */}
      {espanso && (
        <div style={{ marginBottom: 10 }}>
          {sessioniCollegate.length === 0 ? (
            <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", padding: "8px 0" }}>Nessuna sessione collegata</div>
          ) : (
            sessioniCollegate.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `0.5px solid rgba(0,0,0,0.05)` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{s.tipo}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{formatDataBreve(s.data)} · {s.oraInizio}–{s.oraFine}</div>
                </div>
                <button onClick={() => onScollegaSessione(s.id, pacchetto.id)}
                  style={{ fontSize: 10, color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Azioni */}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button onClick={() => setEspanso(!espanso)}
          style={{ flex: 1, padding: "8px", borderRadius: 8, border: `0.5px solid ${C.border}`, background: "#fff", fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer" }}>
          {espanso ? "Chiudi" : "Vedi sessioni"}
        </button>
        {completate < totale && (
          <button onClick={() => onCollegaSessione(pacchetto)}
            style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: C.orangeLight, fontSize: 12, fontWeight: 700, color: C.orange, cursor: "pointer" }}>
            + Aggiungi sessione
          </button>
        )}
        <button onClick={() => onModifica(pacchetto)}
          style={{ padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${C.border}`, background: "#fff", fontSize: 12, color: "#555", cursor: "pointer" }}>
          ✏️
        </button>
        <button onClick={() => onElimina(pacchetto.id)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: C.redLight, fontSize: 12, color: C.red, cursor: "pointer" }}>
          🗑
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────

interface Props {
  clienti: Cliente[];
  sessioniOggi: SessioneCompleta[];
}

export default function SezioneFatture({ clienti, sessioniOggi }: Props) {
  const now = new Date();
  const [anno, setAnno]           = useState(now.getFullYear());
  const [mese, setMese]           = useState(now.getMonth());
  const [sessioni, setSessioni]   = useState<SessioneCompleta[]>([]);
  const [pacchetti, setPacchetti] = useState<Pacchetto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"sessioni" | "pacchetti">("sessioni");

  const [showModalPacchetto, setShowModalPacchetto]           = useState(false);
  const [pacchettoInModifica, setPacchettoInModifica]         = useState<Pacchetto | undefined>(undefined);
  const [pacchettoPerCollegare, setPacchettoPerCollegare]     = useState<Pacchetto | null>(null);
  const [toast, setToast]                                     = useState<string | null>(null);

  const mostraToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const carica = async () => {
    setLoading(true);
    try {
      const [righeSessioni, righePacchetti] = await Promise.all([
        fetchSessioniMese(anno, mese),
        fetchPacchetti(),
      ]);
      setSessioni(righeSessioni.map(dbToSessione));
      setPacchetti(righePacchetti.map(dbToPacchetto));
    } catch { /* silenzioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { carica(); }, [anno, mese]);

  // Calcola stats
  const sessioniFatturabili = sessioni.filter(s => s.prezzo > 0);
  const fatturato    = sessioniFatturabili.reduce((a, s) => a + s.prezzo, 0);
  const incassato    = sessioniFatturabili.filter(s => s.pagato).reduce((a, s) => a + s.prezzo, 0);
  const daIncassare  = fatturato - incassato;

  // Navigazione mesi
  const mesePrecedente = () => { if (mese === 0) { setAnno(a => a - 1); setMese(11); } else setMese(m => m - 1); };
  const meseSuccessivo = () => { if (mese === 11) { setAnno(a => a + 1); setMese(0); } else setMese(m => m + 1); };

  const handleCreaPacchetto = async (dati: Parameters<typeof inserisciPacchetto>[0]) => {
    try {
      const row = await inserisciPacchetto(dati);
      setPacchetti(prev => [dbToPacchetto(row), ...prev]);
      setShowModalPacchetto(false);
      mostraToast("✓ Pacchetto creato!");
    } catch { alert("Errore nella creazione del pacchetto."); }
  };

  const handleModificaPacchetto = async (dati: Parameters<typeof inserisciPacchetto>[0]) => {
    if (!pacchettoInModifica) return;
    try {
      await aggiornaPacchetto(pacchettoInModifica.id, dati);
      setPacchetti(prev => prev.map(p => p.id === pacchettoInModifica.id ? { ...p, ...dati, prezzoTotale: dati.prezzo_totale, numSessioni: dati.num_sessioni, clienteNome: dati.cliente_nome, clienteEmail: dati.cliente_email } : p));
      setPacchettoInModifica(undefined);
      setShowModalPacchetto(false);
      mostraToast("✓ Pacchetto aggiornato!");
    } catch { alert("Errore nell'aggiornamento."); }
  };

  const handleEliminaPacchetto = async (id: number) => {
    if (!confirm("Eliminare questo pacchetto?")) return;
    try {
      await eliminaPacchetto(id);
      setPacchetti(prev => prev.filter(p => p.id !== id));
      mostraToast("Pacchetto eliminato");
    } catch { alert("Errore nell'eliminazione."); }
  };

  const handleCollegaSessione = async (sessioneId: number) => {
    if (!pacchettoPerCollegare) return;
    try {
      await collegaSessioneAPacchetto(sessioneId, pacchettoPerCollegare.id);
      setSessioni(prev => prev.map(s => s.id === sessioneId ? { ...s, pacchettoId: pacchettoPerCollegare.id } : s));
      setPacchettoPerCollegare(null);
      mostraToast("✓ Sessione collegata al pacchetto!");
    } catch { alert("Errore nel collegamento."); }
  };

  const handleScollegaSessione = async (sessioneId: number) => {
    try {
      await collegaSessioneAPacchetto(sessioneId, null);
      setSessioni(prev => prev.map(s => s.id === sessioneId ? { ...s, pacchettoId: null } : s));
      mostraToast("Sessione scollegata");
    } catch { alert("Errore nello scollegamento."); }
  };

  // Tutte le sessioni disponibili (mese corrente + sessioniOggi per collegamento)
  const tutteSessioni = [...sessioni, ...sessioniOggi.filter(s => !sessioni.find(x => x.id === s.id))];

  return (
    <>
      {toast && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700, zIndex: 300, whiteSpace: "nowrap" }}>{toast}</div>
      )}

      {(showModalPacchetto) && (
        <ModalPacchetto
          pacchetto={pacchettoInModifica}
          clienti={clienti}
          onSalva={dati => {
            const payload = { cliente_nome: dati.clienteNome, cliente_email: dati.clienteEmail, nome: dati.nome, num_sessioni: dati.numSessioni, prezzo_totale: dati.prezzoTotale, pagato: dati.pagato, note: dati.note };
            pacchettoInModifica ? handleModificaPacchetto(payload) : handleCreaPacchetto(payload);
          }}
          onClose={() => { setShowModalPacchetto(false); setPacchettoInModifica(undefined); }}
        />
      )}

      {pacchettoPerCollegare && (
        <ModalCollegaSessione
          sessioni={tutteSessioni}
          pacchetto={pacchettoPerCollegare}
          sessioniGiaCollegate={tutteSessioni.filter(s => s.pacchettoId === pacchettoPerCollegare.id).map(s => s.id)}
          onCollega={handleCollegaSessione}
          onClose={() => setPacchettoPerCollegare(null)}
        />
      )}

      <div style={{ width: "100%", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>

        {/* HEADER */}
        <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Fatture</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{MESI[mese]} {anno}</div>
            </div>
            <button onClick={() => { setPacchettoInModifica(undefined); setShowModalPacchetto(true); }}
              style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Navigazione mesi */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={mesePrecedente} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#fff" }}>{MESI[mese]} {anno}</div>
            <button onClick={meseSuccessivo} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>

          {/* STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { val: `€${fatturato}`, lbl: "Fatturato",    col: C.orange },
              { val: `€${incassato}`, lbl: "Incassato",    col: C.green  },
              { val: `€${daIncassare}`, lbl: "Da incassare", col: daIncassare > 0 ? C.amber : "#888" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.col }}>{item.val}</div>
                <div style={{ fontSize: 9, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.lbl}</div>
              </div>
            ))}
          </div>

          {/* TAB */}
          <div style={{ display: "flex", borderRadius: 10, border: `0.5px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
            {(["sessioni", "pacchetti"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: tab === t ? 700 : 500, border: "none", cursor: "pointer", background: tab === t ? C.orange : "#fff", color: tab === t ? "#fff" : "#888" }}>
                {t === "sessioni" ? `Sessioni (${sessioni.length})` : `Pacchetti (${pacchetti.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa", fontSize: 13 }}>Caricamento…</div>
          ) : tab === "sessioni" ? (
            <>
              {sessioni.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa", fontSize: 13 }}>Nessuna sessione in {MESI[mese]}</div>
              ) : (
                sessioni.map(s => {
                  const pacchetto = pacchetti.find(p => p.id === s.pacchettoId);
                  return (
                    <div key={s.id} style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 3, height: 36, borderRadius: 2, background: s.prezzo === 0 ? "#ddd" : s.pacchettoId ? C.purple : C.orange, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.cliente}</div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{formatDataBreve(s.data)} · {s.tipo}</div>
                        {pacchetto && <div style={{ fontSize: 10, color: C.purple, marginTop: 1, fontWeight: 600 }}>📦 {pacchetto.nome}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: s.prezzo === 0 ? "#aaa" : "#222" }}>
                          {s.prezzo === 0 ? "Gratis" : s.pacchettoId ? "Inclusa" : `€${s.prezzo}`}
                        </div>
                        {s.prezzo > 0 && !s.pacchettoId && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: s.pagato ? C.green : C.amber }}>{s.pagato ? "✓ Pagato" : "⏳ Da inc."}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <>
              {pacchetti.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>Nessun pacchetto creato</div>
                  <button onClick={() => setShowModalPacchetto(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    + Crea il primo pacchetto
                  </button>
                </div>
              ) : (
                pacchetti.map(p => (
                  <CardPacchetto
                    key={p.id}
                    pacchetto={p}
                    tutteLeSessioni={tutteSessioni}
                    onModifica={pac => { setPacchettoInModifica(pac); setShowModalPacchetto(true); }}
                    onElimina={handleEliminaPacchetto}
                    onCollegaSessione={setPacchettoPerCollegare}
                    onScollegaSessione={handleScollegaSessione}
                  />
                ))
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
