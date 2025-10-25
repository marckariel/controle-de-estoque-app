import type { RawSku, RawHistoryEntry } from '../types.ts';

const generateHistory = (days: number, startStock: number, dailyChange: number): RawHistoryEntry[] => {
  const history: RawHistoryEntry[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString();
    const stock = Math.round(startStock + (days - i) * dailyChange + (Math.random() - 0.5) * 5);
    history.push({ timestamp, stock: Math.max(0, stock) }); // Garante que o estoque não seja negativo
  }
  return history;
};

export const mockSkus: RawSku[] = [
  {
    id: 'TS-BL-01',
    name: 'Camiseta Básica de Algodão',
    url: 'https://www.google.com/search?q=Camiseta+Básica+de+Algodão',
    variations: [
      { name: 'Azul - P', history: generateHistory(7, 150, -2.5) },
      { name: 'Azul - M', history: generateHistory(7, 200, -3) },
      { name: 'Preto - M', history: generateHistory(7, 180, -1.5) },
      { name: 'Branco - G', history: generateHistory(7, 120, -0.5) },
    ],
  },
  {
    id: 'CL-DN-05',
    name: 'Calça Jeans Slim Fit',
    url: 'https://www.google.com/search?q=Calça+Jeans+Slim+Fit',
    variations: [
      { name: 'Azul Escuro - 40', history: generateHistory(7, 80, -1) },
      { name: 'Preto - 42', history: generateHistory(7, 95, -1.8) },
    ],
  },
    {
    id: 'SH-SN-12',
    name: 'Tênis Esportivo Performance',
    url: 'https://www.google.com/search?q=Tênis+Esportivo+Performance',
    variations: [
      { name: 'Branco/Vermelho - 41', history: generateHistory(7, 50, -0.8) },
      { name: 'Preto/Cinza - 42', history: generateHistory(7, 65, -1.2) },
      { name: 'Azul Marinho - 40', history: generateHistory(7, 30, -0.2) },
    ],
  },
];