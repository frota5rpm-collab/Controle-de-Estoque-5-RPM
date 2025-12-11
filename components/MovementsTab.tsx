import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Material, Movement, MovementType } from '../types';
import { Plus, ArrowDownCircle, ArrowUpCircle, FileDown, Search, Edit, XCircle, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { exportToExcel } from '../utils/excel';

type SortKey = 'created_at' | 'type' | 'material_name' | 'quantity' | 'requester' | 'vehicle_prefix' | 'guide_number';

export const MovementsTab: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // States para modais
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<Movement | null>(null);
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);

  const [search, setSearch] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({ 
    key: 'created_at', 
    direction: 'DESC' 
  });

  // Form State para Movimentação
  const initialForm = {
    material_id: '',
    type: MovementType.EXIT,
    quantity: 1,
    requester: '',
    vehicle_prefix: '',
    guide_number: '',
    created_at: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(initialForm);

  // Form State para Novo Material (Rápido)
  const [newMaterialData, setNewMaterialData] = useState({ name: '', unit: '' });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      // 1. Fetch Materials first
      const { data: matData, error: matError } = await supabase
        .from('materials')
        .select('*')
        .order('name');
        
      if (matError) throw matError;
      setMaterials(matData || []);

      // 2. Fetch Movements
      const { data: movData, error: movError } = await supabase
        .from('movements')
        .select('*');

      if (movError) throw movError;

      // 3. Manually Join
      const matMap = new Map<string, { name: string; unit: string }>();
      
      if (matData) {
        matData.forEach((m: any) => {
            matMap.set(m.id, { name: m.name, unit: m.unit });
        });
      }
      
      const formatted = (movData || []).map((m: any) => {
        const materialInfo = matMap.get(m.material_id) || { name: 'Material não encontrado', unit: '' };
        return {
            ...m,
            material_name: materialInfo.name,
            material_unit: materialInfo.unit
        };
      });

      setMovements(formatted);
      
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setErrorMsg(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    // Validação de campos obrigatórios
    if (!formData.material_id) { alert("Selecione um material."); return; }
    if (formData.quantity <= 0) { alert("A quantidade deve ser maior que zero."); return; }
    if (!formData.created_at) { alert("Informe a data."); return; }

    // Validação Condicional: Obrigatório apenas se for SAÍDA
    if (formData.type === MovementType.EXIT) {
        if (!formData.requester.trim()) { alert("Para SAÍDA, informe o Responsável pela retirada."); return; }
        if (!formData.vehicle_prefix.trim()) { alert("Para SAÍDA, informe o Prefixo da viatura."); return; }
    }

    try {
      // Format payload
      const payload = {
          material_id: formData.material_id,
          type: formData.type,
          quantity: formData.quantity,
          requester: formData.requester || null, // Envia null se vazio na Entrada
          vehicle_prefix: formData.vehicle_prefix || null, // Envia null se vazio na Entrada
          guide_number: formData.guide_number, 
          created_at: formData.created_at
      };

      if (isEditing) {
        const { error } = await supabase
          .from('movements')
          .update(payload)
          .eq('id', isEditing.id);
          
        if (error) throw error;
        alert("Movimentação atualizada.");
      } else {
        const { error: movError } = await supabase.from('movements').insert([payload]);
        if (movError) throw movError;
      }

      setIsAdding(false);
      setIsEditing(null);
      setFormData(initialForm);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar: ${err.message || JSON.stringify(err)}`);
    }
  };

  const handleCreateMaterial = async () => {
      if(!newMaterialData.name.trim()) return alert("Digite o nome do material");
      
      try {
          const unitToSave = newMaterialData.unit?.trim() || 'Unidade';
          const { data, error } = await supabase
              .from('materials')
              .insert([{ 
                  name: newMaterialData.name, 
                  quantity: 0, // Inicia com 0, a entrada fará o ajuste
                  unit: unitToSave
              }])
              .select(); // Retorna o dado criado

          if(error) throw error;

          if (data && data.length > 0) {
              const newMat = data[0];
              // Atualiza lista local
              const newMaterialsList = [...materials, newMat].sort((a,b) => a.name.localeCompare(b.name));
              setMaterials(newMaterialsList);
              
              // Seleciona o novo material no formulário principal
              setFormData({ ...formData, material_id: newMat.id });
              
              // Fecha modal de material
              setIsCreatingMaterial(false);
              setNewMaterialData({ name: '', unit: '' });
              alert("Material criado com sucesso!");
          }
      } catch (err: any) {
          alert("Erro ao criar material: " + err.message);
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
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400 opacity-50" />;
    return sortConfig.direction === 'ASC' 
      ? <ArrowUp size={14} className="text-pmmg-primary" /> 
      : <ArrowDown size={14} className="text-pmmg-primary" />;
  };

  const filteredMovements = movements
    .filter(m => 
      (m.material_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.requester?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.vehicle_prefix?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.guide_number?.toLowerCase() || '').includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Movement];
      let valB: any = b[sortConfig.key as keyof Movement];

      if (sortConfig.key === 'material_name') {
         valA = a.material_name || '';
         valB = b.material_name || '';
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'ASC' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ASC' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border-l-4 border-pmmg-primary">
        <div className="relative w-full md:w-96">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
           <input
              type="text"
              placeholder="Buscar por material, responsável, prefixo ou guia..."
              className="pl-8 pr-4 py-2 border rounded-md w-full outline-none focus:ring-2 focus:ring-pmmg-primary"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => exportToExcel(movements, 'Movimentacoes_Frota_5RPM')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm"
          >
            <FileDown size={16} /> Exportar
          </button>
          <button 
            onClick={() => { setIsAdding(true); setFormData(initialForm); }}
            className="flex items-center gap-2 px-3 py-2 bg-pmmg-primary text-white rounded-md hover:bg-[#3E3223] transition-colors shadow-sm"
          >
            <Plus size={16} /> Nova Movimentação
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200">
          <XCircle size={20} />
          <span>Erro: {errorMsg}</span>
        </div>
      )}

      {/* MODAL PRINCIPAL DE MOVIMENTAÇÃO */}
      {(isAdding || isEditing) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-xl my-8 border-t-4 border-pmmg-primary relative">
             <h3 className="text-xl font-bold mb-4 text-pmmg-primary">{isEditing ? 'Editar Movimentação' : 'Registrar Movimentação'}</h3>
             
             {/* Sub-Modal de Criar Material (Sobreposto) */}
             {isCreatingMaterial && (
                <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center rounded-lg p-6 animate-in fade-in zoom-in duration-200">
                     <div className="w-full max-w-sm space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-bold text-pmmg-primary">Adicionar Novo Material</h4>
                            <button onClick={() => setIsCreatingMaterial(false)} className="text-gray-500 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Nome do Material</label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none"
                                value={newMaterialData.name}
                                onChange={e => setNewMaterialData({...newMaterialData, name: e.target.value})}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Unidade</label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none"
                                value={newMaterialData.unit}
                                onChange={e => setNewMaterialData({...newMaterialData, unit: e.target.value})}
                                placeholder="Ex: Un, Litro, Caixa"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                             <button onClick={() => setIsCreatingMaterial(false)} className="flex-1 py-2 border rounded hover:bg-gray-100">Cancelar</button>
                             <button onClick={handleCreateMaterial} className="flex-1 py-2 bg-pmmg-primary text-white rounded hover:bg-[#3E3223]">Criar</button>
                        </div>
                     </div>
                </div>
             )}

             <p className="mb-4 text-sm text-gray-500">Ao salvar, o estoque será atualizado automaticamente.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700">Material <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select 
                        className="flex-1 border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                        value={formData.material_id}
                        onChange={e => setFormData({...formData, material_id: e.target.value})}
                    >
                        <option value="">Selecione um material...</option>
                        {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit || 'Un'})</option>
                        ))}
                    </select>
                    <button 
                        onClick={() => setIsCreatingMaterial(true)}
                        className="mt-1 bg-pmmg-success text-white p-2 rounded hover:bg-green-700 transition-colors"
                        title="Criar novo material"
                    >
                        <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Tipo <span className="text-red-500">*</span></label>
                  <select 
                     className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                     value={formData.type}
                     onChange={e => setFormData({...formData, type: e.target.value as MovementType})}
                  >
                    <option value={MovementType.EXIT}>SAÍDA</option>
                    <option value={MovementType.ENTRY}>ENTRADA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Quantidade <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Data <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                    value={formData.created_at}
                    onChange={e => setFormData({...formData, created_at: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">Nº Guia</label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                    placeholder="Ex: 12345 (Opcional)"
                    value={formData.guide_number}
                    onChange={e => setFormData({...formData, guide_number: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">
                    Responsável pela retirada {formData.type === MovementType.EXIT && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                    placeholder={formData.type === MovementType.ENTRY ? "Opcional na entrada" : "Nome do militar/funcionário"}
                    value={formData.requester}
                    onChange={e => setFormData({...formData, requester: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700">
                    Prefixo Viatura {formData.type === MovementType.EXIT && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-pmmg-primary outline-none"
                    placeholder={formData.type === MovementType.ENTRY ? "Opcional na entrada" : "Ex: VP-1234"}
                    value={formData.vehicle_prefix}
                    onChange={e => setFormData({...formData, vehicle_prefix: e.target.value})}
                  />
                </div>
             </div>

             <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={() => { setIsEditing(null); setIsAdding(false); setIsCreatingMaterial(false); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-2 bg-pmmg-primary text-white rounded hover:bg-[#3E3223] shadow-md transition-colors"
                >
                  Salvar
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-gray-100 text-gray-700 select-none border-b-2 border-pmmg-primary/20">
            <tr>
              <th className="p-4 font-semibold border-b cursor-pointer hover:bg-gray-200" onClick={() => handleSort('created_at')}>
                <div className="flex items-center gap-1">Data {renderSortIcon('created_at')}</div>
              </th>
              <th className="p-4 font-semibold border-b text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('type')}>
                <div className="flex items-center justify-center gap-1">Tipo {renderSortIcon('type')}</div>
              </th>
              <th className="p-4 font-semibold border-b cursor-pointer hover:bg-gray-200" onClick={() => handleSort('material_name')}>
                <div className="flex items-center gap-1">Material {renderSortIcon('material_name')}</div>
              </th>
              <th className="p-4 font-semibold border-b text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('quantity')}>
                <div className="flex items-center justify-center gap-1">Qtd {renderSortIcon('quantity')}</div>
              </th>
              <th className="p-4 font-semibold border-b cursor-pointer hover:bg-gray-200" onClick={() => handleSort('requester')}>
                <div className="flex items-center gap-1">Responsável {renderSortIcon('requester')}</div>
              </th>
              <th className="p-4 font-semibold border-b cursor-pointer hover:bg-gray-200" onClick={() => handleSort('vehicle_prefix')}>
                <div className="flex items-center gap-1">Prefixo {renderSortIcon('vehicle_prefix')}</div>
              </th>
              <th className="p-4 font-semibold border-b cursor-pointer hover:bg-gray-200" onClick={() => handleSort('guide_number')}>
                <div className="flex items-center gap-1">Nº Guia {renderSortIcon('guide_number')}</div>
              </th>
              <th className="p-4 font-semibold border-b text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={8} className="p-8 text-center text-gray-500">Carregando histórico...</td></tr>
            ) : filteredMovements.length === 0 ? (
               <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhuma movimentação encontrada.</td></tr>
            ) : (
              filteredMovements.map(m => (
                <tr key={m.id} className="border-b hover:bg-amber-50/50 transition-colors">
                  <td className="p-4 text-sm text-gray-700">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </td>
                  <td className="p-4 text-center">
                    {m.type === MovementType.ENTRY ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded border border-green-200">
                        <ArrowUpCircle size={14} /> ENTRADA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold text-xs bg-red-100 px-2 py-1 rounded border border-red-200">
                        <ArrowDownCircle size={14} /> SAÍDA
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-medium text-gray-800">{m.material_name}</td>
                  <td className="p-4 text-center font-mono font-bold">
                    {m.quantity} <span className="text-xs font-normal text-gray-500">{m.material_unit}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-700">{m.requester || '-'}</td>
                  <td className="p-4 text-center">
                      {m.vehicle_prefix ? (
                         <span className="text-sm font-mono bg-gray-50 rounded px-2 py-1 text-gray-800">{m.vehicle_prefix}</span>
                      ) : (
                         <span className="text-gray-400 text-sm">-</span>
                      )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{m.guide_number || '-'}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { 
                          setIsEditing(m); 
                          setFormData({
                            material_id: m.material_id,
                            type: m.type,
                            quantity: m.quantity,
                            requester: m.requester || '',
                            vehicle_prefix: m.vehicle_prefix || '',
                            guide_number: m.guide_number,
                            created_at: m.created_at ? new Date(m.created_at).toISOString().split('T')[0] : ''
                          });
                        }}
                        className="p-2 text-pmmg-primary hover:bg-pmmg-primary/10 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};