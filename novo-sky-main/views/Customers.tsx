import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { PipelineStage, Customer, CustomerPipelineStage } from '../types';
import { getLocalDateString } from '../constants';
import Papa from 'papaparse';
import { 
  Search, 
  UserPlus, 
  MessageCircle, 
  History, 
  Phone, 
  MapPin, 
  ChevronRight,
  ShoppingCart,
  Zap,
  Tag,
  DollarSign,
  PackageCheck,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit3,
  UploadCloud
} from 'lucide-react';
import Modal from '../components/Modal';
import FollowUpModal from '../components/FollowUpModal';

const Customers: React.FC = () => {
  const { customers, orders, addCustomer, createOrder, team, removeCustomer, removeOrder, updateOrder, selectedCustomerId, setSelectedCustomerId, addLead, updateLeadStage } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', city: '', notes: '' });
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  const [quickSale, setQuickSale] = useState({ 
    value: '', 
    description: '', 
    salespersonId: '', 
    date: getLocalDateString(),
    orderType: 'addon' as 'addon' | 'history'
  });

  React.useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setSelectedCustomer(customer);
        setIsDetailModalOpen(true);
      }
    }
  }, [selectedCustomerId, customers]);

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({ ...formData });
    setFormData({ name: '', phone: '', city: '', notes: '' });
    setIsModalOpen(false);
  };

  const handleQuickSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !quickSale.value) return;

    if (editingOrderId) {
      await updateOrder({
        id: editingOrderId,
        customerId: selectedCustomer.id,
        salespersonId: quickSale.salespersonId || undefined,
        total: Number(quickSale.value),
        date: quickSale.date,
        status: 'completed',
        items: [], 
        installments: 1,
        downPayment: Number(quickSale.value),
        orderType: quickSale.orderType
      });
      alert("Venda atualizada com sucesso!");
    } else {
      await createOrder({
        customerId: selectedCustomer.id,
        salespersonId: quickSale.salespersonId || undefined,
        total: Number(quickSale.value),
        date: quickSale.date,
        status: 'completed',
        items: [], 
        installments: 1,
        downPayment: Number(quickSale.value),
        orderType: quickSale.orderType
      });
      alert("Venda registrada com sucesso!");
    }

    setQuickSale({ value: '', description: '', salespersonId: '', date: getLocalDateString(), orderType: 'addon' });
    setEditingOrderId(null);
    setIsDetailModalOpen(false);
  };

  const handleEditOrder = (order: any) => {
    setEditingOrderId(order.id);
    setQuickSale({
      value: order.total.toString(),
      description: '', // Items are not easily editable here, but we can at least edit the value/date
      salespersonId: order.salespersonId || '',
      date: order.date,
      orderType: order.orderType || 'addon'
    });
  };

  const handleExport = () => {
    const dataToExport = customers.map(c => ({
      nome: c.name,
      whatsapp: c.phone,
      cidade: c.city,
      Produtos: getCustomerOrders(c.id).map(o => o.items.map(i => i.productId).join(', ')).join('; ')
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'clientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    customers.forEach(c => {
      const customerOrders = getCustomerOrders(c.id);
      const isMillion = customerOrders.some(o => o.items.some(i => i.productId.toLowerCase().includes('million')));
      const stage = isMillion ? CustomerPipelineStage.CLIENTES_MILLION : CustomerPipelineStage.CLIENTES_SKY;

      addLead({
        prospectName: c.name,
        prospectPhone: c.phone,
        prospectCity: c.city,
        stage: stage,
        pipelineType: isMillion ? 'million' : 'sky',
        productInterest: getCustomerOrders(c.id).map(o => o.items.map(i => i.productId).join(', ')).join('; '),
        estimatedValue: 0,
        lastInteraction: new Date().toISOString(),
        nextContactDate: '',
        assignedTo: 'admin',
        customerId: c.id
      });
    });

    alert('Clientes exportados e movidos para o pipeline de clientes!');
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'sky' | 'million'>('sky');

  const handleImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const customersToImport = results.data as any[];
        for (const c of customersToImport) {
          const newCustomer = {
            name: c.nome,
            phone: c.whatsapp,
            city: c.cidade,
            notes: '',
          };
          const customerId = await addCustomer(newCustomer);

          if (customerId) {
            await addLead({
              prospectName: c.nome,
              prospectPhone: c.whatsapp,
              prospectCity: c.cidade,
              stage: importType === 'sky' ? CustomerPipelineStage.CLIENTES_SKY : CustomerPipelineStage.CLIENTES_MILLION,
              pipelineType: importType === 'sky' ? 'sky' : 'million',
              productInterest: c.produtos || '',
              estimatedValue: 0,
              lastInteraction: new Date().toISOString(),
              nextContactDate: '',
              assignedTo: 'admin',
              customerId: customerId
            });
          }
        }
        alert(`${customersToImport.length} clientes importados com sucesso!`);
        setIsImportModalOpen(false);
      }
    });
  };

  const getCustomerOrders = (id: string) => orders.filter(o => o.customerId === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">Gestão de Carteira</h1>
          <p className="text-slate-500 font-bold">Base de dados sincronizada com LocalStorage.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <UploadCloud size={20} /> Importar CSV
          </button>
          <button 
            onClick={handleExport}
            className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <UserPlus size={20} /> Exportar e Mover para Pipeline
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#003459] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center gap-2"
          >
            <UserPlus size={20} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar cliente..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-black text-slate-900 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCustomers.map(customer => {
          const custOrders = getCustomerOrders(customer.id);
          const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);

          return (
            <div 
              key={customer.id} 
              onClick={() => { setSelectedCustomer(customer); setIsDetailModalOpen(true); }}
              className="bg-white p-5 rounded-[1.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between hover:border-[#00A8E8] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-[#003459] flex items-center justify-center font-black border border-slate-100 group-hover:bg-[#003459] group-hover:text-white transition-colors">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 group-hover:text-[#00A8E8] transition-colors">{customer.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{customer.city} • {customer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo total</p>
                  <p className="font-black text-[#003459]">R$ {totalSpent.toLocaleString('pt-BR')}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm(`Deseja remover ${customer.name}?`)) removeCustomer(customer.id);
                  }}
                  className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <ChevronRight className="text-slate-300 group-hover:text-[#00A8E8]" />
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isDetailModalOpen} onClose={closeDetailModal} title="Ficha do Cliente">
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-6 bg-[#003459] rounded-[2rem] border-2 border-slate-900 shadow-xl text-white">
              <div className="w-16 h-16 rounded-2xl bg-[#00A8E8] flex items-center justify-center font-black text-2xl border border-white/20">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black leading-tight">{selectedCustomer.name}</h2>
                <div className="flex gap-3 mt-1 opacity-70">
                   <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> {selectedCustomer.phone}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 space-y-4">
               <h3 className="text-xs font-black text-[#003459] uppercase tracking-widest flex items-center gap-2">
                 <Zap size={16} className="text-[#00A8E8]" /> {editingOrderId ? 'Editar Lançamento' : 'Lançar Nova Venda / Histórico'}
               </h3>
               <form onSubmit={handleQuickSale} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Data</label>
                      <input type="date" className="w-full p-2.5 bg-white border border-blue-200 rounded-xl font-bold text-xs" value={quickSale.date} onChange={e => setQuickSale({...quickSale, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Lançar como:</label>
                      <select className="w-full p-2.5 bg-white border border-blue-200 rounded-xl font-bold text-xs" value={quickSale.orderType} onChange={e => setQuickSale({...quickSale, orderType: e.target.value as any})}>
                        <option value="addon">Add-on (Funil)</option>
                        <option value="history">Apenas Histórico</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" placeholder="Valor (R$)" required className="w-full pl-9 p-3 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none" value={quickSale.value} onChange={e => setQuickSale({...quickSale, value: e.target.value})} />
                    </div>
                    <select className="w-full p-3 bg-white border border-blue-200 rounded-xl font-bold text-xs outline-none" value={quickSale.salespersonId} onChange={e => setQuickSale({...quickSale, salespersonId: e.target.value})}>
                      <option value="">Vendedor...</option>
                      {team.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <PackageCheck size={14} className="absolute left-3 top-3 text-slate-400" />
                    <textarea placeholder="Quais produtos comprou?" required className="w-full pl-9 p-3 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none h-20 resize-none" value={quickSale.description} onChange={e => setQuickSale({...quickSale, description: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full py-4 bg-[#003459] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> {editingOrderId ? 'Salvar Alterações' : 'Finalizar Lançamento'}
                  </button>
                  {editingOrderId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingOrderId(null);
                        setQuickSale({ value: '', description: '', salespersonId: '', date: getLocalDateString(), orderType: 'addon' });
                      }}
                      className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                    >
                      Cancelar Edição
                    </button>
                  )}
               </form>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                 <History size={14} className="text-[#00A8E8]" /> Histórico de Compras
               </h3>
               <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                 {getCustomerOrders(selectedCustomer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                   <div key={order.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl group">
                     <div className="flex items-center gap-4">
                       <div>
                         <p className="text-xs font-black text-[#003459]">{new Date(order.date).toLocaleDateString()}</p>
                         <p className="text-[9px] font-bold text-slate-500 uppercase">
                            {order.orderType === 'history' ? 'Retroativo' : 'Venda Normal'}
                         </p>
                       </div>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => handleEditOrder(order)}
                           className="p-1.5 text-slate-400 hover:text-[#00A8E8]"
                         >
                           <Edit3 size={14} />
                         </button>
                         <button 
                           onClick={() => {
                             if(confirm("Deseja remover este pedido?")) removeOrder(order.id);
                           }}
                           className="p-1.5 text-slate-400 hover:text-red-500"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                     </div>
                     <span className="text-sm font-black text-[#00A8E8]">R$ {order.total.toLocaleString('pt-BR')}</span>
                   </div>
                 ))}
               </div>
            </div>

            <div className="pt-4">
               <button 
                 onClick={() => setIsFollowUpModalOpen(true)}
                 className="w-full py-4 bg-white text-[#003459] border-2 border-[#003459] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
               >
                  <Calendar size={16} /> Agendar Follow-up
               </button>
            </div>
          </div>
        )}
      </Modal>

      <FollowUpModal 
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        targetName={selectedCustomer?.name || ''}
        targetPhone={selectedCustomer?.phone}
      />

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Clientes de CSV">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-900 uppercase mb-1 block px-1">Tipo de Cliente</label>
            <select 
              value={importType}
              onChange={(e) => setImportType(e.target.value as 'sky' | 'million')}
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none"
            >
              <option value="sky">Clientes SKY</option>
              <option value="million">Clientes Million</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-900 uppercase mb-1 block px-1">Arquivo CSV</label>
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => e.target.files && handleImport(e.target.files[0])}
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="pt-4">
            <h3 className="text-sm font-black text-slate-900">Instruções para a Tabela de Importação</h3>
            <p className="text-xs text-slate-600 mt-2">O seu arquivo CSV deve ter as seguintes colunas, exatamente nesta ordem e com estes nomes no cabeçalho:</p>
            <ul className="list-disc list-inside text-xs text-slate-600 mt-2 space-y-1">
              <li><span className="font-bold">nome</span>: O nome completo do cliente.</li>
              <li><span className="font-bold">whatsapp</span>: O número de telefone do cliente.</li>
              <li><span className="font-bold">cidade</span>: A cidade onde o cliente reside.</li>
              <li><span className="font-bold">produtos</span>: Os produtos de interesse do cliente (opcional).</li>
            </ul>
            <p className="text-xs text-slate-500 mt-4">A primeira linha do arquivo deve ser o cabeçalho com os nomes das colunas. Certifique-se de que o arquivo está salvo no formato CSV (separado por vírgulas).</p>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Cliente">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-black text-slate-900 uppercase mb-1 block px-1">Nome Completo</label>
            <input required className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-1 block px-1">WhatsApp</label>
              <input required className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-1 block px-1">Cidade</label>
              <input required className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-900 outline-none" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase tracking-widest shadow-xl">Salvar Cliente</button>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;