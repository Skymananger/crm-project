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
    <div className={`p-5 rounded-3xl border-2 shadow-lg mb-8 flex items-start gap-4 animate-pulse-subtle ${message.color}`}>
      <div className="mt-1 p-2 bg-white/50 rounded-xl">
        {message.icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Líder Tóxico Diz:</p>
        <p className="text-sm font-black leading-tight italic">"{message.text}"</p>
      </div>
    </div>
  );
};

export default ToxicCoach;
