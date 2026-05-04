/**
 * BEATCAVE STUDIO — Sezione Clienti
 * File: SchedaCliente.tsx
 *
 * Contiene:
 *  - ListaClienti: lista con ricerca e stats per cliente
 *  - SchedaCliente: dettaglio con storico sessioni e pagamenti
 *  - ModificaCliente: form modifica dati cliente
 */

 import { useState } from "react";
 import type { SessioneCompleta, TipoSessione } from "./types";
 
 // ─────────────────────────────────────────────────────────
 // TIPI
 // ─────────────────────────────────────────────────────────
 
 export interface Cliente {
   id: number;
   nome: string;
   email: string;
   telefono: string;
   dataCreazioneISO: string; // YYYY-MM-DD
 }
 
 // ─────────────────────────────────────────────────────────
 // DESIGN SYSTEM
 // ─────────────────────────────────────────────────────────
 
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
 
 // Colori avatar — assegnati in base all'indice del cliente
 const AVATAR_COLORS = [C.orange, C.purple, C.green, C.amber, "#D4537E", "#378ADD"];
 
 // ─────────────────────────────────────────────────────────
 // HELPERS
 // ─────────────────────────────────────────────────────────
 
 const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
 const MESI_BREVI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
 
 function iniziali(nome: string): string {
   return nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
 }
 
 function formatDataBreve(iso: string): string {
   if (!iso) return "";
   const d = new Date(iso + "T12:00:00");
   const gg = d.toLocaleDateString("it-IT", { weekday: "short" });
   return `${gg.charAt(0).toUpperCase() + gg.slice(1)} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
 }
 
 function formatMeseAnno(iso: string): string {
   if (!iso) return "";
   const d = new Date(iso + "T12:00:00");
   return `${MESI[d.getMonth()]} ${d.getFullYear()}`;
 }
 
 function avatarColor(index: number): string {
   return AVATAR_COLORS[index % AVATAR_COLORS.length];
 }
 
 // Calcola stats di un cliente dalle sue sessioni
 function calcolaStats(sessioni: SessioneCompleta[]) {
   const totale    = sessioni.reduce((acc, s) => acc + s.prezzo, 0);
   const incassato = sessioni.filter(s => s.pagato).reduce((acc, s) => acc + s.prezzo, 0);
   const daIncassare = totale - incassato;
   return { totale, incassato, daIncassare, numSessioni: sessioni.length };
 }
 
 // ─────────────────────────────────────────────────────────
 // SOTTO-COMPONENTI
 // ─────────────────────────────────────────────────────────
 
 function SectionLabel({ children }: { children: React.ReactNode }) {
   return <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 10 }}>{children}</div>;
 }
 
 function Avatar({ nome, color, size = 42 }: { nome: string; color: string; size?: number }) {
   return (
     <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
       {iniziali(nome)}
     </div>
   );
 }
 
 // ─────────────────────────────────────────────────────────
 // MODAL: Nuovo / Modifica Cliente
 // ─────────────────────────────────────────────────────────
 
 function FormCliente({
   cliente,
   onSalva,
   onClose,
 }: {
   cliente?: Cliente;
   onSalva: (c: Omit<Cliente, "id" | "dataCreazioneISO">) => void;
   onClose: () => void;
 }) {
   const [nome, setNome]         = useState(cliente?.nome ?? "");
   const [email, setEmail]       = useState(cliente?.email ?? "");
   const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
   const [errori, setErrori]     = useState<Record<string, string>>({});
 
   const valida = () => {
     const e: Record<string, string> = {};
     if (!nome.trim())  e.nome  = "Il nome è obbligatorio";
     if (!email.trim()) e.email = "L'email è obbligatoria";
     else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email non valida";
     setErrori(e);
     return Object.keys(e).length === 0;
   };
 
   const isModifica = !!cliente;
 
   return (
     <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
       <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px" }}>
         <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>
           {isModifica ? "Modifica cliente" : "Nuovo cliente"}
         </div>
         <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 
           <div>
             <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 6 }}>Nome completo</div>
             <input type="text" placeholder="es. Mario Bianchi" value={nome} onChange={e => setNome(e.target.value)}
               style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${errori.nome ? C.orange : C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
             {errori.nome && <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>{errori.nome}</div>}
           </div>
 
           <div>
             <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 6 }}>Email</div>
             <input type="email" placeholder="es. mario@email.com" value={email} onChange={e => setEmail(e.target.value)}
               style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${errori.email ? C.orange : C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
             {errori.email && <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>{errori.email}</div>}
           </div>
 
           <div>
             <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 6 }}>Telefono <span style={{ fontWeight: 400, color: "#bbb" }}>(opzionale)</span></div>
             <input type="tel" placeholder="es. +39 333 123 4567" value={telefono} onChange={e => setTelefono(e.target.value)}
               style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `0.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
           </div>
 
           <button onClick={() => { if (valida()) onSalva({ nome: nome.trim(), email: email.trim(), telefono: telefono.trim() }); }}
             style={{ padding: "13px", borderRadius: 12, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
             {isModifica ? "Salva modifiche" : "Aggiungi cliente"}
           </button>
         </div>
       </div>
     </div>
   );
 }
 
 // ─────────────────────────────────────────────────────────
 // SCHEDA CLIENTE
 // ─────────────────────────────────────────────────────────
 
 function SchedaCliente({
   cliente,
   clienteIndex,
   sessioni,
   onClose,
   onModifica,
   onNuovaPrenotazione,
 }: {
   cliente: Cliente;
   clienteIndex: number;
   sessioni: SessioneCompleta[];
   onClose: () => void;
   onModifica: (c: Cliente) => void;
   onNuovaPrenotazione: (clienteId: number) => void;
 }) {
   const [showModifica, setShowModifica] = useState(false);
   const [toast, setToast] = useState<string | null>(null);
 
   const mostraToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
 
   const stats = calcolaStats(sessioni);
   const colore = avatarColor(clienteIndex);
 
   // Sessioni ordinate per data decrescente (più recenti prima)
   const sessioniOrdinate = [...sessioni].sort((a, b) => b.data.localeCompare(a.data));
 
   const handleModifica = (dati: Omit<Cliente, "id" | "dataCreazioneISO">) => {
     onModifica({ ...cliente, ...dati });
     setShowModifica(false);
     mostraToast("✓ Cliente aggiornato");
   };
 
   return (
     <>
       {toast && (
         <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 700, zIndex: 300, whiteSpace: "nowrap" }}>{toast}</div>
       )}
       {showModifica && (
         <FormCliente cliente={cliente} onSalva={handleModifica} onClose={() => setShowModifica(false)} />
       )}
 
       <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
 
         {/* HEADER */}
         <div style={{ background: C.dark, padding: "12px 16px 20px", flexShrink: 0 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
             <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
               <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
             </button>
             <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Clienti</span>
           </div>
 
           <Avatar nome={cliente.nome} color={colore} size={56} />
           <div style={{ fontSize: 23, fontWeight: 700, color: "#fff", marginTop: 10, letterSpacing: "-0.3px" }}>{cliente.nome}</div>
           <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
             {cliente.email}{cliente.telefono ? ` · ${cliente.telefono}` : ""}
           </div>
 
           {/* Strip statistiche */}
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", marginTop: 16 }}>
             {[
               { num: String(stats.numSessioni), lbl: "Sessioni",  color: C.orange },
               { num: `€${stats.totale}`,        lbl: "Totale",    color: "#fff"   },
               { num: `€${stats.incassato}`,      lbl: "Incassato", color: C.green  },
             ].map((item, i) => (
               <div key={i} style={{ background: "rgba(255,255,255,0.05)", padding: "10px 8px", textAlign: "center" }}>
                 <div style={{ fontSize: 18, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.num}</div>
                 <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{item.lbl}</div>
               </div>
             ))}
           </div>
         </div>
 
         {/* BODY */}
         <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 24 }}>
 
           {/* CONTATTI */}
           <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
             <SectionLabel>Contatti</SectionLabel>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `0.5px solid rgba(0,0,0,0.05)` }}>
               <span style={{ fontSize: 12, color: "#888" }}>Email</span>
               <span style={{ fontSize: 13, fontWeight: 600, color: C.orange }}>{cliente.email}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `0.5px solid rgba(0,0,0,0.05)` }}>
               <span style={{ fontSize: 12, color: "#888" }}>Telefono</span>
               <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{cliente.telefono || "—"}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
               <span style={{ fontSize: 12, color: "#888" }}>Cliente dal</span>
               <span style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{formatMeseAnno(cliente.dataCreazioneISO)}</span>
             </div>
           </div>
 
           {/* DA INCASSARE */}
           {stats.daIncassare > 0 && (
             <div style={{ background: C.amberLight, border: `0.5px solid ${C.amber}44`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <div>
                 <div style={{ fontSize: 12, fontWeight: 700, color: C.amberDark }}>Pagamenti in sospeso</div>
                 <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>Da incassare</div>
               </div>
               <div style={{ fontSize: 20, fontWeight: 700, color: C.amberDark }}>€{stats.daIncassare}</div>
             </div>
           )}
 
           {/* STORICO SESSIONI */}
           <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
             <SectionLabel>Storico sessioni ({stats.numSessioni})</SectionLabel>
             {sessioniOrdinate.length === 0 ? (
               <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "12px 0" }}>Nessuna sessione</div>
             ) : (
               sessioniOrdinate.map((s, i) => (
                 <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < sessioniOrdinate.length - 1 ? `0.5px solid rgba(0,0,0,0.05)` : "none" }}>
                   <div style={{ width: 8, height: 8, borderRadius: "50%", background: SESSION_COLORS[s.tipo as TipoSessione], flexShrink: 0 }} />
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{s.tipo}</div>
                     <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{formatDataBreve(s.data)} · {s.oraInizio}–{s.oraFine}</div>
                   </div>
                   <div style={{ textAlign: "right" }}>
                     <div style={{ fontSize: 13, fontWeight: 700, color: "#222" }}>€{s.prezzo}</div>
                     <div style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: s.pagato ? C.greenLight : C.amberLight, color: s.pagato ? C.greenDark : C.amberDark, marginTop: 2 }}>
                       {s.pagato ? "Pagato" : "Non pagato"}
                     </div>
                   </div>
                 </div>
               ))
             )}
           </div>
 
           {/* AZIONI */}
           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
             <button onClick={() => onNuovaPrenotazione(cliente.id)}
               style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${C.orange}44` }}>
               Nuova prenotazione
             </button>
             <button onClick={() => setShowModifica(true)}
               style={{ width: "100%", padding: "13px", borderRadius: 12, border: `0.5px solid ${C.border}`, background: "#fff", color: "#444", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
               Modifica cliente
             </button>
           </div>
 
         </div>
       </div>
     </>
   );
 }
 
 // ─────────────────────────────────────────────────────────
 // LISTA CLIENTI (componente principale esportato)
 // ─────────────────────────────────────────────────────────
 
 interface Props {
   clienti: Cliente[];
   sessioni: SessioneCompleta[];
   onClose: () => void;
   onAggiungiCliente: (c: Omit<Cliente, "id" | "dataCreazioneISO">) => void;
   onModificaCliente: (c: Cliente) => void;
   onNuovaPrenotazione: (clienteId: number) => void;
 }
 
 export default function SezioneClienti({ clienti, sessioni, onClose, onAggiungiCliente, onModificaCliente, onNuovaPrenotazione }: Props) {
   const [ricerca, setRicerca]               = useState("");
   const [clienteSelezionato, setCliente]    = useState<Cliente | null>(null);
   const [clienteIndex, setClienteIndex]     = useState(0);
   const [showFormNuovo, setShowFormNuovo]   = useState(false);
 
   const filtratiIndex = clienti
     .map((c, i) => ({ c, i }))
     .filter(({ c }) => c.nome.toLowerCase().includes(ricerca.toLowerCase()) || c.email.toLowerCase().includes(ricerca.toLowerCase()));
 
   const sessioniDiCliente = (clienteId: number) =>
     sessioni.filter(s => s.clienteEmail === clienti.find(c => c.id === clienteId)?.email);
 
   if (clienteSelezionato) {
     return (
       <SchedaCliente
         cliente={clienteSelezionato}
         clienteIndex={clienteIndex}
         sessioni={sessioniDiCliente(clienteSelezionato.id)}
         onClose={() => setCliente(null)}
         onModifica={c => { onModificaCliente(c); setCliente(c); }}
         onNuovaPrenotazione={id => { onNuovaPrenotazione(id); setCliente(null); onClose(); }}
       />
     );
   }
 
   return (
     <>
       {showFormNuovo && (
         <FormCliente
           onSalva={dati => { onAggiungiCliente(dati); setShowFormNuovo(false); }}
           onClose={() => setShowFormNuovo(false)}
         />
       )}
 
       <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'SF Pro Text','Helvetica Neue',Arial,sans-serif", WebkitFontSmoothing: "antialiased" }}>
 
         {/* HEADER */}
         <div style={{ background: C.dark, padding: "12px 16px 16px", flexShrink: 0 }}>
           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
             <div>
               <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Clienti</div>
               <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{clienti.length} clienti attivi</div>
             </div>
             <button onClick={() => setShowFormNuovo(true)} style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
               <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
             </button>
           </div>
 
           {/* Barra ricerca */}
           <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
             <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
               <circle cx="6" cy="6" r="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/>
               <path d="M9 9l3 3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
             </svg>
             <input
               type="text"
               placeholder="Cerca cliente…"
               value={ricerca}
               onChange={e => setRicerca(e.target.value)}
               style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#fff", width: "100%" }}
             />
           </div>
         </div>
 
         {/* LISTA */}
         <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
           {filtratiIndex.length === 0 ? (
             <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "32px 0" }}>Nessun cliente trovato</div>
           ) : (
             filtratiIndex.map(({ c, i }) => {
               const stats = calcolaStats(sessioniDiCliente(c.id));
               const colore = avatarColor(i);
               return (
                 <div key={c.id} onClick={() => { setCliente(c); setClienteIndex(i); }}
                   style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                   <Avatar nome={c.nome} color={colore} size={44} />
                   <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{c.nome}</div>
                     <div style={{ fontSize: 11, color: "#888", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                     <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: C.orangeLight, color: C.orange }}>{stats.numSessioni} sessioni</div>
                     {stats.daIncassare > 0
                       ? <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: C.amberLight, color: C.amberDark }}>€{stats.daIncassare} da inc.</div>
                       : <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: C.greenLight, color: C.greenDark }}>€{stats.totale}</div>
                     }
                   </div>
                   <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}>
                     <path d="M4 2l4 4-4 4" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                 </div>
               );
             })
           )}
         </div>
 
       </div>
     </>
   );
 }