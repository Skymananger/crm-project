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
  Download,
  Upload,
  FileJson
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    const data: Record<string, string | null> = {};
    const keys = [
      'sky_customers', 'sky_leads', 'sky_products', 'sky_orders', 
      'sky_team', 'sky_settings_fees', 'sky_programs_414', 
      'sky_inventory', 'sky_pipeline_order', 'sky_user_profile',
      'sky_appointments'
    ];
    keys.forEach(k => {
      data[k] = localStorage.getItem(k);
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sky_manager_backup_${getLocalDateString()}.json`;
    a.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importBackup(content);
    };
    reader.readAsText(file);
  };

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
  }, [orders, appointments, leads, currentMonth, currentYear, pipelineOrder]);

  // --- CÁLCULOS BLOCO 3 & 4: FUNIS ---
  const funnelData = (type: 'new' | 'million' | 'sky' | 'dign') => {
    const filteredLeads = leads.filter(l => l.pipelineType === type);
    
    const stages = {
      new: pipelineOrder,
      million: millionPipelineOrder,
      sky: skyPipelineOrder,
      dign: dignPipelineOrder
    }[type];

    return stages.map((stage, index) => {
      const count = filteredLeads.filter(l => l.stage === stage).length;
      const value = filteredLeads.filter(l => l.stage === stage).reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
      const prevCount = index > 0 ? filteredLeads.filter(l => l.stage === stages[index-1]).length : 0;
      const conv = prevCount > 0 ? (count / prevCount) * 100 : 0;

      return { stage, count, value, conv };
    });
  };

  const newFunnel = useMemo(() => funnelData('new'), [leads, pipelineOrder]);
  const millionFunnel = useMemo(() => funnelData('million'), [leads, pipelineOrder]);
  const skyFunnel = useMemo(() => funnelData('sky'), [leads, pipelineOrder]);
  const dignFunnel = useMemo(() => funnelData('dign'), [leads, pipelineOrder]);

  const getStatusColor = (value: number, meta: number) => {
    if (value >= meta) return 'text-green-600 border-green-500';
    if (value >= meta * 0.7) return 'text-amber-600 border-amber-500';
    return 'text-red-600 border-red-500';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* BLOCO 1: MINHA AGENDA DE HOJE */}
      <section className="bg-blue-50/50 p-6 rounded-b-[3rem] border-b border-blue-100 shadow-sm mb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <ToxicCoach />
          <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-[#003459]">{greeting}</h1>
              <p className="text-slate-500 font-bold capitalize">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                <Zap size={14} className="text-[#00A8E8]" />
                <span className="text-xs font-black text-[#003459] uppercase tracking-tight">
                  Você tem {todayVisits.length} visitas e {todayTasks.length} tarefas para hoje
                </span>
              </div>
            </div>
            <SyncStatus />
          </header>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                🏃 Visitas Agendadas
              </h2>
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">HOJE</span>
            </div>

            {todayVisits.length > 0 ? (
              <div className="space-y-3">
                {todayVisits.map(visit => (
                  <div 
                    key={visit.id} 
                    className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#00A8E8] transition-all cursor-pointer"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 truncate">{visit.client}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {visit.time}
                        </span>
                        <span className="text-[10px] font-black text-[#00A8E8] uppercase tracking-tighter">
                          {visit.title}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {e.stopPropagation(); toggleAppointmentStatus(visit.id);}}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md"
                      >
                        Concluir
                      </button>
                      <button 
                        onClick={(e) => {e.stopPropagation(); if(confirm('Deseja excluir esta visita?')) removeAppointment(visit.id);}}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center">
                <p className="text-slate-400 font-bold text-sm">Nenhuma visita agendada. Que tal prospectar hoje? 💪</p>
              </div>
            )}
          </div>

          {todayMeetings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                🤝 Reuniões
              </h2>
              <div className="space-y-3">
                {todayMeetings.map(meeting => (
                  <div 
                    key={meeting.id} 
                    className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all cursor-pointer"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 truncate">{meeting.client}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {meeting.time}
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">
                          {meeting.title}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {e.stopPropagation(); toggleAppointmentStatus(meeting.id);}}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todayAfterSales.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                📦 Pós-venda e Treinamento
              </h2>
              <div className="space-y-3">
                {todayAfterSales.map(item => (
                  <div 
                    key={item.id} 
                    className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-all cursor-pointer"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 truncate">{item.client}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {item.time}
                        </span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                          {item.title}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {e.stopPropagation(); toggleAppointmentStatus(item.id);}}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              ✅ Tarefas e Follow-ups
            </h2>
            <div className="space-y-3">
              {todayTasks.length > 0 ? (
                todayTasks.map(task => {
                  const isLate = task.date < today;
                  const diff = Math.floor((new Date(today).getTime() - new Date(task.date).getTime()) / (1000 * 3600 * 24));
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`bg-white p-4 rounded-2xl border-2 shadow-sm flex items-center justify-between group transition-all cursor-pointer ${isLate ? 'border-red-100 bg-red-50/20' : 'border-slate-100'}`}
                      onClick={() => {
                        if (task.type === 'lead') {
                          setSelectedCustomerId(task.customerId || null);
                          setActiveTab('pipeline');
                        } else {
                          setActiveTab('calendar');
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 truncate">{task.title}</h4>
                          {isLate && <AlertTriangle size={14} className="text-red-500" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                          {task.description}
                        </p>
                        {isLate && (
                          <span className="text-[9px] font-black text-red-600 uppercase mt-1 block">
                            ⚠️ {diff} dias de atraso
                          </span>
                        )}
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
                          className={`ml-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md bg-green-600 text-white'`}>
                          Concluir
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            if (task.type === 'lead') {
                              removeLead(task.id);
                            } else {
                              if(confirm('Deseja excluir esta tarefa?')) removeAppointment(task.id);
                            }
                          }}
                          className={`ml-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md bg-red-600 text-white'`}>
                          Excluir
                        </button>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center">
                  <p className="text-slate-400 font-bold text-sm">Tudo em dia por aqui! ✨</p>
                </div>
              )}
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl space-y-3">
              <h3 className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} /> Atenção Necessária
              </h3>
              <ul className="space-y-2">
                {alerts.map((alert, i) => (
                  <li 
                    key={i} 
                    onClick={() => handleAlertClick(alert.type)}
                    className="text-xs font-bold text-red-700 flex items-center gap-2 cursor-pointer hover:bg-red-100/50 p-2 rounded-xl transition-colors"
                  >
                    <div className="w-1 h-1 bg-red-400 rounded-full" />
                    {alert.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* BLOCO 2: NÚMEROS DO MÊS */}
      <section className="px-6 max-w-5xl mx-auto mb-12">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">📊 Números do Mês</h2>
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-6 px-6">
          <div className={`flex-shrink-0 w-48 bg-white p-5 rounded-[2rem] border-l-4 shadow-sm ${getStatusColor(monthStats.revenue, userProfile.monthlyRevenueMeta || 50000)}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
            <h3 className="text-lg font-black text-slate-900">R$ {monthStats.revenue.toLocaleString('pt-BR')}</h3>
            <p className="text-[9px] font-bold text-slate-500 mt-2">Meta: R$ {(userProfile.monthlyRevenueMeta || 50000).toLocaleString('pt-BR')}</p>
          </div>

          <div className="flex-shrink-0 w-48 bg-white p-5 rounded-[2rem] border-l-4 border-blue-500 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Novos Clientes</p>
            <h3 className="text-lg font-black text-slate-900">R$ {monthStats.newClientsRevenue.toLocaleString('pt-BR')}</h3>
            <p className="text-[9px] font-bold text-slate-500 mt-2">{monthStats.newClientsCount} contratos fechados</p>
          </div>

          <div className="flex-shrink-0 w-48 bg-white p-5 rounded-[2rem] border-l-4 border-orange-500 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Recompras</p>
            <h3 className="text-lg font-black text-slate-900">R$ {monthStats.rebuysRevenue.toLocaleString('pt-BR')}</h3>
            <p className="text-[9px] font-bold text-slate-500 mt-2">{monthStats.rebuysCount} recompras feitas</p>
          </div>

          <div className={`flex-shrink-0 w-48 bg-white p-5 rounded-[2rem] border-l-4 shadow-sm ${getStatusColor(monthStats.monthVisits, userProfile.monthlyVisitsMeta || 40)}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Visitas Feitas</p>
            <h3 className="text-lg font-black text-slate-900">{monthStats.monthVisits} Visitas</h3>
            <p className="text-[9px] font-bold text-slate-500 mt-2">Meta: {userProfile.monthlyVisitsMeta || 40} visitas</p>
          </div>

          <div className="flex-shrink-0 w-48 bg-white p-5 rounded-[2rem] border-l-4 border-emerald-500 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Conversão Geral</p>
            <h3 className="text-lg font-black text-slate-900">{monthStats.conversion.toFixed(1)}%</h3>
            <p className="text-[9px] font-bold text-slate-500 mt-2">Ticket Médio: R$ {monthStats.avgTicket.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </section>

      {/* BLOCO 3: FUNIL NOVOS CLIENTES */}
      <section className="px-6 max-w-5xl mx-auto mb-12">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-[#003459]">Funil de Prospecção</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Novos Clientes</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="space-y-4">
            {newFunnel.map((item, i) => (
              <div key={i} className="relative">
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[10px] font-black text-slate-900 uppercase">{item.stage}</span>
                  <span className="text-[10px] font-black text-blue-600">R$ {item.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-8 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000" 
                      style={{ width: `${Math.max(5, (item.count / (newFunnel[0].count || 1)) * 100)}%`, opacity: 1 - (i * 0.15) }} 
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-900">
                      {item.count} Oportunidades
                    </span>
                  </div>
                  {i > 0 && (
                    <div className="w-12 text-right">
                      <span className="text-[9px] font-black text-slate-400">{item.conv.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-slate-50">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Valor em Pipeline</p>
              <p className="text-sm font-black text-[#003459]">R$ {newFunnel.reduce((acc, i) => acc + i.value, 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase">Conversão Total</p>
              <p className="text-sm font-black text-blue-600">
                {newFunnel[0].count > 0 ? ((newFunnel[newFunnel.length-1].count / newFunnel[0].count) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 4: FUNIL CLIENTES MILLION */}
      <section className="px-6 max-w-5xl mx-auto mb-12">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-[#003459]">Funil Cliente Million</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Relacionamento</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <ShoppingBag size={24} />
            </div>
          </div>

          <div className="space-y-4">
            {millionFunnel.map((item, i) => (
              <div key={i} className="relative">
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[10px] font-black text-slate-900 uppercase">{item.stage}</span>
                  <span className="text-[10px] font-black text-orange-600">R$ {item.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-8 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                    <div 
                      className="h-full bg-orange-600 transition-all duration-1000" 
                      style={{ width: `${Math.max(5, (item.count / (millionFunnel[0].count || 1)) * 100)}%`, opacity: 1 - (i * 0.15) }} 
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-900">
                      {item.count} Oportunidades
                    </span>
                  </div>
                  {i > 0 && (
                    <div className="w-12 text-right">
                      <span className="text-[9px] font-black text-slate-400">{item.conv.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-slate-50">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Valor em Pipeline</p>
              <p className="text-sm font-black text-[#003459]">R$ {millionFunnel.reduce((acc, i) => acc + i.value, 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase">Conversão Total</p>
              <p className="text-sm font-black text-orange-600">
                {millionFunnel[0].count > 0 ? ((millionFunnel[millionFunnel.length-1].count / millionFunnel[0].count) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 5: RESUMO OUTRAS FILIAIS */}
      <section className="px-6 max-w-5xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-[#003459] uppercase tracking-widest mb-4">Filial SKY</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-blue-600">{skyFunnel[0].count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Contatos Ativos</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#003459]">R$ {skyFunnel.reduce((acc, i) => acc + i.value, 0).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Valor em Pipeline</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('customer-pipeline-sky')} className="w-full mt-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all">Ver Pipeline SKY</button>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-[#003459] uppercase tracking-widest mb-4">Filial DIGN</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-purple-600">{dignFunnel[0].count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Contatos Ativos</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#003459]">R$ {dignFunnel.reduce((acc, i) => acc + i.value, 0).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Valor em Pipeline</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('customer-pipeline-dign')} className="w-full mt-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all">Ver Pipeline DIGN</button>
          </div>
        </div>
      </section>
      {/* BLOCO 5: SINCRONIZAÇÃO MANUAL (EMERGÊNCIA) */}
      {/* BLOCO DE AÇÕES ESPECIAIS */}
      <section className="px-6 max-w-5xl mx-auto mb-12">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Importação Especial</h2>
                <p className="text-xs font-bold text-orange-100 uppercase tracking-widest">Base de Dados Million</p>
              </div>
            </div>
            
            <p className="text-orange-50 text-sm mb-8 leading-relaxed font-bold">
              Clique no botão abaixo para importar a lista de clientes Million fornecida. O sistema formatará automaticamente os números para WhatsApp e os incluirá no pipeline correspondente.
            </p>
            
            <button 
              onClick={() => {
                if(confirm("Deseja importar os leads Million agora? Esta ação adicionará novos contatos ao seu pipeline.")) {
                  importMillionLeads();
                }
              }}
              className="w-full md:w-auto px-12 py-5 bg-white text-orange-600 rounded-2xl font-black shadow-lg hover:bg-orange-50 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
            >
              <Zap size={20} /> Importar Leads Million (Manual)
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        </div>
      </section>

      <section className="px-6 max-w-5xl mx-auto pb-12">
        <div className="bg-[#003459] p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#00A8E8]">
                <FileJson size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Sincronização Manual de Emergência</h2>
                <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Mover dados entre Celular e PC</p>
              </div>
            </div>
            
            <p className="text-blue-100 text-sm mb-8 leading-relaxed font-bold">
              Se o computador ainda estiver "zerado", você pode exportar um arquivo de backup do seu celular e importá-lo aqui no computador. Isso moverá todos os seus dados instantaneamente.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={handleExportBackup}
                className="w-full py-5 bg-[#00A8E8] text-white rounded-2xl font-black shadow-lg hover:bg-[#0081B3] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
              >
                <Download size={20} /> 1. Exportar do Celular
              </button>

              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportBackup} 
                  className="hidden" 
                  accept=".json"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 bg-white text-[#003459] rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest border-2 border-white"
                >
                  <Upload size={20} /> 2. Importar Arquivo
                </button>
              </div>

              <button 
                onClick={() => {
                  const text = prompt("Cole o texto do backup aqui:");
                  if (text) importBackup(text);
                }}
                className="w-full py-5 bg-white/10 text-white rounded-2xl font-black border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
              >
                <Zap size={20} /> 3. Colar Manualmente
              </button>
            </div>
            
            <p className="mt-6 text-[10px] text-blue-300 font-bold text-center italic">
              * Ao importar, os dados atuais deste dispositivo serão substituídos pelos do arquivo.
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
