
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Material } from '../types';
import { Edit, FileDown, FileUp, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, XCircle, Car, Filter, Check } from 'lucide-react';
import { exportToExcel, parseExcel } from '../utils/excel';

type SortKey = 'name' | 'quantity' | 'status' | 'unit';
type StatusType = 'NORMAL' | 'LOW' | 'NONE';

export const InventoryTab: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Novo estado para múltiplos filtros de status
  const [activeFilters, setActiveFilters] = useState<StatusType[]>(['NORMAL', 'LOW', 'NONE']);
  const [search, setSearch] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({ 
    key: 'name', 
    direction: 'ASC' 
  });

  const [isEditing, setIsEditing] = useState<Material | null>(null);
  const [formData, setFormData] = useState<Partial<Material>>({ 
      name: '', 
      quantity: 0, 
      unit: 'Unidade',
      compatible_vehicles: '' 
  });

  const fetchMaterials = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*');
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar materiais:', err);
      setErrorMsg(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const getStatus = (m: Material): StatusType => {
    if (m.quantity <= 0) return 'NONE';
    if (m.quantity < 5) return 'LOW'; 
    return 'NORMAL';
  };

  const toggleFilter = (status: StatusType) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? (prev.length > 1 ? prev.filter(s => s !== status) : prev) 
        : [...prev, status]
    );
  };

  const handleSave = async () => {
    if (!formData.name || !isEditing || !isEditing.id) return;
    try {
      const { error } = await supabase
        .from('materials')
        .update({ 
          name: formData.name, 
          unit: formData.unit,
          compatible_vehicles: formData.compatible_vehicles
        })
        .eq('id', isEditing.id);

      if (error) throw error;
      setIsEditing(null);
      fetchMaterials();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'ASC' | 'DESC' = 'ASC';
    if (sortConfig.key === key && sortConfig.direction === 'ASC') direction = 'DESC';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400 opacity-50" />;
    return sortConfig.direction === 'ASC' 
      ? <ArrowUp size={14} className="text-pmmg-primary" /> 
      : <ArrowDown size={14} className="text-pmmg-primary" />;
  };

  const filteredMaterials = materials
    .filter(m => {
      const status = getStatus(m);
      const matchesFilter = activeFilters.includes(status);
      const matchesSearch = 
        m.name.toLowerCase().includes(search.toLowerCase()) || 
        (m.compatible_vehicles || '').toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Material];
      let valB: any = b[sortConfig.key as keyof Material];

      if (sortConfig.key === 'status') {
         const weight = (m: Material) => {
             const s = getStatus(m);
             if (s === 'NONE') return 0;
             if (s === 'LOW') return 1;
             return 2;
         };
         valA = weight(a);
         valB = weight(b);
      } else if (sortConfig.key === 'name' || sortConfig.key === 'unit') {
         valA = (valA || '').toLowerCase();
         valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'ASC' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ASC' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border-l-4 border-pmmg-primary">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          {/* BUSCA */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar material..."
              className="pl-10 pr-4 py-2 border rounded-md w-full focus:ring-2 focus:ring-pmmg-primary outline-none shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* FILTROS MÚLTIPLOS (CHIPS) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-gray-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Filtrar Status:
            </span>
            <button 
              onClick={() => toggleFilter('NORMAL')} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${activeFilters.includes('NORMAL') ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-50 text-gray-300 border-gray-100 opacity-60'}`}
            >
              <div className={`w-2 h-2 rounded-full bg-green-600 ${!activeFilters.includes('NORMAL') && 'grayscale'}`}></div>
              Normal {activeFilters.includes('NORMAL') && <Check size={10} />}
            </button>
            <button 
              onClick={() => toggleFilter('LOW')} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${activeFilters.includes('LOW') ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-50 text-gray-300 border-gray-100 opacity-60'}`}
            >
              <div className={`w-2 h-2 rounded-full bg-yellow-600 ${!activeFilters.includes('LOW') && 'grayscale'}`}></div>
              Baixo {activeFilters.includes('LOW') && <Check size={10} />}
            </button>
            <button 
              onClick={() => toggleFilter('NONE')} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${activeFilters.includes('NONE') ? 'bg-red-100 text-red-800 border-red-300' : 'bg-gray-50 text-gray-300 border-gray-100 opacity-60'}`}
            >
              <div className={`w-2 h-2 rounded-full bg-red-600 ${!activeFilters.includes('NONE') && 'grayscale'}`}></div>
              Sem Estoque {activeFilters.includes('NONE') && <Check size={10} />}
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 w-full xl:w-auto justify-end">
          <label className="flex items-center gap-2 px-3 py-2 bg-pmmg-success text-white rounded-md cursor-pointer hover:bg-green-800 transition-colors shadow-sm text-sm font-bold">
            <FileUp size={16} /> <span className="hidden sm:inline">Importar Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={(e) => {}} />
          </label>
          <button 
            onClick={() => exportToExcel(materials, 'Estoque_Frota_5RPM')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm text-sm font-bold"
          >
            <FileDown size={16} /> <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200">
          <XCircle size={20} />
          <span>Erro: {errorMsg}</span>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl border-t-4 border-pmmg-primary">
            <h3 className="text-xl font-bold mb-4 text-pmmg-primary">Editar Material</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Material</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Unidade de Medida</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                  value={formData.unit} 
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Veículos Compatíveis</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                  value={formData.compatible_vehicles || ''} 
                  onChange={e => setFormData({...formData, compatible_vehicles: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditing(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-pmmg-primary text-white rounded hover:bg-[#3E3223] shadow-md">Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest border-b select-none">
            <tr>
              <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Material {renderSortIcon('name')}</div>
              </th>
              <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity')}>
                 <div className="flex items-center justify-center gap-1">Qtd {renderSortIcon('quantity')}</div>
              </th>
              <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('unit')}>
                <div className="flex items-center justify-center gap-1">Unidade {renderSortIcon('unit')}</div>
              </th>
              <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                 <div className="flex items-center justify-center gap-1">Status {renderSortIcon('status')}</div>
              </th>
              <th className="p-4 text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">Carregando estoque...</td></tr>
            ) : filteredMaterials.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">Nenhum material encontrado com os filtros ativos.</td></tr>
            ) : (
              filteredMaterials.map(item => {
                const status = getStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="p-4">
                        <div className="font-bold text-[#3E3223]">{item.name}</div>
                        {item.compatible_vehicles && (
                            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <Car size={12} className="text-pmmg-accent" /> {item.compatible_vehicles}
                            </div>
                        )}
                    </td>
                    <td className="p-4 text-center font-mono text-lg font-black text-gray-700">{item.quantity}</td>
                    <td className="p-4 text-center text-gray-500 text-sm">{item.unit || '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                        status === 'NORMAL' ? 'bg-green-100 text-green-800 border-green-200' : 
                        status === 'LOW' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {status === 'NORMAL' ? 'NORMAL' : status === 'LOW' ? 'BAIXO' : 'SEM ESTOQUE'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setIsEditing(item); setFormData(item); }}
                        className="p-2 text-pmmg-primary hover:bg-pmmg-primary/10 rounded-full transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
