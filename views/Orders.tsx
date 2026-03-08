import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { ShoppingCart, Clock, CheckCircle2, XCircle, Search, Plus, Trash2, CreditCard, UserCheck, User, UserPlus, Users, MapPin, Phone, Calendar, Edit3 } from 'lucide-react';
import Modal from '../components/Modal';
import { getLocalDateString } from '../constants';

const Orders: React.FC = () => {
  const { orders, customers, leads, products, team, createOrder, addCustomer, removeOrder, updateOrder, setActiveTab, setSelectedCustomerId } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerId: '',
    salespersonId: '',
    isProspect: false,
    newName: '',
    newPhone: '',
    newCity: '',
    items: [] as { productId: string, quantity: number, priceAtSale: number }[],
    installments: 1,
    downPayment: 0,
    date: getLocalDateString(),
    orderType: 'new' as 'new' | 'addon' | 'history'
  });

  const getDisplayName = (id: string) => {
    const cust = customers.find(c => c.id === id);
    if (cust) return cust.name;
    const lead = leads.find(l => l.id === id);
    if (lead) return `(Lead) ${lead.prospectName}`;
    return 'Desconhecido';
  };

  const getSalespersonName = (id?: string) => {
    if (!id) return 'Admin / Direto';
    const member = team.find(m => m.id === id);
    return member ? member.name : 'Admin / Direto';
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, priceAtSale: 0 }]
    }));
  };

  const removeItem = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...formData.items];
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      newItems[idx] = { ...newItems[idx], productId: value, priceAtSale: prod?.price || 0 };
    } else {
      newItems[idx] = { ...newItems[idx], [field]: value };
    }
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({ 
      customerId: '', 
      salespersonId: '', 
      isProspect: false, 
      newName: '', 
      newPhone: '', 
      newCity: '', 
      items: [], 
      installments: 1, 
      downPayment: 0,
      date: getLocalDateString(),
      orderType: 'new'
    });
    setIsNewCustomer(false);
    setEditingOrderId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (order: any) => {
    setEditingOrderId(order.id);
    setFormData({
      customerId: order.customerId,
      salespersonId: order.salespersonId || '',
      isProspect: false,
      newName: '',
      newPhone: '',
      newCity: '',
      items: order.items || [],
      installments: order.installments || 1,
      downPayment: order.downPayment || 0,
      date: order.date,
      orderType: order.orderType || 'new'
    });
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalCustomerId = formData.customerId;

      if (isNewCustomer) {
        if (!formData.newName || !formData.newPhone) {
          alert("Preencha os dados básicos do novo cliente.");
          return;
        }
        const newId = await addCustomer({
          name: formData.newName,
          phone: formData.newPhone,
          city: formData.newCity,
          notes: 'Cadastrado durante lançamento retroativo'
        });
        if (newId) finalCustomerId = newId as string;
      } else if (formData.isProspect) {
        const lead = leads.find(l => l.id === formData.customerId);
        if (lead) {
          const newId = await addCustomer({
            name: lead.prospectName || 'Novo Cliente',
            phone: lead.prospectPhone || '',
            city: lead.prospectCity || '',
            notes: 'Convertido via Lançamento de Pedido'
          });
          if (newId) finalCustomerId = newId as string;
        }
      }

      if (!finalCustomerId) {
        alert("Erro ao identificar ou criar cliente.");
        return;
      }

      const total = formData.items.length > 0 
        ? formData.items.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0)
        : 0;

      if (editingOrderId) {
        await updateOrder({
          id: editingOrderId,
          customerId: finalCustomerId,
          salespersonId: formData.salespersonId || undefined,
          items: formData.items,
          total,
          date: formData.date,
          status: 'completed',
          installments: formData.installments,
          downPayment: Number(formData.downPayment),
          orderType: formData.orderType
        });
      } else {
        await createOrder({
          customerId: finalCustomerId,
          salespersonId: formData.salespersonId || undefined,
          items: formData.items,
          total,
          date: formData.date,
          status: 'completed',
          installments: formData.installments,
          downPayment: Number(formData.downPayment),
          orderType: formData.orderType
        });
      }
      
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o pedido.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black">Faturamento e Pedidos</h1>
          <p className="text-black font-semibold">Lance vendas novas ou retroativas para o histórico.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#003459] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Lançar Pedido
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-200">
              <th className="px-6 py-5 text-xs font-black text-black uppercase">Data</th>
              <th className="px-6 py-5 text-xs font-black text-black uppercase">Cliente</th>
              <th className="px-6 py-5 text-xs font-black text-black uppercase">Tipo</th>
              <th className="px-6 py-5 text-xs font-black text-black uppercase">Valor</th>
              <th className="px-6 py-5 text-xs font-black text-black uppercase">Status</th>
              <th className="px-6 py-5 text-xs font-black text-black uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
              <tr 
                key={order.id} 
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  setSelectedCustomerId(order.customerId);
                  setActiveTab('customers');
                }}
              >
                <td className="px-6 py-5 font-bold text-black">{new Date(order.date).toLocaleDateString()}</td>
                <td className="px-6 py-5 font-black text-black">
                  <span className="hover:text-[#00A8E8] transition-colors">
                    {getDisplayName(order.customerId)}
                  </span>
                </td>
                <td className="px-6 py-5">
                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${order.orderType === 'history' ? 'bg-slate-100 text-slate-600' : order.orderType === 'addon' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {order.orderType === 'history' ? 'Histórico' : order.orderType === 'addon' ? 'Add-on' : 'Nova Venda'}
                   </span>
                </td>
                <td className="px-6 py-5 font-black text-[#00A8E8]">R$ {order.total.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-5">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-[10px] font-black uppercase">Concluído</span>
                </td>
                <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditClick(order)}
                      className="p-2 text-slate-300 hover:text-[#00A8E8] transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm("Deseja remover este pedido?")) removeOrder(order.id);
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingOrderId ? "Editar Lançamento" : "Novo Lançamento"}>
        <form onSubmit={handleSaveOrder} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-slate-100 p-2 rounded-[2rem] border-2 border-slate-200">
             <button type="button" onClick={() => setIsNewCustomer(false)} className={`py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${!isNewCustomer ? 'bg-[#003459] text-white shadow-md' : 'text-slate-500'}`}>Cliente Existente</button>
             <button type="button" onClick={() => setIsNewCustomer(true)} className={`py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${isNewCustomer ? 'bg-[#00A8E8] text-white shadow-md' : 'text-slate-500'}`}>Novo Cliente</button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Data da Venda</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" required className="w-full p-3 pl-9 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Natureza do Lançamento</label>
                  <select className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm" value={formData.orderType} onChange={e => setFormData({...formData, orderType: e.target.value as any})}>
                    <option value="new">Nova Venda (Funil)</option>
                    <option value="addon">Recompra / Add-on</option>
                    <option value="history">Histórico (Retroativo)</option>
                  </select>
               </div>
            </div>

            {!isNewCustomer ? (
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 px-1">Vincular a:</label>
                <select required className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl font-black text-black" value={formData.customerId} onChange={e => {
                  const isLead = leads.some(l => l.id === e.target.value);
                  setFormData({...formData, customerId: e.target.value, isProspect: isLead});
                }}>
                  <option value="">Pesquisar na base...</option>
                  <optgroup label="Clientes">
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Leads">
                    {leads.map(l => <option key={l.id} value={l.id}>{l.prospectName}</option>)}
                  </optgroup>
                </select>
              </div>
            ) : (
              <div className="bg-blue-50/50 p-5 rounded-3xl border-2 border-blue-100 space-y-4">
                <input required={isNewCustomer} className="w-full p-3 bg-white rounded-xl border-2 border-blue-200 font-bold text-sm" placeholder="Nome Completo" value={formData.newName} onChange={e => setFormData({...formData, newName: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                   <input required={isNewCustomer} className="w-full p-3 bg-white rounded-xl border-2 border-blue-200 font-bold text-sm" placeholder="WhatsApp" value={formData.newPhone} onChange={e => setFormData({...formData, newPhone: e.target.value})} />
                   <input className="w-full p-3 bg-white rounded-xl border-2 border-blue-200 font-bold text-sm" placeholder="Cidade" value={formData.newCity} onChange={e => setFormData({...formData, newCity: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t-2 border-slate-100">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produtos / Faturamento</span>
                <button type="button" onClick={addItem} className="text-[10px] font-black text-[#00A8E8] uppercase tracking-tighter bg-blue-50 px-3 py-1 rounded-lg">+ Adicionar Item</button>
             </div>
             {formData.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <select required className="flex-1 p-2 bg-white rounded-lg text-xs font-bold" value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}>
                    <option value="">Produto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" min="1" className="w-16 p-2 bg-white rounded-lg text-xs font-bold text-center" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                  <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                </div>
             ))}
          </div>

          <button type="submit" className="w-full py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-[#00A8E8]/30">Confirmar Lançamento</button>
        </form>
      </Modal>
    </div>
  );
};

export default Orders;