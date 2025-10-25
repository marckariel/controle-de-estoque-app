import { GoogleGenAI } from "@google/genai";
import type { Variation } from '../types.ts';

export const generateStockInsight = async (skuName: string, variations: Variation[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepara uma amostra de dados para não sobrecarregar o prompt
    const dataSample = variations.map(v => ({
        name: v.name,
        // Converte os objetos Date de volta para strings legíveis para o prompt
        historySample: v.history.slice(0, 3).concat(v.history.slice(-3)).map(h => ({ 
            timestamp: h.timestamp.toLocaleDateString('pt-BR'), 
            stock: h.stock 
        })),
        recordCount: v.history.length
    }));

    const prompt = `
      **Análise de Desempenho de SKU para Gerente de Estoque**
      **Produto:** ${skuName}
      **Dados:** A seguir estão amostras do histórico de estoque para cada variação deste produto. Os dados mostram o estoque no início e no fim do período analisado.
      \`\`\`json
      ${JSON.stringify(dataSample, null, 2)}
      \`\`\`
      **Sua Tarefa:**
      Você é um especialista em análise de varejo. Com base nos dados, forneça uma análise concisa em português do Brasil (usando markdown) incluindo:
      1.  **Resumo Geral:** Qual a tendência geral de vendas do produto (a julgar pela queda de estoque)?
      2.  **Análise Comparativa:** Qual variação teve a maior queda de estoque (mais vendida)? Existe alguma variação com desempenho muito diferente das outras?
      3.  **Insights Estratégicos:** Aponte destaques (ex: "A variação X é a campeã de vendas") e sugira uma ação clara e objetiva (ex: "Priorizar reabastecimento da variação Y" ou "Considerar uma promoção para a variação Z que está parada").
      4.  **Conclusão:** Um resumo final sobre a saúde do SKU.
    `;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Error generating stock insight:", error);
    return "Falha ao gerar a análise de IA. Verifique sua chave de API e a configuração no painel.";
  }
};
