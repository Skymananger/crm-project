
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Gift, Calendar, Plus, UserPlus, Clock, MessageCircle, CheckCircle2, AlertCircle, Phone, MapPin, FileText, Star, Share2 } from 'lucide-react';
import Modal from '../components/Modal';
import { PipelineStage, CustomerPipelineStage, Program414, Lead } from '../types';
import { getLocalDateString } from '../constants';

const Referral414: React.FC = () => {
  const { programs414, customers, start414Program, addReferralToProgram, leads } = useApp();
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isAddReferralModalOpen, setIsAddReferralModalOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const [startFormData, setStartFormData] = useState({
    indicatorId: '',
    startDate: getLocalDateString(),
    giftChosen: ''
  });

  const [referralFormData, setReferralFormData] = useState({
    name: '',
    phone: '',
    city: '',
    notes: '',
    interest: ''
  });

  const handleStartProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === startFormData.indicatorId);
    if (!customer) return;

    const [year, month, day] = startFormData.startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day, 12, 0, 0); 
    const end = new Date(start);
    end.setDate(start.getDate() + 14);

    start414Program({
      indicatorId: customer.id,
      indicatorName: customer.name,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      giftChosen: startFormData.giftChosen || 'Prêmio Royal Prestige'
    });
    setIsStartModalOpen(false);
    setStartFormData({ indicatorId: '', startDate: getLocalDateString(), giftChosen: '' });
  };

  const handleAddReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;

    addReferralToProgram(selectedProgramId, {
      prospectName: referralFormData.name,
      prospectPhone: referralFormData.phone,
      prospectCity: referralFormData.city,
      prospectNotes: referralFormData.notes,
      productInterest: referralFormData.interest,
      estimatedValue: 0,
      stage: PipelineStage.STAGE_414,
      lastInteraction: new Date().toISOString(),
      nextContactDate: getLocalDateString(),
      pipelineType: 'new',
      assignedTo: 'admin'
    });
    setIsAddReferralModalOpen(false);
    setReferralFormData({ name: '', phone: '', city: '', notes: '', interest: '' });
  };

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const dayDiff = (end.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return Math.max(0, Math.ceil(dayDiff));
  };

  const getCompletedVisits = (referralIds: string[]) => {
    const leadMap = new Map(leads.map(l => [l.id, l]));
    return referralIds.filter(id => {
      const lead = leadMap.get(id);
      if (!lead) return false;
      return ([
        PipelineStage.VISITA_CONCLUIDA,
        PipelineStage.NEGOCIACAO,
        PipelineStage.PEDIDO,
        PipelineStage.POS_VENDA
      ] as string[]).includes(lead.stage);
    }).length;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">Programa de Indicações 4/14</h1>
          <p className="text-slate-900 font-bold">Incentive sua base de clientes a gerar novos leads em tempo recorde.</p>
        </div>
        <button 
          onClick={() => setIsStartModalOpen(true)}
          className="bg-[#003459] text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Novo Desafio 4/14
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {programs414.map(program => {
          const daysLeft = calculateDaysLeft(program.endDate);
          const completedVisits = getCompletedVisits(program.referralIds);
          const progress = (completedVisits / 4) * 100;
          const isWinner = completedVisits >= 4;

          return (
            <div key={program.id} className={`bg-white p-6 rounded-[2.5rem] border-2 shadow-sm space-y-6 hover:shadow-xl transition-all ${isWinner ? 'border-green-500 bg-green-50/20' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-md ${isWinner ? 'bg-green-500 text-white border-green-600' : 'bg-[#003459] text-white border-[#003459]'}`}>
                    {isWinner ? <Star size={28} className="fill-current" /> : <Gift size={28} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight">{program.indicatorName}</h3>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mt-1">Meta Prêmio: <span className="text-[#00A8E8]">{program.giftChosen}</span></p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 shadow-sm ${isWinner ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-900 text-white border-slate-900'}`}>
                   <span className="text-xs font-black uppercase tracking-widest">{isWinner ? 'CONCLUÍDO' : `${daysLeft} DIAS`}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-black text-slate-900 uppercase tracking-widest">
                  <span>Progresso Visitas</span>
                  <span className={isWinner ? 'text-green-600' : 'text-[#00A8E8]'}>{completedVisits}/4</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-1000 ${isWinner ? 'bg-green-500' : 'bg-[#00A8E8]'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => { setSelectedProgramId(program.id); setIsAddReferralModalOpen(true); }}
                  className="bg-[#00A8E8] text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0081B3] transition-all shadow-md"
                >
                  <UserPlus size={16} /> Lançar Indicação
                </button>
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-900 font-black text-[10px] uppercase shadow-sm">
                  <Calendar size={16} /> Expira: {new Date(program.endDate).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} title="Novo Desafio 4/14">
        <form onSubmit={handleStartProgram} className="space-y-6">
          <div>
            <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Indicador (Escolher da Base)</label>
            <select required className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:border-[#003459] shadow-sm" value={startFormData.indicatorId} onChange={e => setStartFormData({...startFormData, indicatorId: e.target.value})}>
              <option value="">Selecione o Cliente...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Data de Início</label>
              <input type="date" required className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:border-[#003459] shadow-sm" value={startFormData.startDate} onChange={e => setStartFormData({...startFormData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1 text-center">Data Limite (14 dias)</label>
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl font-black text-[#003459] flex items-center justify-center text-sm shadow-sm">
                {(() => {
                  const [y, m, d] = startFormData.startDate.split('-').map(Number);
                  if(!y) return '--/--/----';
                  const dt = new Date(y, m-1, d, 12, 0, 0);
                  dt.setDate(dt.getDate() + 14);
                  return dt.toLocaleDateString('pt-BR');
                })()}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Prêmio Prometido</label>
            <input 
              required 
              placeholder="Ex: Jogo de Facas Profissional" 
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:border-[#003459] shadow-sm placeholder:text-slate-400" 
              value={startFormData.giftChosen} 
              onChange={e => setStartFormData({...startFormData, giftChosen: e.target.value})} 
            />
          </div>
          <button type="submit" className="w-full py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-[#0081B3] transition-all">
            Iniciar Cronômetro de 14 Dias
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAddReferralModalOpen} onClose={() => setIsAddReferralModalOpen(false)} title="Vincular Indicação">
        <form onSubmit={handleAddReferral} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Nome do Indicado</label>
              <input 
                required 
                placeholder="Nome Completo" 
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#003459] shadow-sm" 
                value={referralFormData.name} 
                onChange={e => setReferralFormData({...referralFormData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">WhatsApp de Contato</label>
              <input 
                required 
                placeholder="(00) 00000-0000" 
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#003459] shadow-sm" 
                value={referralFormData.phone} 
                onChange={e => setReferralFormData({...referralFormData, phone: e.target.value})} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Cidade do Indicado</label>
              <input 
                placeholder="Cidade / Estado" 
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#003459] shadow-sm" 
                value={referralFormData.city} 
                onChange={e => setReferralFormData({...referralFormData, city: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Produto de Interesse</label>
              <input 
                placeholder="Ex: Jogo Royal" 
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#003459] shadow-sm" 
                value={referralFormData.interest} 
                onChange={e => setReferralFormData({...referralFormData, interest: e.target.value})} 
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-900 uppercase block mb-2 px-1">Observações Estratégicas</label>
            <textarea 
              placeholder="Notas para abordagem comercial..." 
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 h-24 resize-none placeholder:text-slate-400 outline-none focus:border-[#003459] shadow-sm" 
              value={referralFormData.notes} 
              onChange={e => setReferralFormData({...referralFormData, notes: e.target.value})} 
            />
          </div>
          <button type="submit" className="w-full py-5 bg-[#003459] text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-black transition-all">
            Salvar Oportunidade no Pipeline
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Referral414;
