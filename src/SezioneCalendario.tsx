/**
 * BEATCAVE STUDIO — Sezione Calendario
 * File: SezioneCalendario.tsx
 *
 * Funzionalità:
 *  - Calendario mensile navigabile
 *  - Puntini sui giorni con sessioni
 *  - Click su un giorno → mostra le sessioni di quel giorno
 *  - Click su una sessione → apre la scheda sessione
 *  - Bottone + per nuova prenotazione nel giorno selezionato
 */

import { useState, useEffect } from "react";
import type { SessioneCompleta, TipoSessione, StatoSessione } from "./types";
import { fetchSessioniMese, dbToSessione } from "./supabase";

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
  amber:       "#BA7517",
  amberLight:  "#FAEEDA",
  amberDark:   "#854F0B",
  border:      "rgba(0,0,0,0.08)",
  bg:          "#f5f5f5",
} as const;

const SESSION_COLORS: Record<TipoSessione, string> = {
  Registrazione: C.orange,
  Mixing:        C.green,
  Produzione:    C.purple,
  Mastering:     C.amber,
};

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const GIORNI_BREVI = ["L","M","M","G","V","S","D"];
const GIORNI_LUNGHI = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];

function giornoISO(d: Date): number { return (d.getDay() + 6) % 7; }

interface Cella { giorno: number; corrente: boolean; iso: string; }

function generaGriglia(anno: number, mese: number): Cella[] {
  const primo  = new Date(anno, mese, 1);
  const ultimo = new Date(anno, mese + 1, 0);
  const offset = giornoISO(primo);
  const prec   = new Date(anno, mese, 0);
  const celle: Cella[] = [];

  for (let i = offset - 1; i >= 0; i--) {
    const g = prec.getDate() - i;
    const m = mese === 0 ? 11 : mese - 1;
    const a = mese === 0 ? anno - 1 : anno;
    celle.push({ giorno: g, corrente: false, iso: `${a}-${String(m+1).padStart(2,"0")}-${String(g).padStart(2,"0")}` });
  }

  for (let g = 1; g <= ultimo.getDate(); g++) {
    celle.push({ giorno: g, corrente: true, iso: `${anno}-${String(mese+1).padStart(2,"0")}-${String(g).padStart(2,"0")}` });
  }

  let ex = 1;
  const meseSuc = mese === 11 ? 0 : mese + 1;
  const annoSuc = mese === 11 ? anno + 1 : anno;
  while (celle.length % 7 !== 0) {
    celle.push({ giorno: ex, corrente: false, iso: `${annoSuc}-${String(meseSuc+1).padStart(2,"0")}-${String(ex).padStart(2,"0")}` });
    ex++;
  }

  return celle;
}

function formatDataLeggibile(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const gg = giornoISO(d);
  return `${GIORNI_LUNGHI[gg]} ${d.getDate()} ${MESI[d.getMonth()]}`;
}

function badgeConfig(stato: StatoSessione) {
  switch (stato) {
    case "in_corso":      return { label: "In corso",      bg: "#FEF0E6",    color: C.orange    };
    case "confermata":    return { label: "Confermata",    bg: C.greenLight, color: C.greenDark };
    case "da_confermare": return { label: "Da confermare", bg: C.amberLight, color: C.amberDark };
  }
}

// ─────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────

interface Props {
  onApriSessione: (s: SessioneCompleta) => void;
  onNuovaPrenotazione: (dataPreselezionata?: string) => void;
}

export default function SezioneCalendario({ onApriSessione, onNuovaPrenotazione }: Props) {
  const now = new Date();
  const [anno, setAnno]               = useState(now.getFullYear());
  const [mese, setMese]               = useState(now.getMonth());
  const [giornoSel, setGiornoSel]     = useState(now.toISOString().split("T")[0]);
  const [sessioni, setSessioni]       = useState<SessioneCompleta[]>([]);
  const [loading, setLoading]         = useState(true);

  const carica = async () => {
    setLoading(true);
    try {
      const rows = await fetchSessioniMese(anno, mese);
      setSessioni(rows.map(dbToSessione));
    } catch { /* silenzioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { carica(); }, [anno, mese]);

  const prev = () => { if (mese === 0) { setAnno(a => a - 1); setMese(11); } else setMese(m => m - 1); };
  const next = () => { if (mese === 11) { setAnno(a => a + 1); setMese(0); } else setMese(m => m + 1); };

  const celle = generaGriglia(anno, mese);

  // Giorni con almeno una sessione
  const giorniConSessioni = new Set(sessioni.map(s => s.data));

  // Sessioni del giorno selezionato
  const sessioniGiorno = sessioni
    .filter(s => s.data === giornoSel)
    .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

  const oggiISO = now.toISOString().split("T")[0];

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* HEADER */}
      <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Calendario</div>
          <button onClick={() => onNuovaPrenotazione(giornoSel)} style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* CORPO SCROLLABILE */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>

        {/* NAVIGAZIONE MESE */}
        <div style={{ background: "#fff", padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{MESI[mese]} {anno}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={prev} style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${C.border}`, background: "#f5f5f5", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>‹</button>
            <button onClick={() => { setAnno(now.getFullYear()); setMese(now.getMonth()); setGiornoSel(oggiISO); }} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: `0.5px solid ${C.border}`, background: "#f5f5f5", fontSize: 11, fontWeight: 600, cursor: "pointer", color: C.orange }}>Oggi</button>
            <button onClick={next} style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${C.border}`, background: "#f5f5f5", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>›</button>
          </div>
        </div>

        {/* INTESTAZIONE GIORNI */}
        <div style={{ background: "#fff", display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 16px", marginBottom: 4 }}>
          {GIORNI_BREVI.map((g, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#aaa", padding: "4px 0" }}>{g}</div>)}
        </div>

        {/* GRIGLIA GIORNI */}
        <div style={{ background: "#fff", display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, padding: "0 16px 12px", borderBottom: `0.5px solid ${C.border}` }}>
          {celle.map((cella, i) => {
            const isOggi     = cella.iso === oggiISO;
            const isSel      = cella.iso === giornoSel;
            const haSessione = giorniConSessioni.has(cella.iso);

            let bg = "transparent";
            let color = cella.corrente ? "#333" : "#ccc";
            let fontWeight: number = 400;
            let border = "none";

            if (isOggi) { bg = C.orange; color = "#fff"; fontWeight = 700; }
            else if (isSel && cella.corrente) { bg = C.orangeLight; color = C.orange; fontWeight = 700; border = `1.5px solid ${C.orange}`; }

            return (
              <div key={i} onClick={() => cella.corrente && setGiornoSel(cella.iso)}
                style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 12, borderRadius: 8, position: "relative", cursor: cella.corrente ? "pointer" : "default", background: bg, color, fontWeight, border }}>
                {cella.giorno}
                {haSessione && (
                  <div style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: isOggi ? "rgba(255,255,255,0.8)" : isSel ? C.orange : C.orange }} />
                )}
              </div>
            );
          })}
        </div>

        {/* SESSIONI GIORNO SELEZIONATO */}
        <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{formatDataLeggibile(giornoSel)}</div>
          {sessioniGiorno.length > 0 && (
            <div style={{ fontSize: 11, color: "#888", background: "#ebebeb", padding: "2px 8px", borderRadius: 10 }}>{sessioniGiorno.length} sessioni</div>
          )}
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "#aaa" }}>Caricamento…</div>
          ) : sessioniGiorno.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>Nessuna sessione</div>
              <button onClick={() => onNuovaPrenotazione(giornoSel)}
                style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                + Aggiungi sessione
              </button>
            </div>
          ) : (
            sessioniGiorno.map(s => {
              const badge = badgeConfig(s.stato as StatoSessione);
              return (
                <div key={s.id} onClick={() => onApriSessione(s)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                  <div style={{ width: 3, height: 38, borderRadius: 2, background: SESSION_COLORS[s.tipo as TipoSessione], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.cliente}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{s.oraInizio} – {s.oraFine} · {s.tipo}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l4 5-4 5" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        {sessioniGiorno.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 10px" }}>
            <button onClick={() => onNuovaPrenotazione(giornoSel)}
              style={{ width: 52, height: 52, borderRadius: "50%", background: C.orange, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${C.orange}55` }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
