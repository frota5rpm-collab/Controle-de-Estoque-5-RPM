
import React, { useState, useEffect } from 'react';
import { Home, Fuel, Plus, Search, Edit, Trash2, LogOut, Car, User, Gauge, Droplets, Filter, FileDown, ArrowUpDown, ArrowUp, ArrowDown, Lock, Unlock, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FuelRecord } from '../types';
import { exportToExcel } from '../utils/excel';

interface FuelModuleProps {
  onBack?: () => void;
  userEmail?: string;
  onLogout?: () => void;
  isPublic?: boolean;
}

export const FuelModule: React.FC<FuelModuleProps> = ({ onBack, userEmail, onLogout, isPublic = false }) => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm: Partial<FuelRecord> = {
    vehicle_prefix: '',
    vehicle_plate: '',
    driver_name: '',
    liters: 0,
    fuel_type: 'DIESEL',
    odometer: 0,
    fraction: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleSave = async () => {
    if (isPublic) return;
    if (!formData.vehicle_prefix || !formData.liters) {
      alert("Prefixo e Litragem são obrigatórios.");
      return;
    }
    try {
      if (editingId) {
        await supabase.from('fuel_records').update(formData).eq('id', editingId);
      } else {
        await supabase.from('fuel_records').insert([formData]);
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (e) { alert("Erro ao salvar."); }
  };

  const filtered = records.filter(r => 
    r.vehicle_prefix.includes(search) || 
    (r.vehicle_plate || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.driver_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  return (
    <div className="min-h-screen bg-[#958458] flex flex-col font-sans">
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isPublic && onBack && (
              <button onClick={onBack} className="flex flex-col items-center text-[#C5A059] bg-white/5 p-2 rounded hover:bg-white/10">
                <Home size={20} /> <span className="text-[10px] font-bold uppercase mt-1">Menu</span>
              </button>
            )}
            <img src={shieldUrl} alt="Escudo" className="h-24" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#C5A059] uppercase">Combustível 5ª RPM</h1>
            <div className="flex items-center justify-end gap-2 text-white/70 text-sm font-bold">
              {isPublic ? <><Globe size={14}/> Visão Pública (Somente Leitura)</> : <><Lock size={14}/> Modo Militar - {userEmail}</>}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl p-6 border border-[#d4c5a3]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                placeholder="Buscar prefixo, placa ou motorista..." 
                className="w-full pl-10 pr-4 py-2 border rounded shadow-sm outline-none focus:ring-2 focus:ring-[#C5A059]"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {!isPublic && (
                <button onClick={() => { setEditingId(null); setFormData(initialForm); setIsModalOpen(true); }} className="bg-[#3E3223] text-[#C5A059] px-6 py-2 rounded font-bold shadow hover:bg-black flex items-center gap-2">
                  <Plus size={18} /> Novo Registro
                </button>
              )}
              <button onClick={() => exportToExcel(filtered, 'Combustivel_5RPM')} className="bg-green-700 text-white px-4 py-2 rounded font-bold hover:bg-green-800 flex items-center gap-2">
                <FileDown size={18} /> Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left bg-white">
              <thead className="bg-[#3E3223] text-white uppercase text-xs">
                <tr>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Viatura</th>
                  <th className="p-4">Motorista</th>
                  <th className="p-4">Odômetro</th>
                  <th className="p-4">Litros</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Unidade</th>
                  {!isPublic && <th className="p-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="text-sm divide-y">
                {loading ? <tr><td colSpan={8} className="p-8 text-center text-gray-500">Buscando dados...</td></tr> : 
                 filtered.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-500 italic">Nenhum abastecimento registrado.</td></tr> :
                 filtered.map(r => (
                  <tr key={r.id} className="hover:bg-amber-50">
                    <td className="p-4 font-mono text-xs">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                    <td className="p-4 font-bold text-[#3E3223]">
                      <div className="flex items-center gap-2"><Car size={14} className="text-[#C5A059]" /> {r.vehicle_prefix}</div>
                      <div className="text-[10px] text-gray-400">{r.vehicle_plate}</div>
                    </td>
                    <td className="p-4 uppercase font-semibold text-gray-600">{r.driver_name}</td>
                    <td className="p-4 font-mono">{r.odometer} KM</td>
                    <td className="p-4 font-bold text-blue-700">{r.liters} L</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black ${r.fuel_type === 'DIESEL' ? 'bg-black text-white' : 'bg-yellow-100 text-yellow-800'}`}>
                        {r.fuel_type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{r.fraction}</td>
                    {!isPublic && (
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingId(r.id); setFormData(r); setIsModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && !isPublic && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border-t-8 border-[#C5A059] p-6">
            <h2 className="text-xl font-bold text-[#3E3223] mb-6 flex items-center gap-2"><Droplets className="text-[#C5A059]"/> Registrar Abastecimento</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Prefixo *</label>
                  <input className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059]" value={formData.vehicle_prefix} onChange={e => setFormData({...formData, vehicle_prefix: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Placa</label>
                  <input className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059] uppercase" value={formData.vehicle_plate} onChange={e => setFormData({...formData, vehicle_plate: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Motorista</label>
                <input className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059] uppercase" value={formData.driver_name} onChange={e => setFormData({...formData, driver_name: e.target.value.toUpperCase()})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Litros *</label>
                  <input type="number" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059]" value={formData.liters} onChange={e => setFormData({...formData, liters: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Odômetro</label>
                  <input type="number" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059]" value={formData.odometer} onChange={e => setFormData({...formData, odometer: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Tipo Combustível</label>
                <select className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059]" value={formData.fuel_type} onChange={e => setFormData({...formData, fuel_type: e.target.value as any})}>
                  <option value="DIESEL">DIESEL</option>
                  <option value="GASOLINA">GASOLINA</option>
                  <option value="ETANOL">ETANOL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Unidade/Fração</label>
                <input className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-[#C5A059] uppercase" value={formData.fraction} onChange={e => setFormData({...formData, fraction: e.target.value.toUpperCase()})} />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2 bg-[#3E3223] text-[#C5A059] rounded font-black uppercase shadow-lg hover:bg-black">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
