import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Settings as SettingsIcon, Save, Download, Shield, Palette, CreditCard, Percent, AlertTriangle, Upload, User, Camera, ShieldCheck, FileJson, Trash2, MapPin, RefreshCw, ArrowLeft, ArrowRight, Edit3, X, Zap } from 'lucide-react';
import { getLocalDateString } from '../constants';
import SafetyConfirmationModal from '../components/SafetyConfirmationModal';

const Settings: React.FC = () => {
  const { machineFees, updateMachineFees, resetApp, importBackup, userProfile, updateUserProfile, customers, leads, orders, googleMapsApiKey, setGoogleMapsApiKey, pipelineOrder, updatePipelineOrder, renamePipelineStage, fetchInitialData, isCloudActive, registerBiometrics, saveProgress, fixPipelineLeads, moveLeadsBetweenPipelines, clearPipelineLeads, millionPipelineOrder, skyPipelineOrder, dignPipelineOrder } = useApp();
  const [tempFees, setTempFees] = useState<number[]>(machineFees || [1.99, 1.99, 1.99, 1.99, 1.99, 1.99]);
  const [profileName, setProfileName] = useState(userProfile.name);
  const [revenueMeta, setRevenueMeta] = useState(userProfile.monthlyRevenueMeta || 0);
  const [visitsMeta, setVisitsMeta] = useState(userProfile.monthlyVisitsMeta || 0);
  const [mapsKey, setMapsKey] = useState(googleMapsApiKey || '');
  
  const [activePipelineTab, setActivePipelineTab] = useState<'new' | 'million' | 'sky' | 'dign'>('new');
  const activeOrder = {
    new: pipelineOrder,
    million: millionPipelineOrder,
    sky: skyPipelineOrder,
    dign: dignPipelineOrder
  }[activePipelineTab];

  const [tempPipelineOrder, setTempPipelineOrder] = useState<string[]>(activeOrder || []);
  const [newStageName, setNewStageName] = useState('');
  const [editingStage, setEditingStage] = useState<{oldName: string, newName: string} | null>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('sky_backup_history') || '[]');
      setLocalHistory(history);
    } catch (e) {
      console.error("Erro ao carregar histórico local:", e);
    }
  }, []);

  const [safetyModal, setSafetyModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmationWord: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmationWord: '',
    onConfirm: () => {}
  });

  const openSafetyModal = (title: string, message: string, word: string, action: () => void) => {
    setSafetyModal({
      isOpen: true,
      title,
      message,
      confirmationWord: word,
      onConfirm: action
    });
  };

  useEffect(() => {
    if (activeOrder) setTempPipelineOrder(activeOrder);
    else setTempPipelineOrder([]);
  }, [activePipelineTab, activeOrder]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const handleManualSync = async () => {
    if (!isCloudActive) {
      alert("Nuvem não conectada. Verifique se você está logado.");
      return;
    }
    saveProgress();
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tempPipelineOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setTempPipelineOrder(newOrder);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    if (tempPipelineOrder.includes(newStageName.trim())) {
      alert("Esta etapa já existe!");
      return;
    }
    setTempPipelineOrder([...tempPipelineOrder, newStageName.trim()]);
    setNewStageName('');
  };

  const handleRemoveStage = (stage: string) => {
    if (confirm(`Deseja remover a etapa "${stage}"?`)) {
      setTempPipelineOrder(tempPipelineOrder.filter(s => s !== stage));
    }
  };

  const savePipelineOrder = () => {
    if (!tempPipelineOrder || tempPipelineOrder.length === 0) return;
    updatePipelineOrder(tempPipelineOrder as any, activePipelineTab);
    alert(`Ordem do pipeline ${activePipelineTab.toUpperCase()} atualizada!`);
  };

  const handleRenameStage = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName || tempPipelineOrder.includes(newName)) return;
    
    const updatedOrder = tempPipelineOrder.map(s => s === oldName ? newName : s);
    setTempPipelineOrder(updatedOrder);
    await renamePipelineStage(oldName, newName, activePipelineTab);
    setEditingStage(null);
  };

  const handleBackup = () => {
    const data: Record<string, string | null> = {};
    const keys = [
      'sky_customers', 'sky_leads', 'sky_products', 'sky_orders', 
      'sky_team', 'sky_settings_fees', 'sky_programs_414', 
      'sky_inventory', 'sky_pipeline_order', 'sky_user_profile',
      'sky_appointments'
    ];
    keys.forEach(k => {
      data[k] = localStorage.getItem(k);
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sky_manager_backup_${getLocalDateString()}.json`;
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importBackup(content);
    };
    reader.readAsText(file);
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateUserProfile({ ...userProfile, image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleFeeChange = (index: number, value: string) => {
    const newFees = [...tempFees];
    newFees[index] = Number(value);
    setTempFees(newFees);
  };

  const saveFees = () => {
    updateMachineFees(tempFees);
    alert("Taxas atualizadas com sucesso!");
  };

  const saveProfileName = () => {
    updateUserProfile({ 
      ...userProfile, 
      name: profileName,
      monthlyRevenueMeta: revenueMeta,
      monthlyVisitsMeta: visitsMeta
    });
    alert("Perfil e metas atualizados!");
  };

  const saveMapsKey = () => {
    setGoogleMapsApiKey(mapsKey);
    alert("Chave do Google Maps salva! Recarregue a página para ativar o preenchimento automático.");
    window.location.reload();
  };

  const confirmReset = () => {
    openSafetyModal(
      "Reset Total do Sistema",
      "Isso apagará TODOS os dados permanentemente (Clientes, Leads, Pedidos, etc.) em conformidade com a LGPD. Esta ação não pode ser desfeita.",
      "APAGAR TUDO",
      resetApp
    );
  };

  const confirmClearPipeline = (type: 'million' | 'sky' | 'dign') => {
    const names = { million: 'Million', sky: 'Sky', dign: 'Dignity' };
    openSafetyModal(
      `Limpar Pipeline ${names[type]}`,
      `Isso excluirá permanentemente todos os leads do pipeline ${names[type]}. Os dados de outros pipelines serão mantidos.`,
      "LIMPAR",
      () => clearPipelineLeads(type)
    );
  };

  const restoreFromHistory = (index: number) => {
    const backup = localHistory[index];
    if (!backup) return;
    
    openSafetyModal(
      "Restaurar Ponto de Histórico",
      `Isso substituirá seus dados atuais pela versão salva em ${new Date(backup.timestamp).toLocaleString()}. Deseja continuar?`,
      "RESTAURAR",
      () => {
        Object.keys(backup).forEach(key => {
          if (key !== 'timestamp' && backup[key]) {
            localStorage.setItem(key, backup[key]);
          }
        });
        alert("Dados restaurados! O sistema irá reiniciar.");
        window.location.reload();
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 text-black">
      <div>
        <h1 className="text-2xl font-black text-[#003459]">Configurações e Ajustes</h1>
        <p className="text-slate-900 font-bold">Personalize taxas, identidade, seu perfil e segurança da distribuidora.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* SEÇÃO DE PERFIL */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#003459] mb-6 flex items-center gap-2 uppercase tracking-tight">
              <User size={22} className="text-[#00A8E8]" />
              Perfil do Administrador
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group cursor-pointer" onClick={() => profileImageInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-[2rem] bg-slate-100 border-4 border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                  {userProfile.image ? (
                    <img src={userProfile.image} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-slate-400" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <Camera size={24} className="text-white" />
                </div>
                <input 
                  type="file" 
                  ref={profileImageInputRef} 
                  onChange={handleProfileImageUpload} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                />
              </div>

              <div className="flex-1 w-full space-y-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Seu Nome de Exibição</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-black" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Meta Faturamento (R$)</label>
                        <input 
                          type="number" 
                          className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-black" 
                          value={revenueMeta}
                          onChange={(e) => setRevenueMeta(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Meta Visitas (Mês)</label>
                        <input 
                          type="number" 
                          className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-black" 
                          value={visitsMeta}
                          onChange={(e) => setVisitsMeta(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={saveProfileName}
                      className="w-full py-4 bg-[#00A8E8] text-white rounded-2xl font-black text-xs uppercase hover:bg-[#0081B3] shadow-md"
                    >
                      Salvar Alterações de Perfil
                    </button>
                  </div>
                <p className="text-[10px] text-slate-500 font-bold px-1 italic">Clique na imagem para alterar sua foto ou anexo comercial.</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO GOOGLE MAPS */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#003459] mb-6 flex items-center gap-2 uppercase tracking-tight">
              <MapPin size={22} className="text-[#00A8E8]" />
              Integração Google Maps
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase mb-2 block px-1">Google Maps API Key (Places API)</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder="Cole sua chave aqui..."
                    className="flex-1 p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-black" 
                    value={mapsKey}
                    onChange={(e) => setMapsKey(e.target.value)}
                  />
                  <button 
                    onClick={saveMapsKey}
                    className="px-6 bg-[#003459] text-white rounded-2xl font-black text-xs uppercase hover:bg-black"
                  >
                    Ativar
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-bold px-1">
                Necessário para sugestões de endereço automáticas no Pipeline e Agenda.
              </p>
            </div>
          </div>

          {/* SEÇÃO GOOGLE OAUTH */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#003459] mb-6 flex items-center gap-2 uppercase tracking-tight">
              <RefreshCw size={22} className="text-[#00A8E8]" />
              Configuração Google Agenda
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-black text-[#003459] mb-2 uppercase">Instruções de Configuração:</p>
                <ol className="text-[10px] text-slate-600 font-bold space-y-2 list-decimal ml-4">
                  <li>Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-[#00A8E8] underline">Google Cloud Console</a>.</li>
                  <li>Crie uma credencial de <b>ID do cliente OAuth 2.0</b> (Tipo: Aplicativo Web).</li>
                  <li>Adicione este URL em <b>Origens JavaScript autorizadas</b>:
                    <code className="block mt-1 p-2 bg-white border rounded text-[#003459] select-all">https://ais-dev-hvk75n4zfibfxwwtb3hmhp-29029123394.us-west2.run.app</code>
                  </li>
                  <li>Adicione este URL em <b>URIs de redirecionamento autorizados</b>:
                    <code className="block mt-1 p-2 bg-white border rounded text-[#003459] select-all">https://ais-dev-hvk75n4zfibfxwwtb3hmhp-29029123394.us-west2.run.app/auth/google/callback</code>
                  </li>
                  <li>Configure as variáveis de ambiente <b>GOOGLE_CLIENT_ID</b> e <b>GOOGLE_CLIENT_SECRET</b> no AI Studio.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* SEÇÃO PIPELINE */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-black text-[#003459] flex items-center gap-2 uppercase tracking-tight">
                  <Palette size={22} className="text-[#00A8E8]" />
                  Personalizar Pipelines
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Selecione o pipeline para editar as etapas</p>
              </div>
              <button 
                onClick={savePipelineOrder}
                className="flex items-center gap-2 bg-[#00A8E8] text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-[#0081B3] transition-all shadow-md"
              >
                <Save size={16} /> Salvar {activePipelineTab.toUpperCase()}
              </button>
            </div>

            <div className="flex gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl">
              {(['new', 'million', 'sky', 'dign'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActivePipelineTab(tab)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activePipelineTab === tab 
                    ? 'bg-white text-[#003459] shadow-sm' 
                    : 'text-slate-500 hover:bg-white/50'
                  }`}
                >
                  {tab === 'new' ? 'Prospecção' : tab === 'million' ? 'Million' : tab === 'sky' ? 'Sky' : 'Dignity'}
                </button>
              ))}
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl mb-6">
              <p className="text-[10px] font-black text-amber-800 uppercase mb-2">Manutenção de Dados:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                  onClick={() => fixPipelineLeads()}
                  className="py-3 bg-white text-amber-700 border-2 border-amber-200 rounded-xl font-black text-[10px] uppercase hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Corrigir Atribuição
                </button>
                <button 
                  onClick={() => moveLeadsBetweenPipelines('million', 'dign')}
                  className="py-3 bg-white text-purple-700 border-2 border-purple-200 rounded-xl font-black text-[10px] uppercase hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight size={14} /> Million → Dignity
                </button>
                <button 
                  onClick={() => moveLeadsBetweenPipelines('million', 'sky')}
                  className="py-3 bg-white text-blue-700 border-2 border-blue-200 rounded-xl font-black text-[10px] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight size={14} /> Million → Sky
                </button>
                <button 
                  onClick={() => confirmClearPipeline('million')}
                  className="py-3 bg-white text-red-700 border-2 border-red-200 rounded-xl font-black text-[10px] uppercase hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Limpar Million
                </button>
                <button 
                  onClick={() => confirmClearPipeline('sky')}
                  className="py-3 bg-white text-red-700 border-2 border-red-200 rounded-xl font-black text-[10px] uppercase hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Limpar Sky
                </button>
                <button 
                  onClick={() => confirmClearPipeline('dign')}
                  className="py-3 bg-white text-red-700 border-2 border-red-200 rounded-xl font-black text-[10px] uppercase hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Limpar Dignity
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nova etapa (ex: Pós-Venda)"
                  className="flex-1 p-4 bg-white rounded-2xl border-2 border-slate-200 focus:border-[#003459] outline-none font-black text-black text-xs uppercase" 
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

              <div className="space-y-2">
                {(!tempPipelineOrder || tempPipelineOrder.length === 0) ? (
                  <p className="p-4 text-xs font-bold text-slate-400">Nenhuma etapa definida para este pipeline.</p>
                ) : tempPipelineOrder.map((stage, i) => (
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
            </div>
          </div>

          {/* SEÇÃO SEGURANÇA */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#003459] mb-6 flex items-center gap-2 uppercase tracking-tight">
              <ShieldCheck size={22} className="text-[#00A8E8]" />
              Segurança da Conta
            </h3>
            <button 
              onClick={registerBiometrics}
              className="w-full py-4 bg-[#003459] text-white rounded-2xl font-black text-xs uppercase hover:bg-black transition-all shadow-md"
            >
              Registrar Acesso com Face ID
            </button>
          </div>

          {/* SEÇÃO LGPD */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-[#003459] flex items-center gap-2 uppercase tracking-tight">
              <ShieldCheck size={22} className="text-[#00A8E8]" />
              Conformidade LGPD
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-blue-50/50 rounded-2xl border-2 border-blue-100">
                <p className="text-[10px] font-black text-[#003459] uppercase mb-2 tracking-widest flex items-center gap-2">
                  <FileJson size={14} /> Portabilidade de Dados
                </p>
                <p className="text-[10px] text-slate-600 font-bold mb-4">Exporte todos os seus dados em formato JSON estruturado conforme exige a lei.</p>
                <button onClick={handleBackup} className="w-full py-2 bg-white text-[#003459] border-2 border-[#003459]/20 rounded-xl font-black text-[9px] uppercase hover:bg-white/50 transition-all">Solicitar Cópia Completa</button>
              </div>
              <div className="p-5 bg-red-50/50 rounded-2xl border-2 border-red-100">
                <p className="text-[10px] font-black text-red-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                  <Trash2 size={14} /> Direito ao Esquecimento
                </p>
                <p className="text-[10px] text-slate-600 font-bold mb-4">Elimine permanentemente seu histórico de transações e banco de dados local.</p>
                <button onClick={confirmReset} className="w-full py-2 bg-white text-red-600 border-2 border-red-100 rounded-xl font-black text-[9px] uppercase hover:bg-red-50 transition-all">Excluir Minha Conta</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-[#003459] flex items-center gap-2 uppercase tracking-tight">
                <CreditCard size={22} className="text-[#00A8E8]" />
                Taxas da Máquina
              </h3>
              <button 
                onClick={saveFees}
                className="flex items-center gap-2 bg-[#00A8E8] text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-[#0081B3] transition-all shadow-md"
              >
                <Save size={16} /> Salvar Taxas
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {tempFees.map((fee, i) => (
                <div key={i} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-900 uppercase ml-1">{(i + 1).toString().padStart(2, '0')}x</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      value={fee}
                      onChange={(e) => handleFeeChange(i, e.target.value)}
                      className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#003459] font-black text-black text-sm shadow-sm"
                    />
                    <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#003459] text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3 uppercase">
                <FileJson size={24} className="text-[#00A8E8]" />
                Sincronização Manual
              </h3>
              <p className="text-blue-100 text-sm mb-8 leading-relaxed font-bold">
                Mova seus dados entre dispositivos (celular/PC) rapidamente exportando e importando o arquivo de backup.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleBackup}
                  className="w-full py-5 bg-[#00A8E8] text-white rounded-2xl font-black shadow-lg hover:bg-[#0081B3] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <Download size={20} /> 1. Exportar Backup
                </button>

                <div className="relative">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".json"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 bg-white text-[#003459] rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest border-2 border-white"
                  >
                    <Upload size={20} /> 2. Importar Arquivo
                  </button>
                </div>

                <button 
                  onClick={() => {
                    const text = prompt("Cole o texto do backup aqui:");
                    if (text) importBackup(text);
                  }}
                  className="w-full py-5 bg-white/10 text-white rounded-2xl font-black border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <Zap size={20} /> 3. Colar Manual
                </button>

                <button 
                  onClick={handleManualSync}
                  className="w-full py-4 text-blue-300 font-black flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest hover:text-white transition-colors mt-4"
                >
                  <RefreshCw size={14} /> Sincronização em Nuvem
                </button>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
          </div>

          <div className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 mb-3">
              <AlertTriangle size={20} />
              <h3 className="text-lg font-black uppercase tracking-tight">Estatísticas de Dados</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase">
                <span>Total de Clientes</span>
                <span>{customers?.length || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase">
                <span>Leads Ativos</span>
                <span>{leads?.length || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase">
                <span>Pedidos Lançados</span>
                <span>{orders?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO HISTÓRICO LOCAL */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#003459] mb-4 flex items-center gap-2 uppercase tracking-tight">
              <RefreshCw size={22} className="text-[#00A8E8]" />
              Histórico de Alterações (Auto-Backup)
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mb-6">O sistema guarda automaticamente os últimos 5 estados para recuperação rápida em caso de erro.</p>
            
            <div className="space-y-3">
              {localHistory.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 italic p-4 bg-slate-50 rounded-2xl text-center">Nenhum histórico disponível ainda.</p>
              ) : (
                localHistory.map((item, i) => (
                  <div key={item.timestamp || i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-[#00A8E8]/30 transition-all group">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-[#003459]">Estado em {new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span className="text-[10px] font-bold text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={() => restoreFromHistory(i)}
                      className="px-4 py-2 bg-white text-[#00A8E8] border-2 border-[#00A8E8]/20 rounded-xl font-black text-[10px] uppercase hover:bg-[#00A8E8] hover:text-white transition-all shadow-sm"
                    >
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <SafetyConfirmationModal
        isOpen={safetyModal.isOpen}
        onClose={() => setSafetyModal({ ...safetyModal, isOpen: false })}
        onConfirm={safetyModal.onConfirm}
        title={safetyModal.title}
        message={safetyModal.message}
        confirmationWord={safetyModal.confirmationWord}
      />
    </div>
  );
};

export default Settings;