
import React from 'react';
import { Package, Shield, LogOut, KeyRound, CalendarClock, RefreshCw, Droplets } from 'lucide-react';
import { ModuleType } from '../types';

interface DashboardSelectionProps {
  onSelectModule: (module: ModuleType) => void;
  userEmail: string;
  onLogout: () => void;
  onChangePassword: () => void;
}

export const DashboardSelection: React.FC<DashboardSelectionProps> = ({ 
  onSelectModule, 
  userEmail, 
  onLogout,
  onChangePassword
}) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#958458] flex flex-col items-center justify-center p-4 font-sans relative">
      
      {/* Botões Superiores */}
      <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap justify-end">
        <button 
          onClick={onChangePassword}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/30 px-4 py-2 rounded-full text-sm font-bold"
        >
          <KeyRound size={16} /> Alterar Senha
        </button>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-red-200 hover:text-red-100 transition-colors bg-red-900/20 hover:bg-red-900/40 px-4 py-2 rounded-full text-sm font-bold"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      <div className="w-full max-w-6xl mt-12 md:mt-0">
        
        {/* Cabeçalho do Menu */}
        <div className="text-center mb-10">
          <img 
            src={shieldUrl} 
            alt="Brasão PMMG" 
            className="h-28 mx-auto mb-4 drop-shadow-xl filter brightness-110"
          />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-md font-serif mb-2">
            Sistema de Gestão Frota 5ª RPM
          </h1>
          <p className="text-white/90 text-lg font-medium">
            Bem-vindo, {userEmail}
          </p>
        </div>

        {/* Grid de Opções - Ajustado para 5 itens em telas grandes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          {/* Cartão 1: Controle de Estoque */}
          <button 
            onClick={() => onSelectModule('STOCK')}
            className="group bg-[#fdfbf7] p-6 rounded-xl shadow-2xl border-t-8 border-[#3E3223] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#3E3223]/10 p-4 rounded-full mb-4 group-hover:bg-[#3E3223]/20 transition-colors">
              <Package size={32} className="text-[#3E3223]" />
            </div>
            <h2 className="text-lg font-bold text-[#3E3223] mb-2 group-hover:text-[#C5A059] transition-colors">
              Estoque
            </h2>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">
                Materiais e Insumos
            </p>
          </button>

          {/* Cartão 2: Agenda de Viatura */}
          <button 
            onClick={() => onSelectModule('SCHEDULE')}
            className="group bg-[#fdfbf7] p-6 rounded-xl shadow-2xl border-t-8 border-[#C5A059] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#C5A059]/10 p-4 rounded-full mb-4 group-hover:bg-[#C5A059]/20 transition-colors">
              <CalendarClock size={32} className="text-[#C5A059]" />
            </div>
            <h2 className="text-lg font-bold text-[#3E3223] mb-2 group-hover:text-[#C5A059] transition-colors">
              Agenda
            </h2>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">
                Empréstimo de Viaturas
            </p>
          </button>

          {/* Cartão 3: Substituição da Frota */}
          <button 
            onClick={() => onSelectModule('SUBSTITUTION')}
            className="group bg-[#fdfbf7] p-6 rounded-xl shadow-2xl border-t-8 border-[#556B2F] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#556B2F]/10 p-4 rounded-full mb-4 group-hover:bg-[#556B2F]/20 transition-colors">
              <RefreshCw size={32} className="text-[#556B2F]" />
            </div>
            <h2 className="text-lg font-bold text-[#3E3223] mb-2 group-hover:text-[#556B2F] transition-colors text-xs">
              Substituição
            </h2>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">
                Troca de Veículos
            </p>
          </button>

          {/* NOVO - Cartão 4: Controle de Combustível */}
          <button 
            onClick={() => onSelectModule('FUEL')}
            className="group bg-[#fdfbf7] p-6 rounded-xl shadow-2xl border-t-8 border-[#3E3223] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#3E3223]/10 p-4 rounded-full mb-4 group-hover:bg-[#3E3223]/20 transition-colors">
              <Droplets size={32} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-[#3E3223] mb-2 group-hover:text-blue-600 transition-colors">
              Combustível
            </h2>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">
                Controle de Abastecimento
            </p>
          </button>

          {/* Cartão 5: Controle de PAV */}
          <button 
            onClick={() => onSelectModule('PAV')}
            className="group bg-[#fdfbf7] p-6 rounded-xl shadow-2xl border-t-8 border-[#3E3223] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#3E3223]/10 p-4 rounded-full mb-4 group-hover:bg-[#3E3223]/20 transition-colors">
              <Shield size={32} className="text-[#3E3223]" />
            </div>
            <h2 className="text-lg font-bold text-[#3E3223] mb-2 group-hover:text-[#C5A059] transition-colors">
              PAV
            </h2>
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">
                Viaturas Locadas
            </p>
          </button>

        </div>
        
        <div className="mt-8 text-center text-white/40 text-xs">
            © {currentYear} Polícia Militar de Minas Gerais - 5ª RPM
        </div>

      </div>
    </div>
  );
};
