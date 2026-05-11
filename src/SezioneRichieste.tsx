/**
 * BEATCAVE STUDIO — Sezione Richieste
 * File: SezioneRichieste.tsx
 */

import { useState, useEffect } from "react";

const BASE = "https://lpznonwpofwywtvikgfm.supabase.co/rest/v1";
const KEY  = "sb_publishable_BGd9aD4jqt6K6txVpDCifA_C-IvCaP_";
const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...H, ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const C = { orange: "#E8610A", orangeLight: "#FEF0E6", dark: "#0D0D0D", green: "#1D9E75", greenLight: "#E1F5EE", greenDark: "#0F6E56", red: "#A32D2D", redLight: "#FCEBEB", amber: "#BA7517", amberLight: "#FAEEDA", amberDark: "#854F0B", border: "rgba(0,0,0,0.08)", bg: "#f5f5f5" } as const;
const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

interface Richiesta { id: number; cliente_nome: string; cliente_email: string; data: string; ora_inizio: string; ora_fine: string; tipo: string; note: string; stato: string; creato_il: string; disponibilita_id: number; }

function formatData(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  const gg = d.toLocaleDateString("it-IT", { weekday: "short" });
  return `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

function iniziali(nome: string): string { return nome.split(" ").filter(Boolean).slice(0,2).map(p => p[0].toUpperCase()).join(""); }

export default function SezioneRichieste() {
  const [richieste, setRichieste]   = useState<Richiesta[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState<"in_attesa"|"tutte">("in_attesa");
  const [toast, setToast]           = useState<string|null>(null);
  const [elaborando, setElaborando] = useState<number|null>(null);

  const carica = async () => {
    setLoading(true);
    try { setRichieste((await req("/richieste?order=creato_il.desc")) ?? []); }
    catch { /* silenzioso */ } finally { setLoading(false); }
  };

  useEffect(() => { carica(); }, []);

  const mostraToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleConferma = async (r: Richiesta) => {
    setElaborando(r.id);
    try {
      await req(`/richieste?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ stato: "confermata" }) });
      setRichieste(prev => prev.map(x => x.id === r.id ? { ...x, stato: "confermata" } : x));
      mostraToast(`✓ Sessione confermata per ${r.cliente_nome}`);
    } catch { alert("Errore nella conferma."); } finally { setElaborando(null); }
  };

  const handleRifiuta = async (r: Richiesta) => {
    if (!confirm(`Rifiutare la richiesta di ${r.cliente_nome}?`)) return;
    setElaborando(r.id);
    try {
      await req(`/richieste?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ stato: "rifiutata" }) });
      setRichieste(prev => prev.map(x => x.id === r.id ? { ...x, stato: "rifiutata" } : x));
      mostraToast(`Richiesta di ${r.cliente_nome} rifiutata`);
    } catch { alert("Errore nel rifiuto."); } finally { setElaborando(null); }
  };

  const filtrate = filtro === "in_attesa" ? richieste.filter(r => r.stato === "in_attesa") : richieste;
  const numAttesa = richieste.filter(r => r.stato === "in_attesa").length;

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700, zIndex: 300, whiteSpace: "nowrap" }}>{toast}</div>}

      <div style={{ background: C.dark, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Richieste</div>
              {numAttesa > 0 && <div style={{ background: C.orange, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{numAttesa}</div>}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Prenotazioni dai clienti</div>
          </div>
          <button onClick={carica} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7A5 5 0 1 1 7 2a5 5 0 0 1 3.5 1.5L12 2v4H8l1.5-1.5A3 3 0 1 0 10 7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", borderRadius: 10, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
          <button onClick={() => setFiltro("in_attesa")} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: filtro === "in_attesa" ? 700 : 500, border: "none", cursor: "pointer", background: filtro === "in_attesa" ? C.orange : "#fff", color: filtro === "in_attesa" ? "#fff" : "#888" }}>In attesa {numAttesa > 0 ? `(${numAttesa})` : ""}</button>
          <button onClick={() => setFiltro("tutte")} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: filtro === "tutte" ? 700 : 500, border: "none", borderLeft: `0.5px solid ${C.border}`, cursor: "pointer", background: filtro === "tutte" ? C.orange : "#fff", color: filtro === "tutte" ? "#fff" : "#888" }}>Tutte ({richieste.length})</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#aaa" }}>Caricamento…</div>
        ) : filtrate.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#aaa" }}>{filtro === "in_attesa" ? "Nessuna richiesta in attesa" : "Nessuna richiesta"}</div>
        ) : filtrate.map(r => (
          <div key={r.id} style={{ background: "#fff", border: `0.5px solid ${r.stato === "in_attesa" ? C.orange + "44" : C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{iniziali(r.cliente_nome)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{r.cliente_nome}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{r.cliente_email}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: r.stato === "confermata" ? C.greenLight : r.stato === "rifiutata" ? C.redLight : C.amberLight, color: r.stato === "confermata" ? C.greenDark : r.stato === "rifiutata" ? C.red : C.amberDark }}>
                {r.stato === "confermata" ? "Confermata" : r.stato === "rifiutata" ? "Rifiutata" : "In attesa"}
              </div>
            </div>
            <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "10px 12px", marginBottom: r.stato === "in_attesa" ? 10 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: "#888" }}>Data</span><span style={{ fontSize: 12, fontWeight: 600 }}>{formatData(r.data)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: "#888" }}>Orario</span><span style={{ fontSize: 12, fontWeight: 600 }}>{r.ora_inizio} – {r.ora_fine}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "#888" }}>Tipo</span><span style={{ fontSize: 12, fontWeight: 600 }}>{r.tipo}</span></div>
              {r.note && <div style={{ marginTop: 6, paddingTop: 6, borderTop: `0.5px solid ${C.border}`, fontSize: 11, color: "#555" }}><span style={{ color: "#888" }}>Note: </span>{r.note}</div>}
            </div>
            {r.stato === "in_attesa" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleRifiuta(r)} disabled={elaborando === r.id} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: C.redLight, color: C.red, fontSize: 13, fontWeight: 700, cursor: elaborando === r.id ? "default" : "pointer" }}>Rifiuta</button>
                <button onClick={() => handleConferma(r)} disabled={elaborando === r.id} style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 13, fontWeight: 700, cursor: elaborando === r.id ? "default" : "pointer" }}>
                  {elaborando === r.id ? "…" : "✓ Conferma sessione"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
