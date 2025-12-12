import React, { useState, useEffect } from 'react';
import { Package, Truck, History, LogOut, Home } from 'lucide-react';
import { InventoryTab } from './components/InventoryTab';
import { MovementsTab } from './components/MovementsTab';
import { FleetTab } from './components/FleetTab';
import { checkConnection, supabase } from './lib/supabase';
import { DatabaseSetup } from './components/DatabaseSetup';
import { LoginScreen } from './components/LoginScreen';
import { DashboardSelection } from './components/DashboardSelection';
import { PavModule } from './components/PavModule';
import { Tab } from './types';

// Tipos de módulo disponíveis
type ModuleType = 'STOCK' | 'PAV' | null;

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [currentModule, setCurrentModule] = useState<ModuleType>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // Estados de Autenticação
  const [session, setSession] = useState<any>(null);
  const [isManualAuth, setIsManualAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar conexão com banco
    checkConnection().then(setIsConnected);

    // 2. Verificar Sessão Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Se não tem sessão Supabase, verifica se tem sessão Manual (LocalStorage)
      if (!session) {
        const localAuth = localStorage.getItem('pmmg_auth');
        if (localAuth === 'true') {
            setIsManualAuth(true);
        }
      }
      setAuthLoading(false);
    });

    // 3. Ouvir mudanças na autenticação Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setIsManualAuth(false); // Prioriza Supabase
    });

    return () => subscription.unsubscribe();
  }, []);

  // Função Unificada de Logout
  const handleLogout = async () => {
    await supabase.auth.signOut(); // Logout Supabase
    localStorage.removeItem('pmmg_auth'); // Logout Manual
    setSession(null);
    setIsManualAuth(false);
    setCurrentModule(null);
  };

  const handleManualLoginSuccess = () => {
      setIsManualAuth(true);
  };

  // ----- RENDERING FLOW -----

  // 1. Tela de Carregamento
  if (authLoading) {
     return (
        <div className="min-h-screen bg-[#958458] flex items-center justify-center">
            <div className="text-white font-bold text-xl animate-pulse">Carregando sistema...</div>
        </div>
     );
  }

  // 2. Tela de Login (Se não tiver sessão nem manual nem Supabase)
  const isAuthenticated = session || isManualAuth;
  
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleManualLoginSuccess} />;
  }

  // 3. Configuração de Banco (apenas se conectado e houver erro de conexão com tabelas)
  if (isConnected === false) {
    return <DatabaseSetup />;
  }

  const userEmail = session?.user?.email || 'frota5rpm@gmail.com';

  // 4. Tela de Seleção de Módulo (Dashboard)
  if (!currentModule) {
    return (
      <DashboardSelection 
        onSelectModule={setCurrentModule} 
        userEmail={userEmail}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Módulo PAV
  if (currentModule === 'PAV') {
    return (
      <PavModule 
        onBack={() => setCurrentModule(null)} 
        userEmail={userEmail}
        onLogout={handleLogout}
      />
    );
  }

  // 6. Módulo ESTOQUE (Aplicação original)
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-32 flex items-center justify-between">
          
          {/* Lado Esquerdo: Escudo e Botão Voltar */}
          <div className="flex items-center gap-4 py-2">
            <button 
              onClick={() => setCurrentModule(null)}
              className="hidden md:flex flex-col items-center justify-center text-[#C5A059] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
              title="Voltar ao Menu Principal"
            >
               <Home size={20} />
               <span className="text-[10px] uppercase font-bold mt-1">Menu</span>
            </button>
            <img 
              src={shieldUrl} 
              alt="Escudo PMMG" 
              className="h-28 drop-shadow-xl filter brightness-110"
              style={{ height: '7rem' }}
            />
          </div>

          {/* Lado Direito: Título */}
          <div className="text-right">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] drop-shadow-md shadow-black/50 font-serif uppercase">
              CONTROLE DE ESTOQUE
            </h1>
            <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif">
              FROTA 5ª RPM
            </p>
            <p className="text-xs text-gray-300 mt-1 opacity-70">Logado como: {userEmail}</p>
          </div>
        </div>
        
        {/* Navigation Tabs & Logout */}
        <div className="bg-[#4A3B2A]/90 backdrop-blur-sm text-white/90">
          <div className="container mx-auto px-4 flex justify-between items-center overflow-x-auto">
            <div className="flex gap-1">
              {/* Botão Menu Mobile (aparece só em telas pequenas) */}
              <button 
                onClick={() => setCurrentModule(null)}
                className="md:hidden flex items-center gap-2 px-4 py-3 border-b-4 border-transparent text-white/70 hover:text-white hover:bg-white/5"
              >
                 <Home size={18} />
              </button>

              {/* 1. ESTOQUE */}
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

              {/* 2. MOVIMENTAÇÕES */}
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

              {/* 3. MAPA CARGA */}
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

            {/* Botão Sair */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-200 hover:text-red-100 hover:bg-red-900/30 rounded transition-colors text-sm font-semibold ml-4 whitespace-nowrap"
              title="Sair do sistema"
            >
              <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
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