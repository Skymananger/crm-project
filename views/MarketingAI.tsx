
import React, { useState } from 'react';
import { generateMarketingImage } from '../services/geminiService';
import { Sparkles, Download, RefreshCw, Send, Image as ImageIcon } from 'lucide-react';

const MarketingAI: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const [loadingStep, setLoadingStep] = useState(0);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setLoadingStep(1);
    
    // Simulate steps for better UX since image gen is slow
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    const result = await generateMarketingImage(prompt);
    clearInterval(stepInterval);
    
    if (result) {
      setGeneratedImage(result);
      setHistory(prev => [result, ...prev].slice(0, 5));
    }
    setLoading(false);
    setLoadingStep(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#003459]">Marketing com IA</h1>
        <p className="text-slate-600">Crie fotografias profissionais de produtos instantaneamente para suas redes sociais.</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="space-y-6">
          <div className="relative">
            <label className="text-sm font-bold text-slate-700 mb-2 block px-2">
              O que você quer criar?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Jogo de panelas Royal Prestige sobre bancada de mármore..."
              className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-[#00A8E8] focus:bg-white rounded-3xl outline-none transition-all resize-none h-32 text-slate-900 font-medium placeholder-slate-400"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className={`absolute bottom-4 right-4 px-6 py-3 rounded-2xl transition-all flex items-center gap-2 font-bold ${
                loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#00A8E8] text-white hover:bg-[#0081B3] shadow-lg shadow-[#00A8E8]/30'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  <span>Criando...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Gerar</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
              {loading ? (
                <div className="text-center space-y-4 px-6 animate-pulse">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-[#00A8E8]">
                    <RefreshCw className="animate-spin" size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-800 font-black uppercase text-[10px] tracking-widest">
                      {loadingStep === 1 && "Analisando seu pedido..."}
                      {loadingStep === 2 && "Compondo a cena profissional..."}
                      {loadingStep === 3 && "Renderizando iluminação de estúdio..."}
                    </p>
                    <div className="w-32 h-1 bg-slate-200 mx-auto rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00A8E8] transition-all duration-1000" 
                        style={{ width: `${(loadingStep / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : generatedImage ? (
                <>
                  <img src={generatedImage} alt="Gerada" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button className="p-3 bg-white rounded-full text-slate-800 hover:scale-110 transition-transform">
                      <Download size={24} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 px-6">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-[#00A8E8]">
                    <Sparkles size={32} />
                  </div>
                  <p className="text-slate-500 font-medium">Sua imagem aparecerá aqui após a geração</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon size={20} className="text-[#00A8E8]" />
                Criações Recentes
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {history.length > 0 ? (
                  history.map((img, i) => (
                    <div key={i} className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                      <img src={img} alt={`Histórico ${i}`} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setGeneratedImage(img)} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-slate-500 text-sm italic">
                    Nenhuma criação ainda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingAI;
