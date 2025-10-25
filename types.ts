// Tipos para dados processados, usados na UI
export interface HistoryEntry {
  timestamp: Date;
  stock: number;
}

export interface Variation {
  name: string;
  history: HistoryEntry[];
  currentStock: number;
  variation: number;
}

export interface Sku {
  id: string;
  name: string;
  url: string;
  variations: Variation[];
  totalStock: number;
  totalVariation: number;
}

// Tipos para dados brutos, como recebidos da API ou mocks
export interface RawHistoryEntry {
  timestamp: string; // Timestamps são strings (ISO 8601) em JSON
  stock: number;
}

export interface RawVariation {
  name: string;
  history: RawHistoryEntry[];
}

export interface RawSku {
  id: string;
  name: string;
  url: string;
  variations: RawVariation[];
}
