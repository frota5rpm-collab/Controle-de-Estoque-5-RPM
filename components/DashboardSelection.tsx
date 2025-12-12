import React from 'react';
import { Package, Shield, LogOut } from 'lucide-react';

interface DashboardSelectionProps {
  onSelectModule: (module: 'STOCK' | 'PAV') => void;
  userEmail: string;
  onLogout: () => void;
}

export const DashboardSelection: React.FC<DashboardSelectionProps> = ({ onSelectModule, userEmail, onLogout }) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  return (
    <div className="min-h-screen bg-[#958458] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        
        {/* Cabeçalho do Menu */}
        <div className="text-center mb-10">
          <img 
            src={shieldUrl} 
            alt="Brasão PMMG" 
            className="h-28 mx-auto mb-4 drop-shadow-xl filter brightness-110"
          />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-md font-serif mb-2">
            Sistema Integrado 5ª RPM
          </h1>
          <p className="text-white/80">Bem-vindo, {userEmail}</p>
        </div>

        {/* Grid de Opções */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Cartão 1: Estoque & Frota */}
          <button 
            onClick={() => onSelectModule('STOCK')}
            className="group bg-[#fdfbf7] p-8 rounded-xl shadow-2xl border-t-8 border-[#3E3223] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#3E3223]/10 p-6 rounded-full mb-6 group-hover:bg-[#3E3223]/20 transition-colors">
              <Package size={48} className="text-[#3E3223]" />
            </div>
            <h2 className="text-2xl font-bold text-[#3E3223] mb-3 group-hover:text-[#C5A059] transition-colors">
              Controle de Estoque
            </h2>
            <p className="text-gray-600">
              Gerenciamento de materiais, movimentações (entrada/saída) e mapa carga da frota.
            </p>
          </button>

          {/* Cartão 2: PAV */}
          <button 
            onClick={() => onSelectModule('PAV')}
            className="group bg-[#fdfbf7] p-8 rounded-xl shadow-2xl border-t-8 border-[#C5A059] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
          >
            <div className="bg-[#C5A059]/10 p-6 rounded-full mb-6 group-hover:bg-[#C5A059]/20 transition-colors">
              <Shield size={48} className="text-[#C5A059]" />
            </div>
            <h2 className="text-2xl font-bold text-[#3E3223] mb-3 group-hover:text-[#C5A059] transition-colors">
              Controle de PAV
            </h2>
            <p className="text-gray-600">
              Gestão administrativa, controle de processos e novos registros do PAV.
            </p>
          </button>

        </div>

        {/* Botão de Sair */}
        <div className="mt-12 text-center">
          <button 
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/30 px-6 py-2 rounded-full"
          >
            <LogOut size={18} /> Sair do Sistema
          </button>
        </div>

      </div>
    </div>
  );
};