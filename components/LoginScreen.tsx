import React, { useState } from 'react';
import { Lock, User, LogIn, Eye, EyeOff, UserPlus, KeyRound, ShieldAlert, BadgeHelp, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'RECOVERY';

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Campos
  const [pmNumber, setPmNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [realEmail, setRealEmail] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Novo campo de confirmação
  
  const [sectionCode, setSectionCode] = useState(''); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Estado para exibir confirmação
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  // --- CONFIGURAÇÃO DE SEGURANÇA ---
  const ACCESS_CODE = 'FROTA5RPM'; 

  const shieldUrl = "https://yaoebstgiagmrvlbozny.supabase.co/storage/v1/object/sign/Logo%20PMMG/ESCUDO%20PMMG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mMjgyNzE5YS0xNjI0LTRiYTUtODk3MC1jNTc3ZDIzMTQ4YjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMb2dvIFBNTUcvRVNDVURPIFBNTUcucG5nIiwiaWF0IjoxNzY1NDAzMzE0LCJleHAiOjIzOTYxMjMzMTR9.1uAuyEEDpwU_vmvKjnSJw0uYbcOIkB-vRpXRDU-Arss";

  // Formata o PM para 123.456-7
  const formatPmNumber = (value: string) => {
      // Remove tudo que não é dígito e limita a 7 caracteres
      let v = value.replace(/\D/g, '').slice(0, 7);
      
      // Aplica a máscara
      if (v.length > 6) {
          v = v.replace(/^(\d{3})(\d{3})(\d)/, '$1.$2-$3');
      } else if (v.length > 3) {
          v = v.replace(/^(\d{3})(\d)/, '$1.$2');
      }
      return v;
  };

  const handlePmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPmNumber(formatPmNumber(e.target.value));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Remove a máscara para processar internamente (o banco usa apenas números)
    const cleanPm = pmNumber.replace(/\D/g, '');

    // Validações Comuns
    if (cleanPm.length < 3) {
        setMessage({ text: "Nº PM inválido.", type: 'error' });
        setLoading(false);
        return;
    }

    try {
      if (mode === 'REGISTER') {
        // --- CADASTRO ---
        if (sectionCode !== ACCESS_CODE) throw new Error("Código de acesso da seção incorreto.");
        if (!fullName.trim()) throw new Error("Informe seu nome completo.");
        if (!realEmail.includes('@')) throw new Error("Informe um e-mail válido.");
        if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
        
        // Confirmação de senha no cadastro também é boa prática
        if (password !== confirmPassword) throw new Error("As senhas não conferem.");

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: realEmail,
          password: password,
          options: {
              data: {
                  full_name: fullName,
                  pm_number: cleanPm // Envia sem máscara
              }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
            try {
                await supabase.from('profiles').upsert({
                    id: authData.user.id,
                    pm_number: cleanPm, // Envia sem máscara
                    email: realEmail,
                    full_name: fullName
                }, { onConflict: 'id' });
            } catch (manualInsertError: any) {
                console.warn("Inserção manual falhou, confiando no Trigger:", manualInsertError);
            }

            setMessage({ text: "Cadastro realizado! Faça login para entrar.", type: 'success' });
            setMode('LOGIN');
            setPassword('');
            setConfirmPassword('');
        }

      } else if (mode === 'LOGIN') {
        // --- LOGIN ---
        // 1. Buscar qual é o e-mail deste PM usando o número limpo
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('pm_number', cleanPm) 
            .single();

        if (profileError || !profiles) {
            console.error("Erro busca perfil:", profileError);
            throw new Error("Cadastro não encontrado para este Nº PM. Verifique se digitou corretamente ou cadastre-se.");
        }

        const userEmail = profiles.email;

        // 2. Fazer login com o e-mail encontrado
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (loginError) throw loginError;

      } else if (mode === 'RECOVERY') {
        // --- RECUPERAÇÃO VIA CÓDIGO MESTRE (RPC) ---
        if (sectionCode !== ACCESS_CODE) throw new Error("Código Mestre da Seção incorreto.");
        if (password.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas digitadas não conferem.");

        // Chama a função RPC segura no banco de dados usando o número limpo
        const { data: rpcData, error: rpcError } = await supabase.rpc('reset_password_via_pm', {
            target_pm: cleanPm,
            new_password: password,
            secret_code: sectionCode
        });

        if (rpcError) throw rpcError;

        setMessage({ 
            text: "Sucesso! Sua senha foi redefinida. Use-a para entrar agora.", 
            type: 'success' 
        });
        
        // Retorna para login após sucesso
        setTimeout(() => {
            setMode('LOGIN');
            setPassword('');
            setConfirmPassword('');
        }, 2000);
      }

    } catch (error: any) {
      // --- Tratamento de Erro Robusto ---
      let errorMsg = "Ocorreu um erro desconhecido.";

      if (typeof error === 'string') {
          errorMsg = error;
      } else if (error instanceof Error) {
          errorMsg = error.message;
      } else if (typeof error === 'object' && error !== null) {
          errorMsg = error.message || error.msg || error.error_description || JSON.stringify(error);
      }

      // Mensagens Amigáveis
      if (typeof errorMsg === 'string') {
        if (errorMsg.includes("Invalid login credentials")) errorMsg = "Senha incorreta.";
        if (errorMsg.includes("User already registered")) errorMsg = "Este e-mail já está em uso.";
        if (errorMsg.includes("duplicate key")) errorMsg = "Este Nº PM já possui cadastro.";
        if (errorMsg.includes("row-level security")) errorMsg = "Erro de permissão. Tente recarregar a página.";
        if (mode === 'RECOVERY' && errorMsg.includes("PM não encontrado")) errorMsg = "Este Nº PM não possui cadastro no sistema.";
        
        if (mode === 'REGISTER' && errorMsg.includes("foreign key constraint")) {
            setMessage({ text: "Cadastro realizado! Faça login para entrar.", type: 'success' });
            setMode('LOGIN');
            setPassword('');
            setConfirmPassword('');
            setLoading(false);
            return;
        }
      }
      
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
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
            style={{ height: '6rem' }}
          />
          <h1 className="text-2xl font-bold text-pmmg-primary text-center">Controles Frota 5ª RPM</h1>
          <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-wider">
            {mode === 'REGISTER' && 'Novo Cadastro de Militar'}
            {mode === 'LOGIN' && 'Acesso ao Sistema'}
            {mode === 'RECOVERY' && 'Redefinição de Senha'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Campo Nº PM (Comum a todos) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nº PM (Login)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                maxLength={9} // Limita a 9 caracteres (123.456-7)
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-pmmg-primary outline-none tracking-widest font-mono font-bold text-gray-800 text-lg"
                placeholder="123.456-7"
                value={pmNumber}
                onChange={handlePmChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Campos Específicos de Cadastro */}
          {mode === 'REGISTER' && (
             <div className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-pmmg-primary outline-none uppercase"
                        placeholder="NOME COMPLETO"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Seu E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="email"
                            required
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-pmmg-primary outline-none"
                            placeholder="exemplo@gmail.com"
                            value={realEmail}
                            onChange={(e) => setRealEmail(e.target.value)}
                        />
                    </div>
                </div>
             </div>
          )}

          {/* Código de Seção (Cadastro e Recuperação) */}
          {(mode === 'REGISTER' || mode === 'RECOVERY') && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 animate-fade-in mt-4">
                <label className="block text-sm font-bold text-yellow-800 mb-1">
                    Código Mestre da Seção
                </label>
                <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-yellow-600" />
                <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-pmmg-accent outline-none bg-white text-gray-800 placeholder-gray-400 uppercase font-bold"
                    placeholder="FROTA..."
                    value={sectionCode}
                    onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                />
                </div>
                <p className="text-[10px] text-yellow-700 mt-1">
                    {mode === 'RECOVERY' 
                     ? '* Obrigatório para autorizar a troca de senha.' 
                     : '* Validação de segurança obrigatória.'}
                </p>
            </div>
          )}

          {/* Campo Senha (Todos os modos usam senha agora) */}
          <div className="animate-fade-in">
            <label className="block text-sm font-bold text-gray-700 mb-1">
                {mode === 'RECOVERY' ? 'Nova Senha' : 'Senha'}
            </label>
            <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-pmmg-primary outline-none"
                placeholder={mode === 'RECOVERY' ? "Digite a nova senha" : "Sua senha"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                title={showPassword ? "Ocultar senha" : "Exibir senha"}
            >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            </div>
          </div>

          {/* Confirmação de Senha (Cadastro e Recuperação) */}
          {(mode === 'REGISTER' || mode === 'RECOVERY') && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                    Confirme a Senha
                </label>
                <div className="relative">
                    <CheckCircle className={`absolute left-3 top-2.5 h-5 w-5 ${confirmPassword && password === confirmPassword ? 'text-green-500' : 'text-gray-400'}`} />
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 outline-none ${
                            confirmPassword && password !== confirmPassword 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'focus:ring-pmmg-primary'
                        }`}
                        placeholder="Digite a senha novamente"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                        title={showConfirmPassword ? "Ocultar senha" : "Exibir senha"}
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                )}
              </div>
          )}

          {message && (
            <div className={`p-3 rounded text-sm text-center border font-semibold ${
                message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
                message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2 shadow-lg mt-4 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-pmmg-primary hover:bg-[#3E3223]/90'
            }`}
          >
            {loading ? 'Processando...' : (
                mode === 'REGISTER' ? <><UserPlus size={20} /> Confirmar Cadastro</> : 
                mode === 'RECOVERY' ? <><RefreshCw size={20} /> Redefinir Senha</> :
                <><LogIn size={20} /> Entrar</>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col gap-3 text-center">
            {mode === 'LOGIN' && (
                <>
                    <button 
                        onClick={() => { setMode('REGISTER'); setMessage(null); setPassword(''); setConfirmPassword(''); setPmNumber(''); setSectionCode(''); setRealEmail(''); setFullName(''); }}
                        className="text-sm font-semibold text-pmmg-primary hover:text-[#C5A059] transition-colors"
                    >
                        Não tem cadastro? Crie sua conta.
                    </button>
                    <button 
                        onClick={() => { setMode('RECOVERY'); setMessage(null); setPassword(''); setConfirmPassword(''); setPmNumber(''); setSectionCode(''); }}
                        className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
                    >
                        <BadgeHelp size={14} /> Esqueci a senha
                    </button>
                </>
            )}

            {(mode === 'REGISTER' || mode === 'RECOVERY') && (
                <button 
                    onClick={() => { setMode('LOGIN'); setMessage(null); setPassword(''); setConfirmPassword(''); }}
                    className="text-sm font-semibold text-gray-600 hover:text-pmmg-primary transition-colors"
                >
                    Voltar para o Login
                </button>
            )}
        </div>
      </div>
    </div>
  );
};