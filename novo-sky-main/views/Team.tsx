import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { TeamMember, TeamRole } from '../types';
import { UserPlus, Award, TrendingUp, ChevronRight, Target, Zap, DollarSign, PackageCheck, Calendar, Phone, MapPin, Star, UserCheck, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { getLocalDateString } from '../constants';

const Team: React.FC = () => {
  const { team, addTeamMember, orders, removeTeamMember } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    city: '', 
    role: 'trainee' as TeamRole, 
    goals: '', 
    promotionGoal: '',
    startDate: getLocalDateString()
  });

  const [saleVolume, setSaleVolume] = useState({ value: '', description: '' });

  const roleLabels: Record<TeamRole, string> = {
    distribuidor_jr: 'Distribuidor Júnior',
    vendedor: 'Vendedor Pleno',
    recruta: 'Recruta',
    trainee: 'Trainee',
    gerente: 'Gerente de Equipe'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTeamMember({
      name: formData.name,
      role: formData.role,
      goals: Number(formData.goals),
      promotionGoal: Number(formData.promotionGoal),
      startDate: formData.startDate
    });
    setIsModalOpen(false);
    setFormData({ 
      name: '', 
      city: '', 
      role: 'trainee', 
      goals: '', 
      promotionGoal: '', 
      startDate: getLocalDateString() 
    });
  };

  const handleLogSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !saleVolume.value) return;
    alert(`R$ ${saleVolume.value} creditado à conta de ${selectedMember.name}`);
    setSaleVolume({ value: '', description: '' });
    setIsDetailModalOpen(false);
  };

  const getMemberSales = (id: string) => orders.filter(o => o.salespersonId === id);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">Gestão de Empreendedores</h1>
          <p className="text-slate-600 font-bold">Acompanhe o faturamento e a evolução de carreira do seu time.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#003459] text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center gap-2"
        >
          <UserPlus size={20} /> Cadastrar Empreendedor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {team.map(member => {
          const totalVol = getMemberSales(member.id).reduce((sum, o) => sum + o.total, 0);
          const progress = member.promotionGoal > 0 ? (totalVol / member.promotionGoal) * 100 : 0;
          
          return (
            <div 
              key={member.id} 
              onClick={() => { setSelectedMember(member); setIsDetailModalOpen(true); }}
              className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-xl text-[#003459] border border-slate-100 group-hover:bg-[#003459] group-hover:text-white transition-colors">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-[#00A8E8] transition-colors truncate">{member.name}</h3>
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${member.role === 'distribuidor_jr' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {roleLabels[member.role]}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 mt-0.5">
                   <Calendar size={12} /> Desde {new Date(member.startDate).toLocaleDateString()}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Meta Promoção</span>
                    <span className="text-[9px] font-black text-[#003459]">{Math.min(100, Math.round(progress))}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div className="h-full bg-[#00A8E8] rounded-full transition-all duration-700" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight size={20} className="text-slate-300 group-hover:text-[#00A8E8]" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm(`Deseja remover ${member.name} da equipe?`)) removeTeamMember(member.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Dashboard do Empreendedor">
        {selectedMember && (
          <div className="space-y-6">
             <div className="p-7 bg-[#003459] rounded-[2rem] text-white border-2 border-slate-900 shadow-xl flex items-center gap-5">
               <div className="w-16 h-16 bg-[#00A8E8] rounded-2xl flex items-center justify-center font-black text-2xl border border-white/20">
                 {selectedMember.name.charAt(0)}
               </div>
               <div>
                  <h3 className="text-xl font-black">{selectedMember.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">{roleLabels[selectedMember.role]}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/20 px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                      <Calendar size={10} /> {new Date(selectedMember.startDate).toLocaleDateString()}
                    </span>
                  </div>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta Mensal</p>
                  <p className="text-lg font-black text-[#003459]">R$ {selectedMember.goals.toLocaleString('pt-BR')}</p>
                </div>
                <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl">
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Próximo Nível</p>
                  <p className="text-lg font-black text-amber-900">R$ {selectedMember.promotionGoal.toLocaleString('pt-BR')}</p>
                </div>
             </div>

             <div className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 space-y-4">
                <h3 className="text-xs font-black text-[#003459] uppercase tracking-widest flex items-center gap-2">
                  <Star size={16} className="text-amber-500" /> Histórico e Faturamento
                </h3>
                <div className="space-y-3">
                   {getMemberSales(selectedMember.id).slice(0, 3).map(o => (
                     <div key={o.id} className="bg-white p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{new Date(o.date).toLocaleDateString()}</span>
                        <span className="text-xs font-black text-[#00A8E8]">R$ {o.total.toLocaleString('pt-BR')}</span>
                     </div>
                   ))}
                   {getMemberSales(selectedMember.id).length === 0 && (
                     <p className="text-[10px] text-center text-slate-400 font-bold uppercase italic py-2">Sem vendas registradas ainda.</p>
                   )}
                </div>
             </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Empreendedor">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase block mb-1 px-1">Nome Completo</label>
              <input required className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-[#003459] transition-all" placeholder="Nome do Vendedor" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-black text-slate-900 uppercase block mb-1 px-1">Data de Início</label>
                  <input type="date" required className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-[#003459]" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
               </div>
               <div>
                  <label className="text-xs font-black text-slate-900 uppercase block mb-1 px-1">Cargo / Nível</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-[#003459]" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as TeamRole})}>
                    <option value="recruta">Recruta</option>
                    <option value="trainee">Trainee</option>
                    <option value="vendedor">Vendedor Pleno</option>
                    <option value="distribuidor_jr">Distribuidor Júnior</option>
                    <option value="gerente">Gerente de Equipe</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-black text-slate-900 uppercase block mb-1 px-1">Meta Mensal (R$)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="number" className="w-full pl-9 p-4 bg-white border-2 border-[#00A8E8]/30 rounded-2xl font-black outline-none" placeholder="10.000" value={formData.goals} onChange={e => setFormData({...formData, goals: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-black text-slate-900 uppercase block mb-1 px-1">Meta Promoção (R$)</label>
                  <div className="relative">
                    <Award size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="number" className="w-full pl-9 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl font-black outline-none" placeholder="100.000" value={formData.promotionGoal} onChange={e => setFormData({...formData, promotionGoal: e.target.value})} />
                  </div>
               </div>
            </div>
          </div>
          
          <button type="submit" className="w-full py-5 bg-[#003459] text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all text-xs">
            Confirmar Ingresso de Empreendedor
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Team;