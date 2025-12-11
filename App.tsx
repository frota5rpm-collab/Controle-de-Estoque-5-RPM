import React, { useState, useEffect } from 'react';
import { Package, Truck, History } from 'lucide-react';
import { InventoryTab } from './components/InventoryTab';
import { MovementsTab } from './components/MovementsTab';
import { FleetTab } from './components/FleetTab';
import { checkConnection } from './lib/supabase';
import { DatabaseSetup } from './components/DatabaseSetup';
import { Tab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkConnection().then(setIsConnected);
  }, []);

  if (isConnected === false) {
    return <DatabaseSetup />;
  }

  // URL do escudo (brasão)
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
      {/* Header - Cor alterada para Marrom Escuro (antiga cor do texto) */}
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          
          {/* Lado Esquerdo: Escudo */}
          <div className="flex-shrink-0 py-2">
            <img 
              src={shieldUrl} 
              alt="Escudo PMMG" 
              className="h-28 drop-shadow-xl filter brightness-110"
            />
          </div>

          {/* Lado Direito: Título - Cor alterada para Dourado (cor do Mapa Carga) */}
          <div className="text-right">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] drop-shadow-md shadow-black/50 font-serif">
              Controle de Estoque 5ª RPM
            </h1>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-[#4A3B2A]/90 backdrop-blur-sm text-white/90">
          <div className="container mx-auto px-4 flex gap-1 overflow-x-auto">
             {/* 1. ESTOQUE (Esquerda) */}
             <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all whitespace-nowrap font-bold uppercase tracking-wider text-sm ${
                  activeTab === 'inventory' 
                  ? 'border-[#C5A059] text-[#C5A059] bg-black/20' 
                  : 'border-transparent hover:bg-white/5 text-white/70 hover:text-white'
                }`}
             >
               <Package size={18} /> Estoque
             </button>

             {/* 2. MOVIMENTAÇÕES (Meio) */}
             <button
                onClick={() => setActiveTab('movements')}
                className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all whitespace-nowrap font-bold uppercase tracking-wider text-sm ${
                  activeTab === 'movements' 
                  ? 'border-[#C5A059] text-[#C5A059] bg-black/20' 
                  : 'border-transparent hover:bg-white/5 text-white/70 hover:text-white'
                }`}
             >
               <History size={18} /> Movimentações
             </button>

             {/* 3. MAPA CARGA (Direita) */}
             <button
                onClick={() => setActiveTab('fleet')}
                className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all whitespace-nowrap font-bold uppercase tracking-wider text-sm ${
                  activeTab === 'fleet' 
                  ? 'border-[#C5A059] text-[#C5A059] bg-black/20' 
                  : 'border-transparent hover:bg-white/5 text-white/70 hover:text-white'
                }`}
             >
               <Truck size={18} /> Mapa Carga
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] min-h-[500px] p-1">
          {isConnected === null ? (
            <div className="flex items-center justify-center h-64 text-gray-500 font-semibold">
              Conectando ao banco de dados...
            </div>
          ) : (
            <div className="p-4 md:p-6">
              {activeTab === 'inventory' && <InventoryTab />}
              {activeTab === 'movements' && <MovementsTab />}
              {activeTab === 'fleet' && <FleetTab />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;