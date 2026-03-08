
import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Percent, TrendingUp } from 'lucide-react';

const Calculators: React.FC = () => {
  const [totalValue, setTotalValue] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(12);
  const [interestRate, setInterestRate] = useState<number>(1.99);
  
  const [result, setResult] = useState({
    financedAmount: 0,
    installmentValue: 0,
    totalWithInterest: 0,
    totalInterest: 0
  });

  useEffect(() => {
    const financed = totalValue - downPayment;
    if (financed <= 0) {
      setResult({ financedAmount: 0, installmentValue: 0, totalWithInterest: 0, totalInterest: 0 });
      return;
    }

    const totalWithInterest = financed * (1 + (interestRate / 100) * installments);
    const installmentValue = totalWithInterest / installments;
    const totalInterest = totalWithInterest - financed;

    setResult({
      financedAmount: financed,
      installmentValue,
      totalWithInterest: totalWithInterest + downPayment,
      totalInterest
    });
  }, [totalValue, downPayment, installments, interestRate]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#003459]">Simulador Financeiro</h1>
        <p className="text-slate-600">Ferramenta estratégica para fechamento de vendas consultivas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calculator size={20} className="text-[#00A8E8]" />
            Parâmetros da Venda
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Valor Total do Produto (R$)</label>
              <input 
                type="number" 
                value={totalValue || ''} 
                onChange={(e) => setTotalValue(Number(e.target.value))}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#00A8E8] rounded-2xl outline-none transition-all font-bold text-slate-900 placeholder-slate-400"
                placeholder="0,00"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Entrada (R$)</label>
              <input 
                type="number" 
                value={downPayment || ''} 
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#00A8E8] rounded-2xl outline-none transition-all font-bold text-slate-900 placeholder-slate-400"
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Parcelas</label>
                <select 
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#00A8E8] rounded-2xl outline-none transition-all font-bold text-slate-900"
                >
                  {[1, 3, 6, 10, 12, 18, 24].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Taxa Mensal (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={interestRate} 
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#00A8E8] rounded-2xl outline-none transition-all font-bold text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#003459] text-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-900/20 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#00A8E8]" />
              Resumo da Simulação
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-blue-200 text-sm font-medium">Valor da Parcela</p>
                <p className="text-4xl font-black text-white">R$ {result.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div>
                  <p className="text-blue-200 text-xs font-bold uppercase">Total Financiado</p>
                  <p className="text-lg font-bold">R$ {result.financedAmount.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs font-bold uppercase">Total de Juros</p>
                  <p className="text-lg font-bold text-red-400">R$ {result.totalInterest.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-blue-100 font-medium">Total Geral</span>
              <span className="text-2xl font-black text-[#00A8E8]">R$ {result.totalWithInterest.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculators;
