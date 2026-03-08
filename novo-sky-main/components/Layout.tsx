import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { APP_VERSION } from '../constants';
import { 
  LayoutDashboard, 
  Trello, 
  Users, 
  Calendar, 
  UserPlus, 
  Package, 
  ShoppingCart, 
  Calculator, 
  Camera, 
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Star,
  Gift,
  Boxes,
  Save,
  CheckCircle2,
  User,
  Cloud,
  CloudOff,
  Smartphone
} from 'lucide-react';
import Modal from './Modal';
import SyncStatus from './SyncStatus';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NavItem: React.FC<{ 
  id: string; 
  label: string; 
  icon: React.ReactNode; 
  active: boolean; 
  onClick: () => void 
}> = ({ id, label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-[#003459] text-white shadow-lg' 
        : 'text-slate-900 hover:bg-slate-100 font-bold'
    }`}
  >
    {icon}
    <span className="font-black text-xs uppercase tracking-tight">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { saveProgress, leads, inventory, userProfile, isCloudActive, saving, lastSaved, appointments, lastSyncError, testCloudConnection, pendingCount } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'pipeline', label: 'Pipeline de Vendas', icon: <Trello size={20} /> },
    { id: 'customer-pipeline-million', label: 'Cliente Million', icon: <Trello size={20} /> },
    { id: 'customer-pipeline-sky', label: 'Cliente SKY', icon: <Trello size={20} /> },
    { id: 'customer-pipeline-dign', label: 'Cliente DIGN', icon: <Trello size={20} /> },
    { id: 'referral414', label: 'Programa 4/14', icon: <Gift size={20} /> },
    { id: 'inventory', label: 'Almoxarifado', icon: <Boxes size={20} /> },
    { id: 'customers', label: 'Clientes', icon: <Users size={20} /> },
    { id: 'calendar', label: 'Agenda', icon: <Calendar size={20} /> },
    { id: 'team', label: 'Equipe', icon: <UserPlus size={20} /> },
    { id: 'products', label: 'Produtos', icon: <Package size={20} /> },
    { id: 'orders', label: 'Pedidos', icon: <ShoppingCart size={20} /> },
    { id: 'calculators', label: 'Calculadoras', icon: <Calculator size={20} /> },
    { id: 'marketing', label: 'Marketing IA', icon: <Camera size={20} /> },
    { id: 'records', label: 'Registros', icon: <Save size={20} /> },
    { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> },
  ];

  const lowStockCount = inventory.filter(item => item.quantity <= item.minQuantity).length;

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#00A8E8] rounded-xl flex items-center justify-center text-white shadow-lg">
               <Star size={20} className="fill-current" />
             </div>
             <div>
               <h1 className="text-xl font-black text-[#003459] leading-none">SKY</h1>
               <p className="text-[10px] font-black text-[#00A8E8] uppercase tracking-widest">Manager v{APP_VERSION}</p>
             </div>
          </div>
          <button className="lg:hidden text-slate-900" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <NavItem key={item.id} {...item} active={activeTab === item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button onClick={saveProgress} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-50 text-[#003459] hover:bg-blue-100 transition-colors font-black uppercase text-[10px] tracking-widest border-2 border-blue-200">
            <Save size={16} /> Salvar e Sincronizar
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-700 hover:bg-red-50 transition-colors font-black uppercase text-[10px] tracking-widest">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setSidebarOpen(true)}><Menu size={24} className="text-[#003459]" /></button>
            <h2 className="text-sm lg:text-lg font-black text-[#003459] uppercase tracking-tight truncate max-w-[120px] lg:max-w-none">
              {menuItems.find(m => m.id === activeTab)?.label}
              <span className="ml-2 text-[10px] opacity-30 font-bold">v{APP_VERSION}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Status de Sincronização Robusto */}
            <div className="hidden md:block">
              <SyncStatus />
            </div>

            <button 
              onClick={() => setNotifOpen(true)} 
              className="p-2 text-slate-900 hover:bg-slate-100 rounded-full relative transition-colors"
            >
              <Bell size={22} />
              {(leads.length > 0 || lowStockCount > 0 || appointments.some(a => !a.completed)) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>
              )}
            </button>

            <div className="flex items-center gap-2 lg:gap-3 pl-2 border-l border-slate-100">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-[#003459] text-white flex items-center justify-center font-black shadow-md overflow-hidden border-2 border-slate-100">
                {userProfile.image ? (
                  <img src={userProfile.image} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      <Modal isOpen={notifOpen} onClose={() => setNotifOpen(false)} title="Central de Notificações">
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border-2 flex gap-4 ${isCloudActive ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCloudActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {isCloudActive ? <Cloud size={20} /> : <CloudOff size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">{isCloudActive ? 'Conectado à Nuvem' : 'ERRO DE SINCRONIZAÇÃO'}</p>
              {pendingCount > 0 && (
                <div className="mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold inline-flex items-center gap-2">
                  {pendingCount} itens aguardando envio
                  <button onClick={saveProgress} className="text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-md hover:bg-amber-600">Sincronizar</button>
                </div>
              )}
              <p className="text-xs font-bold text-slate-600 mt-1">
                {isCloudActive 
                  ? (pendingCount > 0 
                      ? 'Você tem dados salvos localmente que ainda não subiram para a nuvem.' 
                      : 'Todos os seus dados estão sincronizados entre seus dispositivos.')
                  : 'O sistema não conseguiu conectar ao banco de dados Supabase. Verifique se você configurou as variáveis de ambiente no painel da Vercel.'}
              </p>
              {!isCloudActive && (
                <div className="mt-3 p-3 bg-white/50 rounded-xl border border-red-200 space-y-2">
                  <p className="text-[10px] font-black text-red-800 uppercase">Checklist de Solução:</p>
                  <ul className="text-[9px] font-bold text-slate-700 list-disc pl-4 space-y-1">
                    <li>Verifique se SUPABASE_URL está correta</li>
                    <li>Verifique se SUPABASE_ANON_KEY está correta</li>
                    <li>Certifique-se de que fez o Deploy no Vercel após configurar as chaves</li>
                    <li>Tente atualizar a página (F5)</li>
                  </ul>
                </div>
              )}
              {lastSyncError && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg text-[10px] font-bold text-red-700 break-all">
                  Erro Técnico: {lastSyncError}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-[9px] font-black text-slate-400 uppercase">Versão: {APP_VERSION}</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => testCloudConnection()}
                    className="text-[9px] font-black text-green-600 uppercase hover:underline"
                  >
                    Testar Conexão
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-[9px] font-black text-[#00A8E8] uppercase hover:underline"
                  >
                    Recarregar App
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {lowStockCount > 0 && (
            <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Boxes size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-red-900">Alerta de Estoque</p>
                <p className="text-xs font-bold text-slate-900 mt-1">Existem {lowStockCount} itens com estoque crítico no almoxarifado.</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Layout;