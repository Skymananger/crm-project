import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Modal from './Modal';

interface SafetyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmationWord?: string;
  confirmButtonText?: string;
  confirmButtonColor?: string;
}

const SafetyConfirmationModal: React.FC<SafetyConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmationWord = 'CONFIRMAR',
  confirmButtonText = 'Confirmar Exclusão',
  confirmButtonColor = 'bg-red-600 hover:bg-red-700'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleConfirm = () => {
    if (inputValue.toUpperCase() === confirmationWord.toUpperCase()) {
      onConfirm();
      setInputValue('');
      onClose();
    }
  };

  const isConfirmed = inputValue.toUpperCase() === confirmationWord.toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <AlertTriangle className="text-red-600 shrink-0" size={24} />
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-900 uppercase">Ação Irreversível</p>
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase px-1">
            Digite <span className="text-red-600 font-black">"{confirmationWord}"</span> abaixo para prosseguir:
          </label>
          <input
            type="text"
            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-red-500 focus:bg-white outline-none font-black text-black uppercase transition-all"
            placeholder={confirmationWord}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={`flex-1 py-4 ${confirmButtonColor} text-white rounded-2xl font-black text-xs uppercase shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SafetyConfirmationModal;
