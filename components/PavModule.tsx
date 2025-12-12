import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, FileText, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PavProcess } from '../types';
import { exportToExcel } from '../utils/excel';

interface PavModuleProps {
  onBack: () => void;
  userEmail: string;
  onLogout: () => void;
}

export const PavModule: React.FC<PavModuleProps> = ({ onBack, userEmail, onLogout }) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  // Estados
  const [processes, setProcesses] = useState<PavProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<PavProcess | null>(null);

  // Estado do Formulário
  const initialForm = {
    fraction: '',
    vehicle_prefix: '',
    vehicle_plate: '',
    accident_date: '',
    reds_number: '',
    sicor_number: '',
    pav_number: '',
    inquirer: '',
    sent_to_inquirer: false,
    os_request_date: '',
    os_number: '',
    os_followup_date: '',
    observations: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch Data
  const fetchProcesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('pav_processes')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Erro ao buscar PAVs:", error);
        alert("Erro ao carregar dados. Verifique se executou o script SQL de atualização.");
    } else {
        setProcesses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  // Handlers
  const handleSave = async () => {
    try {
        if (!formData.vehicle_prefix || !formData.reds_number) {
            alert("Prefixo e Nº REDS são obrigatórios.");
            return;
        }

        const payload = {
            ...formData,
            accident_date: formData.accident_date || null,
            os_request_date: formData.os_request_date || null,
            os_followup_date: formData.os_followup_date || null,
        };

        if (isEditing) {
            const { error } = await supabase.from('pav_processes').update(payload).eq('id', isEditing.id);
            if (error) throw error;
            alert("Processo atualizado com sucesso!");
        } else {
            const { error } = await supabase.from('pav_processes').insert([payload]);
            if (error) throw error;
            alert("Processo criado com sucesso!");
        }

        setIsModalOpen(false);
        setFormData(initialForm);
        setIsEditing(null);
        fetchProcesses();

    } catch (e: any) {
        alert("Erro ao salvar: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este processo?")) {
          const { error } = await supabase.from('pav_processes').delete().eq('id', id);
          if (error) alert("Erro ao excluir");
          else fetchProcesses();
      }
  };

  const openModal = (process?: PavProcess) => {
      if (process) {
          setIsEditing(process);
          setFormData({
              fraction: process.fraction || '',
              vehicle_prefix: process.vehicle_prefix || '',
              vehicle_plate: process.vehicle_plate || '',
              accident_date: process.accident_date || '',
              reds_number: process.reds_number || '',
              sicor_number: process.sicor_number || '',
              pav_number: process.pav_number || '',
              inquirer: process.inquirer || '',
              sent_to_inquirer: process.sent_to_inquirer || false,
              os_request_date: process.os_request_date || '',
              os_number: process.os_number || '',
              os_followup_date: process.os_followup_date || '',
              observations: process.observations || ''
          });
      } else {
          setIsEditing(null);
          setFormData(initialForm);
      }
      setIsModalOpen(true);
  };

  // Filtragem
  const filteredProcesses = processes.filter(p => 
      (p.vehicle_prefix || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.reds_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.pav_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.inquirer || '').toLowerCase().includes(search.toLowerCase())
  );

  // Formatação de data simples
  const formatDate = (dateString: string | null) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
      {/* Header Específico do PAV */}
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
                onClick={onBack}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Voltar ao Menu"
             >
                <ArrowLeft size={24} />
             </button>
             <div className="flex items-center gap-3">
                <img src={shieldUrl} alt="Escudo" className="h-12" />
                <div>
                    <h1 className="text-2xl font-bold text-[#C5A059]">Controle de PAV</h1>
                    <p className="text-xs text-gray-400">Polícia Administrativa - 5ª RPM</p>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 hidden md:block">{userEmail}</span>
            <button 
                onClick={onLogout}
                className="text-red-300 hover:text-red-100"
                title="Sair"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-6 min-h-[600px]">
            
            {/* Barra de Ferramentas */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Buscar por Prefixo, REDS, PAV ou Encarregado..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => exportToExcel(processes, 'Controle_PAV_5RPM')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                     >
                        <FileText size={18} /> Exportar Excel
                     </button>
                     <button 
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] text-[#3E3223] font-bold rounded hover:bg-[#b08d4a] transition-colors shadow-sm"
                     >
                        <Plus size={20} /> Novo Processo
                     </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-[#3E3223] text-white">
                        <tr>
                            <th className="p-3 border-r border-[#4A3B2A]">Prefixo/Placa</th>
                            <th className="p-3 border-r border-[#4A3B2A]">Ocorrência</th>
                            <th className="p-3 border-r border-[#4A3B2A]">Controle Adm.</th>
                            <th className="p-3 border-r border-[#4A3B2A]">Encarregado</th>
                            <th className="p-3 border-r border-[#4A3B2A]">Portal de Serviços</th>
                            <th className="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loading ? (
                             <tr><td colSpan={6} className="p-8 text-center">Carregando dados...</td></tr>
                        ) : filteredProcesses.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum processo encontrado.</td></tr>
                        ) : filteredProcesses.map((p) => (
                            <tr key={p.id} className="border-b hover:bg-amber-50">
                                <td className="p-3 border-r">
                                    <div className="font-bold text-[#3E3223]">{p.vehicle_prefix}</div>
                                    <div className="text-xs text-gray-500">{p.vehicle_plate}</div>
                                    <div className="text-xs bg-gray-100 rounded px-1 mt-1 w-fit">{p.fraction}</div>
                                </td>
                                <td className="p-3 border-r">
                                    <div className="font-semibold">REDS: {p.reds_number}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <Calendar size={10} /> {formatDate(p.accident_date)}
                                    </div>
                                </td>
                                <td className="p-3 border-r">
                                    {p.pav_number && <div className="text-xs font-mono">PAV: {p.pav_number}</div>}
                                    {p.sicor_number && <div className="text-xs font-mono">SICOR: {p.sicor_number}</div>}
                                    {!p.pav_number && !p.sicor_number && <span className="text-gray-400 italic">Pendente</span>}
                                </td>
                                <td className="p-3 border-r">
                                    <div>{p.inquirer || '-'}</div>
                                    <div className="mt-1">
                                        {p.sent_to_inquirer ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                                <CheckCircle size={10} /> ENVIADO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                                <XCircle size={10} /> PENDENTE
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3 border-r">
                                    {p.os_number ? (
                                        <>
                                            <div className="font-semibold text-blue-800">OS: {p.os_number}</div>
                                            <div className="text-xs text-gray-500">Solic: {formatDate(p.os_request_date)}</div>
                                            {p.os_followup_date && (
                                                <div className="text-xs text-orange-600 font-bold mt-1">
                                                    Cobrança: {formatDate(p.os_followup_date)}
                                                </div>
                                            )}
                                        </>
                                    ) : <span className="text-gray-400 italic">-</span>}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => openModal(p)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(p.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Excluir"
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
        </div>

        {/* Modal de Cadastro/Edição */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl border-t-8 border-[#C5A059] my-8">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-[#3E3223] mb-6 flex items-center gap-2">
                            {isEditing ? <Edit /> : <Plus />}
                            {isEditing ? 'Editar Processo' : 'Novo Processo de PAV'}
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* COLUNA 1: DADOS DA VIATURA */}
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-[#3E3223] border-b pb-2 mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} /> Dados da Ocorrência
                                </h3>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unidade/Fração</label>
                                    <input 
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.fraction}
                                        onChange={e => setFormData({...formData, fraction: e.target.value})}
                                        placeholder="Ex: 5ª CIA IND"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prefixo <span className="text-red-500">*</span></label>
                                        <input 
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                            value={formData.vehicle_prefix}
                                            onChange={e => setFormData({...formData, vehicle_prefix: e.target.value})}
                                            placeholder="VP-12345"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Placa</label>
                                        <input 
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                            value={formData.vehicle_plate}
                                            onChange={e => setFormData({...formData, vehicle_plate: e.target.value})}
                                            placeholder="ABC-1234"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº REDS <span className="text-red-500">*</span></label>
                                    <input 
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.reds_number}
                                        onChange={e => setFormData({...formData, reds_number: e.target.value})}
                                        placeholder="2024-..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data do Acidente</label>
                                    <input 
                                        type="date"
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.accident_date}
                                        onChange={e => setFormData({...formData, accident_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* COLUNA 2: DADOS ADMINISTRATIVOS */}
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-[#3E3223] border-b pb-2 mb-2 flex items-center gap-2">
                                    <FileText size={16} /> Controle Administrativo
                                </h3>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº PAV</label>
                                        <input 
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                            value={formData.pav_number}
                                            onChange={e => setFormData({...formData, pav_number: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº SICOR</label>
                                        <input 
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                            value={formData.sicor_number}
                                            onChange={e => setFormData({...formData, sicor_number: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Encarregado PAV</label>
                                    <input 
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.inquirer}
                                        onChange={e => setFormData({...formData, inquirer: e.target.value})}
                                        placeholder="Posto/Grad e Nome"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <input 
                                        type="checkbox"
                                        id="sent_to_inquirer"
                                        className="w-5 h-5 text-[#C5A059] rounded focus:ring-[#C5A059]"
                                        checked={formData.sent_to_inquirer}
                                        onChange={e => setFormData({...formData, sent_to_inquirer: e.target.checked})}
                                    />
                                    <label htmlFor="sent_to_inquirer" className="text-sm font-bold text-gray-700 select-none">
                                        Enviado ao Encarregado?
                                    </label>
                                </div>
                            </div>

                            {/* COLUNA 3: PORTAL DE SERVIÇOS */}
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-[#3E3223] border-b pb-2 mb-2 flex items-center gap-2">
                                    <Search size={16} /> Portal de Serviços
                                </h3>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº da OS (Portal)</label>
                                    <input 
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.os_number}
                                        onChange={e => setFormData({...formData, os_number: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Solicitação OS</label>
                                    <input 
                                        type="date"
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.os_request_date}
                                        onChange={e => setFormData({...formData, os_request_date: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Reforço Cobrança</label>
                                    <input 
                                        type="date"
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none"
                                        value={formData.os_followup_date}
                                        onChange={e => setFormData({...formData, os_followup_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* OBSERVAÇÕES (Ocupa toda a largura) */}
                            <div className="lg:col-span-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observações</label>
                                <textarea 
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none h-20 resize-none"
                                    placeholder="Detalhes adicionais..."
                                    value={formData.observations}
                                    onChange={e => setFormData({...formData, observations: e.target.value})}
                                />
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 mt-8 border-t pt-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded border font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                className="px-6 py-2 bg-[#3E3223] text-white rounded hover:bg-[#2a2218] shadow-md font-bold transition-colors"
                            >
                                Salvar Processo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};