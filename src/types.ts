// types.ts — tipi condivisi tra tutti i componenti Beatcave

export type TipoSessione = "Registrazione" | "Mixing" | "Produzione" | "Mastering";
export type StatoSessione = "in_corso" | "confermata" | "da_confermare";
export type TabId = "home" | "calendario" | "clienti" | "fatture";
export type Schermata = "home" | "nuova-prenotazione" | "scheda-sessione" | "clienti";

export interface SessioneCompleta {
  id: number;
  cliente: string;
  clienteEmail: string;
  data: string;
  oraInizio: string;
  oraFine: string;
  tipo: TipoSessione;
  stato: StatoSessione;
  prezzo: number;
  pagato: boolean;
  note: string;
}

export interface Prenotazione {
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
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefono: string;
  dataCreazioneISO: string;
}