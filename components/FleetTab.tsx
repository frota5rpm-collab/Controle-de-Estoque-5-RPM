import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';
import { Plus, Edit, Search, Car, XCircle, FileUp, FileDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { exportToExcel, parseExcel } from '../utils/excel';

type SortKey = 'prefix' | 'plate' | 'model' | 'fraction';

export const FleetTab: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<Vehicle | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Estado para o formulário
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    prefix: '',
    plate: '',
    model: '',
    fraction: ''
  });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({ 
    key: 'prefix', 
    direction: 'ASC' 
  });

  const fetchVehicles = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) {
      console.error(error);
      setErrorMsg(error.message || JSON.stringify(error));
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleSave = async () => {
    if(!formData.prefix || !formData.plate) {
      alert("Prefixo e Placa são obrigatórios.");
      return;
    }

    // Payload limpo apenas com os campos editáveis
    const payload = {
      prefix: formData.prefix,
      plate: formData.plate,
      model: formData.model,
      fraction: formData.fraction
    };

    try {
      if (isEditing && isEditing.id) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', isEditing.id);
        if (error) throw error;
        alert("Viatura atualizada com sucesso.");
      } else {
        const { error } = await supabase.from('vehicles').insert([payload]);
        if (error) throw error;
        alert("Viatura cadastrada com sucesso.");
      }
      setIsEditing(null);
      setIsAdding(false);
      setFormData({ prefix: '', plate: '', model: '', fraction: '' });
      fetchVehicles();
    } catch (e: any) {
      alert("Erro ao salvar viatura: " + (e.message || e));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const data = await parseExcel(e.target.files[0]);
        
        const formattedData = data.map((row: any) => {
           // Função para buscar chave parcial (ex: MARCA/MODELO pega 'modelo')
           const keys = Object.keys(row);
           const findKey = (search: string) => keys.find(k => k.toLowerCase().includes(search));

           const prefixKey = findKey('prefixo');
           const plateKey = findKey('placa');
           const modelKey = findKey('modelo') || findKey('marca');
           const fractionKey = findKey('unidade') || findKey('fracao') || findKey('fraçao');

           return {
             prefix: prefixKey ? String(row[prefixKey]) : '',
             plate: plateKey ? String(row[plateKey]) : '',
             model: modelKey ? String(row[modelKey]) : '',
             fraction: fractionKey ? String(row[fractionKey]) : '',
           };
        }).filter((r: any) => r.prefix && r.prefix !== '0' && r.prefix !== '');

        if (formattedData.length > 0) {
          const { error } = await supabase.from('vehicles').insert(formattedData);
          if (error) throw error;
          alert(`${formattedData.length} viaturas importadas com sucesso!`);
          fetchVehicles();
        } else {
           alert("Nenhuma viatura válida encontrada. Verifique se a planilha tem colunas 'PREFIXO' e 'PLACA'.");
        }
      } catch (err: any) {
        alert(`Erro ao importar: ${err.message}`);
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
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400 opacity-50" />;
    return sortConfig.direction === 'ASC' 
      ? <ArrowUp size={14} className="text-pmmg-primary" /> 
      : <ArrowDown size={14} className="text-pmmg-primary" />;
  };

  const filtered = vehicles
    .filter(v => 
        v.prefix.toLowerCase().includes(search.toLowerCase()) || 
        v.plate.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Vehicle];
      let valB: any = b[sortConfig.key as keyof Vehicle];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'ASC' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ASC' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
       <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border-l-4 border-pmmg-primary">
         <div className="relative w-full xl:w-96">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
           <input 
             className="pl-8 pr-4 py-2 border rounded-md w-full outline-none focus:ring-2 focus:ring-pmmg-primary"
             placeholder="Buscar Prefixo ou Placa..."
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
         </div>
         <div className="flex gap-2 flex-wrap justify-end w-full xl:w-auto">
            <label className="flex items-center gap-2 px-3 py-2 bg-pmmg-success text-white rounded-md cursor-pointer hover:bg-green-800 transition-colors shadow-sm">
                <FileUp size={16} /> <span className="hidden sm:inline">Importar</span>
                <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} />
            </label>
            <button 
                onClick={() => exportToExcel(vehicles, 'Mapa_Carga_Frota_5RPM')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm"
            >
                <FileDown size={16} /> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button 
              onClick={() => { setIsAdding(true); setFormData({}); }}
              className="flex items-center gap-2 px-3 py-2 bg-pmmg-primary text-white rounded-md hover:bg-[#3E3223] transition-colors shadow-sm"
            >
              <Plus size={16} /> Nova Viatura
            </button>
         </div>
       </div>

       {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200">
          <XCircle size={20} />
          <span>Erro: {errorMsg}</span>
        </div>
      )}

       {(isAdding || isEditing) && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl border-t-4 border-pmmg-primary">
             <h3 className="text-xl font-bold mb-4 text-pmmg-primary">{isEditing ? 'Editar Viatura' : 'Nova Viatura'}</h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Prefixo</label>
                 <input 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                    value={formData.prefix || ''} 
                    onChange={e => setFormData({...formData, prefix: e.target.value})} 
                    placeholder="Ex: 12345"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Placa</label>
                 <input 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                    value={formData.plate || ''} 
                    onChange={e => setFormData({...formData, plate: e.target.value})} 
                    placeholder="Ex: ABC-1234"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Marca / Modelo</label>
                 <input 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                    value={formData.model || ''} 
                    onChange={e => setFormData({...formData, model: e.target.value})} 
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Fração (Unidade)</label>
                 <input 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                    value={formData.fraction || ''} 
                    onChange={e => setFormData({...formData, fraction: e.target.value})} 
                 />
               </div>
             </div>
             <div className="flex justify-end gap-2 mt-6">
               <button 
                  onClick={() => { setIsEditing(null); setIsAdding(false); setFormData({}); }} 
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

       <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
         <table className="w-full text-left">
           <thead className="bg-gray-100 text-gray-700 select-none border-b-2 border-pmmg-primary/20">
             <tr>
               <th className="p-4 border-b cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('prefix')}>
                    <div className="flex items-center gap-1">Prefixo {renderSortIcon('prefix')}</div>
               </th>
               <th className="p-4 border-b cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('plate')}>
                    <div className="flex items-center gap-1">Placa {renderSortIcon('plate')}</div>
               </th>
               <th className="p-4 border-b cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('model')}>
                    <div className="flex items-center gap-1">Marca/Modelo {renderSortIcon('model')}</div>
               </th>
               <th className="p-4 border-b cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('fraction')}>
                    <div className="flex items-center gap-1">Fração {renderSortIcon('fraction')}</div>
               </th>
               <th className="p-4 border-b text-right">Ações</th>
             </tr>
           </thead>
           <tbody>
             {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando frota...</td></tr> : 
              filtered.map(v => (
                <tr key={v.id} className="border-b hover:bg-amber-50/50 transition-colors">
                  <td className="p-4 font-bold font-mono text-pmmg-primary flex items-center gap-2">
                    <Car size={16} className="text-pmmg-accent" /> {v.prefix}
                  </td>
                  <td className="p-4 font-mono uppercase text-gray-700">{v.plate}</td>
                  <td className="p-4 text-gray-600">{v.model}</td>
                  <td className="p-4 text-gray-600">{v.fraction}</td>
                  <td className="p-4 text-right">
                    <button 
                        onClick={() => {
                            setIsEditing(v); 
                            setFormData({
                                prefix: v.prefix,
                                plate: v.plate,
                                model: v.model,
                                fraction: v.fraction
                            });
                        }} 
                        className="p-2 text-pmmg-primary hover:bg-pmmg-primary/10 rounded-full transition-colors"
                        title="Editar"
                    >
                        <Edit size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
           </tbody>
         </table>
       </div>
    </div>
  );
};