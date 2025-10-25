import { mockSkus } from './mockData.ts';
import type { RawSku } from '../types.ts';

// Aponta diretamente para o seu servidor onde o banco de dados ao vivo está
const API_BASE_URL = 'http://68.183.138.24:3001'; 
// Garante que a API real seja usada
const USE_MOCK_DATA = false; 

export const getAllSkus = async (): Promise<RawSku[]> => {
  if (USE_MOCK_DATA) {
    console.warn("MODO DE TESTE ATIVADO: Usando dados simulados.");
    // Deep copy para evitar mutações nos dados mockados entre re-renderizações
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(mockSkus))), 500));
  }
  try {
    // A URL final será http://68.183.138.24:3001/api/skus
    const response = await fetch(`${API_BASE_URL}/api/skus`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar dados da API. Status: ${response.status}`);
    }
    const data: RawSku[] = await response.json();
    return data;
  } catch (error) {
    console.error("Não foi possível buscar os SKUs:", error);
    alert(`Erro ao conectar com o servidor: ${error instanceof Error ? error.message : String(error)}. Exibindo dados de exemplo.`);
    return JSON.parse(JSON.stringify(mockSkus)); // Retorna dados mockados em caso de erro
  }
};
