/**
 * BEATCAVE STUDIO — Client Supabase senza librerie esterne
 * File: supabase.ts
 *
 * Usa fetch nativo — nessun npm install necessario.
 */

 const BASE = "https://lpznonwpofwywtvikgfm.supabase.co/rest/v1";
 const KEY  = "sb_publishable_BGd9aD4jqt6K6txVpDCifA_C-IvCaP_";
 
 const H = {
   "apikey":        KEY,
   "Authorization": `Bearer ${KEY}`,
   "Content-Type":  "application/json",
   "Prefer":        "return=representation",
 };
 
 async function req(path: string, options?: RequestInit) {
   const res = await fetch(`${BASE}${path}`, {
     ...options,
     headers: { ...H, ...(options?.headers ?? {}) },
   });
   if (!res.ok) throw new Error(await res.text());
   const text = await res.text();
   return text ? JSON.parse(text) : null;
 }
 
 // ── CLIENTI ──
 
 export async function fetchClienti() {
   return req("/clienti?order=nome") ?? [];
 }
 
 export async function inserisciCliente(c: { nome: string; email: string; telefono: string }) {
   const rows = await req("/clienti", { method: "POST", body: JSON.stringify(c) });
   return Array.isArray(rows) ? rows[0] : rows;
 }
 
 export async function aggiornaCliente(id: number, c: { nome: string; email: string; telefono: string }) {
   return req(`/clienti?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(c) });
 }
 
 // ── SESSIONI ──
 
 // Chiamata da App.tsx come: fetchSessioni(oggiISO())
 export async function fetchSessioni(data?: string) {
   const filtro = data ? `?data=eq.${data}&order=ora_inizio` : `?order=data.desc,ora_inizio`;
   const rows = await req(`/sessioni${filtro}`);
   return rows ?? [];
 }
 
 export async function fetchSessioniCliente(email: string) {
   const rows = await req(`/sessioni?cliente_email=eq.${encodeURIComponent(email)}&order=data.desc`);
   return rows ?? [];
 }
 
 export async function inserisciSessione(s: {
   cliente_nome: string; cliente_email: string; data: string;
   ora_inizio: string; ora_fine: string; tipo: string; stato: string;
   prezzo: number; pagato: boolean; note: string;
 }) {
   const rows = await req("/sessioni", { method: "POST", body: JSON.stringify(s) });
   return Array.isArray(rows) ? rows[0] : rows;
 }
 
 export async function aggiornaSessione(id: number, s: Record<string, unknown>) {
   return req(`/sessioni?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(s) });
 }
 
 export async function eliminaSessione(id: number) {
   return req(`/sessioni?id=eq.${id}`, {
     method: "DELETE",
     headers: { "Prefer": "return=minimal" },
   });
 }
 
 // ── CONVERSORI ──
 
 export function dbToSessione(row: Record<string, unknown>) {
   return {
     id:           Number(row.id),
     cliente:      String(row.cliente_nome ?? ""),
     clienteEmail: String(row.cliente_email ?? ""),
     data:         String(row.data ?? ""),
     oraInizio:    String(row.ora_inizio ?? ""),
     oraFine:      String(row.ora_fine ?? ""),
     tipo:         String(row.tipo ?? "Registrazione") as "Registrazione" | "Mixing" | "Produzione" | "Mastering",
     stato:        String(row.stato ?? "confermata") as "in_corso" | "confermata" | "da_confermare",
     prezzo:       Number(row.prezzo ?? 0),
     pagato:       Boolean(row.pagato),
     note:         String(row.note ?? ""),
   };
 }
 
 export function dbToCliente(row: Record<string, unknown>) {
   return {
     id:               Number(row.id),
     nome:             String(row.nome ?? ""),
     email:            String(row.email ?? ""),
     telefono:         String(row.telefono ?? ""),
     dataCreazioneISO: String(row.data_creazione ?? new Date().toISOString().split("T")[0]),
   };
 }