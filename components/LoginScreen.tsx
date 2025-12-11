import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Credenciais fixas solicitadas
    if (email === 'frota5rpm@gmail.com' && password === 'Transportes.2024') {
      localStorage.setItem('pmmg_auth', 'true'); // Salva sessão
      setError(false);
      onLoginSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#958458] flex items-center justify-center p-4">
      <div className="bg-[#fdfbf7] p-8 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-pmmg-primary">
        <div className="flex flex-col items-center mb-6">
          <img 
            src={shieldUrl} 
            alt="Brasão PMMG" 
            className="h-24 mb-4 drop-shadow-md"
          />
          <h1 className="text-2xl font-bold text-pmmg-primary text-center">Controle de Estoque 5ª RPM</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso Restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Login</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-pmmg-primary outline-none"
                placeholder="Ex: frota5rpm@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-pmmg-primary outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-sm text-center border border-red-200 font-semibold">
              Login ou senha incorretos.
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-pmmg-primary text-white font-bold py-3 rounded-md hover:bg-[#3E3223]/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <LogIn size={20} />
            Entrar no Sistema
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          Polícia Militar de Minas Gerais
        </div>
      </div>
    </div>
  );
};
