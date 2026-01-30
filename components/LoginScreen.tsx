
import React, { useState } from 'react';
import { Lock, User, LogIn, Eye, EyeOff, UserPlus, KeyRound, ShieldAlert, BadgeHelp, Mail, CheckCircle, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { supabase, isNetworkError, getErrorMessage } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'RECOVERY';

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [pmNumber, setPmNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [realEmail, setRealEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sectionCode, setSectionCode] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' | 'warning' } | null>(null);

  const ACCESS_CODE = 'FROTA5RPM'; 
  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cleanPm = pmNumber.replace(/\D/g, '');
    if (cleanPm.length < 3) {
        setMessage({ text: "Nº PM inválido.", type: 'error' });
        setLoading(false);
        return;
    }

    try {
      if (mode === 'LOGIN') {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('pm_number', cleanPm) 
            .maybeSingle();

        if (profileError) {
            console.error("Erro ao buscar perfil:", profileError);
            const errorText = getErrorMessage(profileError);
            if (isNetworkError(profileError)) {
                throw new Error(`Sem conexão com o banco. O servidor pode estar hibernando (aguarde 1 min). Erro: ${errorText}`);
            }
            throw new Error(`Erro ao validar PM: ${errorText}`);
        }

        if (!profile) {
            setMessage({ 
              text: "Nº PM não encontrado. Realize um novo cadastro.", 
              type: 'warning' 
            });
            setLoading(false);
            return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: password,
        });

        if (loginError) {
            const loginMsg = getErrorMessage(loginError);
            if (loginMsg.includes("Invalid login credentials")) {
                throw new Error("Senha incorreta para este Nº PM.");
            }
            throw new Error(loginMsg);
        }
      } else if (mode === 'REGISTER') {
        if (sectionCode !== ACCESS_CODE) throw new Error("Código de acesso da seção incorreto.");
        if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
        
        const { error: authError } = await supabase.auth.signUp({
          email: realEmail,
          password: password,
          options: { data: { full_name: fullName.toUpperCase(), pm_number: cleanPm } }
        });
        if (authError) throw new Error(getErrorMessage(authError));
        setMessage({ text: "Cadastro realizado! Agora tente fazer o login.", type: 'success' });
        setMode('LOGIN');
      } else if (mode === 'RECOVERY') {
          if (sectionCode !== ACCESS_CODE) throw new Error("Código Mestre da Seção incorreto.");
          const { error: rpcError } = await supabase.rpc('reset_password_via_pm', {
              target_pm: cleanPm,
              new_password: password,
              secret_code: sectionCode
          });
          if (rpcError) throw new Error(getErrorMessage(rpcError));
          setMessage({ text: "Senha redefinida com sucesso!", type: 'success' });
          setMode('LOGIN');
      }
    } catch (error: any) {
      setMessage({ text: getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#958458] flex items-center justify-center p-4">
      <div className="bg-[#fdfbf7] p-8 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-pmmg-primary animate-fade-in text-gray-800">
        <div className="flex flex-col items-center mb-6">
          <img src={shieldUrl} alt="Brasão PMMG" className="h-24 mb-4 drop-shadow-md" style={{ height: '6rem' }} />
          <h1 className="text-2xl font-bold text-pmmg-primary text-center font-serif uppercase tracking-tight">Gestão Frota 5ª RPM</h1>
          <p className="text-gray-500 text-[10px] mt-1 uppercase font-black tracking-widest">
            {mode === 'LOGIN' ? 'Acesso Restrito' : mode === 'REGISTER' ? 'Novo Cadastro' : 'Recuperar Senha'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-600 mb-1 uppercase tracking-widest">Nº PM (Login)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text" required
                className="w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none tracking-widest font-mono font-bold text-gray-800 text-lg shadow-inner"
                placeholder="123.456-7"
                value={pmNumber}
                onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 7);
                    if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d)/, '$1.$2-$3');
                    else if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, '$1.$2');
                    setPmNumber(v);
                }}
                disabled={loading}
              />
            </div>
          </div>

          {mode === 'REGISTER' && (
              <div className="animate-fade-in space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-600 mb-1 uppercase tracking-widest">Nome Completo</label>
                    <input
                        type="text" required placeholder="POSTO/GRAD E NOME"
                        className="w-full px-4 py-2.5 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none uppercase font-bold text-sm"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-600 mb-1 uppercase tracking-widest">E-mail</label>
                    <input
                        type="email" required placeholder="E-MAIL"
                        className="w-full px-4 py-2.5 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none text-sm"
                        value={realEmail}
                        onChange={(e) => setRealEmail(e.target.value)}
                    />
                  </div>
              </div>
          )}

          {(mode === 'REGISTER' || mode === 'RECOVERY') && (
              <div className="bg-amber-50 p-4 rounded border border-amber-200 animate-fade-in">
                  <label className="block text-[10px] font-black text-amber-800 mb-1 uppercase tracking-tighter">Código Mestre</label>
                  <input
                      type="text" required placeholder="FROTA..."
                      className="w-full px-4 py-2 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 outline-none uppercase font-bold text-sm"
                      value={sectionCode}
                      onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                  />
              </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-600 mb-1 uppercase tracking-widest">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"} required
                className="w-full pl-10 pr-10 py-3 border rounded-md focus:ring-2 focus:ring-[#C5A059] outline-none shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-xs font-bold border flex items-start gap-3 ${
                message.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 
                message.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                'bg-green-50 text-green-800 border-green-200'
            }`}>
              {message.type === 'error' ? <XCircle size={16} /> : message.type === 'warning' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className={`w-full text-white font-black py-4 rounded-lg shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest transition-all ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#3E3223] hover:bg-[#2a2218] active:scale-95'
            }`}
          >
            {loading ? <RefreshCw className="animate-spin" /> : <LogIn size={20} />}
            {mode === 'LOGIN' ? 'Acessar' : mode === 'REGISTER' ? 'Cadastrar' : 'Redefinir'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
            {mode === 'LOGIN' ? (
                <>
                    <button onClick={() => { setMode('REGISTER'); setMessage(null); }} className="text-sm font-bold text-[#C5A059] hover:underline">Não possui conta? Registre-se aqui.</button>
                    <br/>
                    <button onClick={() => { setMode('RECOVERY'); setMessage(null); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Esqueceu sua senha?</button>
                </>
            ) : (
                <button onClick={() => { setMode('LOGIN'); setMessage(null); }} className="text-sm font-bold text-gray-500 hover:text-[#3E3223]">Voltar para o Login</button>
            )}
        </div>
      </div>
    </div>
  );
};
