
import React, { useState, useEffect } from 'react';
import { Package, Truck, History, LogOut, Home, Wifi, WifiOff, RefreshCw, Clock, AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import { InventoryTab } from './components/InventoryTab';
import { MovementsTab } from './components/MovementsTab';
import { FleetTab } from './components/FleetTab';
import { checkConnection, supabase, isNetworkError, getErrorMessage } from './lib/supabase';
import { DatabaseSetup } from './components/DatabaseSetup';
import { LoginScreen } from './components/LoginScreen';
import { DashboardSelection } from './components/DashboardSelection';
import { PavModule } from './components/PavModule';
import { VehicleScheduleModule } from './components/VehicleScheduleModule';
import { FleetSubstitutionModule } from './components/FleetSubstitutionModule';
import { Tab, ModuleType } from './types';

type ConnectionStatus = 'LOADING' | 'ONLINE' | 'OFFLINE_NETWORK' | 'OFFLINE_SQL' | 'OFFLINE_CONFIG';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [currentModule, setCurrentModule] = useState<ModuleType>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('LOADING');
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const verifyConnection = async () => {
    setIsRetrying(true);
    const result = await checkConnection();
    if (result.ok) {
        setConnStatus('ONLINE');
    } else {
        setErrorMessage(result.message || '');
        if (result.type === 'NETWORK') setConnStatus('OFFLINE_NETWORK');
        else if (result.type === 'SQL') setConnStatus('OFFLINE_SQL');
        else if (result.type === 'AUTH_CONFIG') setConnStatus('OFFLINE_CONFIG');
    }
    setIsRetrying(false);
  };

  useEffect(() => {
    verifyConnection();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentModule(null);
  };

  if (authLoading) {
     return (
        <div className="min-h-screen bg-[#958458] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <div className="text-white font-bold text-xl animate-pulse uppercase tracking-widest">Sincronizando...</div>
        </div>
     );
  }

  if (connStatus === 'OFFLINE_NETWORK') {
      return (
          <div className="min-h-screen bg-[#3E3223] flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-t-8 border-amber-500">
                  <WifiOff size={40} className="text-amber-600 animate-pulse mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Falha de Conexão</h2>
                  <p className="text-gray-600 mb-6 text-sm">{errorMessage}</p>
                  <button onClick={verifyConnection} className="w-full py-4 bg-[#C5A059] text-[#3E3223] font-black rounded-lg shadow-lg hover:bg-[#b08d4a] transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                      <RefreshCw size={20} className={isRetrying ? 'animate-spin' : ''} />
                      {isRetrying ? 'Tentando...' : 'Reconectar'}
                  </button>
              </div>
          </div>
      );
  }

  if (connStatus === 'OFFLINE_SQL') {
      return <DatabaseSetup onBack={() => verifyConnection()} />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  const userFullName = session?.user?.user_metadata?.full_name || session?.user?.email || 'Militar';

  if (!currentModule) {
    return (
      <DashboardSelection 
        onSelectModule={setCurrentModule} 
        userEmail={userFullName} 
        onLogout={handleLogout}
        onChangePassword={() => {}}
      />
    );
  }

  if (currentModule === 'SCHEDULE') return <VehicleScheduleModule onBack={() => setCurrentModule(null)} userEmail={userFullName} onLogout={handleLogout} />;
  if (currentModule === 'PAV') return <PavModule onBack={() => setCurrentModule(null)} userEmail={userFullName} onLogout={handleLogout} />;
  if (currentModule === 'SUBSTITUTION') return <FleetSubstitutionModule onBack={() => setCurrentModule(null)} userEmail={userFullName} onLogout={handleLogout} />;

  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          <div className="flex items-center gap-4 py-2">
            <button onClick={() => setCurrentModule(null)} className="hidden md:flex flex-col items-center justify-center text-[#C5A059] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
               <Home size={20} />
               <span className="text-[10px] uppercase font-bold mt-1">Menu</span>
            </button>
            <img src={shieldUrl} alt="Escudo PMMG" className="h-28 drop-shadow-xl" />
          </div>
          <div className="text-right">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#C5A059] font-serif uppercase tracking-tight">CONTROLE DE ESTOQUE</h1>
            <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif">FROTA 5ª RPM</p>
            <div className="mt-1 flex items-center justify-end gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm font-semibold text-white/90">{userFullName}</span>
            </div>
          </div>
        </div>
        <div className="bg-[#4A3B2A]/90 backdrop-blur-sm text-white/90">
          <div className="container mx-auto px-4 flex justify-between items-center overflow-x-auto">
            <div className="flex gap-1">
              <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all whitespace-nowrap font-bold uppercase tracking-wider text-sm ${activeTab === 'inventory' ? 'border-[#C5A059] text-[#C5A059] bg-black/20' : 'border-transparent hover:bg-white/5 text-white/70 hover:text-white'}`}><Package size={18} /> Estoque</button>
              <button onClick={() => setActiveTab('movements')} className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all whitespace-nowrap font-bold uppercase tracking-wider text-sm ${activeTab === 'movements' ? 'border-[#C5A059] text-[#C5A059] bg-black/20' : 'border-transparent hover:bg-white/5 text-white/70 hover:text-white'}`}><History size={18} /> Movimentações</button>
              <button onClick={() => setActiveTab('fleet')} className={`flex items-center gap-2 px-6 py-3 border-b-4 transition-all whitespace-nowrap font-bold uppercase tracking-wider text-sm ${activeTab === 'fleet' ? 'border-[#C5A059] text-[#C5A059] bg-black/20' : 'border-transparent hover:bg-white/5 text-white/70 hover:text-white'}`}><Truck size={18} /> Mapa Carga</button>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-200 hover:text-red-100 hover:bg-red-900/30 rounded transition-colors text-sm font-semibold ml-4 whitespace-nowrap"><LogOut size={18} /> Sair</button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] min-h-[500px]">
          <div className="p-4 md:p-6">
            {activeTab === 'inventory' && <InventoryTab />}
            {activeTab === 'movements' && <MovementsTab />}
            {activeTab === 'fleet' && <FleetTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
