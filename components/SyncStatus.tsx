import React from 'react';
import { useApp } from '../store/AppContext';
import { RefreshCw, CloudOff, Cloud, AlertCircle } from 'lucide-react';

const SyncStatus: React.FC = () => {
  const { isCloudActive, pendingCount, syncPendingData, lastSyncError, saving } = useApp();

  if (!isCloudActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-tight border border-slate-200">
        <CloudOff size={12} />
        Nuvem Desconectada
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border transition-all ${pendingCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
          {pendingCount > 0 ? <RefreshCw size={12} className="animate-spin-slow" /> : <Cloud size={12} />}
          {pendingCount > 0 ? `${pendingCount} Alterações Pendentes` : 'Sincronizado com a Nuvem'}
        </div>
        
        {pendingCount > 0 && (
          <button 
            onClick={() => syncPendingData()}
            disabled={saving}
            className="px-4 py-1.5 bg-[#00A8E8] text-white rounded-full text-[10px] font-black uppercase tracking-tight hover:bg-[#0081B3] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={12} className={saving ? 'animate-spin' : ''} />
            Sincronizar Agora
          </button>
        )}
      </div>

      {lastSyncError && (
        <div className="flex items-center gap-2 text-[9px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
          <AlertCircle size={10} />
          {lastSyncError}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
