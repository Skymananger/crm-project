import React, { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { PipelineStage, Lead, Appointment, CustomerPipelineStage } from '../types';
import { PIPELINE_STAGES, getLocalDateString, calculateNextRecurrenceDate } from '../constants';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  MapPin, 
  Clock, 
  ChevronRight,
  Target,
  ShoppingBag,
  Zap,
  Cloud
} from 'lucide-react';

import SyncStatus from '../components/SyncStatus';
import ToxicCoach from '../components/ToxicCoach';

const Dashboard: React.FC = () => {
  const { 
    leads, 
    orders, 
    appointments, 
    customers, 
    userProfile, 
    setActiveTab, 
    setSelectedCustomerId, 
    updateLeadStage,
    updateLead,
    removeLead,
    removeAppointment,
    toggleAppointmentStatus,
    importBackup,
    importMillionLeads,
    pipelineOrder,
    millionPipelineOrder,
    skyPipelineOrder,
    dignPipelineOrder
  } = useApp();


  const today = getLocalDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // --- CÁLCULOS BLOCO 1: AGENDA ---
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia! 🌅";
    if (hour < 18) return "Boa tarde! ☀️";
    return "Boa noite! 🌙";
  }, []);

  const todayVisits = useMemo(() => {
    return appointments.filter(a => a.date === today && !a.completed && a.type === 'visit');
  }, [appointments, today]);

  const todayMeetings = useMemo(() => {
    return appointments.filter(a => a.date === today && !a.completed && a.type === 'meeting');
  }, [appointments, today]);

  const todayAfterSales = useMemo(() => {
    return appointments.filter(a => a.date === today && !a.completed && (a.type === 'after-sales' || a.type === 'training'));
  }, [appointments, today]);

  const todayTasks = useMemo(() => {
    // Leads (Follow-ups)
    const leadTasks = leads.filter(l => {
      if (!l.nextContactDate) return false;
      const leadDate = new Date(l.nextContactDate);
      const todayDate = new Date(today);
      
      let currentOrder = pipelineOrder;
      if (l.pipelineType === 'million') currentOrder = millionPipelineOrder as any;
      else if (l.pipelineType === 'sky') currentOrder = skyPipelineOrder as any;
      else if (l.pipelineType === 'dign') currentOrder = dignPipelineOrder as any;

      return leadDate <= todayDate && l.stage !== currentOrder[currentOrder.length - 1];
    }).map(l => ({
      id: l.id,
      title: l.prospectName || 'Follow-up',
      description: l.nextActionDescription || 'Follow-up pendente',
      date: l.nextContactDate,
      customerId: l.customerId,
      type: 'lead' as const
    }));

    // Appointments (Tasks/Calls)
    const apptTasks = appointments.filter(a => 
      a.date === today && !a.completed && (a.type === 'task' || a.type === 'call' || a.type === 'other')
    ).map(a => ({
      id: a.id,
      title: a.client || 'Tarefa',
      description: a.title,
      date: a.date,
      type: 'appt' as const
    }));

    return [...leadTasks, ...apptTasks].sort((a, b) => a.date.localeCompare(b.date));
  }, [leads, appointments, today, pipelineOrder]);

  const alerts = useMemo(() => {
    const list: { text: string; type: 'proposals' | 'no-action' | 'inactive' }[] = [];
    
    // Propostas sem resposta > 7 dias
    const negotiationStage = pipelineOrder.length > 1 ? pipelineOrder[pipelineOrder.length - 2] : pipelineOrder[0];
    const oldProposals = leads.filter(l => {
      let currentOrder = pipelineOrder;
      if (l.pipelineType === 'million') currentOrder = millionPipelineOrder as any;
      else if (l.pipelineType === 'sky') currentOrder = skyPipelineOrder as any;
      else if (l.pipelineType === 'dign') currentOrder = dignPipelineOrder as any;
      
      const currentNegotiationStage = currentOrder.length > 1 ? currentOrder[currentOrder.length - 2] : currentOrder[0];

      if (l.stage !== currentNegotiationStage) return false;
      const lastInt = new Date(l.lastInteraction);
      const diff = (new Date().getTime() - lastInt.getTime()) / (1000 * 3600 * 24);
      return diff > 7;
    });
    if (oldProposals.length > 0) {
      list.push({
        text: `${oldProposals.length} propostas sem resposta há mais de 7 dias`,
        type: 'proposals'
      });
    }

    // Negociações sem próxima ação
    const noAction = leads.filter(l => {
      let currentOrder = pipelineOrder;
      if (l.pipelineType === 'million') currentOrder = millionPipelineOrder as any;
      else if (l.pipelineType === 'sky') currentOrder = skyPipelineOrder as any;
      else if (l.pipelineType === 'dign') currentOrder = dignPipelineOrder as any;
      
      const currentNegotiationStage = currentOrder.length > 1 ? currentOrder[currentOrder.length - 2] : currentOrder[0];
      return l.stage === currentNegotiationStage && !l.nextContactDate;
    });
    if (noAction.length > 0) {
      list.push({
        text: `${noAction.length} negociações sem próxima ação definida`,
        type: 'no-action'
      });
    }

    // Clientes inativos > 60 dias
    const inactiveCustomers = customers.filter(c => {
      if (!c.lastContactDate) return true;
      const last = new Date(c.lastContactDate);
      const diff = (new Date().getTime() - last.getTime()) / (1000 * 3600 * 24);
      return diff > 60;
    });
    if (inactiveCustomers.length > 0) {
      list.push({
        text: `${inactiveCustomers.length} clientes inativos merecem atenção`,
        type: 'inactive'
      });
    }

    return list;
  }, [leads, customers, pipelineOrder]);

  const handleAlertClick = (type: 'proposals' | 'no-action' | 'inactive') => {
    if (type === 'proposals' || type === 'no-action') {
      setActiveTab('pipeline');
    } else if (type === 'inactive') {
      setActiveTab('customers');
    }
  };

  // --- CÁLCULOS BLOCO 2: NÚMEROS DO MÊS ---
  const monthStats = useMemo(() => {
    const stats = orders.reduce((acc, o) => {
      const d = new Date(o.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        acc.revenue += o.total;
        if (o.orderType === 'new') {
          acc.newClientsRevenue += o.total;
          acc.newClientsCount += 1;
        } else if (o.orderType === 'addon') {
          acc.rebuysRevenue += o.total;
          acc.rebuysCount += 1;
        }
        acc.orderCount += 1;
      }
      return acc;
    }, { revenue: 0, newClientsRevenue: 0, newClientsCount: 0, rebuysRevenue: 0, rebuysCount: 0, orderCount: 0 });

    const monthVisits = appointments.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && a.completed;
    }).length;

    const oppStats = leads.reduce((acc, l) => {
      const d = new Date(l.lastInteraction);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        acc.total += 1;
        
        let currentOrder = pipelineOrder;
        if (l.pipelineType === 'million') currentOrder = millionPipelineOrder as any;
        else if (l.pipelineType === 'sky') currentOrder = skyPipelineOrder as any;
        else if (l.pipelineType === 'dign') currentOrder = dignPipelineOrder as any;

        if (l.stage === currentOrder[currentOrder.length - 1]) {
          acc.won += 1;
        }
      }
      return acc;
    }, { total: 0, won: 0 });

    const conversion = oppStats.total > 0 ? (oppStats.won / oppStats.total) * 100 : 0;
    const avgTicket = stats.orderCount > 0 ? stats.revenue / stats.orderCount : 0;

    return {
      ...stats,
      monthVisits,
      conversion,
      avgTicket
    };
  }, [orders, appointments, leads, currentMonth, currentYear, pipelineOrder, millionPipelineOrder, skyPipelineOrder, dignPipelineOrder]);

  // --- CÁLCULOS BLOCO 3 & 4: FUNIS ---
  const funnelData = (type: 'new' | 'million' | 'sky' | 'dign') => {
    const filteredLeads = leads.filter(l => l.pipelineType === type);
    
    const stages = {
      new: pipelineOrder,
      million: millionPipelineOrder,
      sky: skyPipelineOrder,
      dign: dignPipelineOrder
    }[type];

    const normalize = (s: string) => s.toLowerCase().trim().replace(/ã/g, 'a').replace(/ó/g, 'o').replace(/ê/g, 'e').replace(/í/g, 'i');

    return stages.map((stage, index) => {
      const normalizedStage = normalize(stage);
      const stageLeads = filteredLeads.filter(l => {
        const lStage = normalize(l.stage || '');
        // Match exato ou se um contém o outro (ex: 'Clientes Milionário' vs 'Clientes Million')
        if (lStage === normalizedStage) return true;
        
        // Casos especiais de normalização
        if (normalizedStage.includes('million') || normalizedStage.includes('milionario')) {
          return lStage.includes('million') || lStage.includes('milionario');
        }
        if (normalizedStage.includes('dign')) {
          return lStage.includes('dign');
        }
        if (normalizedStage.includes('sky')) {
          return lStage.includes('sky') || lStage === 'produtos';
        }
        
        return false;
      });

      const count = stageLeads.length;
      const value = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
      
      // Para conversão, comparamos com o estágio anterior normalize
      let prevCount = 0;
      if (index > 0) {
        const prevStageNorm = normalize(stages[index-1]);
        prevCount = filteredLeads.filter(l => {
          const lStage = normalize(l.stage || '');
          if (lStage === prevStageNorm) return true;
          if (prevStageNorm.includes('million') || prevStageNorm.includes('milionario')) return lStage.includes('million') || lStage.includes('milionario');
          if (prevStageNorm.includes('dign')) return lStage.includes('dign');
          if (prevStageNorm.includes('sky')) return lStage.includes('sky') || lStage === 'produtos';
          return false;
        }).length;
      }
      
      const conv = prevCount > 0 ? (count / prevCount) * 100 : 0;

      return { stage, count, value, conv };
    });
  };

  const newFunnel = useMemo(() => funnelData('new'), [leads, pipelineOrder]);
  const millionFunnel = useMemo(() => funnelData('million'), [leads, millionPipelineOrder]);
  const skyFunnel = useMemo(() => funnelData('sky'), [leads, skyPipelineOrder]);
  const dignFunnel = useMemo(() => funnelData('dign'), [leads, dignPipelineOrder]);

  const getStatusColor = (value: number, meta: number) => {
    if (value >= meta) return 'text-green-600 border-green-500';
    if (value >= meta * 0.7) return 'text-amber-600 border-amber-500';
    return 'text-red-600 border-red-500';
  };

  return (
    <div className="min-h-screen bg-transparent pb-20">
      {/* BLOCO 1: MINHA AGENDA DE HOJE */}
      <section className="bg-white/40 backdrop-blur-xl p-8 lg:p-12 rounded-[3.5rem] border border-white/40 shadow-2xl shadow-blue-900/5 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto space-y-10">
          <ToxicCoach />
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#00A8E8]/10 px-4 py-2 rounded-2xl border border-[#00A8E8]/20">
                <span className="w-2 h-2 bg-[#00A8E8] rounded-full animate-ping"></span>
                <span className="text-[10px] font-black text-[#003459] uppercase tracking-[0.2em]">{greeting}</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-[#003459] tracking-tighter leading-tight drop-shadow-sm">
                Sua produtividade <br/>
                <span className="text-[#00A8E8] bg-clip-text">está no topo?</span>
              </h1>
              <p className="text-slate-500 font-bold text-lg opacity-80 flex items-center gap-2">
                <Calendar size={20} className="text-[#00A8E8]" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black text-[#003459] uppercase tracking-[0.2em] opacity-40">
                  Visitas & Reuniões
                </h2>
                <div className="h-px bg-slate-200 flex-1 ml-4"></div>
              </div>

              {todayVisits.length > 0 || todayMeetings.length > 0 ? (
                <div className="space-y-4">
                  {[...todayVisits, ...todayMeetings].map(item => (
                    <div 
                      key={item.id} 
                      className="bg-white/80 p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:border-[#00A8E8] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                      onClick={() => setActiveTab('calendar')}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.type === 'visit' ? 'bg-[#00A8E8]' : 'bg-indigo-500'}`}>
                          {item.type === 'visit' ? <MapPin size={24} /> : <Users size={24} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-[#003459] text-lg lg:text-xl truncate tracking-tight">{item.client}</h4>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Clock size={12} /> {item.time}
                            </span>
                            <span className={`text-[11px] font-black uppercase tracking-tighter ${item.type === 'visit' ? 'text-[#00A8E8]' : 'text-indigo-600'}`}>
                              • {item.title}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {e.stopPropagation(); toggleAppointmentStatus(item.id);}}
                        className="bg-white text-[#003459] w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-slate-100 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-sm active:scale-95"
                      >
                        <CheckCircle2 size={24} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/40 border-2 border-dashed border-slate-200 p-12 rounded-[3rem] text-center">
                  <p className="text-slate-400 font-bold text-lg">Sem compromissos externos.</p>
                  <p className="text-slate-400 text-sm mt-1">Que tal focar em prospectar novos leads? 💪</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black text-[#003459] uppercase tracking-[0.2em] opacity-40">
                  Tasks do Dia
                </h2>
                <div className="h-px bg-slate-200 flex-1 ml-4"></div>
              </div>

              <div className="space-y-4">
                {todayTasks.length > 0 ? (
                  todayTasks.map(task => {
                    const isLate = task.date < today;
                    return (
                      <div 
                        key={task.id} 
                        className={`bg-white/80 p-5 rounded-3xl border border-white shadow-lg flex items-center justify-between group transition-all duration-300 hover:scale-[1.02] cursor-pointer ${isLate ? 'ring-2 ring-red-500/20' : ''}`}
                        onClick={() => {
                          if (task.type === 'lead') {
                            setSelectedCustomerId(task.customerId || null);
                            setActiveTab('pipeline');
                          } else {
                            setActiveTab('calendar');
                          }
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLate ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                            {isLate ? <AlertTriangle size={20} /> : <Zap size={20} />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-[#003459] truncate tracking-tight">{task.title}</h4>
                            <p className="text-[11px] font-bold text-slate-500 mt-0.5 truncate opacity-70">
                              {task.description}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            if (task.type === 'lead') {
                              const lead = leads.find(l => l.id === task.id);
                              if (lead) {
                                const nextDate = lead.recurrence ? calculateNextRecurrenceDate(lead.nextContactDate, lead.recurrence) : '';
                                updateLead({
                                  ...lead,
                                  lastInteraction: new Date().toISOString(),
                                  nextContactDate: nextDate,
                                  prospectNotes: (lead.prospectNotes || '') + `\n[Follow-up concluído em ${new Date().toLocaleDateString()}]${nextDate ? ` - Próximo agendado para ${nextDate}` : ''}`
                                });
                              }
                            } else {
                              toggleAppointmentStatus(task.id);
                            }
                          }}
                          className="p-3 bg-white hover:bg-green-500 hover:text-white rounded-2xl border border-slate-100 text-[#003459] transition-all"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white/40 border-2 border-dashed border-slate-200 p-12 rounded-[3rem] text-center">
                    <p className="text-slate-400 font-bold text-sm">Lista de tarefas limpa! ✨</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2: NÚMEROS DO MÊS */}
      <section className="px-6 max-w-6xl mx-auto mb-16">
        <header className="flex items-center justify-between mb-8 px-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Métricas de Performance</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">{currentMonth + 1}/{currentYear}</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { label: 'Faturamento', value: `R$ ${monthStats.revenue.toLocaleString('pt-BR')}`, sub: `Meta: R$ ${(userProfile.monthlyRevenueMeta || 50000).toLocaleString('pt-BR')}`, color: 'blue', icon: <DollarSign size={20} />, progress: (monthStats.revenue / (userProfile.monthlyRevenueMeta || 50000)) * 100 },
            { label: 'Novos Clientes', value: `R$ ${monthStats.newClientsRevenue.toLocaleString('pt-BR')}`, sub: `${monthStats.newClientsCount} contratos`, color: 'emerald', icon: <Target size={20} /> },
            { label: 'Recompras', value: `R$ ${monthStats.rebuysRevenue.toLocaleString('pt-BR')}`, sub: `${monthStats.rebuysCount} pedidos`, color: 'orange', icon: <ShoppingBag size={20} /> },
            { label: 'Visitas', value: `${monthStats.monthVisits}`, sub: `Meta: ${userProfile.monthlyVisitsMeta || 40}`, color: 'indigo', icon: <MapPin size={20} />, progress: (monthStats.monthVisits / (userProfile.monthlyVisitsMeta || 40)) * 100 },
            { label: 'Conversão', value: `${monthStats.conversion.toFixed(1)}%`, sub: `Ticket: R$ ${monthStats.avgTicket.toFixed(0)}`, color: 'purple', icon: <TrendingUp size={20} /> }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.05] transition-all duration-500">
              <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-xl font-black text-[#003459] tracking-tight">{stat.value}</h3>
              <p className="text-[10px] font-extrabold text-slate-500 mt-2 opacity-60 uppercase">{stat.sub}</p>
              
              {stat.progress !== undefined && (
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-50">
                  <div 
                    className={`h-full bg-${stat.color}-500 transition-all duration-1000`} 
                    style={{ width: `${Math.min(100, stat.progress)}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BLOCO 3: FUNIL NOVOS CLIENTES */}
      <section className="px-6 max-w-6xl mx-auto mb-16">
        <div className="bg-white/70 backdrop-blur-xl p-10 lg:p-14 rounded-[4rem] border border-white shadow-2xl shadow-blue-900/5 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full mb-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Growth Engine</span>
              </div>
              <h2 className="text-3xl font-black text-[#003459] tracking-tight">Funil de Prospecção</h2>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">Novos Leads & Oportunidades</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <TrendingUp size={32} />
            </div>
          </div>

          <div className="space-y-8 relative z-10">
          <div className="relative max-w-2xl mx-auto py-10 pt-20">
            {newFunnel.map((item, i) => {
              const baseWidth = 100 - (i * 12);
              const nextWidth = 100 - ((i + 1) * 12);
              return (
                <div key={i} className="relative group mb-1 last:mb-0">
                  <div 
                    className="h-20 bg-gradient-to-br from-blue-500 to-indigo-700 shadow-lg transition-all duration-500 hover:brightness-110 flex items-center justify-center relative overflow-hidden"
                    style={{ 
                      width: `${baseWidth}%`, 
                      margin: '0 auto',
                      clipPath: `polygon(0% 0%, 100% 0%, ${(100 - (nextWidth/baseWidth * 100))/2}% 100%, ${100 - (100 - (nextWidth/baseWidth * 100))/2}% 100%)`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-center z-10 px-4">
                      <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">{item.stage}</p>
                      <p className="text-lg font-black text-white leading-none">
                        {item.count} <span className="text-[10px] opacity-60">LEADS</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Label flutuante */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[110%] w-32 md:w-48 text-left hidden md:block">
                    <p className="text-xs font-black text-[#003459] mb-0.5">R$ {item.value.toLocaleString('pt-BR')}</p>
                    {i > 0 && (
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Conv: {item.conv.toFixed(0)}%</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-8 mt-14 pt-10 border-t border-slate-100 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Volume Total em Pipeline</p>
              <p className="text-2xl font-black text-[#003459]">R$ {newFunnel.reduce((acc, i) => acc + i.value, 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Taxa de Conversão Real</p>
              <p className="text-2xl font-black text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-2xl">
                {newFunnel.length > 0 && newFunnel[0].count > 0 ? ((newFunnel[newFunnel.length-1].count / newFunnel[0].count) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* BLOCO 4: FUNIL CLIENTES MILLION */}
      <section className="px-6 max-w-6xl mx-auto mb-16">
        <div className="bg-white/70 backdrop-blur-xl p-10 lg:p-14 rounded-[4rem] border border-white shadow-2xl shadow-orange-900/5 relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50"></div>

          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full mb-3">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Premium Care</span>
              </div>
              <h2 className="text-3xl font-black text-[#003459] tracking-tight">Funil Cliente Million</h2>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">Gestão de Relacionamento VIP</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-orange-200">
              <ShoppingBag size={32} />
            </div>
          </div>

          <div className="relative max-w-2xl mx-auto py-10 pt-20">
            {millionFunnel.map((item, i) => {
              const baseWidth = 100 - (i * 12);
              const nextWidth = 100 - ((i + 1) * 12);
              const isLast = i === millionFunnel.length - 1;
              return (
                <div key={i} className="relative group mb-2 last:mb-0">
                  <div 
                    className="h-24 bg-gradient-to-br from-orange-400 via-orange-500 to-red-600 shadow-xl transition-all duration-500 hover:brightness-110 flex items-center justify-center relative overflow-hidden"
                    style={{ 
                      width: `${baseWidth}%`, 
                      margin: '0 auto',
                      clipPath: isLast 
                        ? `polygon(0% 0%, 100% 0%, 50% 100%)`
                        : `polygon(${(100 - (100 * (100 - (i * 4)) / 100))/2}% 0%, ${100 - (100 - (100 * (100 - (i * 4)) / 100))/2}% 0%, ${100 - (100 - (100 * (100 - (i+1) * 4) / 100))/2}% 100%, ${(100 - (100 * (100 - (i+1) * 4) / 100))/2}% 100%)`,
                      borderRadius: isLast ? '0 0 50% 50%' : '0'
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-center z-10 px-4">
                      <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">{item.stage}</p>
                      <p className="text-lg font-black text-white leading-none">
                        {item.count} <span className="text-[10px] opacity-60">LEADS</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Label flutuante lateral */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[110%] w-32 md:w-48 text-left hidden md:block">
                    <div className="bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Potencial</p>
                      <p className="text-sm font-black text-[#003459]">R$ {item.value.toLocaleString('pt-BR')}</p>
                      {i > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp size={10} className="text-green-500" />
                          <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">{item.conv.toFixed(0)}% retido</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-8 mt-14 pt-10 border-t border-slate-100 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Oportunidades Ativas</p>
              <p className="text-2xl font-black text-[#003459]">R$ {millionFunnel.reduce((acc, i) => acc + i.value, 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Conversão Million</p>
              <p className="text-2xl font-black text-orange-600 bg-orange-50 inline-block px-4 py-1 rounded-2xl">
                {millionFunnel.length > 0 && millionFunnel[0].count > 0 ? ((millionFunnel[millionFunnel.length-1].count / millionFunnel[0].count) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 5: RESUMO OUTRAS FILIAIS */}
      <section className="px-6 max-w-6xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-xl shadow-blue-900/5 group hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Cloud size={24} />
              </div>
              <h3 className="text-xl font-black text-[#003459] tracking-tight uppercase">Filial SKY</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-blue-600">{skyFunnel[0]?.count || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Contatos Ativos</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[#003459]">R$ {(skyFunnel.reduce((acc, i) => acc + i.value, 0) || 0).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valor em Pipeline</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('customer-pipeline-sky')} 
              className="w-full mt-8 py-4 bg-[#003459] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#005086] transition-all shadow-lg shadow-blue-900/10"
            >
              Ver Pipeline SKY Completo
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3.5rem] border border-white shadow-xl shadow-purple-900/5 group hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-black text-[#003459] tracking-tight uppercase">Filial DIGN</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-purple-600">{dignFunnel[0]?.count || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Contatos Ativos</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-[#003459]">R$ {(dignFunnel.reduce((acc, i) => acc + i.value, 0) || 0).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valor em Pipeline</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('customer-pipeline-dign')} 
              className="w-full mt-8 py-4 bg-purple-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/10"
            >
              Ver Pipeline DIGN Completo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
