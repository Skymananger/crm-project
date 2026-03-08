import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const ConsentBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('sky_lgpd_consent');
    if (!consent) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('sky_lgpd_consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[200] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-[#003459] border-2 border-[#00A8E8]/30 p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#00A8E8] rounded-2xl text-white shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <div className="max-w-xl">
            <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Segurança e LGPD</h4>
            <p className="text-blue-100 text-[11px] font-bold leading-relaxed">
              O Sky Manager utiliza criptografia local e sincronização em nuvem segura para proteger seus dados comerciais e de clientes. 
              Ao continuar, você concorda com nossos Termos de Uso e garante a coleta ética de dados de seus prospectos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest px-4">Política de Privacidade</button>
          <button 
            onClick={handleAccept}
            className="bg-[#00A8E8] text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            Aceitar e Continuar <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;