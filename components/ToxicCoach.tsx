import React, { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { AlertTriangle, Skull, Zap, TrendingDown, Target } from 'lucide-react';

const ToxicCoach: React.FC = () => {
  const { leads, appointments, orders, userProfile } = useApp();

  const message = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayVisits = appointments.filter(a => a.date === today && a.type === 'visit' && !a.completed);
    const todayTasks = appointments.filter(a => a.date === today && !a.completed);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthRevenue = orders.reduce((acc, o) => {
      const d = new Date(o.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) return acc + o.total;
      return acc;
    }, 0);

    const revenueMeta = userProfile.monthlyRevenueMeta || 50000;
    const revenueProgress = (monthRevenue / revenueMeta) * 100;

    const negotiationLeads = leads.filter(l => l.stage.toUpperCase().includes('NEGOCIAÇÃO') || l.stage.toUpperCase().includes('PROPOSTA'));
    const leadsWithoutAction = leads.filter(l => !l.nextContactDate && l.stage !== 'Fechado');

    // Prioridade de "esporro"
    if (monthRevenue === 0 && new Date().getDate() > 5) {
      return {
        text: "Dia " + new Date().getDate() + " e ZERO de faturamento? Você é um turista ou um vendedor? Tira a bunda da cadeira!",
        icon: <Skull className="text-red-600" />,
        color: "bg-red-50 border-red-200 text-red-900"
      };
    }

    if (todayVisits.length === 0) {
      return {
        text: "Nenhuma visita agendada para hoje? O café é para quem fecha contrato, não para quem fica assistindo a vida passar. Vai prospectar!",
        icon: <AlertTriangle className="text-orange-600" />,
        color: "bg-orange-50 border-orange-200 text-orange-900"
      };
    }

    if (revenueProgress < 20 && new Date().getDate() > 10) {
      return {
        text: `Meta em ${revenueProgress.toFixed(1)}%? Se continuar nesse ritmo, o único 'upgrade' que você vai ter é o plano de internet para procurar outro emprego.`,
        icon: <TrendingDown className="text-red-600" />,
        color: "bg-red-50 border-red-200 text-red-900"
      };
    }

    if (leads.length < 20) {
      return {
        text: `Só ${leads.length} leads no sistema? Você está com medo de falar com pessoas ou só é preguiçoso mesmo? Enche esse funil agora!`,
        icon: <Target className="text-purple-600" />,
        color: "bg-purple-50 border-purple-200 text-purple-900"
      };
    }

    if (leadsWithoutAction.length > 5) {
      return {
        text: `${leadsWithoutAction.length} leads sem próxima ação. Você está esperando eles adivinharem que você quer vender? Organização é o mínimo, e você nem isso tem.`,
        icon: <Zap className="text-amber-600" />,
        color: "bg-amber-50 border-amber-200 text-amber-900"
      };
    }

    if (todayTasks.length > 10) {
      return {
        text: `10+ tarefas acumuladas? Parabéns, você é oficialmente o gargalo da sua própria empresa. Resolve essa bagunça ou para de fingir que trabalha.`,
        icon: <AlertTriangle className="text-red-600" />,
        color: "bg-red-50 border-red-200 text-red-900"
      };
    }

    return {
      text: "Não se acomode. O mercado não tem pena de quem acha que 'já fez o suficiente'. Continua moendo!",
      icon: <Zap className="text-blue-600" />,
      color: "bg-blue-50 border-blue-200 text-blue-900"
    };
  }, [leads, appointments, orders, userProfile]);

  return (
    <div className={`mx-4 mt-4 p-3 rounded-2xl border backdrop-blur-md shadow-lg transition-all duration-500 flex items-center gap-4 relative overflow-hidden group ${message.color.split(' ').filter(c => !c.includes('bg-') && !c.includes('border-')).join(' ')}`}>
      <div className={`absolute inset-0 opacity-5 -z-10 ${message.color.split(' ').find(c => c.includes('bg-'))}`}></div>
      
      <div className="shrink-0 p-2 bg-white/40 rounded-xl shadow-inner border border-white/50 group-hover:rotate-12 transition-transform duration-500 flex items-center justify-center">
        <div className="w-5 h-5 flex items-center justify-center">
          {message.icon}
        </div>
      </div>
      
      <div className="flex-1 flex items-center gap-3">
        <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[7px] font-black uppercase tracking-tighter whitespace-nowrap">Toxic Mode</span>
        <p className="text-xs lg:text-sm font-bold leading-tight tracking-tight drop-shadow-sm italic line-clamp-1">
          "{message.text}"
        </p>
      </div>

      <div className="opacity-10 group-hover:opacity-20 transition-opacity">
        <Skull size={24} />
      </div>
    </div>
  );
};

export default ToxicCoach;
