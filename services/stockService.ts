import { mockSkus } from './mockData.ts';
import type { RawSku } from '../types.ts';

// Aponta para o caminho local que a Vercel vai redirecionar
const API_BASE_URL = ''; 
// Garante que a API real seja usada
const USE_MOCK_DATA = false; 

export const getAllSkus = async (): Promise<RawSku[]> => {
  if (USE_MOCK_DATA) {
    console.warn("MODO DE TESTE ATIVADO: Usando dados simulados.");
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(mockSkus))), 500));
  }
  try {
    // A URL final agora será /api/skus, que a Vercel vai interceptar
    const response = await fetch(`${API_BASE_URL}/api/skus`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar dados da API. Status: ${response.status}`);
    }
    const data: RawSku[] = await response.json();
    return data;
  } catch (error) {
    console.error("Não foi possível buscar os SKUs:", error);
    alert(`Erro ao conectar com o servidor: ${error instanceof Error ? error.message : String(error)}. Exibindo dados de exemplo.`);
    return JSON.parse(JSON.stringify(mockSkus)); 
  }
};