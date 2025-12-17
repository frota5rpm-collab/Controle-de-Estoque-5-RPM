import React, { useState, useEffect } from 'react';
import { Package, Truck, History, LogOut, Home, KeyRound, Eye, EyeOff } from 'lucide-react';
import { InventoryTab } from './components/InventoryTab';
import { MovementsTab } from './components/MovementsTab';
import { FleetTab } from './components/FleetTab';
import { checkConnection, supabase } from './lib/supabase';
import { DatabaseSetup } from './components/DatabaseSetup';
import { LoginScreen } from './components/LoginScreen';
import { DashboardSelection } from './components/DashboardSelection';
import { PavModule } from './components/PavModule';
import { VehicleScheduleModule } from './components/VehicleScheduleModule';
import { FleetSubstitutionModule } from './components/FleetSubstitutionModule';
import { Tab } from './types';

// Tipos de módulo disponíveis
type ModuleType = 'STOCK' | 'PAV' | 'SCHEDULE' | 'SUBSTITUTION' | null;

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [currentModule, setCurrentModule] = useState<ModuleType>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // Estados de Autenticação
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estado Modal Alterar Senha (Logado)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Confirmação
  
  // Estados de visibilidade de senha
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [passwordMsg, setPasswordMsg] = useState<{text: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    // 1. Verificar conexão com banco
    checkConnection().then(setIsConnected);

    // 2. Verificar Sessão Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      
      // Se tiver token na URL, limpa
      if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // 3. Ouvir mudanças na autenticação Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthLoading(false);
      
      // Limpeza de URL
      if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Função Unificada de Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentModule(null);
    setActiveTab('inventory');
  };

  // Função para alterar senha (usuário logado)
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
        setPasswordMsg({ text: "A senha deve ter no mínimo 6 caracteres.", type: 'error' });
        return;
    }
    
    if (newPassword !== confirmPassword) {
        setPasswordMsg({ text: "As senhas não conferem.", type: 'error' });
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPasswordMsg({ text: "Senha alterada com sucesso!", type: 'success' });
        setTimeout(() => {
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMsg(null);
        }, 1500);
    } catch (err: any) {
        setPasswordMsg({ text: "Erro ao alterar senha: " + err.message, type: 'error' });
    }
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

  // 2. Tela de Login (Se não tiver sessão Supabase)
  if (!session) {
    return <LoginScreen />;
  }

  // 3. Configuração de Banco (Falha na conexão)
  if (isConnected === false) {
    // Se a conexão falhou automaticamente, mostra sem botão de voltar (exige reload)
    return <DatabaseSetup />;
  }

  // Recupera nome dos metadados ou usa o email
  const userFullName = session?.user?.user_metadata?.full_name || session?.user?.email || 'Militar';

  // 4. Tela de Seleção de Módulo (Dashboard)
  if (!currentModule) {
    return (
      <>
        <DashboardSelection 
          onSelectModule={setCurrentModule} 
          userEmail={userFullName} 
          onLogout={handleLogout}
          onChangePassword={() => setIsPasswordModalOpen(true)}
        />
        {/* Modal de Senha (Renderizado globalmente se necessário aqui) */}
        {isPasswordModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
                <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-sm border-t-4 border-[#C5A059]">
                    <h3 className="text-lg font-bold text-[#3E3223] mb-4 flex items-center gap-2">
                        <KeyRound size={20} className="text-[#C5A059]" />
                        Nova Senha
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nova Senha</label>
                            <div className="relative">
                                <input 
                                    type={showNewPassword ? "text" : "password"}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-[#C5A059] outline-none pr-10"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Senha</label>
                            <div className="relative">
                                <input 
                                    type={showConfirmNewPassword ? "text" : "password"}
                                    className={`w-full border p-2 rounded focus:ring-2 outline-none pr-10 ${
                                        confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : 'focus:ring-[#C5A059]'
                                    }`}
                                    placeholder="Digite novamente"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showConfirmNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        
                        {passwordMsg && (
                            <div className={`text-sm p-2 rounded ${
                                passwordMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {passwordMsg.text}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                onClick={() => { 
                                    setIsPasswordModalOpen(false); 
                                    setNewPassword(''); 
                                    setConfirmPassword(''); 
                                    setPasswordMsg(null);
                                    setShowNewPassword(false);
                                    setShowConfirmNewPassword(false);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleChangePassword}
                                className="px-4 py-2 bg-[#3E3223] text-white rounded hover:bg-[#2a2218]"
                            >
                                Salvar Senha
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </>
    );
  }

  // 5. Módulo Agenda de Viatura
  if (currentModule === 'SCHEDULE') {
      return (
        <VehicleScheduleModule 
          onBack={() => setCurrentModule(null)}
          userEmail={userFullName}
          onLogout={handleLogout}
        />
      );
  }

  // 6. Módulo PAV
  if (currentModule === 'PAV') {
    return (
      <PavModule 
        onBack={() => setCurrentModule(null)} 
        userEmail={userFullName}
        onLogout={handleLogout}
      />
    );
  }

  // 7. Módulo Substituição de Frota
  if (currentModule === 'SUBSTITUTION') {
    return (
      <FleetSubstitutionModule 
        onBack={() => setCurrentModule(null)}
        userEmail={userFullName}
        onLogout={handleLogout}
      />
    );
  }

  // 8. Módulo ESTOQUE (Aplicação original)
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

          {/* Lado Direito: Título e Saudação */}
          <div className="text-right flex flex-col items-end">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#C5A059] drop-shadow-md shadow-black/50 font-serif uppercase">
              CONTROLE DE ESTOQUE
            </h1>
            <p className="text-lg font-bold text-[#C5A059] opacity-90 tracking-widest font-serif mb-1">
              FROTA 5ª RPM
            </p>
            
            {/* Mensagem simples de boas vindas sem botão de senha */}
            <div className="mt-1">
                <span className="text-sm font-semibold text-white/90">
                   Bem-vindo, {userFullName}
                </span>
            </div>
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