/**
 * BEATCAVE STUDIO — Client Supabase
 * File: supabase.ts
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

export async function fetchSessioni(data?: string) {
  const filtro = data ? `?data=eq.${data}&order=ora_inizio` : `?order=data.desc,ora_inizio`;
  const rows = await req(`/sessioni${filtro}`);
  return rows ?? [];
}

export async function fetchSessioniFuture() {
  const oggi = new Date().toISOString().split("T")[0];
  const rows = await req(`/sessioni?archiviata=eq.false&data=gte.${oggi}&order=data,ora_inizio`);
  return rows ?? [];
}

export async function fetchSessioniArchiviate() {
  const rows = await req(`/sessioni?archiviata=eq.true&order=data.desc,ora_inizio`);
  return rows ?? [];
}

export async function fetchSessioniMese(anno: number, mese: number) {
  const from = `${anno}-${String(mese + 1).padStart(2, "0")}-01`;
  const toDate = new Date(anno, mese + 1, 0);
  const to = `${anno}-${String(mese + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;
  const rows = await req(`/sessioni?data=gte.${from}&data=lte.${to}&order=data,ora_inizio`);
  return rows ?? [];
}

export async function fetchSessioniCliente(email: string) {
  const rows = await req(`/sessioni?cliente_email=eq.${encodeURIComponent(email)}&order=data.desc`);
  return rows ?? [];
}

export async function inserisciSessione(s: {
  cliente_nome: string; cliente_email: string; data: string;
  ora_inizio: string; ora_fine: string; tipo: string; stato: string;
  prezzo: number; pagato: boolean; note: string; pacchetto_id?: number | null;
}) {
  const rows = await req("/sessioni", { method: "POST", body: JSON.stringify(s) });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function aggiornaSessione(id: number, s: Record<string, unknown>) {
  return req(`/sessioni?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(s) });
}

export async function eliminaSessione(id: number) {
  return req(`/sessioni?id=eq.${id}`, { method: "DELETE", headers: { "Prefer": "return=minimal" } });
}

// ── PACCHETTI ──

export async function fetchPacchetti() {
  const rows = await req("/pacchetti?order=creato_il.desc");
  return rows ?? [];
}

export async function fetchSessioniPacchetto(pacchettoId: number) {
  const rows = await req(`/sessioni?pacchetto_id=eq.${pacchettoId}&order=data,ora_inizio`);
  return rows ?? [];
}

export async function inserisciPacchetto(p: {
  cliente_nome: string; cliente_email: string; nome: string;
  num_sessioni: number; prezzo_totale: number; pagato: boolean; note: string;
}) {
  const rows = await req("/pacchetti", { method: "POST", body: JSON.stringify(p) });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function aggiornaPacchetto(id: number, p: Record<string, unknown>) {
  return req(`/pacchetti?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(p) });
}

export async function eliminaPacchetto(id: number) {
  return req(`/pacchetti?id=eq.${id}`, { method: "DELETE", headers: { "Prefer": "return=minimal" } });
}

export async function collegaSessioneAPacchetto(sessioneId: number, pacchettoId: number | null) {
  return req(`/sessioni?id=eq.${sessioneId}`, {
    method: "PATCH",
    body: JSON.stringify({ pacchetto_id: pacchettoId }),
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
    pacchettoId:  row.pacchetto_id ? Number(row.pacchetto_id) : null,
    archiviata:   Boolean(row.archiviata),
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

export function dbToPacchetto(row: Record<string, unknown>) {
  return {
    id:            Number(row.id),
    clienteNome:   String(row.cliente_nome ?? ""),
    clienteEmail:  String(row.cliente_email ?? ""),
    nome:          String(row.nome ?? ""),
    numSessioni:   Number(row.num_sessioni ?? 4),
    prezzoTotale:  Number(row.prezzo_totale ?? 0),
    pagato:        Boolean(row.pagato),
    note:          String(row.note ?? ""),
    creatoIl:      String(row.creato_il ?? ""),
  };
}
