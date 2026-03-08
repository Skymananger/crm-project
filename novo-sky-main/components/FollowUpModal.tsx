import React, { useState } from 'react';
import Modal from './Modal';
import { Clock, Calendar, Bell, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { ApptType, RecurrenceType } from '../types';
import { getLocalDateString } from '../constants';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetPhone?: string;
  targetAddress?: string;
  leadId?: string;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, targetName, targetPhone, targetAddress, leadId }) => {
  const { addAppointment, syncToGoogleCalendar, googleTokens, leads, updateLead } = useApp();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '1',
    unit: 'days' as 'hours' | 'days' | 'weeks' | 'months',
    notes: '',
    type: 'call' as ApptType,
    manualDate: getLocalDateString(),
    recurrence: 'none' as RecurrenceType
  });

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let scheduledDate: Date;
    if (formData.manualDate) {
      const [y, m, d] = formData.manualDate.split('-').map(Number);
      scheduledDate = new Date(y, m - 1, d, 10, 0, 0);
    } else {
      scheduledDate = new Date();
      const amount = parseInt(formData.amount);
      if (formData.unit === 'hours') scheduledDate.setHours(scheduledDate.getHours() + amount);
      else if (formData.unit === 'days') scheduledDate.setDate(scheduledDate.getDate() + amount);
      else if (formData.unit === 'weeks') scheduledDate.setDate(scheduledDate.getDate() + (amount * 7));
      else if (formData.unit === 'months') scheduledDate.setMonth(scheduledDate.getMonth() + amount);
    }

    const dateStr = getLocalDateString(scheduledDate);
    const timeStr = scheduledDate.toTimeString().split(' ')[0].substring(0, 5);

    const newAppt = {
      title: `Follow-up: ${targetName}`,
      client: targetName,
      date: dateStr,
      time: timeStr,
      address: targetAddress || '',
      type: formData.type,
      synced: !!googleTokens,
      completed: false,
      leadId: leadId
    };

    await addAppointment(newAppt);
    
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        updateLead({
          ...lead,
          nextContactDate: dateStr,
          nextActionDescription: formData.notes,
          recurrence: formData.recurrence
        });
      }
    }
    
    if (googleTokens) {
      await syncToGoogleCalendar({ ...newAppt, id: 'temp' } as any);
    }

    setLoading(false);
    alert(`Follow-up agendado para ${scheduledDate.toLocaleString('pt-BR')}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Follow-up">
      <form onSubmit={handleSchedule} className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
          <Bell className="text-[#00A8E8]" size={20} />
          <p className="text-xs font-bold text-[#003459]">Defina quando você deve entrar em contato com <strong>{targetName}</strong> novamente.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">Agendar para Data Específica</label>
            {formData.manualDate && (
              <button 
                type="button" 
                onClick={() => setFormData({...formData, manualDate: ''})}
                className="text-[9px] font-black text-red-500 uppercase"
              >
                Limpar
              </button>
            )}
          </div>
          <input 
            type="date"
            className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00A8E8] outline-none"
            value={formData.manualDate}
            onChange={e => setFormData({...formData, manualDate: e.target.value})}
          />
        </div>

        {!formData.manualDate && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Ou em...</label>
              <input 
                type="number" 
                min="1" 
                required 
                className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00A8E8] outline-none"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Unidade</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00A8E8] outline-none"
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value as any})}
              >
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
                <option value="weeks">Semanas</option>
                <option value="months">Meses</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Meio de Contato</label>
          <select 
            className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00A8E8] outline-none"
            value={formData.type}
            onChange={e => setFormData({...formData, type: e.target.value as any})}
          >
            <option value="call">Chamada Telefônica</option>
            <option value="visit">Visita Pessoal</option>
            <option value="meeting">Reunião Online</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Recorrência (Lembrete Automático)</label>
          <select 
            className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00A8E8] outline-none"
            value={formData.recurrence}
            onChange={e => setFormData({...formData, recurrence: e.target.value as any})}
          >
            <option value="none">Sem Recorrência</option>
            <option value="daily">Diário</option>
            <option value="every_15_days">A cada 15 dias</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">O que será feito? (Descrição)</label>
          <textarea 
            className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-[#00A8E8] outline-none h-24 resize-none"
            placeholder="Ex: Ligar para confirmar proposta..."
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-5 bg-[#003459] text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
        >
          {loading ? <Clock className="animate-spin" size={20} /> : <Calendar size={20} />}
          Confirmar Agendamento
        </button>
      </form>
    </Modal>
  );
};

export default FollowUpModal;
