import React from 'react';
import { ArrowLeft, LogOut, FileText } from 'lucide-react';

interface PavModuleProps {
  onBack: () => void;
  userEmail: string;
  onLogout: () => void;
}

export const PavModule: React.FC<PavModuleProps> = ({ onBack, userEmail, onLogout }) => {
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  return (
    <div className="min-h-screen bg-[#958458] font-sans flex flex-col">
      {/* Header Específico do PAV */}
      <header className="bg-[#3E3223] shadow-lg sticky top-0 z-40 border-b-4 border-[#C5A059]">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
                onClick={onBack}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Voltar ao Menu"
             >
                <ArrowLeft size={24} />
             </button>
             <div className="flex items-center gap-3">
                <img src={shieldUrl} alt="Escudo" className="h-12" />
                <div>
                    <h1 className="text-2xl font-bold text-[#C5A059]">Controle de PAV</h1>
                    <p className="text-xs text-gray-400">Polícia Administrativa</p>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 hidden md:block">{userEmail}</span>
            <button 
                onClick={onLogout}
                className="text-red-300 hover:text-red-100"
                title="Sair"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-[#fdfbf7] rounded-xl shadow-2xl border border-[#d4c5a3] p-8 min-h-[500px] flex flex-col items-center justify-center text-center">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
                <FileText size={64} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#3E3223] mb-2">Módulo PAV em Construção</h2>
            <p className="text-gray-600 max-w-md">
                Aguardando as instruções para criação dos formulários e controles. 
                Por favor, forneça os detalhes do que precisa ser controlado aqui.
            </p>
        </div>
      </main>
    </div>
  );
};