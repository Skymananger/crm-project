
import React, { useState } from 'react';
import { getRouteStrategyStream } from '../services/geminiService';
import { Map, MapPin, Sparkles, Navigation, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

const RoutesIA: React.FC = () => {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setStrategy(""); // Reset strategy to show streaming
    
    await getRouteStrategyStream(city, 2, (text) => {
      setStrategy(text);
    });
    
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003459]">Rotas Inteligentes</h1>
          <p className="text-slate-600">Use IA para planejar suas rotas de prospecção e visitas.</p>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
          <Sparkles size={18} className="text-[#00A8E8]" />
          <span className="text-sm font-bold text-slate-800">Powered by Gemini</span>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00A8E8]" size={20} />
            <input 
              type="text" 
              placeholder="Digite a cidade ou região de interesse..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-[#00A8E8] rounded-2xl outline-none font-bold text-slate-900 placeholder-slate-400"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading || !city}
            className="bg-[#00A8E8] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-[#00A8E8]/30 hover:bg-[#0081B3] disabled:bg-slate-200 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
            Gerar Estratégia
          </button>
        </div>

        {strategy ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
              <h3 className="text-lg font-bold text-[#003459] mb-4 flex items-center gap-2">
                <Navigation size={20} className="text-[#00A8E8]" />
                Plano de Ação Estratégico
              </h3>
              <div className="markdown-body prose prose-slate max-w-none text-slate-800 leading-relaxed font-medium">
                <Markdown>{strategy}</Markdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Map size={40} />
            </div>
            <div className="max-w-xs mx-auto">
              <p className="text-slate-600 font-medium">Insira uma cidade para que nossa IA sugira os melhores bairros e rotas para seu time hoje.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesIA;
