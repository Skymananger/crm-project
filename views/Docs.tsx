
import React, { useState, useRef } from 'react';
import { FileText, Download, Search, FolderPlus, Trash2 } from 'lucide-react';

interface Document {
  name: string;
  size: string;
  date: string;
  type: string;
  url?: string;
}

const Docs: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('sky_documents');
    return saved ? JSON.parse(saved) : [
      { name: 'Tabela_Precos_2024.pdf', size: '1.2 MB', date: '10/08/2024', type: 'PDF' },
      { name: 'Contrato_Padrao_Sky.docx', size: '450 KB', date: '05/08/2024', type: 'DOC' },
      { name: 'Manual_Vendas_IA.pdf', size: '3.8 MB', date: '01/08/2024', type: 'PDF' },
    ];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDocs = (docs: Document[]) => {
    setDocuments(docs);
    localStorage.setItem('sky_documents', JSON.stringify(docs));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newDoc: Document = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString('pt-BR'),
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        url: event.target?.result as string
      };
      saveDocs([newDoc, ...documents]);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (index: number) => {
    if (confirm("Deseja remover este documento?")) {
      const updated = documents.filter((_, i) => i !== index);
      saveDocs(updated);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#003459]">Documentos</h1>
          <p className="text-slate-500 font-bold">Acesse tabelas, contratos e materiais de treinamento.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#00A8E8] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-[#0081B3] transition-all uppercase text-xs"
          >
            <FolderPlus size={20} /> Upload PDF/Doc
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar documentos..." 
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00A8E8] font-bold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex items-start justify-between group hover:border-[#00A8E8] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-[#00A8E8] rounded-2xl transition-colors">
                <FileText size={24} />
              </div>
              <div>
                <p className="font-black text-slate-800 line-clamp-1 text-sm">{doc.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{doc.size} • {doc.date}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {doc.url ? (
                <a href={doc.url} download={doc.name} className="p-2 text-slate-300 hover:text-[#00A8E8] transition-colors">
                  <Download size={20} />
                </a>
              ) : (
                <button className="p-2 text-slate-200 cursor-not-allowed">
                  <Download size={20} />
                </button>
              )}
              <button onClick={() => removeDoc(i)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Docs;
