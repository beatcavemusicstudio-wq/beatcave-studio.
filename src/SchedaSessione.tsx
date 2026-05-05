/**
 * BEATCAVE STUDIO — Scheda Sessione
 * File: SchedaSessione.tsx
 * Fix: layout desktop corretto con margin-left per sidebar
 */

import { useState } from "react";
import type { SessioneCompleta, StatoSessione, TipoSessione } from "./types";

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
  red:         "#A32D2D",
  redLight:    "#FCEBEB",
  border:      "rgba(0,0,0,0.08)",
  bg:          "#f5f5f5",
} as const;

const SESSION_COLORS: Record<TipoSessione, string> = {
  Registrazione: C.orange,
  Mixing:        C.green,
  Produzione:    C.purple,
  Mastering:     C.amber,
};

const SLOT_FISSI = [
  { label: "10:00 – 12:00", inizio: "10:00", fine: "12:00" },
  { label: "15:00 – 17:00", inizio: "15:00", fine: "17:00" },
  { label: "17:00 – 19:00", inizio: "17:00", fine: "19:00" },
  { label: "19:00 – 21:00", inizio: "19:00", fine: "21:00" },
  { label: "21:00 – 23:00", inizio: "21:00", fine: "23:00" },
];

const TIPI_SESSIONE: { tipo: TipoSessione; colore: string }[] = [
  { tipo: "Registrazione", colore: C.orange  },
  { tipo: "Mixing",        colore: C.green   },
  { tipo: "Produzione",    colore: C.purple  },
  { tipo: "Mastering",     colore: C.amber   },
];

const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

function formatData(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
}

function formatDataBreve(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const gg = d.toLocaleDateString("it-IT", { weekday: "short" });
  return `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

function aggiungi7Giorni(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

function calcolaDurata(inizio: string, fine: string): string {
  const [hi, mi] = inizio.split(":").map(Number);
  const [hf, mf] = fine.split(":").map(Number);
  const minuti = (hf * 60 + mf) - (hi * 60 + mi);
  const ore = Math.floor(minuti / 60);
  const min = minuti % 60;
  if (min === 0) return `${ore} ${ore === 1 ? "ora" : "ore"}`;
  return `${ore}h ${min}min`;
}

function badgeStato(stato: StatoSessione) {
  switch (stato) {
    case "in_corso":      return { label: "In corso",      bg: C.orangeLight, color: C.orange    };
    case "confermata":    return { label: "Confermata",    bg: C.greenLight,  color: C.greenDark };
    case "da_confermare": return { label: "Da confermare", bg: C.amberLight,  color: C.amberDark };
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 10 }}>{children}</div>;
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor ?? "#222" }}>{value}</span>
    </div>
  );
}

function PagatoToggle({ pagato, onChange }: { pagato: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!pagato)} style={{ width: 46, height: 26, borderRadius: 13, cursor: "pointer", background: pagato ? C.green : "#ddd", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: pagato ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

function ModalConfermaElimina({ onConferma, onAnnulla }: { onConferma: () => void; onAnnulla: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onAnnulla}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "24px 16px 32px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Elimina sessione</div>
        <div style={{ fontSize: 14, color: "#666", marginBottom: 24, lineHeight: 1.5 }}>Sei sicuro? L'azione non può essere annullata.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onAnnulla} style={{ flex: 1, padding: "13px", borderRadius: 12, border: `0.5px solid ${C.border}`, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#444" }}>Annulla</button>
          <button onClick={onConferma} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: C.redLight, fontSize: 14, fontWeight: 700, cursor: "pointer", color: C.red }}>Elimina</button>
        </div>
      </div>
    </div>
  );
}

// ── Modifica Sessione ──
function ModificaSessione({ sessione, onSalva, onClose }: { sessione: SessioneCompleta; onSalva: (s: SessioneCompleta) => void; onClose: () => void }) {
  const slotIniziale = SLOT_FISSI.find(s => s.inizio === sessione.oraInizio && s.fine === sessione.oraFine) ?? null;
  const [data, setData]                 = useState(sessione.data);
  const [slotSel, setSlot]              = useState<typeof SLOT_FISSI[0] | null>(slotIniziale);
  const [orarioLibero, setOrarioLibero] = useState(!slotIniziale);
  const [oraInizio, setOraInizio]       = useState(sessione.oraInizio);
  const [oraFine, setOraFine]           = useState(sessione.oraFine);
  const [tipo, setTipo]                 = useState<TipoSessione>(sessione.tipo);
  const [prezzo, setPrezzo]             = useState(String(sessione.prezzo));
  const [pagato, setPagato]             = useState(sessione.pagato);
  const [note, setNote]                 = useState(sessione.note);
  const [stato, setStato]               = useState<StatoSessione>(sessione.stato);

  const handleSalva = () => {
    onSalva({ ...sessione, data, oraInizio: orarioLibero ? oraInizio : slotSel?.inizio ?? oraInizio, oraFine: orarioLibero ? oraFine : slotSel?.fine ?? oraFine, tipo, prezzo: Number(prezzo), pagato, note, stato });
  };

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 16, paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Modifica sessione</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{sessione.cliente}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16, paddingBottom: 100 }}>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Data</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: `0.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none", background: "#fff", color: "#222", fontFamily: "inherit" }} />
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Orario</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SLOT_FISSI.map(slot => {
              const sel = !orarioLibero && slotSel?.label === slot.label;
              return <button key={slot.label} onClick={() => { setSlot(slot); setOrarioLibero(false); }} style={{ background: sel ? C.orange : "#fff", border: `0.5px solid ${sel ? C.orange : C.border}`, borderRadius: 10, padding: "11px 8px", fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? "#fff" : "#555", cursor: "pointer" }}>{slot.label}</button>;
            })}
            <button onClick={() => { setOrarioLibero(true); setSlot(null); }} style={{ background: orarioLibero ? C.orangeLight : "#fff", border: `${orarioLibero ? "1.5px solid" : "0.5px dashed"} ${orarioLibero ? C.orange : "#ccc"}`, borderRadius: 10, padding: "11px 8px", fontSize: 12, fontWeight: orarioLibero ? 700 : 400, color: orarioLibero ? C.orange : "#aaa", cursor: "pointer" }}>+ Orario libero</button>
          </div>
          {orarioLibero && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, outline: "none" }} />
              <span style={{ color: "#aaa" }}>→</span>
              <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, outline: "none" }} />
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Tipo sessione</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TIPI_SESSIONE.map(({ tipo: t, colore }) => {
              const sel = tipo === t;
              return <button key={t} onClick={() => setTipo(t)} style={{ background: sel ? `${colore}18` : "#fff", border: `${sel ? "1.5px" : "0.5px"} solid ${sel ? colore : C.border}`, borderRadius: 10, padding: "11px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: colore, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? colore : "#555" }}>{t}</span>
              </button>;
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Stato</div>
          <div style={{ display: "flex", borderRadius: 12, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
            {(["da_confermare", "confermata", "in_corso"] as StatoSessione[]).map(s => {
              const labels: Record<StatoSessione, string> = { da_confermare: "Da conf.", confermata: "Confermata", in_corso: "In corso" };
              const sel = stato === s;
              return <button key={s} onClick={() => setStato(s)} style={{ flex: 1, padding: "10px 4px", fontSize: 11, fontWeight: sel ? 700 : 500, border: "none", borderRight: `0.5px solid ${C.border}`, cursor: "pointer", background: sel ? C.orangeLight : "#fff", color: sel ? C.orange : "#888" }}>{labels[s]}</button>;
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Prezzo e pagamento</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, color: "#aaa" }}>€</span>
              <input type="number" value={prezzo} onChange={e => setPrezzo(e.target.value)} min={0} style={{ border: "none", outline: "none", fontSize: 20, fontWeight: 700, color: "#222", width: "100%", background: "transparent" }} />
            </div>
            <div style={{ display: "flex", borderRadius: 12, border: `0.5px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
              <button onClick={() => setPagato(false)} style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: !pagato ? C.amberLight : "#fff", color: !pagato ? C.amberDark : "#bbb" }}>Non pag.</button>
              <button onClick={() => setPagato(true)} style={{ padding: "0 12px", fontSize: 12, fontWeight: 700, border: "none", borderLeft: `0.5px solid ${C.border}`, cursor: "pointer", background: pagato ? C.greenLight : "#fff", color: pagato ? C.greenDark : "#bbb" }}>Pagato</button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>Note</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Aggiungi una nota…" style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: `0.5px solid ${C.border}`, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", color: "#333" }} />
        </div>

      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, #f5f5f5 70%, transparent)", padding: "12px 16px 24px" }}>
        <button onClick={handleSalva} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: C.orange, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Salva modifiche</button>
      </div>
    </div>
  );
}

// ── Scheda Sessione principale ──

interface Props {
  sessione: SessioneCompleta;
  onClose: () => void;
  onAggiorna: (s: SessioneCompleta) => void;
  onElimina: (id: number) => void;
  onDuplica: (s: SessioneCompleta) => void;
}

export default function SchedaSessione({ sessione, onClose, onAggiorna, onElimina, onDuplica }: Props) {
  const [dati, setDati]                 = useState<SessioneCompleta>(sessione);
  const [modificaMode, setModificaMode] = useState(false);
  const [showConferma, setShowConferma] = useState(false);
  const [toast, setToast]               = useState<string | null>(null);

  const mostraToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleTogglePagato = () => {
    const aggiornata = { ...dati, pagato: !dati.pagato };
    setDati(aggiornata);
    onAggiorna(aggiornata);
    mostraToast(aggiornata.pagato ? "✓ Segnata come pagata" : "Segnata come non pagata");
  };

  const handleElimina = () => { onElimina(dati.id); onClose(); };

  const handleDuplica = () => {
    const nuovaData = aggiungi7Giorni(dati.data);
    onDuplica({ ...dati, id: Date.now(), data: nuovaData, stato: "confermata", pagato: false });
    mostraToast(`✓ Duplicata per il ${formatDataBreve(nuovaData)}`);
    setTimeout(() => onClose(), 2000);
  };

  if (modificaMode) {
    return <ModificaSessione sessione={dati} onSalva={s => { setDati(s); onAggiorna(s); setModificaMode(false); mostraToast("✓ Sessione aggiornata"); }} onClose={() => setModificaMode(false)} />;
  }

  const badge  = badgeStato(dati.stato as StatoSessione);
  const colore = SESSION_COLORS[dati.tipo as TipoSessione];

  return (
    <>
      {toast && (
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700, zIndex: 300, whiteSpace: "nowrap" }}>{toast}</div>
      )}
      {showConferma && <ModalConfermaElimina onConferma={handleElimina} onAnnulla={() => setShowConferma(false)} />}

      {/* Wrapper con stesso layout responsive dell'app */}
      <div style={{ display: "flex", width: "100%", minHeight: "100dvh", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>

        {/* Spacer sidebar desktop — stessa larghezza della sidebar */}
        <div className="bc-sidebar-spacer" style={{ width: 0, flexShrink: 0 }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, minWidth: 0 }}>

          {/* HEADER */}
          <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 20, paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Sessione</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dati.cliente}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{formatDataBreve(dati.data)} · {dati.oraInizio} – {dati.oraFine}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: colore }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{dati.tipo}</span>
                </div>
              </div>
              <div style={{ padding: "5px 12px", borderRadius: 20, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{badge.label}</div>
            </div>
          </div>

          {/* BODY */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>

            <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <SectionLabel>Dettagli</SectionLabel>
              <InfoRow label="Data"   value={formatData(dati.data)} />
              <InfoRow label="Orario" value={`${dati.oraInizio} – ${dati.oraFine}`} />
              <InfoRow label="Durata" value={calcolaDurata(dati.oraInizio, dati.oraFine)} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Tipo</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: colore }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{dati.tipo}</span>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <SectionLabel>Pagamento</SectionLabel>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 10px", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Importo</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.orange }}>€ {dati.prezzo}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{dati.pagato ? "Pagato" : "Non pagato"}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{dati.pagato ? "Pagamento ricevuto" : "In attesa di pagamento"}</div>
                </div>
                <PagatoToggle pagato={dati.pagato} onChange={handleTogglePagato} />
              </div>
            </div>

            {dati.note ? (
              <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <SectionLabel>Note</SectionLabel>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{dati.note}</div>
              </div>
            ) : null}

            <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <SectionLabel>Cliente</SectionLabel>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Email</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.orange }}>{dati.clienteEmail}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <button onClick={() => setModificaMode(true)} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${C.orange}44` }}>Modifica sessione</button>
              <button onClick={handleDuplica} style={{ width: "100%", padding: "13px", borderRadius: 12, border: `0.5px solid ${C.border}`, background: "#fff", color: "#444", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Duplica per la settimana prossima</button>
              <button onClick={() => setShowConferma(true)} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: C.redLight, color: C.red, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Elimina sessione</button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
