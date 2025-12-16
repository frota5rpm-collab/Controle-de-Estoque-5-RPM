import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Material } from '../types';
import { Edit, FileDown, FileUp, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, XCircle, Car } from 'lucide-react';
import { exportToExcel, parseExcel } from '../utils/excel';

type SortKey = 'name' | 'quantity' | 'status' | 'unit';

export const InventoryTab: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'LOW' | 'NONE' | 'NORMAL'>('ALL');
  const [search, setSearch] = useState('');
  
  // Configuração de ordenação
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ASC' | 'DESC' }>({ 
    key: 'name', 
    direction: 'ASC' 
  });

  const [isEditing, setIsEditing] = useState<Material | null>(null);
  
  // Form states
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

  const handleSave = async () => {
    if (!formData.name) return;
    
    // Bloqueia inserção manual por aqui, permite apenas edição
    if (!isEditing || !isEditing.id) return;

    try {
      // Atualiza nome, unidade e veículos compatíveis. Quantidade é via Movimentações.
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
      setFormData({ name: '', quantity: 0, unit: 'Unidade', compatible_vehicles: '' });
      fetchMaterials();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message || JSON.stringify(err)}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const data = await parseExcel(e.target.files[0]);
        
        // Função auxiliar para buscar chave ignorando maiúsculas/minúsculas
        const findValue = (row: any, searchKeys: string[]) => {
            const objectKeys = Object.keys(row);
            for (const searchKey of searchKeys) {
                const foundKey = objectKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase());
                if (foundKey) return row[foundKey];
            }
            return undefined;
        };

        const formattedData = data.map((row: any) => ({
          name: findValue(row, ['material', 'nome', 'name', 'item', 'descricao']),
          quantity: Number(findValue(row, ['quantidade', 'qtd', 'quantity', 'saldo', 'quant']) || 0),
          unit: findValue(row, ['unidade', 'medida', 'unit', 'und', 'tipo']) || 'Unidade',
          compatible_vehicles: findValue(row, ['compatibilidade', 'veiculos', 'compativel']) || ''
        })).filter(r => r.name); // Filtra linhas que tenham pelo menos nome

        if (formattedData.length > 0) {
          const { error } = await supabase.from('materials').insert(formattedData);
          if (error) throw error;
          alert(`${formattedData.length} itens importados com sucesso!`);
          fetchMaterials();
        } else {
          alert("Nenhum material encontrado no arquivo. Verifique se as colunas chamam 'Material' e 'Quantidade'.");
        }
      } catch (err: any) {
        alert(`Erro ao importar: ${err.message || 'Verifique o formato do arquivo.'}`);
        console.error(err);
      }
    }
  };

  const getStatus = (m: Material) => {
    if (m.quantity === 0) return 'NONE';
    if (m.quantity < 5) return 'LOW'; 
    return 'NORMAL';
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

  const filteredMaterials = materials
    .filter(m => {
      const status = getStatus(m);
      const matchesFilter = filter === 'ALL' || status === filter;
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
      } 
      else if (sortConfig.key === 'name' || sortConfig.key === 'unit') {
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
        <div className="flex flex-col md:flex-row items-center gap-2 w-full xl:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar material ou veículo compatível..."
              className="pl-8 pr-4 py-2 border rounded-md w-full focus:ring-2 focus:ring-pmmg-primary outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="border p-2 rounded-md flex-1 md:flex-none focus:ring-2 focus:ring-pmmg-primary outline-none"
              value={filter}
              onChange={(e: any) => setFilter(e.target.value)}
            >
              <option value="ALL">Todos os Status</option>
              <option value="NORMAL">Estoque Normal</option>
              <option value="LOW">Estoque Baixo</option>
              <option value="NONE">Sem Estoque</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-2 w-full xl:w-auto justify-end">
          <label className="flex items-center gap-2 px-3 py-2 bg-pmmg-success text-white rounded-md cursor-pointer hover:bg-green-800 transition-colors shadow-sm">
            <FileUp size={16} /> <span className="hidden sm:inline">Importar Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={() => exportToExcel(materials, 'Estoque_Frota_5RPM')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm"
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
                  placeholder="Ex: Unidade, Litros, Caixa, Kg..."
                />
              </div>
              
              {/* CAMPO DE VEÍCULOS COMPATÍVEIS */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Veículos Compatíveis (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-pmmg-primary outline-none" 
                  value={formData.compatible_vehicles || ''} 
                  onChange={e => setFormData({...formData, compatible_vehicles: e.target.value})}
                  placeholder="Ex: L200, Duster, Palio..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Quantidade
                  <span className="text-xs text-red-500 ml-2 font-normal">(Bloqueado na edição)</span>
                </label>
                <input 
                  type="number" 
                  className="w-full border p-2 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                  disabled={true} 
                />
                <p className="text-xs text-gray-500 mt-1">Para alterar a quantidade, realize uma Movimentação (Entrada/Saída).</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => { setIsEditing(null); }}
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
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 select-none border-b-2 border-pmmg-primary/20">
            <tr>
              <th 
                className="p-4 font-semibold border-b cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">Material {renderSortIcon('name')}</div>
              </th>
              <th 
                className="p-4 font-semibold border-b text-center w-32 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('quantity')}
              >
                 <div className="flex items-center justify-center gap-1">Qtd {renderSortIcon('quantity')}</div>
              </th>
              <th 
                className="p-4 font-semibold border-b text-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('unit')}
              >
                <div className="flex items-center justify-center gap-1">Unidade {renderSortIcon('unit')}</div>
              </th>
              <th 
                className="p-4 font-semibold border-b text-center w-40 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('status')}
              >
                 <div className="flex items-center justify-center gap-1">Status {renderSortIcon('status')}</div>
              </th>
              <th className="p-4 font-semibold border-b text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando estoque...</td></tr>
            ) : filteredMaterials.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum material encontrado.</td></tr>
            ) : (
              filteredMaterials.map(item => {
                const status = getStatus(item);
                return (
                  <tr key={item.id} className="border-b hover:bg-amber-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">
                        <div>{item.name}</div>
                        {/* Exibe Veículos Compatíveis na Tabela se houver */}
                        {item.compatible_vehicles && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Car size={12} className="text-pmmg-accent" /> 
                                <span className="font-semibold text-gray-600">Compatível:</span> {item.compatible_vehicles}
                            </div>
                        )}
                    </td>
                    <td className="p-4 text-center font-mono text-lg font-bold text-gray-700">{item.quantity}</td>
                    <td className="p-4 text-center text-gray-600 text-sm">{item.unit || '-'}</td>
                    <td className="p-4 text-center">
                      {status === 'NONE' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle size={12} /> SEM ESTOQUE
                        </span>
                      )}
                      {status === 'LOW' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <AlertTriangle size={12} /> BAIXO
                        </span>
                      )}
                      {status === 'NORMAL' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setIsEditing(item); setFormData({ ...item, compatible_vehicles: item.compatible_vehicles || '' }); }}
                          className="p-2 text-pmmg-primary hover:bg-pmmg-primary/10 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
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