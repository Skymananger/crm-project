import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getLocalDateString } from '../constants';
import { CustomerPipelineStage, Lead, ApptType, PipelineStage } from '../types';
import { Plus, Phone, Calendar as CalendarIcon, GripVertical, Settings2, ArrowLeft, ArrowRight, MapPin, Tag, Calendar, Info, Share2, Edit3, Save, X, CalendarPlus, Home, ShoppingCart, DollarSign, PackageCheck, Clock, ClipboardCheck, Trash2, Download, Upload } from 'lucide-react';
import Modal from '../components/Modal';
import ToxicCoach from '../components/ToxicCoach';
import FollowUpModal from '../components/FollowUpModal';
import AddressAutocomplete from '../src/components/AddressAutocomplete';

interface LeadCardProps {
  lead: Lead;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onDragStart, onClick, onDelete }) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, lead.id)}
    onClick={onClick}
    className="bg-white p-5 rounded-[1.5rem] shadow-md border-2 border-slate-100 mb-4 cursor-grab active:cursor-grabbing hover:border-[#003459] transition-all group relative"
  >
    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#00A8E8]">
      <GripVertical size={20} />
    </div>
    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100">
      <button 
        onClick={onDelete}
        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
    <div className="pl-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${lead.pipelineType !== 'new' ? 'bg-orange-500' : 'bg-blue-500'}`} />
        <h4 className="font-black text-slate-900 group-hover:text-[#00A8E8] transition-colors truncate text-sm">
          {lead.prospectName || 'Sem Nome'}
        </h4>
      </div>
      <p className="text-[10px] text-slate-900 font-black uppercase mb-1 tracking-widest truncate">{lead.productInterest || 'Interesse Indefinido'}</p>
      {lead.nextActionDescription && (
        <p className="text-[9px] text-slate-400 font-bold italic truncate mb-3">"{lead.nextActionDescription}"</p>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <span className="text-[10px] font-black text-[#003459]">R$ {(lead.estimatedValue || 0).toLocaleString('pt-BR')}</span>
        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase">
          <CalendarIcon size={10} /> {lead.nextContactDate ? lead.nextContactDate.split('-').reverse().join('/') : 'Set'}
        </div>
      </div>
    </div>
  </div>
);

interface CustomerPipelineProps {
  type: 'million' | 'sky' | 'dign';
}

const CustomerPipeline: React.FC<CustomerPipelineProps> = ({ type }) => {
  const { 
    leads, addCustomer, createOrder, updateLeadStage, addLead, updateLead, 
    addAppointment, removeLead, googleTokens, syncToGoogleCalendar,
    millionPipelineOrder, skyPipelineOrder, dignPipelineOrder,
    updatePipelineOrder, renamePipelineStage,
    importLeadsFromRawText, clearPipelineLeads
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPipelineOrder = {
    million: millionPipelineOrder,
    sky: skyPipelineOrder,
    dign: dignPipelineOrder
  }[type];

  const [tempPipelineOrder, setTempPipelineOrder] = useState<string[]>(currentPipelineOrder);
  const [newStageName, setNewStageName] = useState('');
  const [editingStage, setEditingStage] = useState<{oldName: string, newName: string} | null>(null);

  const pipelineTitle = {
    million: 'Pipeline Cliente Million',
    sky: 'Pipeline Cliente SKY',
    dign: 'Pipeline Cliente DIGN'
  }[type];

  const initialStage = currentPipelineOrder[0];
  
  const [quickSale, setQuickSale] = useState({ 
    value: '', 
    description: '',
    date: getLocalDateString()
  });

  const [actionFormData, setActionFormData] = useState({
    type: 'visit' as ApptType,
    date: getLocalDateString(),
    time: '09:00',
    notes: ''
  });

  const [formData, setFormData] = useState({
    prospectName: '', 
    prospectPhone: '', 
    prospectCity: '', 
    prospectAddress: '', 
    prospectNotes: '', 
    productInterest: '', 
    estimatedValue: '', 
    stage: initialStage, 
    nextContactDate: '',
    pipelineType: type,
    nextActionDescription: ''
  });

  // Atualiza o formData quando o tipo muda ou a ordem do pipeline muda
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      pipelineType: type,
      stage: currentPipelineOrder[0]
    }));
  }, [type, currentPipelineOrder]);

  const handleQuickConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !quickSale.value || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Cria cliente
      const newCustId = await addCustomer({
        name: selectedLead.prospectName || 'Novo Cliente',
        phone: selectedLead.prospectPhone || '',
        city: selectedLead.prospectCity || '',
        notes: `Convertido via fechamento de pipeline ${type}`
      });

      if (newCustId) {
        // 2. Cria pedido com a data fornecida (que pode ser retroativa)
        await createOrder({
          customerId: newCustId as string,
          total: Number(quickSale.value),
          date: quickSale.date,
          status: 'completed',
          items: [],
          installments: 1,
          downPayment: Number(quickSale.value),
          orderType: 'new'
        });

        // 3. Move do pipeline e atualiza valor
        // Procuramos por um estágio que contenha "FECHADO" ou usamos o último estágio
        const closedStage = currentPipelineOrder.find(s => s.toUpperCase().includes('FECHADO')) || currentPipelineOrder[currentPipelineOrder.length - 1];
        
        await updateLead({
          ...selectedLead,
          stage: closedStage,
          estimatedValue: Number(quickSale.value),
          lastInteraction: new Date().toISOString()
        });
        alert("Lead convertido e faturamento registrado!");
        setIsDetailModalOpen(false);
        setQuickSale({ value: '', description: '', date: getLocalDateString() });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const actionTitle = {
      visit: 'Visita Comercial',
      meeting: 'Reunião',
      task: 'Tarefa',
      call: 'Chamada',
      'after-sales': 'Pós-Venda',
      training: 'Treinamento',
      other: 'Outro'
    }[actionFormData.type] || 'Ação Comercial';

    const newAppt = {
      title: `${actionTitle}: ${selectedLead.productInterest}`,
      client: selectedLead.prospectName || 'Cliente sem nome',
      date: actionFormData.date,
      time: actionFormData.time,
      address: selectedLead.prospectAddress || '',
      type: actionFormData.type,
      synced: !!googleTokens,
      completed: false,
      leadId: selectedLead.id
    };

    await addAppointment(newAppt);

    // Sincronizar com Google Agenda
    if (googleTokens) {
      await syncToGoogleCalendar({ ...newAppt, id: 'temp' } as any);
    } else {
      // Fallback: Abrir Google Agenda em nova aba
      const [year, month, day] = actionFormData.date.split('-');
      const [hour, minute] = actionFormData.time.split(':');
      const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const format = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
      const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${actionTitle}: ${selectedLead.productInterest}`)}&dates=${format(startDate)}/${format(endDate)}&details=${encodeURIComponent(`Lead: ${selectedLead.prospectName}\nTel: ${selectedLead.prospectPhone}`)}&location=${encodeURIComponent(selectedLead.prospectAddress || '')}&sf=true&output=xml`;
      window.open(gCalUrl, '_blank');
    }

    updateLead({
      ...selectedLead,
      nextContactDate: actionFormData.date,
      nextActionDescription: actionFormData.notes,
      prospectNotes: selectedLead.prospectNotes + `\n[Agendado ${actionTitle} para ${actionFormData.date}]`
    });

    alert("Ação agendada com sucesso!");
    setActionFormData({ type: 'visit', date: getLocalDateString(), time: '09:00', notes: '' });
    setIsDetailModalOpen(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("leadId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) updateLeadStage(leadId, stage);
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      addLead({
        ...formData,
        estimatedValue: Number(formData.estimatedValue) || 0,
        lastInteraction: new Date().toISOString(),
        assignedTo: 'admin'
      });
      setIsModalOpen(false);
      setFormData({ 
        prospectName: '', 
        prospectPhone: '', 
        prospectCity: '', 
        prospectAddress: '', 
        prospectNotes: '', 
        productInterest: '', 
        estimatedValue: '', 
        stage: currentPipelineOrder[0], 
        nextContactDate: '',
        pipelineType: type,
        nextActionDescription: ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStage = () => {
    if (newStageName.trim() && !tempPipelineOrder.includes(newStageName.trim())) {
      setTempPipelineOrder([...tempPipelineOrder, newStageName.trim()]);
      setNewStageName('');
    }
  };

  const handleRemoveStage = (stageToRemove: string) => {
    if (leads.some(l => l.stage === stageToRemove)) {
      alert("Não é possível remover uma etapa que contém leads. Mova os leads primeiro.");
      return;
    }
    setTempPipelineOrder(tempPipelineOrder.filter(s => s !== stageToRemove));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tempPipelineOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setTempPipelineOrder(newOrder);
  };

  const savePipelineOrder = () => {
    updatePipelineOrder(tempPipelineOrder, type);
    setIsSettingsModalOpen(false);
  };

  const handleRenameStage = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName || tempPipelineOrder.includes(newName)) return;
    
    // Atualiza a ordem local do modal
    const updatedOrder = tempPipelineOrder.map(s => s === oldName ? newName : s);
    setTempPipelineOrder(updatedOrder);
    
    // Atualiza no contexto global
    await renamePipelineStage(oldName, newName, type);
    setEditingStage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        await importLeadsFromRawText(text, type);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">{pipelineTitle}</h1>
          <p className="text-slate-900 font-bold">Gerencie o relacionamento com seus clientes da filial {type.toUpperCase()}.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-indigo-50 text-indigo-700 border-2 border-indigo-100 px-6 py-3 rounded-2xl font-black shadow-sm hover:border-indigo-500 transition-colors flex items-center gap-2"
          >
            <Upload size={18} /> Importar CSV
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv,.txt" 
            className="hidden" 
          />
          <button onClick={() => { setTempPipelineOrder(currentPipelineOrder); setIsSettingsModalOpen(true); }} className="bg-white text-[#003459] border-2 border-slate-200 px-6 py-3 rounded-2xl font-black shadow-sm hover:border-[#003459] transition-colors flex items-center gap-2">
            <Settings2 size={18} /> Configurar Funil
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#00A8E8] text-white px-8 py-3 rounded-2xl font-black shadow-lg">Novo Contato</button>
        </div>
      </div>

      <ToxicCoach />

      <div className="flex-1 overflow-x-auto pb-6">
        <div className="inline-flex gap-5 h-full items-start">
          {currentPipelineOrder.map((stage) => (
            <div key={stage} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage)} className="flex-shrink-0 w-80 bg-white rounded-[2.5rem] p-5 border-2 border-slate-100">
              <h3 className="font-black text-[#003459] uppercase text-xs tracking-widest mb-4 px-1">
                {stage} ({leads.filter(l => l.pipelineType === type && l.stage === stage).length})
              </h3>
              <div className="space-y-4 overflow-y-auto max-h-[60vh] scrollbar-hide">
                {leads.filter(l => l.pipelineType === type && l.stage === stage).map(lead => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    onDragStart={handleDragStart} 
                    onClick={() => { setSelectedLead(lead); setIsDetailModalOpen(true); }} 
                    onDelete={(e) => {
                      e.stopPropagation();
                      if(confirm(`Deseja remover o contato ${lead.prospectName}?`)) removeLead(lead.id);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title={`Configurar Funil: ${pipelineTitle}`}>
        <div className="space-y-6">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nova etapa (ex: Pós-Venda)"
              className="flex-1 p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-black" 
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
            />
            <button 
              onClick={handleAddStage}
              className="px-6 bg-[#003459] text-white rounded-2xl font-black text-xs uppercase hover:bg-black"
            >
              Adicionar
            </button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {tempPipelineOrder.map((stage, i) => (
              <div key={stage} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 group">
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleMoveStage(i, 'up')} disabled={i === 0} className="text-slate-400 hover:text-[#00A8E8] disabled:opacity-30">
                    <ArrowLeft className="rotate-90" size={16} />
                  </button>
                  <button onClick={() => handleMoveStage(i, 'down')} disabled={i === tempPipelineOrder.length - 1} className="text-slate-400 hover:text-[#00A8E8] disabled:opacity-30">
                    <ArrowLeft className="-rotate-90" size={16} />
                  </button>
                </div>
                
                {editingStage?.oldName === stage ? (
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 p-2 bg-white rounded-xl border-2 border-[#00A8E8] outline-none font-black text-black text-xs uppercase" 
                      value={editingStage.newName}
                      onChange={(e) => setEditingStage({ ...editingStage, newName: e.target.value })}
                      autoFocus
                    />
                    <button onClick={() => handleRenameStage(editingStage.oldName, editingStage.newName)} className="p-2 bg-[#00A8E8] text-white rounded-xl hover:bg-[#0081B3]">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditingStage(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-black text-[#003459] uppercase text-xs">{stage}</span>
                    <button 
                      onClick={() => setEditingStage({ oldName: stage, newName: stage })}
                      className="p-2 text-slate-300 hover:text-[#00A8E8] transition-colors opacity-0 group-hover:opacity-100"
                      title="Renomear Etapa"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleRemoveStage(stage)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir Etapa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if(confirm("Tem certeza que deseja resetar este funil para o padrão?")) {
                  const defaultOrder = [
                    type === 'sky' ? CustomerPipelineStage.CLIENTES_SKY : (type === 'million' ? CustomerPipelineStage.CLIENTES_MILLION : CustomerPipelineStage.CLIENTES_DIGN),
                    CustomerPipelineStage.ABORDAGEM,
                    CustomerPipelineStage.FOLLOW_UP,
                    CustomerPipelineStage.EM_CONVERSA,
                    CustomerPipelineStage.PROPOSTA_ENVIADA,
                    CustomerPipelineStage.VENDIDO,
                    CustomerPipelineStage.PERDIDO,
                    CustomerPipelineStage.FRENTE
                  ];
                  setTempPipelineOrder(defaultOrder);
                }
              }}
              className="flex-1 py-4 bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-300 shadow-sm"
            >
              Resetar Padrão
            </button>
            <button 
              onClick={savePipelineOrder}
              className="flex-1 py-4 bg-[#00A8E8] text-white rounded-2xl font-black text-xs uppercase hover:bg-[#0081B3] shadow-md"
            >
              Salvar Ordem
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Cartão da Oportunidade">
        {selectedLead && (
          <div className="space-y-6">
            <div className="p-7 bg-[#003459] rounded-[2rem] border-2 border-slate-900 text-white shadow-xl">
               <h2 className="text-xl font-black">{selectedLead.prospectName}</h2>
               <p className="text-xs font-black text-blue-200 uppercase tracking-widest mt-1">{selectedLead.productInterest}</p>
            </div>

            <div className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 space-y-4 shadow-sm">
               <h3 className="text-xs font-black text-[#003459] uppercase tracking-widest flex items-center gap-2">
                 <CalendarPlus size={16} className="text-[#00A8E8]" /> Agendar Próxima Ação
               </h3>
               <form onSubmit={handleScheduleAction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Ação</label>
                      <select required className="w-full p-2.5 bg-white rounded-xl border border-blue-200 font-bold text-xs outline-none" value={actionFormData.type} onChange={e => setActionFormData({...actionFormData, type: e.target.value as ApptType})}>
                        <option value="visit">Visita</option>
                        <option value="after-sales">Pós Venda</option>
                        <option value="meeting">Reunião</option>
                        <option value="training">Treinamento</option>
                        <option value="call">Chamada</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Hora</label>
                      <input type="time" required className="w-full p-2.5 bg-white rounded-xl border border-blue-200 font-bold text-xs outline-none" value={actionFormData.time} onChange={e => setActionFormData({...actionFormData, time: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Data Agendada</label>
                    <input type="date" required className="w-full p-2.5 bg-white rounded-xl border border-blue-200 font-bold text-xs outline-none" value={actionFormData.date} onChange={e => setActionFormData({...actionFormData, date: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full py-3 bg-[#003459] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                    <Clock size={14} /> Agendar e Notificar
                  </button>
               </form>
            </div>

            <div className="p-6 bg-green-50 rounded-3xl border-2 border-green-100 space-y-4">
               <h3 className="text-xs font-black text-green-800 uppercase tracking-widest flex items-center gap-2">
                 <ShoppingCart size={16} /> Fechar Venda Direta
               </h3>
               <form onSubmit={handleQuickConvert} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-green-800 uppercase block mb-1">Data Fechamento</label>
                      <input type="date" className="w-full p-2.5 bg-white rounded-xl border border-green-200 font-bold text-xs outline-none" value={quickSale.date} onChange={e => setQuickSale({...quickSale, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-green-800 uppercase block mb-1">Valor (R$)</label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="number" placeholder="0,00" className="w-full pl-9 p-2.5 bg-white border border-green-200 rounded-xl font-bold text-xs outline-none" value={quickSale.value} onChange={e => setQuickSale({...quickSale, value: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <PackageCheck size={14} className="absolute left-3 top-3 text-slate-400" />
                    <textarea placeholder="Observações do faturamento..." className="w-full pl-9 p-3 bg-white border border-green-200 rounded-xl font-bold text-sm outline-none h-20 resize-none focus:border-green-500" value={quickSale.description} onChange={e => setQuickSale({...quickSale, description: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-md">
                    Converter em Venda Concluída
                  </button>
               </form>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400">Observações Comerciais</p>
              <p className="text-sm font-bold text-slate-800 italic whitespace-pre-line">{selectedLead.prospectNotes || "Nenhuma nota registrada."}</p>
            </div>

            <div className="pt-4">
               <button 
                 onClick={() => setIsFollowUpModalOpen(true)}
                 className="w-full py-4 bg-white text-[#003459] border-2 border-[#003459] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
               >
                  <Calendar size={16} /> Agendar Follow-up
               </button>
            </div>

            <a href={`https://wa.me/${selectedLead.prospectPhone?.replace(/\D/g, '')}`} target="_blank" className="w-full py-4 bg-[#003459] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
               <Phone size={16} /> Contatar via WhatsApp
            </a>
          </div>
        )}
      </Modal>

      <FollowUpModal 
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        targetName={selectedLead?.prospectName || ''}
        targetPhone={selectedLead?.prospectPhone}
        targetAddress={selectedLead?.prospectAddress}
        leadId={selectedLead?.id}
      />

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title={`Importação Manual: ${type.toUpperCase()}`}>
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500">
            Cole os dados da sua planilha abaixo. <br/>
            Formato esperado (separado por ponto e vírgula): <br/>
            <code className="bg-slate-100 p-1 rounded">NOME;CIDADE;TEL_RES;CELULAR;ORDENS</code>
          </p>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-700 font-black uppercase mb-1">Dica:</p>
            <p className="text-[9px] text-blue-600 font-bold leading-relaxed">
              Você pode copiar várias linhas do Excel ou Bloco de Notas e colar aqui. 
              O sistema irá ignorar duplicatas e traduzir os códigos de produtos automaticamente.
            </p>
          </div>
          <textarea 
            className="w-full h-64 p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 font-mono text-xs outline-none focus:border-[#003459] text-black"
            placeholder="Exemplo:&#10;JOAO SILVA;SAO PAULO;1133334444;11999998888;CO1253,CO4716"
            value={rawImportText}
            onChange={(e) => setRawImportText(e.target.value)}
          />
          <button 
            onClick={async () => {
              await importLeadsFromRawText(rawImportText, type);
              setRawImportText('');
              setIsImportModalOpen(false);
            }}
            className="w-full py-4 bg-[#003459] text-white rounded-2xl font-black text-xs uppercase hover:bg-black shadow-md"
          >
            Processar e Importar
          </button>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Contato">
        <form onSubmit={handleAddLead} className="space-y-6">
          <input required className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none" placeholder="Nome" value={formData.prospectName} onChange={e => setFormData({...formData, prospectName: e.target.value})} />
          <input required className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none" placeholder="WhatsApp" value={formData.prospectPhone} onChange={e => setFormData({...formData, prospectPhone: e.target.value})} />
          <AddressAutocomplete 
            className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none" 
            placeholder="Endereço / Localização" 
            value={formData.prospectAddress} 
            onChange={(val: string) => setFormData({...formData, prospectAddress: val})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Tipo de Pipeline</label>
              <select 
                className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none"
                value={formData.pipelineType}
                onChange={e => setFormData({...formData, pipelineType: e.target.value as any})}
              >
                <option value="million">Million</option>
                <option value="sky">SKY</option>
                <option value="dign">DIGN</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Próximo Contato</label>
              <input 
                type="date"
                className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none" 
                value={formData.nextContactDate} 
                onChange={e => setFormData({...formData, nextContactDate: e.target.value})} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Valor Estimado (R$)</label>
              <input 
                type="number"
                className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none" 
                placeholder="0,00" 
                value={formData.estimatedValue} 
                onChange={e => setFormData({...formData, estimatedValue: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Interesse</label>
              <input className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 font-black outline-none" placeholder="Produto" value={formData.productInterest} onChange={e => setFormData({...formData, productInterest: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase shadow-xl">Lançar Contato</button>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerPipeline;