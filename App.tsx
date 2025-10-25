import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { getAllSkus } from './services/stockService.ts';
import { generateStockInsight } from './services/geminiService.ts';
import type { Sku, RawSku, Variation, HistoryEntry } from './types.ts';

const StarIcon = ({ filled }: { filled: boolean }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${filled ? 'text-yellow-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 24 24" stroke="none"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg> );
const EyeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> );
const RocketIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> );

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) as T : initialValue;
    } catch (error) { return initialValue; }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) { console.error(error); }
  };
  return [storedValue, setValue];
};

type SortConfig = { key: keyof Sku; direction: 'asc' | 'desc'; };

const App = () => {
  const [skus, setSkus] = useState<RawSku[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(7);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [favorites, setFavorites] = useLocalStorage<string[]>('favoriteSkus', []);
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  const [selectedSku, setSelectedSku] = useState<Sku | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchSkus = async () => {
      try {
        setLoading(true);
        setError(null);
        const skuData = await getAllSkus();
        setSkus(skuData);
      } catch (e) {
        setError('Falha ao carregar os dados de estoque.');
        console.error(e);
      } finally { setLoading(false); }
    };
    fetchSkus();
  }, []);

  const processedData: Sku[] = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    const data = skus.map((sku): Sku => {
      let totalStock = 0;
      let totalVariation = 0;
      const processedVariations = sku.variations.map((variation): Variation => {
        const relevantHistory = variation.history.filter(h => new Date(h.timestamp) >= startDate);
        const latest = relevantHistory.length > 0 ? relevantHistory[relevantHistory.length - 1] : { stock: 0, timestamp: new Date().toISOString() };
        const initial = relevantHistory.length > 0 ? relevantHistory[0] : latest;
        const variationValue = latest.stock - initial.stock;
        totalStock += latest.stock;
        totalVariation += variationValue;
        
        const historyWithDateObjects: HistoryEntry[] = relevantHistory.map(h => ({ ...h, timestamp: new Date(h.timestamp) }));
        
        return { ...variation, history: historyWithDateObjects, currentStock: latest.stock, variation: variationValue };
      });
      return { ...sku, variations: processedVariations, totalStock, totalVariation };
    });

    return data.sort((a, b) => {
        const isAFavorite = favorites.includes(a.id);
        const isBFavorite = favorites.includes(b.id);
        if (isAFavorite && !isBFavorite) return -1;
        if (!isAFavorite && isBFavorite) return 1;
        
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === undefined || valB === undefined) return 0;

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [skus, period, sortConfig, favorites]);

  const handleSort = (key: keyof Sku) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));
  const handleToggleFavorite = (skuId: string) => setFavorites(p => p.includes(skuId) ? p.filter(id => id !== skuId) : [...p, skuId]);
  const handleToggleExpand = (skuId: string) => setExpandedSkus(p => { const n = new Set(p); n.has(skuId) ? n.delete(skuId) : n.add(skuId); return n; });
  const handleAnalyzeSku = async (sku: Sku) => {
    setSelectedSku(sku);
    setIsModalOpen(true);
    setIsAnalysisLoading(true);
    setAnalysis('');
    try {
      const insight = await generateStockInsight(sku.name, sku.variations);
      setAnalysis(insight);
    } catch (e) {
      setAnalysis('Ocorreu um erro ao gerar a análise.');
    } finally { setIsAnalysisLoading(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-screen flex-col gap-4"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div><p className="text-xl">Carregando dados...</p></div>;
  if (error) return <div className="container mx-auto p-4"><div className="bg-red-900 border border-red-400 text-red-100 px-4 py-3 rounded"><strong className="font-bold">Erro!</strong><span className="block sm:inline"> {error}</span></div></div>;

  return (
    <div className="container mx-auto p-4 font-sans">
        <header className="mb-6"><h1 className="text-4xl font-bold text-white">Controle de Estoque</h1><p className="text-lg text-gray-400">Monitore e analise o estoque de seus produtos com insights de IA.</p></header>
        <div className="mb-4 flex items-center gap-4 bg-gray-800 p-3 rounded-lg">
            <span className="text-gray-300">Analisar período:</span>
            {[1, 7].map(p => <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{p} {p === 1 ? 'Dia' : 'Dias'}</button>)}
        </div>
        <div className="hidden md:block bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <table className="min-w-full"><thead className="bg-gray-700"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase w-1/12"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase w-5/12 cursor-pointer" onClick={() => handleSort('name')}>Nome do Produto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase w-2/12 cursor-pointer" onClick={() => handleSort('totalStock')}>Estoque Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase w-2/12 cursor-pointer" onClick={() => handleSort('totalVariation')}>Variação Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase w-2/12">Ações</th>
            </tr></thead><tbody className="divide-y divide-gray-700">
            {processedData.map(sku => <React.Fragment key={sku.id}><tr className="hover:bg-gray-700 cursor-pointer" onClick={() => handleToggleExpand(sku.id)}>
                <td className="px-6 py-4"><button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(sku.id); }}><StarIcon filled={favorites.includes(sku.id)} /></button></td>
                <td className="px-6 py-4 text-lg font-semibold">{sku.name}</td>
                <td className="px-6 py-4 text-right text-lg">{sku.totalStock}</td>
                <td className={`px-6 py-4 text-right text-lg font-bold ${sku.totalVariation > 0 ? 'text-green-500' : sku.totalVariation < 0 ? 'text-red-500' : ''}`}>{sku.totalVariation > 0 ? `+${sku.totalVariation}` : sku.totalVariation}</td>
                <td className="px-6 py-4"><div className="flex items-center justify-center gap-4"><a href={sku.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Ver Produto"><EyeIcon /></a><button onClick={(e) => { e.stopPropagation(); handleAnalyzeSku(sku); }} title="Analisar SKU com IA"><RocketIcon /></button></div></td>
            </tr>{expandedSkus.has(sku.id) && <tr className="bg-gray-800"><td colSpan={5} className="p-0"><div className="p-4 bg-gray-900"><table className="min-w-full"><thead className="bg-gray-700"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Variação</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Estoque Atual</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Variação no Período</th>
            </tr></thead><tbody className="divide-y divide-gray-600">
            {sku.variations.map(v => <tr key={v.name}>
                <td className="px-4 py-3">{v.name}</td>
                <td className="px-4 py-3 text-right">{v.currentStock}</td>
                <td className={`px-4 py-3 text-right font-medium ${v.variation > 0 ? 'text-green-500' : v.variation < 0 ? 'text-red-500' : ''}`}>{v.variation > 0 ? `+${v.variation}`: v.variation}</td>
            </tr>)}</tbody></table></div></td></tr>}</React.Fragment>)}</tbody></table>
        </div>
        <div className="md:hidden space-y-4">{processedData.map(sku => <div key={sku.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4" onClick={() => handleToggleExpand(sku.id)}><div className="flex justify-between items-start"><h2 className="text-xl font-bold">{sku.name}</h2><button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(sku.id); }}><StarIcon filled={favorites.includes(sku.id)} /></button></div><div className="flex justify-between mt-4 text-center">
                <div><p className="text-xs text-gray-400">Estoque Total</p><p className="text-lg font-semibold">{sku.totalStock}</p></div>
                <div><p className="text-xs text-gray-400">Variação Total</p><p className={`text-lg font-bold ${sku.totalVariation > 0 ? 'text-green-500' : sku.totalVariation < 0 ? 'text-red-500' : ''}`}>{sku.totalVariation > 0 ? `+${sku.totalVariation}` : sku.totalVariation}</p></div>
                <div className="flex items-center gap-4"><a href={sku.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Ver Produto"><EyeIcon /></a><button onClick={(e) => { e.stopPropagation(); handleAnalyzeSku(sku); }} title="Analisar SKU com IA"><RocketIcon /></button></div>
            </div></div>{expandedSkus.has(sku.id) && <div className="p-4 bg-gray-900 border-t border-gray-700">{sku.variations.map(v => <div key={v.name} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                <span>{v.name}</span><div className="text-right"><span className="block">{v.currentStock}</span><span className={`text-sm ${v.variation > 0 ? 'text-green-500' : v.variation < 0 ? 'text-red-500' : 'text-gray-400'}`}>{v.variation > 0 ? `+${v.variation}`: v.variation}</span></div>
            </div>)}</div>}
        </div>)}</div>
        {isModalOpen && selectedSku && <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-full overflow-y-auto"><div className="p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Análise de IA: {selectedSku.name}</h2><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button></div>
            <div className="h-72 w-full mb-6"><ResponsiveContainer><LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="date" type="category" allowDuplicatedCategory={false} stroke="#A0AEC0" /><YAxis stroke="#A0AEC0" /><Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} /><Legend />
                {selectedSku.variations.map((v, i) => <Line key={v.name} type="monotone" dataKey="stock" data={v.history.map(h => ({ date: new Date(h.timestamp).toLocaleDateString('pt-BR'), stock: h.stock }))} name={v.name} stroke={`hsl(${i * 100}, 70%, 50%)`} dot={false} />)}
            </LineChart></ResponsiveContainer></div>
            <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white max-w-none">{isAnalysisLoading ? <div className="flex items-center justify-center flex-col gap-3"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div><p>Gerando insights...</p></div> : <ReactMarkdown>{analysis}</ReactMarkdown>}</div>
        </div></div></div>}
    </div>
  );
};

export default App;