import React, { useState, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { 
  Plus, 
  Package, 
  DollarSign, 
  Tag, 
  Search, 
  Percent, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  ArrowRight,
  TrendingUp,
  Trash2
} from 'lucide-react';
import Modal from '../components/Modal';
import { parseCatalogImage, parseProductText } from '../services/geminiService';

const Products: React.FC = () => {
  const { products, addProduct, removeProduct } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [scanning, setScanning] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Utensílios',
    price: '',
    margin: '30',
    cost: ''
  });

  const handleScanClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const items = await parseCatalogImage(base64);
      setScannedItems(items.map(it => ({ ...it, cost: it.cost || it.price * 0.7, selected: true })));
      setScanning(false);
      setIsAiModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessBulkText = async () => {
    if (!bulkText.trim()) return;
    setScanning(true);
    const items = await parseProductText(bulkText);
    setScannedItems(items.map(it => ({ ...it, selected: true })));
    setScanning(false);
    setIsBulkModalOpen(false);
    setIsAiModalOpen(true);
  };

  const handleBulkImport = async () => {
    const itemsToImport = scannedItems.filter(it => it.selected);
    for (const item of itemsToImport) {
      const cost = Number(item.cost) || 0;
      const price = Number(item.price) || 0;
      const margin = price > 0 ? ((price - cost) / price) * 100 : 30;

      await addProduct({
        name: item.name,
        sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        category: item.category || 'Geral',
        price: price,
        cost: cost,
        margin: Math.round(margin)
      });
    }
    setIsAiModalOpen(false);
    setScannedItems([]);
    setBulkText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(formData.price);
    const cost = Number(formData.cost) || (price * (1 - Number(formData.margin)/100));
    const margin = price > 0 ? ((price - cost) / price) * 100 : Number(formData.margin);

    addProduct({
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      price: price,
      cost: cost,
      margin: Math.round(margin)
    });
    setIsModalOpen(false);
    setFormData({ name: '', sku: '', category: 'Utensílios', price: '', margin: '30', cost: '' });
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">Catálogo Premium</h1>
          <p className="text-slate-900 font-bold">Gestão de SKUs, custos operacionais e margens.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-white text-[#003459] border-2 border-slate-200 px-5 py-3 rounded-2xl font-black shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-xs uppercase tracking-tight"
          >
            <FileSpreadsheet size={18} />
            Colar Planilha
          </button>
          <button 
            onClick={handleScanClick}
            disabled={scanning}
            className="bg-white text-[#003459] border-2 border-slate-200 px-5 py-3 rounded-2xl font-black shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-xs uppercase tracking-tight"
          >
            {scanning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Lendo Catálogo...</span>
              </>
            ) : (
              <>
                <Camera size={18} />
                <span>Escanear PDF</span>
              </>
            )}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#003459] text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center gap-2 text-xs uppercase tracking-tight"
          >
            <Plus size={20} />
            Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => {
          const profit = product.price - product.cost;
          return (
            <div key={product.id} className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="aspect-video bg-slate-50 relative overflow-hidden border-b-2 border-slate-100">
                <img 
                  src={product.image || `https://picsum.photos/seed/${product.id}/400/225`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={product.name}
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm(`Deseja remover ${product.name} do catálogo?`)) removeProduct(product.id);
                    }}
                    className="bg-white/90 p-1.5 rounded-lg text-red-500 shadow-md hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className="bg-[#003459] px-3 py-1 rounded-lg text-[8px] font-black text-white shadow-lg uppercase tracking-widest">
                    {product.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-1">{product.name}</h3>
                  <p className="text-[9px] text-[#00A8E8] font-black uppercase tracking-widest mt-1">SKU: {product.sku}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                  <div>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Preço Venda</p>
                    <p className="text-md font-black text-[#003459]">R$ {product.price.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Custo Un.</p>
                    <p className="text-md font-bold text-slate-600">R$ {product.cost?.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Lucro: R$ {profit.toLocaleString('pt-BR')}</span>
                   </div>
                   <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[9px] font-black border border-green-100">
                     {product.margin}% MKP
                   </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Colar Texto do Excel */}
      <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Importar da Planilha">
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Copie as linhas do seu Excel e cole abaixo:</p>
          <textarea 
            className="w-full h-64 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-mono text-xs outline-none focus:border-[#003459]"
            placeholder="CÓDIGO | NOME | CUSTO | PREÇO..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <button 
            onClick={handleProcessBulkText}
            disabled={scanning || !bulkText.trim()}
            className="w-full py-4 bg-[#003459] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Extraindo Dados...</span>
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                <span>Processar com IA</span>
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Review de Importação (IA) */}
      <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Confirmar Importação">
        <div className="space-y-5">
          <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {scannedItems.map((item, idx) => {
              const margin = item.price > 0 ? Math.round(((item.price - item.cost) / item.price) * 100) : 0;
              return (
                <div key={idx} className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 ${item.selected ? 'bg-blue-50 border-[#00A8E8]' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={item.selected} onChange={() => {
                      const newItems = [...scannedItems];
                      newItems[idx].selected = !newItems[idx].selected;
                      setScannedItems(newItems);
                    }} className="w-5 h-5 accent-[#00A8E8]" />
                    <div className="flex-1">
                      <p className="text-[11px] font-black text-[#003459] truncate uppercase">{item.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">SKU: {item.sku || 'PENDENTE'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-white/50 p-2 rounded-xl border border-blue-100">
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Custo</p>
                      <p className="text-[10px] font-black">R$ {item.cost?.toFixed(2)}</p>
                    </div>
                    <div className="text-center border-x border-blue-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Venda</p>
                      <p className="text-[10px] font-black">R$ {item.price?.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Margem</p>
                      <p className={`text-[10px] font-black ${margin < 20 ? 'text-red-500' : 'text-green-600'}`}>{margin}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button 
            onClick={handleBulkImport}
            className="w-full py-5 bg-[#00A8E8] text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} /> Importar {scannedItems.filter(i=>i.selected).length} Itens
          </button>
        </div>
      </Modal>

      {/* Novo Item Manual */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar SKU">
        <form onSubmit={handleSubmit} className="space-y-6">
          <input required className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black" placeholder="Nome Comercial" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input required className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black" placeholder="Código SKU" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
            <select className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="Utensílios">Utensílios</option>
              <option value="Panelas">Panelas</option>
              <option value="Eletro">Eletrodomésticos</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Custo (R$)</label>
              <input type="number" step="0.01" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Preço Venda (R$)</label>
              <input type="number" required step="0.01" className="w-full p-4 bg-white border-2 border-[#00A8E8]/30 rounded-2xl font-black" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-[#003459] text-white rounded-3xl font-black uppercase tracking-widest text-xs">Salvar no Catálogo</button>
        </form>
      </Modal>
    </div>
  );
};

export default Products;