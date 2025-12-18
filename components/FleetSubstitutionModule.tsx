
import React, { useState, useEffect } from 'react';
import { Home, Plus, Search, Edit, Trash2, LogOut, RefreshCw, Car, ArrowRight, AlertCircle, CheckCircle, XCircle, BarChart3, Clock, Check, FileUp, FileDown, MapPin, Building2, Calendar, FileText, ArrowUpDown, ArrowUp, ArrowDown, Info, Filter, Square, CheckSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FleetSubstitution } from '../types';
import { exportToExcel } from '../utils/excel';
import * as XLSX from 'xlsx';

interface FleetSubstitutionModuleProps {
  onBack: () => void;
  userEmail: string;
  onLogout: () => void;
}

type SortKey = 'received_prefix' | 'received_plate' | 'received_model' | 'received_bgpm' | 'received_city' | 'received_unit' | 'created_at' | 'indicated_prefix' | 'indicated_plate';

export const FleetSubstitutionModule: React.FC<FleetSubstitutionModuleProps> = ({ onBack, userEmail, onLogout }) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  const [substitutions, setSubstitutions] = useState<FleetSubstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterUnit, setFilterUnit] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DONE' | 'PENDING' | 'NOT_REQUIRED'>('ALL');

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({ 
    key: 'created_at', 
    direction: 'DESC' 
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para aviso de duplicidade
  const [duplicateWarning, setDuplicateWarning] = useState<{ plate: string; type: 'RECEIVED' | 'INDICATED' } | null>(null);

  const initialForm = {
      received_prefix: '',
      received_plate: '',
      received_model: '',
      received_bgpm: '',
      received_city: '',
      received_unit: '',
      indicated_prefix: '',
      indicated_plate: '',
      not_required: false
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fleet_substitutions').select('*');
    if (error) console.error("Erro ao buscar dados:", error);
    else setSubstitutions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Mapas para identificar duplicidades na tela
  const receivedPlateCounts = substitutions.reduce((acc, curr) => {
    const plate = curr.received_plate?.toUpperCase().trim();
    if (plate) acc[plate] = (acc[plate] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const indicatedPlateCounts = substitutions.reduce((acc, curr) => {
    const plate = curr.indicated_plate?.toUpperCase().trim();
    if (plate) acc[plate] = (acc[plate] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCities = Array.from(new Set(substitutions.map(s => s.received_city).filter(Boolean))).sort();
  const uniqueUnits = Array.from(new Set(substitutions.map(s => s.received_unit).filter(Boolean))).sort();

  const stats = {
    total: substitutions.length,
    pending: substitutions.filter(s => !s.not_required && (!s.indicated_prefix || !s.indicated_plate)).length,
    completed: substitutions.filter(s => s.not_required || (s.indicated_prefix && s.indicated_plate)).length
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
              const rowStr = rows[i].map(c => String(c || '').toUpperCase().trim());
              if (rowStr.includes('PREFIXO') && rowStr.includes('PLACA') && rowStr.includes('BGPM')) {
                  headerRowIndex = i;
                  break;
              }
          }
          if (headerRowIndex === -1) throw new Error("Cabeçalho não encontrado.");

          const headers = rows[headerRowIndex].map(c => String(c || '').toUpperCase().trim());
          const findOccurrences = (arr: string[], target: string) => arr.reduce((acc: number[], val, i) => (val === target ? [...acc, i] : acc), []);
          
          const prefIndices = findOccurrences(headers, 'PREFIXO');
          const placIndices = findOccurrences(headers, 'PLACA');
          const bgpmIndex = headers.indexOf('BGPM');
          const modelIndex = headers.findIndex(h => h.includes('MARCA') || h.includes('MODELO'));
          const cityIndex = headers.findIndex(h => h.includes('MUNICÍPIO') || h.includes('DESTINO'));
          const unitIndex = headers.indexOf('UNIDADE');

          const formattedData = rows.slice(headerRowIndex + 1).map((row) => {
              const getVal = (idx: number) => idx !== -1 ? String(row[idx] || '').trim() : '';
              return {
                received_bgpm: getVal(bgpmIndex),
                received_prefix: getVal(prefIndices[0]),
                received_plate: getVal(placIndices[0]).toUpperCase(),
                received_model: getVal(modelIndex),
                received_city: getVal(cityIndex),
                received_unit: getVal(unitIndex),
                indicated_prefix: prefIndices.length > 1 ? getVal(prefIndices[1]) : null,
                indicated_plate: placIndices.length > 1 ? getVal(placIndices[1]).toUpperCase() : null,
                not_required: false
              };
          }).filter(r => r.received_prefix && r.received_prefix !== '');

          if (formattedData.length > 0) {
            const { error } = await supabase.from('fleet_substitutions').insert(formattedData);
            if (error) throw error;
            fetchData();
          }
        } catch (err: any) {
          alert(`Erro na importação: ${err.message}`);
        } finally {
          setLoading(false);
          if (e.target) e.target.value = '';
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleSave = async (force: boolean = false) => {
    const receivedPlate = formData.received_plate.toUpperCase().trim();
    const indicatedPlate = formData.indicated_plate.toUpperCase().trim();

    if (!formData.received_prefix || !receivedPlate) {
        alert("Dados da viatura recebida são obrigatórios.");
        return;
    }

    // Verificação de duplicidade antes de salvar
    if (!force) {
        const isDuplicateReceived = substitutions.some(s => s.id !== editingId && s.received_plate?.toUpperCase().trim() === receivedPlate);
        const isDuplicateIndicated = !formData.not_required && indicatedPlate && substitutions.some(s => s.id !== editingId && s.indicated_plate?.toUpperCase().trim() === indicatedPlate);

        if (isDuplicateReceived) {
            setDuplicateWarning({ plate: receivedPlate, type: 'RECEIVED' });
            return;
        }
        if (isDuplicateIndicated) {
            setDuplicateWarning({ plate: indicatedPlate, type: 'INDICATED' });
            return;
        }
    }

    const payload = {
        received_prefix: formData.received_prefix,
        received_plate: receivedPlate,
        received_model: formData.received_model,
        received_bgpm: formData.received_bgpm,
        received_city: formData.received_city,
        received_unit: formData.received_unit,
        indicated_prefix: formData.not_required ? null : (formData.indicated_prefix || null),
        indicated_plate: formData.not_required ? null : (indicatedPlate || null),
        not_required: formData.not_required
    };

    try {
        if (editingId) await supabase.from('fleet_substitutions').update(payload).eq('id', editingId);
        else await supabase.from('fleet_substitutions').insert([payload]);
        
        setIsModalOpen(false);
        setDuplicateWarning(null);
        fetchData();
    } catch (e: any) {
        alert("Erro ao salvar: " + e.message);
    }
  };

  const openModal = (item?: FleetSubstitution) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        received_prefix: item.received_prefix,
        received_plate: item.received_plate,
        received_model: item.received_model || '',
        received_bgpm: item.received_bgpm || '',
        received_city: item.received_city || '',
        received_unit: item.received_unit || '',
        indicated_prefix: item.indicated_prefix || '',
        indicated_plate: item.indicated_plate || '',
        not_required: item.not_required
      });
    } else {
      setEditingId(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleSort = (key: SortKey) => {
    let direction: 'ASC' | 'DESC' = 'ASC';
    if (sortConfig.key === key && sortConfig.direction === 'ASC') direction = 'DESC';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30 ml-1 inline-block" />;
    return sortConfig.direction === 'ASC' ? <ArrowUp size={14} className="ml-1 inline-block" /> : <ArrowDown size={14} className="ml-1 inline-block" />;
  };

  const filteredItems = substitutions
    .filter(item => {
        const matchesSearch = 
            item.received_prefix.includes(search) || 
            item.received_plate.toLowerCase().includes(search.toLowerCase()) ||
            (item.received_bgpm || '').toLowerCase().includes(search.toLowerCase());
        const matchesCity = filterCity === 'ALL' || item.received_city === filterCity;
        const matchesUnit = filterUnit === 'ALL' || item.received_unit === filterUnit;
        const isCompleted = item.not_required || (item.indicated_prefix && item.indicated_plate);
        const matchesStatus = filterStatus === 'ALL' || (filterStatus === 'DONE' && isCompleted) || (filterStatus === 'PENDING' && !isCompleted) || (filterStatus === 'NOT_REQUIRED' && item.not_required);
        return matchesSearch && matchesCity && matchesUnit && matchesStatus;
    })
    .sort((a, b) => {
        if (sortConfig.key === 'received_bgpm') {
            const parseBgpm = (val: string | null) => {
                if (!val || !val.includes('/')) return { num: 0, year: 0 };
                const [n, y] = val.split('/').map(s => parseInt(s.trim(), 10) || 0);
                return { num: n, year: y };
            };
            const aData = parseBgpm(a.received_bgpm);
            const bData = parseBgpm(b.received_bgpm);
            if (aData.year !== bData.year) return sortConfig.direction === 'ASC' ? aData.year - bData.year : bData.year - aData.year;
            return sortConfig.direction === 'ASC' ? aData.num - bData.num : bData.num - aData.num;
        }
        let valA: any = a[sortConfig.key];
        let valB: any = b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ASC' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ASC' ? 1 : -1;
        return 0;
    });

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
       <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          <div className="flex items-center gap-4 py-2">
             <button onClick={onBack} className="flex flex-col items-center justify-center text-[#C5A059] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
                <Home size={20} />
                <span className="text-[10px] uppercase font-bold mt-1">Menu</span>
             </button>
             <img src={shieldUrl} alt="Escudo" className="h-28 drop-shadow-xl" style={{ height: '7rem' }} />
          </div>
          <div className="text-right">
             <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] font-serif uppercase">Substituição da Frota</h1>
             <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif">FROTA 5ª RPM</p>
             <div className="text-right mt-1">
                 <span className="text-sm font-semibold text-white/90">Bem-vindo, {userEmail}</span>
             </div>
          </div>
        </div>
        <div className="bg-[#4A3B2A]/90 backdrop-blur-sm text-white/90">
          <div className="container mx-auto px-4 flex justify-end items-center py-2">
             <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-red-200 hover:text-red-100 hover:bg-red-900/30 rounded transition-colors text-sm font-semibold">
               <LogOut size={18} /> Sair
             </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-gray-400 flex items-center gap-4">
                <div className="bg-gray-100 p-3 rounded-full text-gray-600"><BarChart3 size={24}/></div>
                <div><p className="text-xs font-bold text-gray-500 uppercase">Total Lançado</p><p className="text-2xl font-black text-gray-800">{stats.total}</p></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500 flex items-center gap-4">
                <div className="bg-yellow-50 p-3 rounded-full text-yellow-600"><Clock size={24}/></div>
                <div><p className="text-xs font-bold text-yellow-600 uppercase">Pendentes</p><p className="text-2xl font-black text-gray-800">{stats.pending}</p></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-600 flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-full text-green-600"><Check size={24}/></div>
                <div><p className="text-xs font-bold text-green-600 uppercase">Concluídas</p><p className="text-2xl font-black text-gray-800">{stats.completed}</p></div>
            </div>
        </div>

        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-6 min-h-[600px]">
            <div className="flex flex-col space-y-4 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input type="text" placeholder="Buscar prefixo, placa ou BGPM..." className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto justify-end flex-wrap">
                        <label className="flex items-center gap-2 px-4 py-2 bg-[#556B2F] text-white rounded cursor-pointer hover:bg-[#435525] transition-colors shadow-sm font-bold whitespace-nowrap"><FileUp size={18} /> Importar<input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} /></label>
                        <button onClick={() => openModal()} className="px-6 py-2 bg-[#C5A059] text-[#3E3223] font-bold rounded hover:bg-[#b08d4a] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"><Plus size={20} /> Novo Registro</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <select className="bg-white border p-2 rounded text-sm outline-none" value={filterCity} onChange={e => setFilterCity(e.target.value)}><option value="ALL">Município: Todos</option>{uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <select className="bg-white border p-2 rounded text-sm outline-none" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}><option value="ALL">Unidade: Todas</option>{uniqueUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
                    <select className="bg-white border p-2 rounded text-sm outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}><option value="ALL">Status: Todos</option><option value="DONE">Concluído</option><option value="PENDING">Pendente</option><option value="NOT_REQUIRED">Não Necessário</option></select>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#3E3223]/20 shadow-inner bg-white">
                <table className="w-full text-left border-collapse text-base min-w-[1200px]">
                    <thead className="bg-[#3E3223] text-white select-none">
                        <tr className="bg-[#2a2218]">
                            <th colSpan={7} className="p-3 border-r border-[#3E3223] text-center text-[#C5A059] font-bold uppercase tracking-widest text-sm">Viatura Recebida</th>
                            <th colSpan={2} className="p-3 border-r border-[#3E3223] text-center text-[#C5A059] font-bold uppercase tracking-widest text-sm">Viatura Indicada</th>
                            <th rowSpan={2} className="p-3 text-center align-middle w-24 text-xs uppercase tracking-widest">Ações</th>
                        </tr>
                        <tr className="bg-[#3E3223] text-white text-[10px] uppercase font-bold tracking-widest border-t border-[#4A3B2A]">
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('received_bgpm')}>BGPM {renderSortIcon('received_bgpm')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('received_prefix')}>Prefixo {renderSortIcon('received_prefix')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('received_plate')}>Placa {renderSortIcon('received_plate')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('received_model')}>Modelo {renderSortIcon('received_model')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('received_city')}>Município {renderSortIcon('received_city')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('received_unit')}>Unidade {renderSortIcon('received_unit')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] text-center">Status</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('indicated_prefix')}>Prefixo {renderSortIcon('indicated_prefix')}</th>
                            <th className="p-3 border-r border-[#4A3B2A] cursor-pointer hover:bg-[#4A3B2A]" onClick={() => handleSort('indicated_plate')}>Placa {renderSortIcon('indicated_plate')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loading ? (
                             <tr><td colSpan={10} className="p-12 text-center text-gray-500 animate-pulse font-bold uppercase">Carregando dados...</td></tr>
                        ) : filteredItems.length === 0 ? (
                            <tr><td colSpan={10} className="p-12 text-center text-gray-500 italic">Nenhum registro encontrado.</td></tr>
                        ) : filteredItems.map((item) => {
                            const isCompleted = item.not_required || (item.indicated_prefix && item.indicated_plate);
                            const isReceivedDuplicate = receivedPlateCounts[item.received_plate?.toUpperCase().trim() || ''] > 1;
                            const isIndicatedDuplicate = item.indicated_plate && indicatedPlateCounts[item.indicated_plate?.toUpperCase().trim() || ''] > 1;

                            return (
                                <tr key={item.id} className={`border-b hover:bg-amber-50 group transition-colors ${item.not_required ? 'bg-blue-50/20' : ''}`}>
                                    <td className="p-3 border-r font-mono text-gray-500">{item.received_bgpm || '-'}</td>
                                    <td className="p-3 border-r font-bold text-[#3E3223]">{item.received_prefix}</td>
                                    <td className={`p-3 border-r font-bold font-mono text-gray-700 relative ${isReceivedDuplicate ? 'bg-red-50 ring-2 ring-inset ring-red-500 animate-pulse' : ''}`}>
                                        {item.received_plate}
                                        {isReceivedDuplicate && (
                                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] px-1 rounded-bl leading-tight font-black uppercase">Veículo Duplicado</div>
                                        )}
                                    </td>
                                    <td className="p-3 border-r text-gray-600 italic text-sm">{item.received_model || '-'}</td>
                                    <td className="p-3 border-r text-gray-600 uppercase text-sm">{item.received_city || '-'}</td>
                                    <td className="p-3 border-r text-gray-600 uppercase text-sm">{item.received_unit || '-'}</td>
                                    <td className="p-3 border-r text-center">
                                        {item.not_required ? <Info size={18} className="text-blue-500 mx-auto" /> : isCompleted ? <CheckCircle size={18} className="text-green-600 mx-auto" /> : <AlertCircle size={18} className="text-yellow-500 animate-pulse mx-auto" />}
                                    </td>
                                    <td className="p-3 border-r font-bold text-[#3E3223]">
                                        {item.not_required ? <span className="text-gray-400 font-normal italic">N/A</span> : (item.indicated_prefix || <span className="text-gray-300 font-normal italic">Pendente</span>)}
                                    </td>
                                    <td className={`p-3 border-r font-bold font-mono text-gray-700 relative ${isIndicatedDuplicate ? 'bg-red-50 ring-2 ring-inset ring-red-500 animate-pulse' : ''}`}>
                                        {item.not_required ? <span className="text-gray-400 font-normal italic">N/A</span> : (item.indicated_plate || <span className="text-gray-300 font-normal italic">-</span>)}
                                        {isIndicatedDuplicate && !item.not_required && (
                                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] px-1 rounded-bl leading-tight font-black uppercase">Veículo Duplicado</div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={16} /></button>
                                            <button onClick={() => setDeletingId(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL DE REGISTRO */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl border-t-8 border-[#C5A059] animate-fade-in my-8">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-[#3E3223] mb-6 flex items-center gap-2">{editingId ? 'Editar Registro' : 'Nova Substituição de Frota'}</h2>
                        
                        {/* AVISO DE DUPLICIDADE AO SALVAR */}
                        {duplicateWarning && (
                            <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 animate-bounce">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="text-red-600" />
                                    <div>
                                        <p className="text-red-800 font-bold">ALERTA DE CONFLITO!</p>
                                        <p className="text-sm text-red-700">A placa <strong>{duplicateWarning.plate}</strong> já está lançada no sistema como viatura {duplicateWarning.type === 'RECEIVED' ? 'recebida' : 'indicada'}.</p>
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => handleSave(true)} className="bg-red-600 text-white px-4 py-1.5 rounded text-xs font-black uppercase shadow-md hover:bg-red-700 transition-all">Desejo lançar assim mesmo</button>
                                            <button onClick={() => setDuplicateWarning(null)} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-xs font-bold hover:bg-gray-300 transition-all">Cancelar e Revisar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-green-50 p-5 rounded-lg border border-green-200 mb-6">
                            <h3 className="font-black text-green-800 mb-4 flex items-center gap-2 text-xs uppercase border-b border-green-200 pb-2"><Car size={16} /> 1. Viatura Recebida</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Prefixo *</label><input className="w-full border-2 border-green-100 p-2.5 rounded-lg focus:border-green-500 outline-none font-bold" value={formData.received_prefix} onChange={e => setFormData({...formData, received_prefix: e.target.value})} /></div>
                                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Placa *</label><input className="w-full border-2 border-green-100 p-2.5 rounded-lg focus:border-green-500 outline-none uppercase font-mono font-bold" value={formData.received_plate} onChange={e => setFormData({...formData, received_plate: e.target.value})} /></div>
                                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">BGPM</label><input className="w-full border-2 border-green-100 p-2.5 rounded-lg focus:border-green-500 outline-none font-mono" value={formData.received_bgpm} onChange={e => setFormData({...formData, received_bgpm: e.target.value})} /></div>
                                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Município</label><input className="w-full border-2 border-green-100 p-2.5 rounded-lg focus:border-green-500 outline-none font-semibold text-sm uppercase" value={formData.received_city} onChange={e => setFormData({...formData, received_city: e.target.value})} /></div>
                                <div><label className="block text-xs font-black text-gray-500 uppercase mb-1">Unidade</label><input className="w-full border-2 border-green-100 p-2.5 rounded-lg focus:border-green-500 outline-none text-sm uppercase" value={formData.received_unit} onChange={e => setFormData({...formData, received_unit: e.target.value})} /></div>
                                <div className="lg:col-span-3"><label className="block text-xs font-black text-gray-500 uppercase mb-1">Marca/Modelo Completo</label><input className="w-full border-2 border-green-100 p-2.5 rounded-lg focus:border-green-500 outline-none" value={formData.received_model} onChange={e => setFormData({...formData, received_model: e.target.value})} /></div>
                            </div>
                        </div>

                        <div className="bg-gray-100 p-5 rounded-lg border-2 border-dashed border-gray-300 mt-4 shadow-inner">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="font-black text-gray-600 flex items-center gap-2 text-xs uppercase"><Car size={16} /> 2. Viatura Indicada para Troca</h3>
                                <button onClick={() => setFormData({...formData, not_required: !formData.not_required})} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${formData.not_required ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{formData.not_required ? <CheckSquare size={14} /> : <Square size={14} />} TROCA NÃO NECESSÁRIA</button>
                            </div>
                            {!formData.not_required ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Prefixo (Substituta)</label><input className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:border-gray-400 outline-none bg-white font-bold" value={formData.indicated_prefix} onChange={e => setFormData({...formData, indicated_prefix: e.target.value})} /></div>
                                    <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Placa (Substituta)</label><input className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:border-gray-400 outline-none bg-white uppercase font-mono font-bold" value={formData.indicated_plate} onChange={e => setFormData({...formData, indicated_plate: e.target.value})} /></div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-4 bg-blue-50 text-blue-800 text-xs font-bold rounded animate-fade-in"><Info size={16} className="mr-2" /> MARCADO COMO NÃO NECESSÁRIA.</div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button onClick={() => { setIsModalOpen(false); setDuplicateWarning(null); }} className="px-8 py-2.5 text-gray-600 hover:bg-gray-100 rounded border font-bold">Cancelar</button>
                            <button onClick={() => handleSave(false)} className="px-10 py-2.5 bg-[#3E3223] text-[#C5A059] rounded-lg hover:bg-[#2a2218] shadow-lg font-black uppercase tracking-widest transition-all">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {deletingId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
                <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-red-600">
                    <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><Trash2 size={24} /> Confirmar Exclusão</h3>
                    <p className="text-gray-700 mb-6">Deseja remover permanentemente este registro?</p>
                    <div className="flex justify-end gap-3"><button onClick={() => setDeletingId(null)} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100">Cancelar</button><button onClick={async () => { await supabase.from('fleet_substitutions').delete().eq('id', deletingId); setDeletingId(null); fetchData(); }} className="px-4 py-2 bg-red-600 text-white rounded font-bold">Sim, Excluir</button></div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};
