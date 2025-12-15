import React, { useState, useEffect } from 'react';
import { Home, CalendarClock, Plus, Search, Trash2, LogOut, Car, User, Clock, AlertTriangle, Info, Truck, Edit, Settings, CheckSquare, Square, XCircle, Calendar, X, FileDown, FileText, ArrowRight, AlertCircle } from 'lucide-react';
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

  // Estados
  const [schedules, setSchedules] = useState<VehicleSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filtros
  const [showFutureOnly, setShowFutureOnly] = useState(false);
  const [filterDate, setFilterDate] = useState(''); // Filtro por data específica
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFleetManagerOpen, setIsFleetManagerOpen] = useState(false);
  
  // Estado de Edição de Agendamento
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Estados de Erro e Validação
  const [conflictError, setConflictError] = useState<React.ReactNode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Erros gerais de validação
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({}); // Campos específicos com erro

  // Form Data Agendamento
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

  // Form Data Viatura (Gerenciamento)
  const [vehicleFormData, setVehicleFormData] = useState<Partial<Vehicle>>({});
  const [isEditingVehicle, setIsEditingVehicle] = useState<Vehicle | null>(null);

  // Exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
        // Buscar agendamentos
        const { data: schData, error: schError } = await supabase
            .from('vehicle_schedules')
            .select('*')
            .order('start_time', { ascending: false });
        
        if (schError) throw schError;
        setSchedules(schData || []);

        // Buscar viaturas para o dropdown
        const { data: vData, error: vError } = await supabase
            .from('vehicles')
            .select('*')
            .order('prefix');
        
        if (vError) throw vError;
        setVehicles(vData || []);

    } catch (error: any) {
        console.error("Erro ao buscar dados:", error);
        const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        alert(`Erro ao carregar dados da agenda: ${msg}`);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- LÓGICA DE AGENDAMENTO ---

  // Verificar Conflito de Horário e retornar o agendamento conflitante
  const checkConflict = (newStart: Date, newEnd: Date, prefix: string, excludeId?: string): VehicleSchedule | null => {
      // Filtra agendamentos da mesma viatura
      const vehicleSchedules = schedules.filter(s => s.vehicle_prefix === prefix);

      for (const schedule of vehicleSchedules) {
          // Se estiver editando, ignorar o próprio agendamento atual
          if (excludeId && schedule.id === excludeId) continue;

          const existingStart = new Date(schedule.start_time);
          const existingEnd = new Date(schedule.end_time);

          // Lógica de colisão de intervalos:
          // (StartA < EndB) e (EndA > StartB)
          if (newStart < existingEnd && newEnd > existingStart) {
              return schedule; // Retorna o agendamento que causou conflito
          }
      }
      return null; // Sem conflito
  };

  const handleOpenEdit = (schedule: VehicleSchedule) => {
      setConflictError(null);
      setErrorMessage(null);
      setFormErrors({});
      
      const startDate = new Date(schedule.start_time);
      const endDate = new Date(schedule.end_time);

      // Formatar para inputs (YYYY-MM-DD e HH:MM)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const startHour = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const endHour = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      setFormData({
          vehicle_prefix: schedule.vehicle_prefix,
          start_date: startDateStr,
          end_date: endDateStr,
          start_hour: startHour,
          end_hour: endHour,
          driver_name: schedule.driver_name,
          reason: schedule.reason,
          observations: schedule.observations || ''
      });
      setEditingScheduleId(schedule.id);
      setIsModalOpen(true);
  };

  const handleOpenNew = () => {
      setIsModalOpen(true);
      setEditingScheduleId(null);
      setFormData(initialForm);
      setConflictError(null);
      setErrorMessage(null);
      setFormErrors({});
  };

  // Helper para classes de input com erro visual
  const getInputClass = (field: keyof typeof initialForm) => {
      const baseClass = "w-full border p-2 rounded outline-none transition-colors ";
      if (formErrors[field]) {
          return baseClass + "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300";
      }
      return baseClass + "focus:ring-2 focus:ring-[#C5A059]";
  };

  const handleSaveSchedule = async () => {
    setConflictError(null); 
    setErrorMessage(null);
    setFormErrors({});

    // 1. Validação de Campos Obrigatórios
    const requiredFields = ['vehicle_prefix', 'start_date', 'end_date', 'start_hour', 'end_hour', 'driver_name', 'reason'];
    const newErrors: Record<string, boolean> = {};
    let hasEmptyFields = false;

    requiredFields.forEach((field) => {
        if (!formData[field as keyof typeof formData]) {
            newErrors[field] = true;
            hasEmptyFields = true;
        }
    });

    if (hasEmptyFields) {
        setFormErrors(newErrors);
        setErrorMessage("Por favor, preencha todos os campos obrigatórios destacados em vermelho.");
        return;
    }

    // 2. Validação Lógica de Data/Hora
    const startDateTime = new Date(`${formData.start_date}T${formData.start_hour}:00`);
    const endDateTime = new Date(`${formData.end_date}T${formData.end_hour}:00`);

    // Valida se as datas são válidas (ex: usuário digitou hora 25:00 manualmente)
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setErrorMessage("Horário ou data inválida. Verifique os campos.");
        return;
    }

    if (endDateTime <= startDateTime) {
        setFormErrors({
            ...newErrors,
            end_date: true,
            end_hour: true,
            start_date: true,
            start_hour: true
        });
        setErrorMessage("A data/hora de término deve ser posterior à data/hora de início.");
        return;
    }

    // 3. Verificar Conflito
    const conflictingSchedule = checkConflict(
        startDateTime, 
        endDateTime, 
        formData.vehicle_prefix, 
        editingScheduleId || undefined
    );

    if (conflictingSchedule) {
        const conflictStart = new Date(conflictingSchedule.start_time);
        const conflictEnd = new Date(conflictingSchedule.end_time);
        
        const formatConflict = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        // Define a mensagem de erro visual para aparecer DENTRO do modal
        setConflictError(
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                    <XCircle size={20} />
                    <span>CONFLITO DE AGENDA DETECTADO</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                    A viatura <strong>{formData.vehicle_prefix}</strong> já possui um agendamento neste intervalo:
                </p>
                <div className="bg-white p-3 rounded border border-red-200 text-sm shadow-inner">
                    <p className="text-gray-800">
                        <strong>Período Ocupado:</strong><br/>
                        <span className="text-red-600 font-bold">
                            {formatConflict(conflictStart)} até {formatConflict(conflictEnd)}
                        </span>
                    </p>
                    <p className="text-gray-800 mt-1"><strong>Responsável:</strong> {conflictingSchedule.driver_name}</p>
                    <p className="text-gray-800"><strong>Motivo:</strong> {conflictingSchedule.reason}</p>
                </div>
                <p className="text-xs text-red-600 mt-3 font-bold text-center uppercase">
                    Por favor, altere o horário ou a viatura acima para prosseguir.
                </p>
            </div>
        );
        return; // Interrompe o salvamento
    }

    try {
        const payload = {
            vehicle_prefix: formData.vehicle_prefix,
            driver_name: formData.driver_name.toUpperCase(),
            reason: formData.reason,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            observations: formData.observations
        };

        if (editingScheduleId) {
            // Update
            const { error } = await supabase
                .from('vehicle_schedules')
                .update(payload)
                .eq('id', editingScheduleId);
            if (error) throw error;
            alert("Agendamento atualizado com sucesso!");
        } else {
            // Insert
            const { error } = await supabase.from('vehicle_schedules').insert([payload]);
            if (error) throw error;
            alert("Agendamento realizado com sucesso!");
        }

        setIsModalOpen(false);
        setFormData(initialForm);
        setEditingScheduleId(null);
        setConflictError(null);
        setErrorMessage(null);
        setFormErrors({});
        fetchData();

    } catch (e: any) {
        const msg = e.message || JSON.stringify(e);
        alert(`Erro ao salvar: ${msg}`);
    }
  };

  const confirmDeleteSchedule = async () => {
      if (!deletingId) return;
      try {
          const { error } = await supabase.from('vehicle_schedules').delete().eq('id', deletingId);
          if (error) throw error;
          fetchData();
      } catch (e: any) {
          const msg = e.message || JSON.stringify(e);
          alert(`Erro ao excluir: ${msg}`);
      } finally {
          setDeletingId(null);
      }
  };

  // --- LÓGICA DE GERENCIAMENTO DE FROTA ---

  const handleSaveVehicle = async () => {
      if(!vehicleFormData.prefix || !vehicleFormData.plate) {
          alert("Prefixo e Placa são obrigatórios.");
          return;
      }

      const payload = {
          prefix: vehicleFormData.prefix,
          plate: vehicleFormData.plate,
          model: vehicleFormData.model || '',
          fraction: vehicleFormData.fraction || ''
      };

      try {
          if (isEditingVehicle && isEditingVehicle.id) {
              const { error } = await supabase.from('vehicles').update(payload).eq('id', isEditingVehicle.id);
              if (error) throw error;
              alert("Viatura atualizada!");
          } else {
              const { error } = await supabase.from('vehicles').insert([payload]);
              if (error) throw error;
              alert("Viatura cadastrada!");
          }
          
          setIsEditingVehicle(null);
          setVehicleFormData({});
          
          // Recarregar viaturas
          const { data: vData } = await supabase.from('vehicles').select('*').order('prefix');
          if (vData) setVehicles(vData);

      } catch (e: any) {
          alert("Erro ao salvar viatura: " + e.message);
      }
  };

  const handleDeleteVehicle = async (id: string) => {
      if (!window.confirm("Tem certeza que deseja excluir esta viatura?")) return;
      try {
          const { error } = await supabase.from('vehicles').delete().eq('id', id);
          if (error) throw error;
          
          // Recarregar viaturas
          const { data: vData } = await supabase.from('vehicles').select('*').order('prefix');
          if (vData) setVehicles(vData);
      } catch (e: any) {
          alert("Erro ao excluir viatura: " + e.message);
      }
  };

  // --- EXPORTAÇÃO ---

  const handleExportExcel = () => {
      const dataToExport = filteredSchedules.map(s => {
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          return {
              "Viatura": s.vehicle_prefix,
              "Motorista": s.driver_name,
              "Início": start.toLocaleString('pt-BR'),
              "Término": end.toLocaleString('pt-BR'),
              "Motivo": s.reason,
              "Observações": s.observations || ''
          };
      });
      exportToExcel(dataToExport, "Agenda_Viaturas_5RPM");
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.setTextColor(62, 50, 35); // Cor PMMG Primary
      doc.text("Agenda de Viaturas - 5ª RPM", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);
      if (filterDate) {
          doc.text(`Filtro de Data: ${new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 31);
      }

      // Tabela
      const tableData = filteredSchedules.map(s => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        return [
            s.vehicle_prefix,
            s.driver_name,
            start.toLocaleString('pt-BR'),
            end.toLocaleString('pt-BR'),
            s.reason
        ];
      });

      autoTable(doc, {
          startY: 35,
          head: [['Viatura', 'Motorista', 'Início', 'Término', 'Motivo']],
          body: tableData,
          headStyles: { fillColor: [62, 50, 35], textColor: 255 }, // #3E3223
          alternateRowStyles: { fillColor: [253, 251, 247] }, // #fdfbf7
          styles: { fontSize: 8 },
      });

      doc.save("Agenda_Viaturas_5RPM.pdf");
  };

  // Formatação para exibição
  const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      return {
          obj: date,
          date: date.toLocaleDateString('pt-BR'),
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
  };

  // Filtragem Principal
  const filteredSchedules = schedules.filter(s => {
      // 1. Busca por Texto
      const matchesSearch = 
        s.vehicle_prefix.includes(search) || 
        s.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        s.reason.toLowerCase().includes(search.toLowerCase());
      
      // 2. Filtro Apenas Futuros
      const matchesFuture = showFutureOnly 
        ? new Date(s.end_time) > new Date() 
        : true;

      // 3. Filtro por Data Específica (Calendário)
      // Se tiver data selecionada, verifica se o agendamento ocorre naquele dia (interseção)
      const matchesDate = filterDate ? (() => {
          const selectedStart = new Date(`${filterDate}T00:00:00`);
          const selectedEnd = new Date(`${filterDate}T23:59:59`);
          const scheduleStart = new Date(s.start_time);
          const scheduleEnd = new Date(s.end_time);

          // Verifica se há sobreposição de intervalos
          // (InicioAgendamento <= FimDiaSelecionado) E (FimAgendamento >= InicioDiaSelecionado)
          return scheduleStart <= selectedEnd && scheduleEnd >= selectedStart;
      })() : true;

      return matchesSearch && matchesFuture && matchesDate;
  });

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
       {/* Header */}
       <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          <div className="flex items-center gap-4 py-2">
             <button 
                onClick={onBack}
                className="flex flex-col items-center justify-center text-[#C5A059] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
             >
                <Home size={20} />
                <span className="text-[10px] uppercase font-bold mt-1">Menu</span>
             </button>
             <img src={shieldUrl} alt="Escudo" className="h-28 drop-shadow-xl" style={{ height: '7rem' }} />
          </div>
          
          <div className="text-right">
             <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] font-serif uppercase">
               AGENDA DE VIATURA
             </h1>
             <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif">
                FROTA 5ª RPM
             </p>
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
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-6 min-h-[600px]">
            
            {/* Barra de Ações e Filtros */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
                
                {/* Grupo de Pesquisa e Filtros */}
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1">
                    
                    {/* Campo de Busca Texto */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Buscar (Prefixo, Motorista...)"
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filtro de Data (Calendário) */}
                    <div className="relative w-full md:w-auto flex items-center">
                        <div className="relative w-full">
                            <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            <input 
                                type="date"
                                className="w-full md:w-48 pl-10 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none text-gray-700"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                title="Filtrar por data específica"
                            />
                            {filterDate && (
                                <button 
                                    onClick={() => setFilterDate('')}
                                    className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                                    title="Limpar filtro de data"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Toggle Apenas Futuros */}
                    <button
                        onClick={() => setShowFutureOnly(!showFutureOnly)}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-bold border transition-colors whitespace-nowrap ${
                            showFutureOnly 
                            ? 'bg-blue-600 text-white border-blue-700' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title={showFutureOnly ? "Exibindo apenas agendamentos futuros" : "Exibindo histórico completo"}
                    >
                        {showFutureOnly ? <CheckSquare size={18} /> : <Square size={18} />}
                        {showFutureOnly ? "Apenas Agendas Futuras" : "Filtrar Agendas Futuras"}
                    </button>
                </div>

                {/* Botões de Ação (Direita) */}
                <div className="flex gap-2 w-full xl:w-auto justify-end flex-wrap">
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                        title="Exportar Excel"
                    >
                        <FileDown size={18} /> 
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                        title="Exportar PDF"
                    >
                        <FileText size={18} /> 
                        <span className="hidden sm:inline">PDF</span>
                    </button>

                    <div className="w-px bg-gray-300 mx-1 hidden xl:block"></div>

                    <button 
                        onClick={() => { setIsFleetManagerOpen(true); setIsEditingVehicle(null); setVehicleFormData({}); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700 transition-colors shadow-sm whitespace-nowrap"
                        title="Gerenciar Frota"
                    >
                        <Settings size={20} /> <span className="hidden sm:inline">Frota</span>
                    </button>
                    <button 
                        onClick={handleOpenNew}
                        className="flex items-center gap-2 px-6 py-2 bg-[#C5A059] text-[#3E3223] font-bold rounded hover:bg-[#b08d4a] transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus size={20} /> Novo
                    </button>
                </div>
            </div>

            {/* Lista de Agendamentos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-gray-500">Carregando agenda...</div>
                ) : filteredSchedules.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2">
                        <CalendarClock size={48} className="text-gray-300" />
                        <p>Nenhum agendamento encontrado com os filtros atuais.</p>
                        {filterDate && <p className="text-sm text-blue-600">Filtro ativo: {new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                    </div>
                ) : (
                    filteredSchedules.map(sch => {
                        const start = formatDateTime(sch.start_time);
                        const end = formatDateTime(sch.end_time);
                        const isSameDay = start.date === end.date;
                        const isToday = new Date(sch.start_time).toDateString() === new Date().toDateString();

                        return (
                            <div key={sch.id} className={`bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col relative group ${isToday ? 'border-[#C5A059]' : 'border-gray-300'}`}>
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button 
                                        onClick={() => handleOpenEdit(sch)}
                                        className="text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 p-1 rounded"
                                        title="Editar Agendamento"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setDeletingId(sch.id)}
                                        className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1 rounded"
                                        title="Cancelar Agendamento"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <div className="bg-[#3E3223] text-[#C5A059] font-bold font-mono px-2 py-1 rounded text-sm flex items-center gap-1">
                                        <Car size={14} /> {sch.vehicle_prefix}
                                    </div>
                                    {isToday && (
                                        <div className="text-xs font-bold text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wide">
                                            HOJE
                                        </div>
                                    )}
                                </div>

                                <div className="text-[#3E3223] text-lg mb-1">
                                    {isSameDay ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{start.date}</span>
                                            <span className="font-bold flex items-center gap-1 text-[#C5A059]">
                                                <Clock size={16} /> {start.time} às {end.time}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                <span>{start.date} {start.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                                                <ArrowRight size={12} /> Até
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                <span>{end.date} {end.time}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-gray-700 text-sm mb-1 mt-2">
                                    <User size={14} /> {sch.driver_name}
                                </div>
                                
                                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 italic mt-2 border border-gray-100">
                                    <span className="font-bold not-italic text-gray-700">Motivo:</span> {sch.reason}
                                </div>

                                {sch.observations && (
                                    <div className="mt-2 text-xs text-blue-600 flex items-start gap-1">
                                        <Info size={12} className="mt-0.5 shrink-0" /> {sch.observations}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Modal de Cadastro/Edição de Agendamento */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border-t-8 border-[#C5A059] my-8 animate-fade-in">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-[#3E3223] mb-6 flex items-center gap-2">
                            <CalendarClock /> {editingScheduleId ? 'Editar Agendamento' : 'Novo Agendamento'}
                        </h2>

                        {/* MENSAGEM DE ERRO GERAL (Validação ou Conflito) */}
                        {errorMessage && (
                            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded flex items-start gap-3">
                                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold">Atenção!</p>
                                    <p className="text-sm">{errorMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* EXIBIÇÃO DE ERRO DE CONFLITO */}
                        {conflictError && (
                            <div className="mb-6">
                                {conflictError}
                            </div>
                        )}

                        <div className="space-y-4">
                            
                            {/* Seleção de Viatura */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Viatura <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <div className="relative w-full">
                                        <Car className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <select 
                                            className={getInputClass('vehicle_prefix') + " pl-10 appearance-none bg-white"}
                                            value={formData.vehicle_prefix}
                                            onChange={e => setFormData({...formData, vehicle_prefix: e.target.value})}
                                        >
                                            <option value="">Selecione a viatura...</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.prefix}>{v.prefix} - {v.model} ({v.fraction})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={() => { setIsFleetManagerOpen(true); setIsEditingVehicle(null); setVehicleFormData({}); }}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-3"
                                        title="Cadastrar Nova Viatura"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Data e Hora Início */}
                            <div className={`bg-gray-50 p-3 rounded border ${formErrors.start_date || formErrors.start_hour ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                <span className={`text-xs font-bold uppercase block mb-2 ${formErrors.start_date || formErrors.start_hour ? 'text-red-600' : 'text-gray-500'}`}>Saída (Início)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Data <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date"
                                            className={getInputClass('start_date')}
                                            value={formData.start_date}
                                            onChange={e => setFormData({...formData, start_date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
                                        <input 
                                            type="time"
                                            className={getInputClass('start_hour')}
                                            value={formData.start_hour}
                                            onChange={e => setFormData({...formData, start_hour: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Data e Hora Término */}
                            <div className={`bg-gray-50 p-3 rounded border ${formErrors.end_date || formErrors.end_hour ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                <span className={`text-xs font-bold uppercase block mb-2 ${formErrors.end_date || formErrors.end_hour ? 'text-red-600' : 'text-gray-500'}`}>Chegada (Término Previsto)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Data <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date"
                                            className={getInputClass('end_date')}
                                            value={formData.end_date}
                                            onChange={e => setFormData({...formData, end_date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
                                        <input 
                                            type="time"
                                            className={getInputClass('end_hour')}
                                            value={formData.end_hour}
                                            onChange={e => setFormData({...formData, end_hour: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Motorista e Motivo */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Motorista / Responsável <span className="text-red-500">*</span></label>
                                <input 
                                    className={getInputClass('driver_name') + " uppercase"}
                                    placeholder="Posto/Grad e Nome"
                                    value={formData.driver_name}
                                    onChange={e => setFormData({...formData, driver_name: e.target.value.toUpperCase()})}
                                    
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Motivo do Empréstimo <span className="text-red-500">*</span></label>
                                <input 
                                    className={getInputClass('reason')}
                                    placeholder="Ex: Apoio a evento, Manutenção, Missão..."
                                    value={formData.reason}
                                    onChange={e => setFormData({...formData, reason: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
                                <textarea 
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none resize-none h-20"
                                    placeholder="Detalhes adicionais..."
                                    value={formData.observations}
                                    onChange={e => setFormData({...formData, observations: e.target.value})}
                                />
                            </div>

                            {!conflictError && !errorMessage && (
                                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 flex items-start gap-2">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    O sistema verificará automaticamente conflitos de horário para a viatura selecionada.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8 border-t pt-4">
                            <button 
                                onClick={() => { setIsModalOpen(false); setEditingScheduleId(null); setFormData(initialForm); setConflictError(null); setErrorMessage(null); setFormErrors({}); }}
                                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded border font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveSchedule}
                                className="px-6 py-2 bg-[#3E3223] text-white rounded hover:bg-[#2a2218] shadow-md font-bold transition-colors"
                            >
                                {editingScheduleId ? 'Salvar Alterações' : 'Agendar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal Gerenciamento de Frota (Mini CRUD) */}
        {isFleetManagerOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl border-t-8 border-gray-600 animate-fade-in flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Truck /> Gerenciar Frota
                        </h2>
                        <button onClick={() => setIsFleetManagerOpen(false)} className="text-gray-500 hover:text-gray-800">
                            <LogOut size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-grow">
                        {/* Formulário de Viatura */}
                        <div className="bg-gray-100 p-4 rounded mb-6 border">
                            <h3 className="font-bold text-sm mb-3 text-gray-700">{isEditingVehicle ? 'Editar Viatura' : 'Nova Viatura'}</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input 
                                    className="border p-2 rounded text-sm" 
                                    placeholder="Prefixo (Ex: 12345)"
                                    value={vehicleFormData.prefix || ''}
                                    onChange={e => setVehicleFormData({...vehicleFormData, prefix: e.target.value})}
                                />
                                <input 
                                    className="border p-2 rounded text-sm" 
                                    placeholder="Placa"
                                    value={vehicleFormData.plate || ''}
                                    onChange={e => setVehicleFormData({...vehicleFormData, plate: e.target.value})}
                                />
                                <input 
                                    className="border p-2 rounded text-sm" 
                                    placeholder="Modelo"
                                    value={vehicleFormData.model || ''}
                                    onChange={e => setVehicleFormData({...vehicleFormData, model: e.target.value})}
                                />
                                <input 
                                    className="border p-2 rounded text-sm" 
                                    placeholder="Fração/Unidade"
                                    value={vehicleFormData.fraction || ''}
                                    onChange={e => setVehicleFormData({...vehicleFormData, fraction: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                {isEditingVehicle && (
                                    <button 
                                        onClick={() => { setIsEditingVehicle(null); setVehicleFormData({}); }}
                                        className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                                    >
                                        Cancelar Edição
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveVehicle}
                                    className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
                                >
                                    {isEditingVehicle ? 'Salvar Alterações' : 'Cadastrar Viatura'}
                                </button>
                            </div>
                        </div>

                        {/* Lista de Viaturas */}
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="p-2">Prefixo</th>
                                    <th className="p-2">Modelo</th>
                                    <th className="p-2">Unidade</th>
                                    <th className="p-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map(v => (
                                    <tr key={v.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-bold font-mono">{v.prefix}</td>
                                        <td className="p-2">{v.model}</td>
                                        <td className="p-2 text-gray-500 text-xs">{v.fraction}</td>
                                        <td className="p-2 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => { setIsEditingVehicle(v); setVehicleFormData(v); }}
                                                className="text-blue-600 hover:bg-blue-100 p-1 rounded"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteVehicle(v.id)}
                                                className="text-red-600 hover:bg-red-100 p-1 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* Modal Delete Confirm Schedule */}
        {deletingId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
                <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-red-600">
                    <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                        <AlertTriangle /> Confirmar Exclusão
                    </h3>
                    <p className="text-gray-700 mb-6">Deseja realmente cancelar este agendamento?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100">Cancelar</button>
                        <button onClick={confirmDeleteSchedule} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold">Sim, Excluir</button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};