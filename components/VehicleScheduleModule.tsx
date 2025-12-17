import React, { useState, useEffect } from 'react';
import { Home, CalendarClock, Plus, Search, Trash2, LogOut, Car, User, Clock, AlertTriangle, Info, Truck, Edit, Settings, CheckSquare, Square, XCircle, Calendar, X, FileDown, FileText, ArrowRight, AlertCircle, Layers, CalendarPlus, MinusCircle, AlertOctagon, MousePointerClick, Check, Clock3 } from 'lucide-react';
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

  // --- NOVO: ESTADOS PARA MÚLTIPLOS DIAS (CRIAÇÃO) ---
  const [isMultiDayMode, setIsMultiDayMode] = useState(false);
  const [multiDates, setMultiDates] = useState<string[]>([]);
  const [dateToAdd, setDateToAdd] = useState('');

  // --- NOVO: ESTADOS PARA SELEÇÃO E EDIÇÃO EM LOTE ---
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal Edição em Lote
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [batchEditTab, setBatchEditTab] = useState<'VEHICLE' | 'TIME'>('VEHICLE');
  const [batchVehiclePrefix, setBatchVehiclePrefix] = useState(''); 
  const [batchStartHour, setBatchStartHour] = useState('');
  const [batchEndHour, setBatchEndHour] = useState('');
  const [ignoreBatchConflict, setIgnoreBatchConflict] = useState(false);

  // Modal Exclusão em Lote
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

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

  // Exclusão Individual
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
        // Buscar agendamentos
        const { data: schData, error: schError } = await supabase
            .from('vehicle_schedules')
            .select('*')
            .order('start_time', { ascending: true }); 
        
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

  // --- LÓGICA DE DETECÇÃO VISUAL DE CONFLITO (NA LISTA) ---
  const hasScheduleConflict = (current: VehicleSchedule): boolean => {
      const currentStart = new Date(current.start_time).getTime();
      const currentEnd = new Date(current.end_time).getTime();

      return schedules.some(other => {
          // Não comparar consigo mesmo
          if (other.id === current.id) return false;
          // Deve ser a mesma viatura
          if (other.vehicle_prefix !== current.vehicle_prefix) return false;

          const otherStart = new Date(other.start_time).getTime();
          const otherEnd = new Date(other.end_time).getTime();

          // Lógica de intersecção
          return (currentStart < otherEnd && currentEnd > otherStart);
      });
  };

  // --- LÓGICA DE AGENDAMENTO ---

  // Verificar Conflito de Horário
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

  const handleOpenEdit = (schedule: VehicleSchedule) => {
      if (isSelectionMode) {
          toggleSelection(schedule.id);
          return;
      }

      setConflictError(null);
      setErrorMessage(null);
      setFormErrors({});
      setIsMultiDayMode(false);
      setMultiDates([]);
      
      const startDate = new Date(schedule.start_time);
      const endDate = new Date(schedule.end_time);

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
      setIsMultiDayMode(false); 
      setMultiDates([]);
      setDateToAdd('');
  };

  const getInputClass = (field: keyof typeof initialForm) => {
      const baseClass = "w-full border p-2 rounded outline-none transition-colors ";
      if (formErrors[field]) {
          return baseClass + "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 text-red-900 placeholder-red-300";
      }
      return baseClass + "focus:ring-2 focus:ring-[#C5A059]";
  };

  const addDateToList = () => {
      if (!dateToAdd) return;
      if (multiDates.includes(dateToAdd)) {
          alert("Esta data já foi adicionada.");
          return;
      }
      const newDates = [...multiDates, dateToAdd].sort();
      setMultiDates(newDates);
      setDateToAdd('');
  };

  const removeDateFromList = (dateToRemove: string) => {
      setMultiDates(multiDates.filter(d => d !== dateToRemove));
  };

  // --- SELEÇÃO EM LOTE ---
  const toggleSelection = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter(item => item !== id));
      } else {
          setSelectedIds([...selectedIds, id]);
      }
  };

  const toggleAllSelection = () => {
      if (selectedIds.length === filteredSchedules.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredSchedules.map(s => s.id));
      }
  };

  const handleBatchDelete = async () => {
      setLoading(true);
      try {
          const { error } = await supabase
              .from('vehicle_schedules')
              .delete()
              .in('id', selectedIds);
          
          if (error) throw error;

          alert(`${selectedIds.length} agendamentos excluídos com sucesso.`);
          setIsBatchDeleteOpen(false);
          setIsSelectionMode(false);
          setSelectedIds([]);
          fetchData();
      } catch (err: any) {
          alert("Erro ao excluir em lote: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleBatchEdit = async () => {
      setLoading(true);
      try {
          if (batchEditTab === 'VEHICLE') {
              // --- MODO 1: TROCAR VIATURA ---
              if (!batchVehiclePrefix) {
                  alert("Selecione a nova viatura.");
                  setLoading(false);
                  return;
              }

              // Validação de conflitos
              if (!ignoreBatchConflict) {
                  for (const id of selectedIds) {
                      const schedule = schedules.find(s => s.id === id);
                      if (schedule) {
                          const conflict = checkConflict(new Date(schedule.start_time), new Date(schedule.end_time), batchVehiclePrefix, id);
                          if (conflict) {
                              alert(`Conflito detectado para a viatura ${batchVehiclePrefix} em ${new Date(schedule.start_time).toLocaleString('pt-BR')}. Marque "Ignorar Conflitos" se desejar forçar.`);
                              setLoading(false);
                              return;
                          }
                      }
                  }
              }

              const { error } = await supabase
                  .from('vehicle_schedules')
                  .update({ vehicle_prefix: batchVehiclePrefix })
                  .in('id', selectedIds);

              if (error) throw error;
              alert(`${selectedIds.length} agendamentos atualizados para a viatura ${batchVehiclePrefix}.`);

          } else {
              // --- MODO 2: TROCAR HORÁRIO ---
              if (!batchStartHour || !batchEndHour) {
                  alert("Informe o horário de início e fim.");
                  setLoading(false);
                  return;
              }

              for (const id of selectedIds) {
                  const schedule = schedules.find(s => s.id === id);
                  if (!schedule) continue;

                  // Pega a data original (YYYY-MM-DD)
                  const originalDateObj = new Date(schedule.start_time);
                  const datePart = originalDateObj.toISOString().split('T')[0];

                  const newStart = new Date(`${datePart}T${batchStartHour}:00`);
                  let newEnd = new Date(`${datePart}T${batchEndHour}:00`);
                  
                  // Ajuste para virada de dia (ex: 22h as 02h)
                  if (newEnd <= newStart) {
                      newEnd.setDate(newEnd.getDate() + 1);
                  }

                  // Valida conflito para o NOVO horário na viatura ATUAL (ou nova se fosse combinada, mas aqui é só horário)
                  if (!ignoreBatchConflict) {
                      const conflict = checkConflict(newStart, newEnd, schedule.vehicle_prefix, id);
                      if (conflict) {
                          alert(`Conflito de horário detectado para ${schedule.vehicle_prefix} no dia ${datePart}. Marque "Ignorar Conflitos" para forçar.`);
                          setLoading(false);
                          return;
                      }
                  }

                  // Update individual (pois cada um tem uma data diferente)
                  // Nota: Supabase não suporta update em batch com valores diferentes facilmente sem RPC.
                  // Faremos loop de updates por simplicidade e segurança.
                  const { error } = await supabase
                      .from('vehicle_schedules')
                      .update({ 
                          start_time: newStart.toISOString(),
                          end_time: newEnd.toISOString()
                      })
                      .eq('id', id);
                  
                  if (error) throw error;
              }
              alert(`${selectedIds.length} agendamentos tiveram seus horários atualizados.`);
          }

          setIsBatchEditOpen(false);
          setIsSelectionMode(false);
          setSelectedIds([]);
          setBatchVehiclePrefix('');
          setBatchStartHour('');
          setBatchEndHour('');
          setIgnoreBatchConflict(false);
          fetchData();

      } catch (err: any) {
          alert("Erro na atualização em lote: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  // forceSave = ignora verificações de conflito
  const handleSaveSchedule = async (forceSave: boolean = false) => {
    setConflictError(null); 
    setErrorMessage(null);
    setFormErrors({});

    // 1. Validação de Campos Básicos (Comuns aos dois modos)
    const requiredFieldsCommon = ['vehicle_prefix', 'start_hour', 'end_hour', 'driver_name', 'reason'];
    const newErrors: Record<string, boolean> = {};
    let hasEmptyFields = false;

    requiredFieldsCommon.forEach((field) => {
        if (!formData[field as keyof typeof formData]) {
            newErrors[field] = true;
            hasEmptyFields = true;
        }
    });

    if (isMultiDayMode) {
        if (multiDates.length === 0) {
            setErrorMessage("Adicione pelo menos uma data à lista para o agendamento em lote.");
            return;
        }
    } else {
        if (!formData.start_date) { newErrors['start_date'] = true; hasEmptyFields = true; }
        if (!formData.end_date) { newErrors['end_date'] = true; hasEmptyFields = true; }
    }

    if (hasEmptyFields) {
        setFormErrors(newErrors);
        setErrorMessage("Por favor, preencha todos os campos obrigatórios destacados em vermelho.");
        return;
    }

    // --- PREPARAÇÃO DOS DADOS PARA SALVAR ---
    const schedulesToInsert: any[] = [];
    
    // Formata o erro de conflito
    const formatConflict = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    // LÓGICA MÚLTIPLA VS ÚNICA
    if (isMultiDayMode) {
        for (const dateStr of multiDates) {
            const currentStart = new Date(`${dateStr}T${formData.start_hour}:00`);
            let currentEnd = new Date(`${dateStr}T${formData.end_hour}:00`);

            if (currentEnd <= currentStart) {
                currentEnd.setDate(currentEnd.getDate() + 1);
            }

            if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
                setErrorMessage("Horário inválido.");
                return;
            }

            if (!forceSave) {
                const conflict = checkConflict(currentStart, currentEnd, formData.vehicle_prefix);
                if (conflict) {
                     const conflictStart = new Date(conflict.start_time);
                     const conflictEnd = new Date(conflict.end_time);
                     
                     setConflictError(
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm animate-fade-in">
                            <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                                <XCircle size={20} />
                                <span>CONFLITO NA DATA {new Date(dateStr).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                                A viatura <strong>{formData.vehicle_prefix}</strong> já possui agendamento neste dia:
                            </p>
                            <div className="bg-white p-3 rounded border border-red-200 text-sm shadow-inner mb-3">
                                <p className="text-gray-800">
                                    <strong>Período Ocupado:</strong> <span className="text-red-600 font-bold">{formatConflict(conflictStart)} até {formatConflict(conflictEnd)}</span>
                                </p>
                                <p className="text-gray-800 mt-1"><strong>Responsável:</strong> {conflict.driver_name}</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => handleSaveSchedule(true)} 
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm shadow-md transition-colors"
                                >
                                    IGNORAR CONFLITO E SALVAR
                                </button>
                            </div>
                        </div>
                    );
                    return; 
                }
            }

            schedulesToInsert.push({
                vehicle_prefix: formData.vehicle_prefix,
                driver_name: formData.driver_name.toUpperCase(),
                reason: formData.reason.toUpperCase(),
                start_time: currentStart.toISOString(),
                end_time: currentEnd.toISOString(),
                observations: formData.observations
            });
        }

    } else {
        const startDateTime = new Date(`${formData.start_date}T${formData.start_hour}:00`);
        const endDateTime = new Date(`${formData.end_date}T${formData.end_hour}:00`);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            setErrorMessage("Horário ou data inválida.");
            return;
        }

        if (endDateTime <= startDateTime) {
            setFormErrors({ ...newErrors, end_date: true, end_hour: true, start_date: true, start_hour: true });
            setErrorMessage("A data/hora de término deve ser posterior à data/hora de início.");
            return;
        }

        if (!forceSave) {
            const conflict = checkConflict(startDateTime, endDateTime, formData.vehicle_prefix, editingScheduleId || undefined);

            if (conflict) {
                const conflictStart = new Date(conflict.start_time);
                const conflictEnd = new Date(conflict.end_time);
                setConflictError(
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm animate-fade-in">
                        <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                            <XCircle size={20} />
                            <span>CONFLITO DE AGENDA DETECTADO</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                            A viatura <strong>{formData.vehicle_prefix}</strong> já possui um agendamento neste intervalo:
                        </p>
                        <div className="bg-white p-3 rounded border border-red-200 text-sm shadow-inner mb-3">
                            <p className="text-gray-800">
                                <strong>Período Ocupado:</strong><br/>
                                <span className="text-red-600 font-bold">
                                    {formatConflict(conflictStart)} até {formatConflict(conflictEnd)}
                                </span>
                            </p>
                            <p className="text-gray-800 mt-1"><strong>Responsável:</strong> {conflict.driver_name}</p>
                            <p className="text-gray-800"><strong>Motivo:</strong> {conflict.reason}</p>
                        </div>
                         <div className="flex justify-end gap-2">
                             <button 
                                onClick={() => handleSaveSchedule(true)} 
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm shadow-md transition-colors"
                            >
                                IGNORAR CONFLITO E SALVAR
                            </button>
                        </div>
                    </div>
                );
                return;
            }
        }

        schedulesToInsert.push({
            vehicle_prefix: formData.vehicle_prefix,
            driver_name: formData.driver_name.toUpperCase(),
            reason: formData.reason.toUpperCase(),
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            observations: formData.observations
        });
    }

    try {
        if (editingScheduleId && !isMultiDayMode) {
            const { error } = await supabase
                .from('vehicle_schedules')
                .update(schedulesToInsert[0])
                .eq('id', editingScheduleId);
            if (error) throw error;
            alert("Agendamento atualizado com sucesso!");
        } else {
            const { error } = await supabase.from('vehicle_schedules').insert(schedulesToInsert);
            if (error) throw error;
            
            if(isMultiDayMode) {
                alert(`${schedulesToInsert.length} agendamentos criados com sucesso!`);
            } else {
                alert("Agendamento realizado com sucesso!");
            }
        }

        setIsModalOpen(false);
        setFormData(initialForm);
        setEditingScheduleId(null);
        setConflictError(null);
        setErrorMessage(null);
        setFormErrors({});
        setIsMultiDayMode(false);
        setMultiDates([]);
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
          
          const { data: vData } = await supabase.from('vehicles').select('*').order('prefix');
          if (vData) setVehicles(vData);
      } catch (e: any) {
          alert("Erro ao excluir viatura: " + e.message);
      }
  };

  // --- EXPORTAÇÃO ---
  // (Mantido igual)
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
      doc.setFontSize(16);
      doc.setTextColor(62, 50, 35);
      doc.text("Agenda de Viaturas - 5ª RPM", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);
      if (filterDate) {
          doc.text(`Filtro de Data: ${new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 31);
      }
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
          headStyles: { fillColor: [62, 50, 35], textColor: 255 }, 
          alternateRowStyles: { fillColor: [253, 251, 247] }, 
          styles: { fontSize: 8 },
      });
      doc.save("Agenda_Viaturas_5RPM.pdf");
  };

  const formatDateTime = (isoString: string) => {
      const date = new Date(isoString);
      return {
          obj: date,
          date: date.toLocaleDateString('pt-BR'),
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
  };

  const filteredSchedules = schedules.filter(s => {
      const matchesSearch = 
        s.vehicle_prefix.includes(search) || 
        s.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        s.reason.toLowerCase().includes(search.toLowerCase());
      
      const matchesFuture = showFutureOnly 
        ? new Date(s.end_time) > new Date() 
        : true;

      const matchesDate = filterDate ? (() => {
          const selectedStart = new Date(`${filterDate}T00:00:00`);
          const selectedEnd = new Date(`${filterDate}T23:59:59`);
          const scheduleStart = new Date(s.start_time);
          const scheduleEnd = new Date(s.end_time);
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

      <main className="container mx-auto px-4 py-8 flex-grow pb-24">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-6 min-h-[600px]">
            
            {/* Barra de Ações e Filtros */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1">
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

                    <div className="relative w-full md:w-auto flex items-center">
                        <div className="relative w-full">
                            <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            <input 
                                type="date"
                                className="w-full md:w-48 pl-10 pr-8 py-2 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none text-gray-700"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                            {filterDate && (
                                <button 
                                    onClick={() => setFilterDate('')}
                                    className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowFutureOnly(!showFutureOnly)}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-bold border transition-colors whitespace-nowrap ${
                            showFutureOnly 
                            ? 'bg-blue-600 text-white border-blue-700' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {showFutureOnly ? <CheckSquare size={18} /> : <Square size={18} />}
                        {showFutureOnly ? "Futuros" : "Todos"}
                    </button>
                    
                    <button
                        onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-bold border transition-colors whitespace-nowrap ${
                            isSelectionMode 
                            ? 'bg-orange-500 text-white border-orange-600 ring-2 ring-orange-300' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <MousePointerClick size={18} />
                        {isSelectionMode ? "Cancelar Seleção" : "Selecionar Vários"}
                    </button>
                </div>

                <div className="flex gap-2 w-full xl:w-auto justify-end flex-wrap">
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <FileDown size={18} /> 
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <FileText size={18} /> 
                        <span className="hidden sm:inline">PDF</span>
                    </button>
                    <div className="w-px bg-gray-300 mx-1 hidden xl:block"></div>
                    <button 
                        onClick={() => { setIsFleetManagerOpen(true); setIsEditingVehicle(null); setVehicleFormData({}); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700 transition-colors shadow-sm whitespace-nowrap"
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
                        <p>Nenhum agendamento encontrado.</p>
                    </div>
                ) : (
                    filteredSchedules.map(sch => {
                        const start = formatDateTime(sch.start_time);
                        const end = formatDateTime(sch.end_time);
                        const isSameDay = start.date === end.date;
                        const isToday = new Date(sch.start_time).toDateString() === new Date().toDateString();
                        const isConflict = hasScheduleConflict(sch);
                        const isSelected = selectedIds.includes(sch.id);

                        return (
                            <div 
                                key={sch.id} 
                                onClick={() => isSelectionMode && toggleSelection(sch.id)}
                                className={`
                                    bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-4 flex flex-col relative group cursor-pointer
                                    ${isSelectionMode ? 'ring-2 cursor-pointer' : ''}
                                    ${isSelectionMode && isSelected ? 'ring-orange-500 bg-orange-50' : 'ring-transparent'}
                                    ${isConflict ? 'border-l-4 border-red-500' : (isToday ? 'border-l-4 border-[#C5A059]' : 'border-l-4 border-gray-300')}
                                `}
                            >
                                {isSelectionMode && (
                                    <div className="absolute top-4 right-4 z-20">
                                        {isSelected 
                                            ? <CheckSquare className="text-orange-500 fill-white" size={24} /> 
                                            : <Square className="text-gray-300" size={24} />
                                        }
                                    </div>
                                )}

                                {!isSelectionMode && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(sch); }}
                                            className="text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 p-1 rounded"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeletingId(sch.id); }}
                                            className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-3">
                                    <div className={`bg-[#3E3223] text-[#C5A059] font-bold font-mono px-3 py-1.5 rounded-md text-xl flex items-center gap-2 ${isSelected ? 'opacity-100' : ''}`}>
                                        <Car size={20} /> {sch.vehicle_prefix}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {isConflict && (
                                            <div className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 animate-pulse">
                                                <AlertOctagon size={12} /> CONFLITO
                                            </div>
                                        )}
                                        {isToday && !isConflict && (
                                            <div className="text-xs font-bold text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wide">
                                                HOJE
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-3 pl-1">
                                    {isSameDay ? (
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-[#C5A059] font-bold text-sm">
                                                <Calendar size={16} />
                                                <span>{start.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600 font-semibold text-sm mt-1">
                                                <Clock size={16} />
                                                <span>{start.time} às {end.time}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-[#C5A059]" />
                                                <span className="text-[#C5A059] font-bold text-sm">{start.date}</span>
                                                <span className="text-gray-600 font-semibold text-sm">{start.time}</span>
                                            </div>
                                            <div className="pl-7 text-xs text-gray-400 font-medium">até</div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-[#C5A059]" />
                                                <span className="text-[#C5A059] font-bold text-sm">{end.date}</span>
                                                <span className="text-gray-600 font-semibold text-sm">{end.time}</span>
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

        {/* BARRA FLUTUANTE DE AÇÃO EM LOTE */}
        {isSelectionMode && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-fade-in border border-gray-700">
                <div className="font-bold text-sm flex items-center gap-2 border-r border-gray-600 pr-4">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {selectedIds.length}
                    </span>
                    <span>Selecionados</span>
                </div>
                
                <button 
                    onClick={toggleAllSelection}
                    className="text-gray-300 hover:text-white text-sm font-semibold"
                >
                    {selectedIds.length === filteredSchedules.length ? "Desmarcar" : "Todos"}
                </button>

                {selectedIds.length > 0 && (
                    <>
                        <button 
                            onClick={() => { 
                                setIsBatchEditOpen(true); 
                                setBatchVehiclePrefix(''); 
                                setBatchStartHour('');
                                setBatchEndHour('');
                                setIgnoreBatchConflict(false); 
                                setBatchEditTab('VEHICLE');
                            }}
                            className="bg-[#C5A059] hover:bg-[#b08d4a] text-[#3E3223] px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <Edit size={16} /> Editar
                        </button>
                        <button 
                            onClick={() => setIsBatchDeleteOpen(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <Trash2 size={16} /> Excluir
                        </button>
                    </>
                )}

                <button 
                    onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
                    className="ml-2 p-1 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>
        )}

        {/* MODAL EXCLUSÃO EM LOTE */}
        {isBatchDeleteOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[85] p-4">
                <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-red-600 animate-fade-in">
                    <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                        <Trash2 /> Excluir {selectedIds.length} itens?
                    </h3>
                    <p className="text-gray-700 mb-6">
                        Você está prestes a excluir permanentemente <strong>{selectedIds.length}</strong> agendamentos selecionados. Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsBatchDeleteOpen(false)} 
                            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleBatchDelete} 
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
                        >
                            {loading ? 'Excluindo...' : 'Sim, Excluir Todos'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDIÇÃO EM LOTE (VIATURA OU HORÁRIO) */}
        {isBatchEditOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border-t-8 border-orange-500 animate-fade-in">
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Layers className="text-orange-500" /> Edição em Lote
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Alterando <strong>{selectedIds.length}</strong> agendamentos selecionados.
                        </p>

                        {/* ABAS */}
                        <div className="flex border-b mb-4">
                            <button 
                                onClick={() => setBatchEditTab('VEHICLE')}
                                className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                    batchEditTab === 'VEHICLE' 
                                    ? 'border-orange-500 text-orange-600' 
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Car size={16} /> Trocar Viatura
                            </button>
                            <button 
                                onClick={() => setBatchEditTab('TIME')}
                                className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                    batchEditTab === 'TIME' 
                                    ? 'border-orange-500 text-orange-600' 
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Clock3 size={16} /> Alterar Horário
                            </button>
                        </div>

                        {/* CONTEÚDO DA ABA */}
                        {batchEditTab === 'VEHICLE' && (
                            <div className="bg-gray-50 p-4 rounded border mb-4 animate-fade-in">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Selecione a Nova Viatura</label>
                                <div className="relative">
                                    <Car className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <select 
                                        className="w-full pl-10 border p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white"
                                        value={batchVehiclePrefix}
                                        onChange={e => setBatchVehiclePrefix(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.prefix}>{v.prefix} - {v.model} ({v.fraction})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {batchEditTab === 'TIME' && (
                            <div className="bg-gray-50 p-4 rounded border mb-4 animate-fade-in">
                                <p className="text-xs text-gray-600 mb-3">
                                    O novo horário será aplicado a <strong>todos os dias</strong> selecionados, mantendo as datas originais.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Novo Início</label>
                                        <input 
                                            type="time" 
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                            value={batchStartHour}
                                            onChange={e => setBatchStartHour(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Novo Fim</label>
                                        <input 
                                            type="time" 
                                            className="w-full border p-2 rounded focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                                            value={batchEndHour}
                                            onChange={e => setBatchEndHour(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-6">
                            <input 
                                type="checkbox" 
                                id="ignoreConflict" 
                                checked={ignoreBatchConflict}
                                onChange={e => setIgnoreBatchConflict(e.target.checked)}
                                className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <label htmlFor="ignoreConflict" className="text-sm text-gray-700 select-none cursor-pointer">
                                Ignorar alertas de conflito
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setIsBatchEditOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleBatchEdit}
                                disabled={loading}
                                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-bold shadow-md flex items-center gap-2"
                            >
                                {loading ? 'Salvando...' : <><Check size={18} /> Confirmar</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Cadastro/Edição de Agendamento */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border-t-8 border-[#C5A059] my-8 animate-fade-in">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-[#3E3223] flex items-center gap-2">
                                <CalendarClock /> {editingScheduleId ? 'Editar Agendamento' : 'Novo Agendamento'}
                            </h2>
                            {!editingScheduleId && (
                                <button 
                                    onClick={() => { setIsMultiDayMode(!isMultiDayMode); setConflictError(null); setErrorMessage(null); }}
                                    className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md transition-all transform hover:scale-105 ${
                                        isMultiDayMode 
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300' 
                                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                    }`}
                                    title={isMultiDayMode ? "Voltar para agendamento único" : "Alternar para múltiplos dias"}
                                >
                                    {isMultiDayMode ? <Layers size={16} /> : <CalendarPlus size={16} />}
                                    {isMultiDayMode ? "MODO LOTE ATIVO" : "AGENDAR VÁRIOS DIAS"}
                                </button>
                            )}
                        </div>

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

                            {/* MODO MÚLTIPLOS DIAS (SELEÇÃO DE DATAS) */}
                            {isMultiDayMode ? (
                                <div className="bg-[#fcfae6] p-4 rounded border border-yellow-200 shadow-sm animate-fade-in">
                                    <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold text-sm">
                                        <Layers size={16} /> Agendamento em Lote
                                    </div>
                                    <p className="text-xs text-gray-600 mb-3">
                                        Adicione os dias desejados. O horário será repetido para cada data.
                                    </p>
                                    
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            type="date"
                                            className="border p-2 rounded w-full"
                                            value={dateToAdd}
                                            onChange={(e) => setDateToAdd(e.target.value)}
                                        />
                                        <button 
                                            onClick={addDateToList}
                                            className="bg-[#C5A059] text-white px-3 rounded hover:bg-[#b08d4a] font-bold"
                                        >
                                            Adicionar
                                        </button>
                                    </div>

                                    {multiDates.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {multiDates.map(date => (
                                                <div key={date} className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm flex items-center gap-2 shadow-sm">
                                                    <span className="font-mono font-bold text-gray-700">{new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                                    <button onClick={() => removeDateFromList(date)} className="text-red-500 hover:text-red-700"><MinusCircle size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* HORÁRIO UNIFICADO */}
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Horário Início <span className="text-red-500">*</span></label>
                                            <input 
                                                type="time"
                                                className={getInputClass('start_hour')}
                                                value={formData.start_hour}
                                                onChange={e => setFormData({...formData, start_hour: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Horário Fim <span className="text-red-500">*</span></label>
                                            <input 
                                                type="time"
                                                className={getInputClass('end_hour')}
                                                value={formData.end_hour}
                                                onChange={e => setFormData({...formData, end_hour: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 italic">
                                        * Se a hora fim for menor que a início (ex: 22:00 as 02:00), o sistema considerará o término no dia seguinte.
                                    </p>
                                </div>
                            ) : (
                                /* MODO PADRÃO (ÚNICO) */
                                <>
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
                                </>
                            )}

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
                                    className={getInputClass('reason') + " uppercase"}
                                    placeholder="Ex: Apoio a evento, Manutenção, Missão..."
                                    value={formData.reason}
                                    onChange={e => setFormData({...formData, reason: e.target.value.toUpperCase()})}
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
                                onClick={() => { setIsModalOpen(false); setEditingScheduleId(null); setFormData(initialForm); setConflictError(null); setErrorMessage(null); setFormErrors({}); setIsMultiDayMode(false); setMultiDates([]); }}
                                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded border font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleSaveSchedule(false)}
                                className="px-6 py-2 bg-[#3E3223] text-white rounded hover:bg-[#2a2218] shadow-md font-bold transition-colors"
                            >
                                {editingScheduleId ? 'Salvar Alterações' : (isMultiDayMode ? 'Agendar Todos' : 'Agendar')}
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