
import React, { useState, useEffect } from 'react';
import { Home, FileText, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Calendar, AlertCircle, FileUp, Filter, ArrowUp, ArrowDown, ArrowUpDown, MessageSquare, MapPin, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PavProcess } from '../types';
import { exportToExcel, parseExcel } from '../utils/excel';

interface PavModuleProps {
  onBack: () => void;
  userEmail: string;
  onLogout: () => void;
}

type SortKey = 'vehicle_plate' | 'accident_date' | 'pav_number' | 'inquirer' | 'os_request_date';

export const PavModule: React.FC<PavModuleProps> = ({ onBack, userEmail, onLogout }) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  // Estados
  const [processes, setProcesses] = useState<PavProcess[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SENT' | 'PENDING'>('ALL');
  const [filterFraction, setFilterFraction] = useState<string>('ALL');

  // Ordenação
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({ 
    key: 'accident_date', 
    direction: 'DESC' 
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<PavProcess | null>(null);

  // Estado para exclusão segura
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Formata o PM para 123.456-7
  const formatPmNumber = (value: string) => {
      let v = value.replace(/\D/g, '').slice(0, 7);
      if (v.length > 6) {
          v = v.replace(/^(\d{3})(\d{3})(\d)/, '$1.$2-$3');
      } else if (v.length > 3) {
          v = v.replace(/^(\d{3})(\d)/, '$1.$2');
      }
      return v;
  };

  // Estado do Formulário
  const initialForm = {
    fraction: '',
    vehicle_prefix: '',
    vehicle_plate: '',
    accident_date: '',
    reds_number: '',
    pav_number: '',
    inquirer: '',
    inquirer_pm_number: '', // Novo campo
    sent_to_inquirer: false,
    os_request_date: '',
    os_number: '',
    os_followup_date: '',
    observations: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Estado para Erros de Validação
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Fetch Data
  const fetchProcesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('pav_processes')
        .select('*');
    
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
    // 1. Validação de Campos Obrigatórios
    const requiredFields = [
        'fraction', 
        'vehicle_prefix', 
        'vehicle_plate', 
        'reds_number', 
        'accident_date', 
        'pav_number', 
        'inquirer', 
        'inquirer_pm_number', // Novo obrigatório
        'os_number', 
        'os_request_date'
    ];
    
    const newErrors: Record<string, boolean> = {};
    let hasError = false;

    requiredFields.forEach(field => {
        if (!formData[field as keyof typeof formData]) {
            newErrors[field] = true;
            hasError = true;
        }
    });

    setErrors(newErrors);

    if (hasError) {
        alert("Por favor, preencha todos os campos obrigatórios (marcados em vermelho).");
        return;
    }

    // 2. Salvar Dados
    try {
        const payload = {
            ...formData,
            inquirer: formData.inquirer.toUpperCase(),
            inquirer_pm_number: formData.inquirer_pm_number.replace(/\D/g, ''), // Salva limpo no banco
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
        setErrors({});
        setIsEditing(null);
        fetchProcesses();

    } catch (e: any) {
        alert("Erro ao salvar: " + e.message);
    }
  };

  const confirmDelete = async () => {
      if (!deletingId) return;

      try {
          const { error } = await supabase.from('pav_processes').delete().eq('id', deletingId);
          if (error) throw error;
          fetchProcesses();
      } catch (e: any) {
          alert("Erro ao excluir: " + e.message);
      } finally {
          setDeletingId(null);
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const data = await parseExcel(e.target.files[0]);
        
        const findValue = (row: any, searchKeys: string[]) => {
            const objectKeys = Object.keys(row);
            for (const searchKey of searchKeys) {
                const foundKey = objectKeys.find(k => k.toLowerCase().includes(searchKey.toLowerCase()));
                if (foundKey) return row[foundKey];
            }
            return undefined;
        };

        const formattedData = data.map((row: any) => {
            const sentRaw = findValue(row, ['enviado', 'status']);
            const isSent = typeof sentRaw === 'string' ? sentRaw.toLowerCase().includes('sim') || sentRaw.toLowerCase().includes('ok') : !!sentRaw;
            const inquirerName = findValue(row, ['encarregado']) || '';
            const inquirerPmRaw = String(findValue(row, ['pm', 'n pm']) || '');

            return {
                fraction: findValue(row, ['fracao', 'unidade', 'companhia']) || '',
                vehicle_prefix: findValue(row, ['prefixo', 'viatura']) || '',
                vehicle_plate: findValue(row, ['placa']) || '',
                reds_number: findValue(row, ['reds', 'bo']) || '',
                accident_date: null,
                pav_number: findValue(row, ['pav', 'n_pav']) || '',
                inquirer: String(inquirerName).toUpperCase(),
                inquirer_pm_number: inquirerPmRaw.replace(/\D/g, '').slice(0, 7),
                sent_to_inquirer: isSent,
                os_number: findValue(row, ['os', 'ordem']) || '',
                observations: findValue(row, ['obs', 'observacao']) || ''
            };
        }).filter(r => r.vehicle_prefix && r.reds_number);

        if (formattedData.length > 0) {
          const { error } = await supabase.from('pav_processes').insert(formattedData);
          if (error) throw error;
          alert(`${formattedData.length} processos importados com sucesso!`);
          fetchProcesses();
        } else {
          alert("Nenhum processo válido encontrado. Verifique se as colunas 'Prefixo' e 'REDS' existem.");
        }
      } catch (err: any) {
        alert(`Erro ao importar: ${err.message}`);
        console.error(err);
      }
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'ASC' | 'DESC' = 'ASC';
    if (sortConfig.key === key && sortConfig.direction === 'ASC') {
      direction = 'DESC';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400 opacity-50 ml-1 inline-block" />;
    return sortConfig.direction === 'ASC' 
      ? <ArrowUp size={14} className="text-[#C5A059] ml-1 inline-block" /> 
      : <ArrowDown size={14} className="text-[#C5A059] ml-1 inline-block" />;
  };

  const openModal = (process?: PavProcess) => {
      setErrors({});
      if (process) {
          setIsEditing(process);
          setFormData({
              fraction: process.fraction || '',
              vehicle_prefix: process.vehicle_prefix || '',
              vehicle_plate: process.vehicle_plate || '',
              accident_date: process.accident_date || '',
              reds_number: process.reds_number || '',
              pav_number: process.pav_number || '',
              inquirer: (process.inquirer || '').toUpperCase(),
              inquirer_pm_number: formatPmNumber(process.inquirer_pm_number || ''),
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

  const getInputClass = (field: string) => {
      const baseClass = "w-full border p-2 rounded focus:outline-none transition-colors ";
      if (errors[field]) {
          return baseClass + "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-400";
      }
      return baseClass + "focus:ring-2 focus:ring-[#C5A059]";
  };

  const processedProcesses = processes
    .filter(p => {
        const matchesSearch = 
            (p.vehicle_prefix || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.reds_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.pav_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.inquirer || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.inquirer_pm_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.vehicle_plate || '').toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = 
            filterStatus === 'ALL' || 
            (filterStatus === 'SENT' && p.sent_to_inquirer) ||
            (filterStatus === 'PENDING' && !p.sent_to_inquirer);

        const matchesFraction = 
            filterFraction === 'ALL' ||
            p.fraction === filterFraction;

        return matchesSearch && matchesStatus && matchesFraction;
    })
    .sort((a, b) => {
        let valA: any = a[sortConfig.key];
        let valB: any = b[sortConfig.key];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'ASC' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ASC' ? 1 : -1;
        return 0;
    });

  const formatDate = (dateString: string | null) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          <div className="flex items-center gap-4 py-2">
             <button 
                onClick={onBack}
                className="flex flex-col items-center justify-center text-[#C5A059] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
                title="Voltar ao Menu Principal"
             >
                <Home size={20} />
                <span className="text-[10px] uppercase font-bold mt-1">Menu</span>
             </button>
             <img 
               src={shieldUrl} 
               alt="Escudo" 
               className="h-28 drop-shadow-xl filter brightness-110"
               style={{ height: '7rem' }}
             />
          </div>
          <div className="text-right">
             <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] drop-shadow-md shadow-black/50 font-serif uppercase">
               CONTROLE DE PAV
             </h1>
             <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif">
                FROTA 5ª RPM
             </p>
             <div className="text-right mt-1">
                 <span className="text-sm font-semibold text-white/90">
                    Bem-vindo, {userEmail}
                 </span>
             </div>
          </div>
        </div>
        <div className="bg-[#4A3B2A]/90 backdrop-blur-sm text-white/90">
          <div className="container mx-auto px-4 flex justify-end items-center py-2">
             <button 
               onClick={onLogout}
               className="flex items-center gap-2 px-4 py-2 text-red-200 hover:text-red-100 hover:bg-red-900/30 rounded transition-colors text-sm font-semibold whitespace-nowrap"
               title="Sair do sistema"
             >
               <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
             </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-6 min-h-[600px]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto flex-1">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Buscar (Vtr, REDS, PM Encarregado)..."
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-48">
                        <div className="absolute left-3 top-2.5 pointer-events-none">
                            <Filter size={18} className="text-gray-400" />
                        </div>
                        <select 
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none appearance-none bg-white"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="ALL">Status: TODOS</option>
                            <option value="SENT">Enviado</option>
                            <option value="PENDING">Pendente</option>
                        </select>
                    </div>

                    <div className="relative w-full sm:w-48">
                        <div className="absolute left-3 top-2.5 pointer-events-none">
                            <MapPin size={18} className="text-gray-400" />
                        </div>
                        <select 
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none appearance-none bg-white"
                            value={filterFraction}
                            onChange={(e) => setFilterFraction(e.target.value)}
                        >
                            <option value="ALL">Unidade: TODAS</option>
                            <option value="4° BPM">4° BPM</option>
                            <option value="67° BPM">67° BPM</option>
                            <option value="37° BPM">37° BPM</option>
                            <option value="69° BPM">69° BPM</option>
                            <option value="3ª CIA PM IND">3ª CIA PM IND</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 w-full lg:w-auto justify-end flex-wrap">
                     <label className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] text-white rounded cursor-pointer hover:bg-[#435525] transition-colors shadow-sm whitespace-nowrap">
                        <FileUp size={18} /> Importar Excel
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} />
                     </label>
                     <button 
                        onClick={() => exportToExcel(processes, 'Controle_PAV_5RPM')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors whitespace-nowrap"
                     >
                        <FileText size={18} /> Exportar Excel
                     </button>
                     <button 
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] text-[#3E3223] font-bold rounded hover:bg-[#b08d4a] transition-colors shadow-sm whitespace-nowrap"
                     >
                        <Plus size={20} /> Novo
                     </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-[#3E3223] text-white select-none">
                        <tr>
                            <th 
                                className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A] transition-colors"
                                onClick={() => handleSort('vehicle_plate')}
                            >
                                VIATURA {renderSortIcon('vehicle_plate')}
                            </th>
                            <th 
                                className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A] transition-colors"
                                onClick={() => handleSort('accident_date')}
                            >
                                REDS/BOS {renderSortIcon('accident_date')}
                            </th>
                            <th 
                                className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A] transition-colors"
                                onClick={() => handleSort('pav_number')}
                            >
                                ENCARREGADO/N° PAV {renderSortIcon('pav_number')}
                            </th>
                            <th 
                                className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A] transition-colors"
                                onClick={() => handleSort('os_request_date')}
                            >
                                PORTAL DE SERVIÇOS {renderSortIcon('os_request_date')}
                            </th>
                             <th 
                                className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A] transition-colors text-center"
                            >
                                STATUS
                            </th>
                            <th className="p-3 border-r border-[#4A3B2A] text-center w-12">OBS</th>
                            <th className="p-3 text-right w-24">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loading ? (
                             <tr><td colSpan={7} className="p-8 text-center">Carregando dados...</td></tr>
                        ) : processedProcesses.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum processo encontrado.</td></tr>
                        ) : processedProcesses.map((p) => (
                            <tr key={p.id} className="border-b hover:bg-amber-50">
                                <td className="p-3 border-r">
                                    <div className="text-lg font-bold text-[#3E3223]">{p.vehicle_prefix}</div>
                                    <div className="text-xs text-gray-500 uppercase">{p.vehicle_plate}</div>
                                    <div className="text-xs bg-gray-100 rounded px-1 mt-1 w-fit">{p.fraction}</div>
                                </td>
                                <td className="p-3 border-r">
                                    <div className="font-bold text-lg text-gray-800">{p.reds_number}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <Calendar size={10} /> {formatDate(p.accident_date)}
                                    </div>
                                </td>
                                <td className="p-3 border-r">
                                    <div className="font-medium text-gray-900">{(p.inquirer || '-').toUpperCase()}</div>
                                    <div className="text-xs text-gray-500 font-bold font-mono">Nº PM: {formatPmNumber(p.inquirer_pm_number || '')}</div>
                                    {p.pav_number ? (
                                        <div className="text-lg font-bold font-mono text-[#3E3223] mt-1">{p.pav_number}</div>
                                    ) : (
                                        <span className="text-gray-400 italic text-xs mt-1 block">Pendente</span>
                                    )}
                                </td>
                                <td className="p-3 border-r">
                                    {p.os_number ? (
                                        <>
                                            <div className="font-bold text-lg text-blue-800">{p.os_number}</div>
                                            <div className="text-xs text-gray-600 font-medium">1ª Solic: {formatDate(p.os_request_date)}</div>
                                            {p.os_followup_date && (
                                                <div className="text-xs text-orange-600 font-bold mt-1">
                                                    Cobrança: {formatDate(p.os_followup_date)}
                                                </div>
                                            )}
                                        </>
                                    ) : <span className="text-gray-400 italic">-</span>}
                                </td>
                                <td className="p-3 border-r text-center">
                                    {p.sent_to_inquirer ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                            <CheckCircle size={10} /> ENVIADO
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                            <XCircle size={10} /> PENDENTE
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 border-r text-center">
                                    {p.observations && (
                                        <div className="group relative inline-block">
                                            <MessageSquare size={20} className="text-blue-500 cursor-help" />
                                            <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-gray-800 text-white text-xs rounded hidden group-hover:block z-50 shadow-lg text-left">
                                                {p.observations}
                                            </div>
                                        </div>
                                    )}
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
                                            onClick={() => setDeletingId(p.id)}
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

        {/* Modal de Confirmação de Exclusão */}
        {deletingId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-red-600">
                    <div className="flex items-center gap-3 mb-4 text-red-700">
                        <AlertCircle size={32} />
                        <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
                    </div>
                    
                    <p className="text-gray-700 mb-6">
                        Tem certeza que deseja excluir este processo de PAV? <br/>
                        <span className="text-sm text-gray-500 mt-2 block">
                            Esta ação não poderá ser desfeita.
                        </span>
                    </p>
                    
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setDeletingId(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-md font-bold flex items-center gap-2"
                        >
                            <Trash2 size={18} />
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            </div>
        )}

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
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unidade <span className="text-red-500">*</span></label>
                                    <select 
                                        className={getInputClass('fraction') + " bg-white"}
                                        value={formData.fraction}
                                        onChange={e => setFormData({...formData, fraction: e.target.value})}
                                    >
                                        <option value="">Selecione a Unidade...</option>
                                        <option value="4° BPM">4° BPM</option>
                                        <option value="67° BPM">67° BPM</option>
                                        <option value="37° BPM">37° BPM</option>
                                        <option value="69° BPM">69° BPM</option>
                                        <option value="3ª CIA PM IND">3ª CIA PM IND</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prefixo <span className="text-red-500">*</span></label>
                                        <input 
                                            className={getInputClass('vehicle_prefix')}
                                            value={formData.vehicle_prefix}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                                setFormData({...formData, vehicle_prefix: val});
                                            }}
                                            placeholder="12345"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Placa <span className="text-red-500">*</span></label>
                                        <input 
                                            className={getInputClass('vehicle_plate')}
                                            value={formData.vehicle_plate}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
                                                setFormData({...formData, vehicle_plate: val});
                                            }}
                                            placeholder="ABC1234"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº REDS <span className="text-red-500">*</span></label>
                                    <input 
                                        className={getInputClass('reds_number')}
                                        value={formData.reds_number}
                                        onChange={e => setFormData({...formData, reds_number: e.target.value})}
                                        placeholder="2024-..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data do Acidente <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date"
                                        className={getInputClass('accident_date')}
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

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Encarregado PAV <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input 
                                            className={getInputClass('inquirer') + " pl-10"}
                                            value={formData.inquirer}
                                            onChange={e => setFormData({...formData, inquirer: e.target.value.toUpperCase()})}
                                            placeholder="Posto/Grad e Nome"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº PM do Encarregado <span className="text-red-500">*</span></label>
                                    <input 
                                        className={getInputClass('inquirer_pm_number')}
                                        value={formData.inquirer_pm_number}
                                        onChange={e => setFormData({...formData, inquirer_pm_number: formatPmNumber(e.target.value)})}
                                        placeholder="123.456-7"
                                        maxLength={9}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº PAV <span className="text-red-500">*</span></label>
                                    <input 
                                        className={getInputClass('pav_number')}
                                        value={formData.pav_number}
                                        onChange={e => setFormData({...formData, pav_number: e.target.value})}
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
                                        Processo de Avarias enviado ao encarregado?
                                    </label>
                                </div>
                            </div>

                            {/* COLUNA 3: PORTAL DE SERVIÇOS */}
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-bold text-[#3E3223] border-b pb-2 mb-2 flex items-center gap-2">
                                    <Search size={16} /> Portal de Serviços
                                </h3>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nº da OS <span className="text-red-500">*</span></label>
                                    <input 
                                        className={getInputClass('os_number')}
                                        value={formData.os_number}
                                        onChange={e => setFormData({...formData, os_number: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Solicitação OS <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date"
                                        className={getInputClass('os_request_date')}
                                        value={formData.os_request_date}
                                        onChange={e => setFormData({...formData, os_request_date: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Reforço Cobrança OS</label>
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
