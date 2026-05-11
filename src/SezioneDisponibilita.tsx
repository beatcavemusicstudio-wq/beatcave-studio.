/**
 * BEATCAVE STUDIO — Sezione Disponibilità
 * File: SezioneDisponibilita.tsx
 *
 * Permette di aprire/chiudere slot disponibili per i clienti
 */

import { useState, useEffect } from "react";

const BASE = "https://lpznonwpofwywtvikgfm.supabase.co/rest/v1";
const KEY  = "sb_publishable_BGd9aD4jqt6K6txVpDCifA_C-IvCaP_";

const H = {
  "apikey":        KEY,
  "Authorization": `Bearer ${KEY}`,
  "Content-Type":  "application/json",
  "Prefer":        "return=representation",
};

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...H, ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const C = {
  orange:      "#E8610A",
  orangeLight: "#FEF0E6",
  dark:        "#0D0D0D",
  green:       "#1D9E75",
  greenLight:  "#E1F5EE",
  greenDark:   "#0F6E56",
  border:      "rgba(0,0,0,0.08)",
  bg:          "#f5f5f5",
} as const;

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const GIORNI_BREVI = ["L","M","M","G","V","S","D"];

const SLOT_FISSI = [
  { inizio: "10:00", fine: "12:00", label: "10:00 – 12:00" },
  { inizio: "15:00", fine: "17:00", label: "15:00 – 17:00" },
  { inizio: "17:00", fine: "19:00", label: "17:00 – 19:00" },
  { inizio: "19:00", fine: "21:00", label: "19:00 – 21:00" },
  { inizio: "21:00", fine: "23:00", label: "21:00 – 23:00" },
];

interface Disponibilita {
  id: number;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  occupato: boolean;
}

function giornoSettimana(d: Date): number { return (d.getDay() + 6) % 7; }

function generaGriglia(anno: number, mese: number): { giorno: number; corrente: boolean; iso: string }[] {
  const primo  = new Date(anno, mese, 1);
  const ultimo = new Date(anno, mese + 1, 0);
  const offset = giornoSettimana(primo);
  const prec   = new Date(anno, mese, 0);
  const celle = [];
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
  while (celle.length % 7 !== 0) {
    const ms = mese === 11 ? 0 : mese + 1;
    const as = mese === 11 ? anno + 1 : anno;
    celle.push({ giorno: ex++, corrente: false, iso: `${as}-${String(ms+1).padStart(2,"0")}-${String(ex-1).padStart(2,"0")}` });
  }
  return celle;
}

function formatDataLeggibile(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const gg = d.toLocaleDateString("it-IT", { weekday: "long" });
  return `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

function oggiISO(): string { return new Date().toISOString().split("T")[0]; }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>{children}</div>;
}

export default function SezioneDisponibilita() {
  const now = new Date();
  const [anno, setAnno]             = useState(now.getFullYear());
  const [mese, setMese]             = useState(now.getMonth());
  const [giornoSel, setGiornoSel]   = useState(oggiISO());
  const [disponibilita, setDisp]    = useState<Disponibilita[]>([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<string | null>(null);

  const carica = async () => {
    setLoading(true);
    try {
      const oggi = oggiISO();
      const rows = await req(`/disponibilita?data=gte.${oggi}&order=data,ora_inizio`);
      setDisp(rows ?? []);
    } catch { /* silenzioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { carica(); }, []);

  const mostraToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const prev = () => { if (mese === 0) { setAnno(a => a - 1); setMese(11); } else setMese(m => m - 1); };
  const next = () => { if (mese === 11) { setAnno(a => a + 1); setMese(0); } else setMese(m => m + 1); };

  const celle = generaGriglia(anno, mese);
  const giorniConSlot = new Set(disponibilita.map(d => d.data));
  const slotGiorno = disponibilita.filter(d => d.data === giornoSel);
  const oggiStr = oggiISO();

  // Slot attivi per il giorno selezionato
  const slotAttivi = new Set(slotGiorno.map(d => d.ora_inizio));

  const toggleSlot = async (slot: typeof SLOT_FISSI[0]) => {
    const esistente = slotGiorno.find(d => d.ora_inizio === slot.inizio);

    if (esistente) {
      // Rimuovi slot
      if (esistente.occupato) {
        mostraToast("⚠️ Slot già prenotato — non puoi rimuoverlo");
        return;
      }
      try {
        await req(`/disponibilita?id=eq.${esistente.id}`, { method: "DELETE", headers: { "Prefer": "return=minimal" } });
        setDisp(prev => prev.filter(d => d.id !== esistente.id));
        mostraToast("Slot rimosso");
      } catch { alert("Errore nella rimozione."); }
    } else {
      // Aggiungi slot
      try {
        const rows = await req("/disponibilita", {
          method: "POST",
          body: JSON.stringify({ data: giornoSel, ora_inizio: slot.inizio, ora_fine: slot.fine, occupato: false }),
        });
        const nuovoSlot = Array.isArray(rows) ? rows[0] : rows;
        setDisp(prev => [...prev, nuovoSlot].sort((a, b) => a.data.localeCompare(b.data) || a.ora_inizio.localeCompare(b.ora_inizio)));
        mostraToast("✓ Slot aggiunto!");
      } catch { alert("Errore nell'aggiunta."); }
    }
  };

  // Aggiunge tutti gli slot di un giorno
  const aggiungiTutti = async () => {
    const slotDaAggiungere = SLOT_FISSI.filter(s => !slotAttivi.has(s.inizio));
    for (const slot of slotDaAggiungere) {
      try {
        const rows = await req("/disponibilita", {
          method: "POST",
          body: JSON.stringify({ data: giornoSel, ora_inizio: slot.inizio, ora_fine: slot.fine, occupato: false }),
        });
        const nuovoSlot = Array.isArray(rows) ? rows[0] : rows;
        setDisp(prev => [...prev, nuovoSlot]);
      } catch { /* silenzioso */ }
    }
    await carica();
    mostraToast("✓ Tutti gli slot aggiunti!");
  };

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {toast && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700, zIndex: 300, whiteSpace: "nowrap" }}>{toast}</div>
      )}

      {/* HEADER */}
      <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Disponibilità</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Slot visibili ai clienti</div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* CALENDARIO */}
        <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{MESI[mese]} {anno}</div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={prev} style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${C.border}`, background: "#f5f5f5", fontSize: 13, cursor: "pointer", color: "#555" }}>‹</button>
              <button onClick={() => { setAnno(now.getFullYear()); setMese(now.getMonth()); setGiornoSel(oggiISO()); }} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: `0.5px solid ${C.border}`, background: "#f5f5f5", fontSize: 11, fontWeight: 600, cursor: "pointer", color: C.orange }}>Oggi</button>
              <button onClick={next} style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${C.border}`, background: "#f5f5f5", fontSize: 13, cursor: "pointer", color: "#555" }}>›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
            {GIORNI_BREVI.map((g, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#aaa", padding: "2px 0" }}>{g}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {celle.map((cella, i) => {
              const isOggi  = cella.iso === oggiStr;
              const isSel   = cella.iso === giornoSel;
              const hasSlot = giorniConSlot.has(cella.iso);
              let bg = "transparent", color = cella.corrente ? "#333" : "#ccc", fontWeight = 400, border = "none";
              if (isOggi) { bg = C.orange; color = "#fff"; fontWeight = 700; }
              else if (isSel && cella.corrente) { bg = C.orangeLight; color = C.orange; fontWeight = 700; border = `1.5px solid ${C.orange}`; }
              return (
                <div key={i} onClick={() => cella.corrente && setGiornoSel(cella.iso)}
                  style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 12, borderRadius: 8, position: "relative", cursor: cella.corrente ? "pointer" : "default", background: bg, color, fontWeight, border }}>
                  {cella.giorno}
                  {hasSlot && <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: isOggi ? "rgba(255,255,255,0.8)" : C.green }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* SLOT DEL GIORNO */}
        <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectionLabel>{formatDataLeggibile(giornoSel)}</SectionLabel>
            {slotAttivi.size < SLOT_FISSI.length && (
              <button onClick={aggiungiTutti} style={{ fontSize: 11, fontWeight: 600, color: C.orange, background: C.orangeLight, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                + Tutti
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "12px 0" }}>Caricamento…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SLOT_FISSI.map(slot => {
                const attivo = slotAttivi.has(slot.inizio);
                const slotDb = slotGiorno.find(d => d.ora_inizio === slot.inizio);
                const occupato = slotDb?.occupato ?? false;
                return (
                  <div key={slot.inizio} onClick={() => toggleSlot(slot)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${attivo ? (occupato ? "#1D9E75" : C.orange) : C.border}`, background: attivo ? (occupato ? C.greenLight : C.orangeLight) : "#f9f9f9", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, fontWeight: attivo ? 700 : 500, color: attivo ? (occupato ? C.greenDark : C.orange) : "#888" }}>{slot.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {occupato && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: C.greenLight, color: C.greenDark }}>Prenotato</span>}
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: attivo ? (occupato ? C.green : C.orange) : "#ddd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {attivo ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INFO */}
        <div style={{ background: C.orangeLight, borderRadius: 10, padding: "10px 13px", fontSize: 12, color: C.orange, lineHeight: 1.5 }}>
          <strong>Come funziona:</strong> tocca uno slot per attivarlo o disattivarlo. Gli slot attivi appaiono nel calendario dei clienti. Gli slot con "Prenotato" non possono essere rimossi.
        </div>

      </div>
    </div>
  );
}
