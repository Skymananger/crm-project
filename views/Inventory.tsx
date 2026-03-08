
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Boxes, Plus, AlertTriangle, History, Search, ArrowRightLeft } from 'lucide-react';
import Modal from '../components/Modal';
import { getLocalDateString } from '../constants';

const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventory } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Uniformes',
    quantity: '',
    minQuantity: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInventoryItem({
      name: formData.name,
      category: formData.category,
      quantity: Number(formData.quantity),
      minQuantity: Number(formData.minQuantity)
    });
    setIsModalOpen(false);
    setFormData({ name: '', category: 'Uniformes', quantity: '', minQuantity: '' });
  };

  const adjustStock = (id: string, amount: number) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      updateInventory({ ...item, quantity: Math.max(0, item.quantity + amount) });
    }
  };

  const filteredItems = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">Almoxarifado Interno</h1>
          <p className="text-slate-900 font-bold">Controle rigoroso de materiais de apoio, uniformes e brindes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#00A8E8] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-[#00A8E8]/30 hover:bg-[#0081B3] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Cadastrar Insumo
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900" size={20} />
          <input 
            type="text" 
            placeholder="Localizar item no estoque..." 
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-[#003459] font-black text-slate-900 placeholder:text-slate-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map(item => {
          const isLowStock = item.quantity <= item.minQuantity;
          return (
            <div key={item.id} className={`bg-white p-6 rounded-[2.5rem] border-2 shadow-sm space-y-4 hover:shadow-xl transition-all ${isLowStock ? 'border-red-500 bg-red-50/10' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl shadow-sm ${isLowStock ? 'bg-red-500 text-white' : 'bg-[#003459] text-white'}`}>
                  <Boxes size={24} />
                </div>
                {isLowStock && (
                  <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-200">
                    <AlertTriangle size={12} /> Crítico
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-black text-slate-900 text-lg line-clamp-1">{item.name}</h3>
                <p className="text-[10px] font-black text-[#00A8E8] uppercase tracking-[0.2em] mt-1">{item.category}</p>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Disponível</p>
                  <p className={`text-3xl font-black ${isLowStock ? 'text-red-600' : 'text-[#003459]'}`}>
                    {item.quantity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => adjustStock(item.id, -1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-900 hover:bg-slate-200 border-2 border-slate-200 shadow-sm"
                  >
                    -
                  </button>
                  <button 
                    onClick={() => adjustStock(item.id, 1)}
                    className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black hover:bg-black border-2 border-slate-900 shadow-md"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-50 flex justify-between items-center text-slate-900">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-60">
                  <History size={12} /> {new Date(item.lastUpdated).toLocaleDateString()}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Mín: {item.minQuantity}</span>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-900 opacity-40">
            <Boxes size={56} className="mb-4" />
            <p className="font-black uppercase text-xs tracking-[0.3em]">Almoxarifado Vazio</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Item de Almoxarifado">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Nome do Material / Insumo</label>
            <input 
              required
              className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-slate-900 placeholder:text-slate-400 shadow-sm"
              placeholder="Ex: Camiseta Uniforme G"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Categoria de Controle</label>
              <select 
                className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-slate-900 shadow-sm"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="Uniformes">Uniformes</option>
                <option value="Brindes">Brindes Parceiros</option>
                <option value="Escritório">Material Escritório</option>
                <option value="Demonstração">Kits Demonstração</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Saldo Inicial</label>
              <input 
                type="number"
                required
                className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] font-black text-slate-900 outline-none shadow-sm"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Ponto de Ressuprimento (Mínimo)</label>
            <input 
              type="number"
              required
              className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] font-black text-slate-900 outline-none shadow-sm"
              value={formData.minQuantity}
              onChange={e => setFormData({...formData, minQuantity: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full py-5 bg-[#00A8E8] text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-[#0081B3] transition-all">
            Salvar no Inventário
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
