
import React, { useState, useEffect } from 'react';
import { Home, CalendarClock, Plus, Search, Trash2, LogOut, Car, User, Clock, AlertTriangle, Edit, Settings, XCircle, Calendar, X, FileDown, FileText, AlertCircle, Layers, CalendarPlus, MousePointerClick, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VehicleSchedule, Vehicle } from '../types';
import { exportToExcel } from '../utils/excel';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface VehicleScheduleModuleProps {
  onBack: () => void;
  userEmail: string;
  onLogout: () => void;
}

export const VehicleScheduleModule: React.FC<VehicleScheduleModuleProps> = ({ onBack, userEmail, onLogout }) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  const [schedules, setSchedules] = useState<VehicleSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filtros
  const [viewMode, setViewMode] = useState<'FUTURE' | 'ALL'>('FUTURE');
  const [filterDate, setFilterDate] = useState(''); 
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFleetManagerOpen, setIsFleetManagerOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Validação
  const [conflictError, setConflictError] = useState<React.ReactNode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Lote
  const [isMultiDayMode, setIsMultiDayMode] = useState(false);
  const [multiDates, setMultiDates] = useState<string[]>([]);
  const [dateToAdd, setDateToAdd] = useState('');

  // Seleção
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Data
  const initialForm = {
    vehicle_prefix: '',
    start_date: '',
    end_date: '',
    start_hour: '',
    end_hour: '',
    driver_name: '',
    reason: '',
    observations: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [vehicleFormData, setVehicleFormData] = useState<Partial<Vehicle>>({ prefix: '', plate: '', model: '', fraction: '' });
  const [isEditingVehicleId, setIsEditingVehicleId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: schData, error: schError } = await supabase
            .from('vehicle_schedules')
            .select('*')
            .order('start_time', { ascending: true }); 
        
        if (schError) throw schError;
        setSchedules(schData || []);

        const { data: vData, error: vError } = await supabase
            .from('vehicles')
            .select('*')
            .order('prefix');
        
        if (vError) throw vError;
        setVehicles(vData || []);
    } catch (error: any) {
        console.error("Erro ao buscar dados:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const checkConflict = (newStart: Date, newEnd: Date, prefix: string, excludeId?: string): VehicleSchedule | null => {
      const vehicleSchedules = schedules.filter(s => s.vehicle_prefix === prefix);
      for (const schedule of vehicleSchedules) {
          if (excludeId && schedule.id === excludeId) continue;
          const existingStart = new Date(schedule.start_time);
          const existingEnd = new Date(schedule.end_time);
          if (newStart < existingEnd && newEnd > existingStart) {
              return schedule;
          }
      }
      return null; 
  };

  const handleOpenNew = () => {
      setIsModalOpen(true);
      setEditingScheduleId(null);
      setFormData(initialForm);
      setConflictError(null);
      setErrorMessage(null);
      setFormErrors({});
      setIsMultiDayMode(false); 
      setMultiDates([]);
      setDateToAdd('');
  };

  const handleOpenEdit = (schedule: VehicleSchedule) => {
      setIsModalOpen(true);
      setEditingScheduleId(schedule.id);
      const start = new Date(schedule.start_time);
      const end = new Date(schedule.end_time);
      setFormData({
          vehicle_prefix: schedule.vehicle_prefix,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
          start_hour: start.toTimeString().slice(0, 5),
          end_hour: end.toTimeString().slice(0, 5),
          driver_name: schedule.driver_name,
          reason: schedule.reason,
          observations: schedule.observations
      });
      setConflictError(null);
      setErrorMessage(null);
      setFormErrors({});
      setIsMultiDayMode(false);
      setMultiDates([]);
  };

  const addDateToList = () => {
    if (!dateToAdd) return;
    if (multiDates.includes(dateToAdd)) {
        alert("Esta data já foi adicionada.");
        return;
    }
    setMultiDates([...multiDates, dateToAdd].sort());
    setDateToAdd('');
  };

  const confirmDeleteSchedule = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from('vehicle_schedules').delete().eq('id', deletingId);
      if (error) throw error;
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleSaveSchedule = async (forceSave: boolean = false) => {
    setConflictError(null); 
    setErrorMessage(null);
    setFormErrors({});
    const requiredFieldsCommon = ['vehicle_prefix', 'start_hour', 'end_hour', 'driver_name', 'reason'];
    const newErrors: Record<string, boolean> = {};
    let hasEmptyFields = false;
    requiredFieldsCommon.forEach((field) => {
        if (!formData[field as keyof typeof formData]) { newErrors[field] = true; hasEmptyFields = true; }
    });
    if (isMultiDayMode) {
        if (multiDates.length === 0) { setErrorMessage("Adicione pelo menos uma data."); return; }
    } else {
        if (!formData.start_date) { newErrors['start_date'] = true; hasEmptyFields = true; }
        if (!formData.end_date) { newErrors['end_date'] = true; hasEmptyFields = true; }
    }
    if (hasEmptyFields) { setFormErrors(newErrors); setErrorMessage("Preencha todos os campos obrigatórios."); return; }
    
    const schedulesToInsert: any[] = [];
    if (isMultiDayMode) {
        for (const dateStr of multiDates) {
            const currentStart = new Date(`${dateStr}T${formData.start_hour}:00`);
            let currentEnd = new Date(`${dateStr}T${formData.end_hour}:00`);
            if (currentEnd <= currentStart) currentEnd.setDate(currentEnd.getDate() + 1);
            if (!forceSave) {
                const conflict = checkConflict(currentStart, currentEnd, formData.vehicle_prefix);
                if (conflict) {
                     setConflictError(
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm animate-fade-in">
                            <div className="flex items-center gap-2 text-red-700 font-bold mb-2"><XCircle size={20} /><span>CONFLITO EM {new Date(dateStr).toLocaleDateString('pt-BR')}</span></div>
                            <button onClick={() => handleSaveSchedule(true)} className="bg-red-600 text-white py-2 px-4 rounded text-sm font-bold">IGNORAR E SALVAR</button>
                        </div>
                    );
                    return; 
                }
            }
            schedulesToInsert.push({ vehicle_prefix: formData.vehicle_prefix, driver_name: formData.driver_name.toUpperCase(), reason: formData.reason.toUpperCase(), start_time: currentStart.toISOString(), end_time: currentEnd.toISOString(), observations: formData.observations });
        }
    } else {
        const startDateTime = new Date(`${formData.start_date}T${formData.start_hour}:00`);
        const endDateTime = new Date(`${formData.end_date}T${formData.end_hour}:00`);
        if (endDateTime <= startDateTime) { setErrorMessage("Término deve ser após o início."); return; }
        if (!forceSave) {
            const conflict = checkConflict(startDateTime, endDateTime, formData.vehicle_prefix, editingScheduleId || undefined);
            if (conflict) {
                setConflictError(
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm animate-fade-in">
                        <div className="flex items-center gap-2 text-red-700 font-bold mb-2"><XCircle size={20} /><span>CONFLITO DETECTADO</span></div>
                         <button onClick={() => handleSaveSchedule(true)} className="bg-red-600 text-white py-2 px-4 rounded text-sm font-bold">IGNORAR E SALVAR</button>
                    </div>
                );
                return;
            }
        }
        schedulesToInsert.push({ vehicle_prefix: formData.vehicle_prefix, driver_name: formData.driver_name.toUpperCase(), reason: formData.reason.toUpperCase(), start_time: startDateTime.toISOString(), end_time: endDateTime.toISOString(), observations: formData.observations });
    }
    try {
        if (editingScheduleId && !isMultiDayMode) {
            await supabase.from('vehicle_schedules').update(schedulesToInsert[0]).eq('id', editingScheduleId);
        } else {
            await supabase.from('vehicle_schedules').insert(schedulesToInsert);
        }
        setIsModalOpen(false);
        fetchData();
    } catch (e: any) { alert("Erro ao salvar."); }
  };

  const handleSaveVehicle = async () => {
      if(!vehicleFormData.prefix || !vehicleFormData.plate) return;
      try {
          if (isEditingVehicleId) await supabase.from('vehicles').update(vehicleFormData).eq('id', isEditingVehicleId);
          else await supabase.from('vehicles').insert([vehicleFormData]);
          setIsEditingVehicleId(null);
          setVehicleFormData({ prefix: '', plate: '', model: '', fraction: '' });
          fetchData();
      } catch (e) { alert("Erro ao salvar viatura."); }
  };

  const handleDeleteVehicle = async (id: string) => {
      if(!confirm("Deseja realmente excluir esta viatura da frota disponível?")) return;
      try {
          await supabase.from('vehicles').delete().eq('id', id);
          fetchData();
      } catch (e) { alert("Erro ao excluir."); }
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.text("Agenda de Viaturas - 5ª RPM", 14, 20);
      autoTable(doc, {
          startY: 30,
          head: [['Viatura', 'Motorista', 'Início', 'Término', 'Motivo']],
          body: filteredSchedules.map(s => [s.vehicle_prefix, s.driver_name, new Date(s.start_time).toLocaleString('pt-BR'), new Date(s.end_time).toLocaleString('pt-BR'), s.reason]),
      });
      doc.save("Agenda_5RPM.pdf");
  };

  const handleExportExcel = () => {
    const data = filteredSchedules.map(s => ({
        'Viatura': s.vehicle_prefix,
        'Motorista': s.driver_name,
        'Início': new Date(s.start_time).toLocaleString('pt-BR'),
        'Término': new Date(s.end_time).toLocaleString('pt-BR'),
        'Motivo': s.reason,
        'Observações': s.observations
    }));
    exportToExcel(data, 'Agenda_Viaturas_5RPM');
  };

  const toggleSelection = (id: string) => {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(item => item !== id));
      else setSelectedIds([...selectedIds, id]);
  };

  const filteredSchedules = schedules.filter(s => {
      const matchesSearch = s.vehicle_prefix.includes(search) || s.driver_name.toLowerCase().includes(search.toLowerCase());
      const matchesDate = filterDate ? (new Date(s.start_time).toISOString().split('T')[0] === filterDate) : true;
      const isFuture = new Date(s.end_time) > new Date();
      return matchesSearch && matchesDate && (viewMode === 'ALL' || isFuture);
  });

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
       <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          <div className="flex items-center gap-4 py-2">
             <button onClick={onBack} className="flex flex-col items-center justify-center text-[#C5A059] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
                <Home size={20} /><span className="text-[10px] uppercase font-bold mt-1">Menu</span>
             </button>
             <img src={shieldUrl} alt="Escudo" className="h-28 drop-shadow-xl" style={{ height: '7rem' }} />
          </div>
          <div className="text-right">
             <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] font-serif uppercase">AGENDA DE VIATURA</h1>
             <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif">FROTA 5ª RPM</p>
          </div>
        </div>
        <div className="bg-[#4A3B2A]/90 backdrop-blur-sm text-white/90 py-2">
          <div className="container mx-auto px-4 flex justify-end items-center"><button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-red-200 hover:text-red-100 hover:bg-red-900/30 rounded transition-colors text-sm font-semibold"><LogOut size={18} /> Sair</button></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow pb-24">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-6 min-h-[600px]">
            {/* TOOLBAR */}
            <div className="flex flex-col xl:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* BUSCA */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input type="text" placeholder="Buscar (Prefixo, Motorista...)" className="w-full pl-9 pr-4 py-2 border rounded-md outline-none text-sm focus:ring-1 focus:ring-[#C5A059]" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {/* DATA */}
                    <input type="date" className="border p-2 rounded-md outline-none text-sm text-gray-700 font-medium" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                    
                    {/* DROPDOWN DE FILTRO DE VISUALIZAÇÃO */}
                    <div className="relative w-full sm:w-56">
                        <select 
                            className="w-full pl-3 pr-10 py-2 border rounded-md outline-none text-sm font-bold text-gray-700 bg-white appearance-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as 'FUTURE' | 'ALL')}
                        >
                            <option value="FUTURE">Agendamentos Futuros</option>
                            <option value="ALL">Todos Agendamentos</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* SELECIONAR VÁRIOS */}
                    <button 
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }} 
                        className={`flex items-center gap-2 px-4 py-2 rounded font-bold border text-sm transition-colors ${isSelectionMode ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <MousePointerClick size={16}/> Selecionar Vários
                    </button>
                </div>

                {/* BOTÕES DE EXPORTAÇÃO E FROTA */}
                <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-[#00875A] text-white rounded font-bold text-sm hover:bg-[#006644] transition-colors"><FileDown size={16}/> Excel</button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-[#DE350B] text-white rounded font-bold text-sm hover:bg-[#BF2600] transition-colors"><FileText size={16}/> PDF</button>
                    <div className="h-8 w-px bg-gray-300 mx-1"></div>
                    <button onClick={() => setIsFleetManagerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#344563] text-white font-bold rounded text-sm hover:bg-[#253858] transition-colors"><Settings size={16}/> Frota</button>
                </div>
            </div>

            {/* BOTÃO NOVO */}
            <div className="mb-6 flex justify-end">
                <button onClick={handleOpenNew} className="flex items-center gap-2 px-8 py-2.5 bg-[#C5A059] text-[#3E3223] font-black rounded shadow-md hover:bg-[#B08D4A] transition-all uppercase tracking-wider"><Plus size={20}/> Novo</button>
            </div>

            {/* GRID DE AGENDAMENTOS COM LAYOUT RESTAURADO CONFORME IMAGEM */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSchedules.map(sch => (
                    <div key={sch.id} onClick={() => isSelectionMode && toggleSelection(sch.id)} className={`bg-white rounded-lg shadow-md p-4 border relative group cursor-pointer transition-all hover:shadow-lg ${selectedIds.includes(sch.id) ? 'ring-2 ring-orange-500 bg-orange-50 border-orange-500' : 'border-gray-100'}`}>
                        {/* PREFIXO PADRONIZADO (MARROM ESCURO / DOURADO) */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-[#3E3223] text-[#C5A059] font-bold px-4 py-1.5 rounded-md text-2xl flex items-center gap-3 shadow-sm">
                                <Car size={24} /> {sch.vehicle_prefix}
                            </div>
                        </div>
                        
                        {/* DATAS PADRONIZADAS (EM LINHAS SEPARADAS) */}
                        <div className="space-y-1 mb-4">
                            <div className="flex items-center gap-2 text-gray-700 font-bold text-lg">
                                <Calendar size={20} className="text-[#C5A059]" /> 
                                {new Date(sch.start_time).toLocaleDateString('pt-BR')} {new Date(sch.start_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </div>
                            <div className="text-gray-400 text-xs ml-8 font-semibold">até</div>
                            <div className="flex items-center gap-2 text-gray-700 font-bold text-lg">
                                <Calendar size={20} className="text-[#C5A059]" /> 
                                {new Date(sch.end_time).toLocaleDateString('pt-BR')} {new Date(sch.end_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </div>
                        </div>

                        {/* MOTORISTA COM ÍCONE */}
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm uppercase mb-4">
                            <User size={16} className="text-gray-400" />
                            {sch.driver_name}
                        </div>

                        {/* BLOCO DE MOTIVO (FUNDO CINZA) */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-[14px] text-gray-600">
                                <span className="font-bold text-gray-700">Motivo:</span> <span className="italic uppercase ml-1">{sch.reason}</span>
                            </div>
                        </div>
                        
                        {!isSelectionMode && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(sch); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                <button onClick={(e) => { e.stopPropagation(); setDeletingId(sch.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* MODAL DE GERENCIAMENTO DE FROTA */}
        {isFleetManagerOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-t-8 border-[#344563]">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-[#344563] flex items-center gap-2"><Settings/> Gerenciar Frota Disponível</h2>
                        <button onClick={() => setIsFleetManagerOpen(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
                    </div>
                    
                    <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                        <div className="bg-gray-50 p-4 rounded-lg border mb-6 shadow-inner">
                            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">{isEditingVehicleId ? "Editar Viatura" : "Adicionar Nova Viatura"}</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input placeholder="Prefixo (Ex: 12345)" className="border p-2 rounded outline-none focus:ring-1 focus:ring-blue-400 font-bold" value={vehicleFormData.prefix} onChange={e => setVehicleFormData({...vehicleFormData, prefix: e.target.value})} />
                                <input placeholder="Placa (Ex: ABC1234)" className="border p-2 rounded outline-none focus:ring-1 focus:ring-blue-400 uppercase font-mono" value={vehicleFormData.plate} onChange={e => setVehicleFormData({...vehicleFormData, plate: e.target.value.toUpperCase()})} />
                                <input placeholder="Marca / Modelo" className="border p-2 rounded outline-none focus:ring-1 focus:ring-blue-400" value={vehicleFormData.model} onChange={e => setVehicleFormData({...vehicleFormData, model: e.target.value})} />
                                <input placeholder="Fração / Unidade" className="border p-2 rounded outline-none focus:ring-1 focus:ring-blue-400" value={vehicleFormData.fraction} onChange={e => setVehicleFormData({...vehicleFormData, fraction: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2">
                                {isEditingVehicleId && <button onClick={() => { setIsEditingVehicleId(null); setVehicleFormData({ prefix: '', plate: '', model: '', fraction: '' }); }} className="px-4 py-1 text-xs font-bold text-gray-500">Cancelar</button>}
                                <button onClick={handleSaveVehicle} className="bg-blue-600 text-white px-6 py-2 rounded font-bold text-sm shadow hover:bg-blue-700">{isEditingVehicleId ? "Salvar" : "Cadastrar"}</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Viaturas Disponíveis ({vehicles.length})</h3>
                            {vehicles.map(v => (
                                <div key={v.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 p-2 rounded text-gray-600"><Car size={18}/></div>
                                        <div>
                                            <div className="font-bold text-gray-800">{v.prefix}</div>
                                            <div className="text-xs text-gray-500 font-mono uppercase">{v.plate} - {v.model}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setIsEditingVehicleId(v.id); setVehicleFormData(v); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit size={16}/></button>
                                        <button onClick={() => handleDeleteVehicle(v.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 border-t bg-gray-50 text-right rounded-b-lg">
                        <button onClick={() => setIsFleetManagerOpen(false)} className="bg-gray-800 text-white px-8 py-2 rounded font-bold hover:bg-black transition-colors">Fechar</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE AGENDAMENTO COM CABEÇALHO/RODAPÉ FIXOS E CORPO ROLÁVEL */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border-t-8 border-[#C5A059] animate-fade-in flex flex-col max-h-[90vh]">
                    {/* Cabeçalho Fixo */}
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold text-[#3E3223] flex items-center gap-2">
                                <CalendarClock /> {editingScheduleId ? 'Editar Agendamento' : 'Novo Agendamento'}
                            </h2>
                            {!editingScheduleId && (
                                <button onClick={() => setIsMultiDayMode(!isMultiDayMode)} className={`text-[10px] px-3 py-2 rounded-lg font-bold flex items-center gap-2 ${isMultiDayMode ? 'bg-indigo-600 text-white' : 'bg-[#7077FF] text-white'} shadow-sm`}>
                                    {isMultiDayMode ? <Layers size={14} /> : <CalendarPlus size={14} />} 
                                    {isMultiDayMode ? "LOTE ATIVO" : "AGENDAR VÁRIOS DIAS"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Corpo Rolável */}
                    <div className="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-4">
                        {errorMessage && <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded text-red-700 text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/> {errorMessage}</div>}
                        {conflictError}
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Viatura *</label>
                            <select className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059] bg-white text-gray-800" value={formData.vehicle_prefix} onChange={e => setFormData({...formData, vehicle_prefix: e.target.value})}>
                                <option value="">Selecione a viatura...</option>
                                {vehicles.map(v => <option key={v.id} value={v.prefix}>{v.prefix} - {v.model}</option>)}
                            </select>
                        </div>

                        {isMultiDayMode ? (
                            <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                <h4 className="font-bold text-xs text-blue-800 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Datas selecionadas</h4>
                                <div className="flex gap-2 mb-3">
                                    <input type="date" className="border p-2 rounded flex-grow text-sm outline-none focus:ring-1 focus:ring-blue-500" value={dateToAdd} onChange={e => setDateToAdd(e.target.value)} />
                                    <button onClick={addDateToList} className="bg-blue-600 text-white px-4 rounded text-xs font-bold hover:bg-blue-700">ADD</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {multiDates.map(d => (
                                        <div key={d} className="bg-white border px-3 py-1 rounded-full text-xs flex items-center gap-2 font-bold text-gray-700">
                                            <span>{new Date(d).toLocaleDateString('pt-BR')}</span>
                                            <button onClick={() => setMultiDates(multiDates.filter(x => x !== d))}><XCircle size={12} className="text-red-400 hover:text-red-600"/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div><label className="text-[10px] font-bold text-blue-800 uppercase">Horário Saída</label><input type="time" className="w-full border p-2 rounded text-sm outline-none" value={formData.start_hour} onChange={e => setFormData({...formData, start_hour: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-bold text-blue-800 uppercase">Horário Retorno</label><input type="time" className="w-full border p-2 rounded text-sm outline-none" value={formData.end_hour} onChange={e => setFormData({...formData, end_hour: e.target.value})} /></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Saída (Início)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-[#C5A059]" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                                        <input type="time" className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-[#C5A059]" value={formData.start_hour} onChange={e => setFormData({...formData, start_hour: e.target.value})} />
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">Chegada (Previsão)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-[#C5A059]" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                                        <input type="time" className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-[#C5A059]" value={formData.end_hour} onChange={e => setFormData({...formData, end_hour: e.target.value})} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Motorista / Responsável *</label><input className="w-full border p-2 rounded uppercase font-bold text-gray-800 outline-none focus:ring-1 focus:ring-[#C5A059]" placeholder="POSTO/GRAD E NOME" value={formData.driver_name} onChange={e => setFormData({...formData, driver_name: e.target.value.toUpperCase()})} /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Motivo do Empréstimo *</label><input className="w-full border p-2 rounded uppercase text-sm outline-none focus:ring-1 focus:ring-[#C5A059]" placeholder="EX: APOIO A EVENTO, MANUTENÇÃO, MISSÃO..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value.toUpperCase()})} /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Observações</label><textarea className="w-full border p-2 rounded h-20 outline-none focus:ring-1 focus:ring-[#C5A059] text-sm resize-none" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Detalhes adicionais..." /></div>
                    </div>

                    {/* Rodapé Fixo */}
                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded border font-bold transition-colors">Cancelar</button>
                        <button onClick={() => handleSaveSchedule(false)} className="px-6 py-2 bg-[#3E3223] text-[#C5A059] rounded hover:bg-black font-black uppercase tracking-widest shadow-md transition-all">Salvar</button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Exclusão */}
        {deletingId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]"><div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-red-600"><h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><AlertTriangle /> Confirmar Exclusão</h3><p className="text-gray-700 mb-6 text-sm">Deseja realmente cancelar este agendamento?</p><div className="flex justify-end gap-3"><button onClick={() => setDeletingId(null)} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 transition-colors">Cancelar</button><button onClick={confirmDeleteSchedule} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-colors">Sim, Excluir</button></div></div></div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #C5A059; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3E3223; }
      `}</style>
    </div>
  );
};
