import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Appointment, ApptType, PipelineStage } from '../types';
import { PIPELINE_STAGES, getLocalDateString } from '../constants';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  RefreshCw, 
  CheckCircle2,
  Calendar as CalendarIcon,
  Save,
  Trash2,
  Trello,
  Phone
} from 'lucide-react';
import Modal from '../components/Modal';
import AddressAutocomplete from '../src/components/AddressAutocomplete';

type CalendarViewType = 'day' | 'week' | 'month';

const CalendarView: React.FC = () => {
  const { appointments, addAppointment, updateAppointment, addLead, googleTokens, setGoogleTokens, syncToGoogleCalendar, removeAppointment, pipelineOrder } = useApp();
  const [view, setView] = useState<CalendarViewType>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setGoogleTokens(event.data.tokens);
        alert("Google Agenda conectado com sucesso!");
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setGoogleTokens]);

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Erro desconhecido no servidor");
      }
      
      window.open(data.url, 'google_auth', 'width=600,height=700');
    } catch (error: any) {
      alert(`Erro ao conectar com Google: ${error.message}`);
    }
  };
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    phone: '',
    date: getLocalDateString(),
    time: '09:00',
    address: '',
    type: 'visit' as ApptType,
    syncWithGoogle: true,
    createLead: false,
    leadStage: pipelineOrder[0] as PipelineStage
  });

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const navigate = (direction: 'prev' | 'next') => {
    setSelectedDay(null);
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
    start.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const handleOpenAddModal = (date?: Date) => {
    const targetDate = date || currentDate;
    setFormData({
      ...formData,
      date: getLocalDateString(targetDate),
      createLead: false
    });
    setIsModalOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Se a opção de criar lead estiver ativa
    if (formData.createLead) {
      await addLead({
        prospectName: formData.client,
        prospectPhone: formData.phone,
        prospectCity: '',
        prospectAddress: formData.address,
        prospectNotes: `Agendado via Agenda: ${formData.title}`,
        stage: formData.leadStage,
        productInterest: formData.title,
        estimatedValue: 0,
        lastInteraction: new Date().toISOString(),
        nextContactDate: formData.date,
        pipelineType: 'new',
        assignedTo: 'admin'
      });
    }

    const newAppointment: Omit<Appointment, 'id'> = {
      title: formData.title,
      client: formData.client,
      date: formData.date,
      time: formData.time,
      address: formData.address,
      type: formData.type,
      synced: formData.syncWithGoogle,
      completed: false
    };
    
    const added = await addAppointment(newAppointment);
    
    // Sincronizar com Google Agenda
    if (googleTokens) {
      setIsSyncing(true);
      await syncToGoogleCalendar({ ...newAppointment, id: 'temp' } as Appointment);
      setIsSyncing(false);
    } else {
      // Fallback: Abrir Google Agenda em nova aba
      const [year, month, day] = formData.date.split('-');
      const [hour, minute] = formData.time.split(':');
      const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const format = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
      const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(formData.title)}&dates=${format(startDate)}/${format(endDate)}&details=${encodeURIComponent(`Cliente: ${formData.client}\nTel: ${formData.phone}`)}&location=${encodeURIComponent(formData.address)}&sf=true&output=xml`;
      window.open(gCalUrl, '_blank');
    }

    setIsModalOpen(false);
    setFormData({ 
      title: '', 
      client: '', 
      phone: '',
      date: getLocalDateString(),
      time: '09:00', 
      address: '', 
      type: 'visit', 
      syncWithGoogle: true, 
      createLead: false, 
      leadStage: pipelineOrder[0] as PipelineStage 
    });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAppt) {
      await updateAppointment(selectedAppt);
      setIsEditModalOpen(false);
      setSelectedAppt(null);
    }
  };

  const handleOpenEdit = (appt: Appointment) => {
    setSelectedAppt(appt);
    setIsEditModalOpen(true);
  };

  const renderMonthView = () => {
    const { firstDay, days } = getDaysInMonth(currentDate);
    const prevMonthDays = Array.from({ length: firstDay }, (_, i) => i);
    const currentMonthDays = Array.from({ length: days }, (_, i) => i + 1);
    
    const today = new Date();
    const isToday = (day: number) => 
      today.getDate() === day && 
      today.getMonth() === currentDate.getMonth() && 
      today.getFullYear() === currentDate.getFullYear();

    const getApptColor = (type: ApptType) => {
      switch(type) {
        case 'visit': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'meeting': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'after-sales': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'task': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
    };

    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-medium text-slate-500 uppercase border-r last:border-r-0">{d}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 min-h-[600px]">
          {prevMonthDays.map(i => <div key={`prev-${i}`} className="border-r border-b border-slate-100 bg-slate-50/30" />)}
          {currentMonthDays.map(day => {
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayAppts = appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
            
            return (
              <div 
                key={day} 
                onClick={() => {
                  const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  setCurrentDate(newDate);
                  setSelectedDay(day);
                  setView('day');
                }}
                className={`border-r border-b border-slate-100 p-1 flex flex-col gap-1 hover:bg-slate-50 transition-colors cursor-pointer min-h-[120px] ${isToday(day) ? 'bg-blue-50/20' : ''}`}
              >
                <div className="flex justify-center mb-1">
                  <span className={`w-7 h-7 flex items-center justify-center text-xs font-medium rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                    {day}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayAppts.slice(0, 3).map(a => (
                    <div 
                      key={a.id} 
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(a); }}
                      className={`px-1.5 py-0.5 text-[9px] font-medium rounded border truncate ${getApptColor(a.type)} ${a.completed ? 'opacity-50 line-through' : ''}`}
                    >
                      {a.time} {a.title}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-[9px] font-bold text-slate-400 px-1">
                      + {dayAppts.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const today = getLocalDateString();

    return (
      <div className="flex flex-col h-full overflow-hidden bg-white animate-in slide-in-from-right duration-300">
        {/* WEEK HEADER */}
        <div className="flex border-b border-slate-200 shrink-0">
          <div className="w-16 border-r border-slate-200 shrink-0" />
          <div className="flex-1 grid grid-cols-7">
            {weekDays.map((date, i) => {
              const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
              const isToday = dateStr === today;
              return (
                <div key={i} className="py-3 text-center border-r last:border-r-0 border-slate-100">
                  <p className={`text-[10px] font-medium uppercase ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className={`text-xl font-normal mt-1 w-10 h-10 flex items-center justify-center mx-auto rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* TIME GRID */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-full">
            {/* TIME LABELS */}
            <div className="w-16 border-r border-slate-200 shrink-0 bg-white">
              {hours.map(h => (
                <div key={h} className="h-20 relative">
                  <span className="absolute -top-2 right-2 text-[10px] text-slate-400">
                    {h.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* DAY COLUMNS */}
            <div className="flex-1 grid grid-cols-7 relative">
              {weekDays.map((date, i) => {
                const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                const dayAppts = appointments.filter(a => a.date === dateStr);
                
                return (
                  <div key={i} className="relative border-r last:border-r-0 border-slate-100 min-h-full">
                    {/* HOUR SLOTS */}
                    {hours.map(h => (
                      <div 
                        key={h} 
                        className="h-20 border-b border-slate-50 cursor-pointer hover:bg-slate-50/50"
                        onClick={() => {
                          const time = `${h.toString().padStart(2, '0')}:00`;
                          setFormData(prev => ({ ...prev, date: dateStr, time }));
                          setIsModalOpen(true);
                        }}
                      />
                    ))}
                    
                    {/* APPOINTMENTS */}
                    {dayAppts.map(a => {
                      const [h, m] = a.time.split(':').map(Number);
                      const top = (h * 80) + (m / 60 * 80);
                      return (
                        <div 
                          key={a.id}
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(a); }}
                          className={`absolute left-1 right-1 p-1 rounded border text-[9px] font-medium shadow-sm cursor-pointer hover:shadow-md transition-all z-10 overflow-hidden ${
                            a.type === 'visit' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                            a.type === 'meeting' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' :
                            a.type === 'after-sales' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
                            'bg-amber-100 border-amber-300 text-amber-800'
                          } ${a.completed ? 'opacity-50 grayscale' : ''}`}
                          style={{ top: `${top}px`, height: '70px' }}
                        >
                          <p className="font-bold">{a.time}</p>
                          <p className="truncate">{a.title}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = getLocalDateString(currentDate);
    const dayAppts = appointments.filter(a => a.date === dateStr);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full overflow-hidden bg-white animate-in slide-in-from-bottom duration-300 relative">
        {/* DAY HEADER */}
        <div className="flex border-b border-slate-200 shrink-0">
          <div className="w-16 border-r border-slate-200 shrink-0" />
          <div className="flex-1 py-4 px-6">
            <p className="text-[10px] font-medium uppercase text-blue-600">
              {currentDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <p className="text-2xl font-normal text-slate-700 mt-1">
              {currentDate.getDate()}
            </p>
          </div>
        </div>

        {/* TIME GRID */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-full">
            {/* TIME LABELS */}
            <div className="w-16 border-r border-slate-200 shrink-0 bg-white">
              {hours.map(h => (
                <div key={h} className="h-20 relative">
                  <span className="absolute -top-2 right-2 text-[10px] text-slate-400">
                    {h.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* DAY COLUMN */}
            <div className="flex-1 relative">
              {/* HOUR SLOTS */}
              {hours.map(h => (
                <div 
                  key={h} 
                  className="h-20 border-b border-slate-50 cursor-pointer hover:bg-slate-50/50"
                  onClick={() => {
                    const time = `${h.toString().padStart(2, '0')}:00`;
                    setFormData(prev => ({ ...prev, date: dateStr, time }));
                    setIsModalOpen(true);
                  }}
                />
              ))}
              
              {/* APPOINTMENTS */}
              {dayAppts.map(a => {
                const [h, m] = a.time.split(':').map(Number);
                const top = (h * 80) + (m / 60 * 80);
                return (
                  <div 
                    key={a.id}
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(a); }}
                    className={`absolute left-4 right-4 p-3 rounded-lg border text-xs font-medium shadow-sm cursor-pointer hover:shadow-md transition-all z-10 overflow-hidden ${
                      a.type === 'visit' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                      a.type === 'meeting' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' :
                      a.type === 'after-sales' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
                      'bg-amber-100 border-amber-300 text-amber-800'
                    } ${a.completed ? 'opacity-50 grayscale' : ''}`}
                    style={{ top: `${top}px`, height: '70px' }}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold">{a.time}</p>
                      {a.completed && <CheckCircle2 size={14} className="text-slate-500" />}
                    </div>
                    <p className="font-medium text-sm mt-1">{a.title}</p>
                    <div className="flex items-center gap-1 mt-2 opacity-70">
                      <MapPin size={12} />
                      <p className="text-[10px] truncate">{a.address || 'Sem local'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FLOATING ADD BUTTON */}
        <button 
          onClick={() => handleOpenAddModal(currentDate)}
          className="absolute bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 z-50 lg:hidden"
        >
          <Plus size={32} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white overflow-hidden -m-6">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 p-4 hidden lg:flex flex-col gap-8 bg-white">
        <button 
          onClick={() => handleOpenAddModal()}
          className="flex items-center gap-3 px-4 py-3 rounded-full shadow-md border border-slate-100 hover:shadow-lg transition-all text-sm font-medium text-slate-700 bg-white w-fit"
        >
          <Plus size={24} className="text-blue-600" />
          <span>Criar</span>
        </button>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-medium text-slate-700">{formatMonthYear(currentDate)}</h3>
            <div className="flex gap-1">
              <button 
                onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date().getDate()); }}
                className="p-1 hover:bg-slate-100 rounded text-[10px] font-medium text-slate-500 uppercase"
              >
                Hoje
              </button>
              <button onClick={() => navigate('prev')} className="p-1 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={16}/></button>
              <button onClick={() => navigate('next')} className="p-1 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight size={16}/></button>
            </div>
          </div>
          
          {/* MINI CALENDAR */}
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-500 font-medium">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="py-1">{d}</div>)}
            {(() => {
              const { firstDay, days } = getDaysInMonth(currentDate);
              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
              for (let d = 1; d <= days; d++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                const isToday = getLocalDateString(date) === getLocalDateString(new Date());
                const isSelected = selectedDay === d;
                cells.push(
                  <button 
                    key={d} 
                    onClick={() => {
                      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                      setCurrentDate(newDate);
                      setSelectedDay(d);
                      setView('day');
                    }}
                    className={`py-1.5 rounded-full text-[10px] hover:bg-slate-100 transition-colors ${isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : isSelected ? 'bg-blue-100 text-blue-700' : 'text-slate-700'}`}
                  >
                    {d}
                  </button>
                );
              }
              return cells;
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Meus Calendários</h3>
          <div className="space-y-1">
            {[
              { label: 'Visitas', color: 'bg-blue-500' },
              { label: 'Reuniões', color: 'bg-indigo-500' },
              { label: 'Pós-venda', color: 'bg-emerald-500' },
              { label: 'Tarefas', color: 'bg-amber-500' }
            ].map(cat => (
              <div key={cat.label} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                <div className={`w-4 h-4 rounded ${cat.color}`} />
                <span className="text-sm text-slate-700">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CALENDAR AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl text-slate-700 font-normal min-w-[200px]">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h1>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Hoje</button>
              <button onClick={() => navigate('prev')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={20}/></button>
              <button onClick={() => navigate('next')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!googleTokens && (
              <button 
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200"
                title="Conectar Google Agenda"
              >
                <RefreshCw size={18} />
                <span className="text-xs font-medium hidden sm:inline">Sincronizar Google</span>
              </button>
            )}
            <div className="flex border border-slate-300 rounded overflow-hidden">
              {(['day', 'week', 'month'] as CalendarViewType[]).map(v => (
                <button 
                  key={v}
                  onClick={() => { setView(v); setSelectedDay(null); }}
                  className={`px-4 py-2 text-sm font-medium border-l first:border-l-0 ${view === v ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {v === 'day' ? 'Hoje' : v === 'week' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* VIEW CONTENT */}
        <div className="flex-1 overflow-auto">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agendar Compromisso">
        <form onSubmit={handleSaveNew} className="space-y-5">
          <div>
            <label className="text-xs font-black text-slate-700 uppercase mb-2 block px-1">Assunto Estratégico</label>
            <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-slate-900 font-bold border border-slate-100 focus:border-[#00A8E8] shadow-inner" placeholder="Ex: Demonstração Royal Prestige" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase mb-2 block px-1">Contato</label>
              <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border border-slate-100 focus:border-[#00A8E8] shadow-inner" placeholder="Nome do Cliente" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 uppercase mb-2 block px-1">Natureza</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border border-slate-100 focus:border-[#00A8E8] shadow-inner" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ApptType})}>
                <option value="visit">Visita Comercial</option>
                <option value="after-sales">Pós Venda</option>
                <option value="meeting">Reunião de Equipe</option>
                <option value="training">Treinamento</option>
                <option value="task">Tarefa Administrativa</option>
                <option value="call">Follow-up por Telefone</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100 space-y-4">
             <div className="flex items-center gap-3">
               <input 
                 type="checkbox" 
                 id="createLead" 
                 className="w-5 h-5 accent-[#00A8E8]" 
                 checked={formData.createLead} 
                 onChange={e => setFormData({...formData, createLead: e.target.checked})} 
               />
               <label htmlFor="createLead" className="text-xs font-black text-[#003459] uppercase cursor-pointer flex items-center gap-2">
                 <Trello size={14} className="text-[#00A8E8]" /> Vincular ao Pipeline comercial
               </label>
             </div>

             {formData.createLead && (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                 <div>
                    <label className="text-[10px] font-black text-[#003459] uppercase block mb-1">Fase do Novo Lead</label>
                    <select 
                      className="w-full p-3 bg-white rounded-xl border border-blue-200 font-bold text-xs"
                      value={formData.leadStage}
                      onChange={e => setFormData({...formData, leadStage: e.target.value as PipelineStage})}
                    >
                      {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-[#003459] uppercase block mb-1">WhatsApp do Lead</label>
                    <div className="relative">
                       <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                        className="w-full p-3 pl-9 bg-white rounded-xl border border-blue-200 font-bold text-xs"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                       />
                    </div>
                 </div>
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase mb-2 block px-1">Horário</label>
              <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border border-slate-100 focus:border-[#00A8E8] shadow-inner" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
            </div>
            <div>
               <label className="text-xs font-black text-slate-700 uppercase mb-2 block px-1">Data Agendada</label>
               <input 
                 type="date" 
                 className="w-full p-4 bg-white rounded-2xl font-bold text-slate-900 border-slate-200 focus:border-[#00A8E8] shadow-inner outline-none" 
                 value={formData.date} 
                 onChange={e => setFormData({...formData, date: e.target.value})} 
               />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-700 uppercase mb-2 block px-1">Endereço de Atendimento</label>
            <AddressAutocomplete 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border border-slate-100 focus:border-[#00A8E8] shadow-inner" 
              placeholder="Logradouro ou Ponto de Referência" 
              value={formData.address} 
              onChange={(val: string) => setFormData({...formData, address: val})} 
            />
          </div>
          <button type="submit" className="w-full py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-[#00A8E8]/30 hover:scale-[1.02] active:scale-95 transition-all">Sincronizar Agenda</button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Gestão Comercial do Evento">
        {selectedAppt && (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className={`p-5 rounded-2xl border-2 flex items-center justify-between ${selectedAppt.completed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
               <div className="flex items-center gap-3">
                 <div className={`p-3 rounded-xl ${selectedAppt.completed ? 'bg-green-500 text-white' : 'bg-[#003459] text-white'}`}>
                   {selectedAppt.completed ? <CheckCircle2 size={20}/> : <Clock size={20}/>}
                 </div>
                 <div>
                   <span className={`text-[10px] font-black uppercase tracking-widest block ${selectedAppt.completed ? 'text-green-700' : 'text-[#003459]'}`}>
                     {selectedAppt.completed ? 'Realizado' : 'Pendente'}
                   </span>
                   <p className="text-xs font-bold text-slate-500">Ação no Pipeline</p>
                 </div>
               </div>
               <button 
                 type="button" 
                 onClick={() => setSelectedAppt({...selectedAppt, completed: !selectedAppt.completed})}
                 className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all shadow-sm ${selectedAppt.completed ? 'bg-white border-green-300 text-green-700' : 'bg-[#003459] border-[#003459] text-white'}`}
               >
                 {selectedAppt.completed ? 'Desmarcar' : 'Concluir'}
               </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Título do Evento</label>
                <input 
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border-2 border-transparent focus:border-[#00A8E8] outline-none shadow-inner" 
                  value={selectedAppt.title} 
                  onChange={e => setSelectedAppt({...selectedAppt, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Data</label>
                  <input 
                    type="date"
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border-2 border-transparent focus:border-[#00A8E8] outline-none shadow-inner" 
                    value={selectedAppt.date} 
                    onChange={e => setSelectedAppt({...selectedAppt, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Hora</label>
                  <input 
                    type="time"
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border-2 border-transparent focus:border-[#00A8E8] outline-none shadow-inner" 
                    value={selectedAppt.time} 
                    onChange={e => setSelectedAppt({...selectedAppt, time: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Localização</label>
                <AddressAutocomplete 
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 border-2 border-transparent focus:border-[#00A8E8] outline-none shadow-inner" 
                  value={selectedAppt.address} 
                  onChange={(val: string) => setSelectedAppt({...selectedAppt, address: val})}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit" 
                className="flex-1 py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-[#0081B3] transition-all"
              >
                <Save size={20} /> Salvar Alterações
              </button>
              <button 
                type="button"
                onClick={() => {
                  if(confirm("Deseja remover este compromisso definitivamente?")) {
                    removeAppointment(selectedAppt.id);
                    setIsEditModalOpen(false);
                  }
                }}
                className="px-6 bg-slate-100 text-red-600 rounded-2xl border-2 border-slate-200 hover:bg-red-50 transition-all shadow-sm"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default CalendarView;