import React, { useState } from 'react';
import { Copy, Check, Database } from 'lucide-react';

export const DatabaseSetup: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const sql = `
-- =========================================================
-- SCRIPT ATUALIZADO (RECUPERAÇÃO VIA CÓDIGO MESTRE)
-- Execute este script no SQL Editor do Supabase
-- =========================================================

-- 1. HABILITAR CRIPTOGRAFIA (Essencial para senhas)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABELA DE PERFIS (Vincula o Nº PM ao usuário)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    pm_number TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões de Segurança (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users Insert Self" ON public.profiles;
CREATE POLICY "Users Insert Self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users Update Self" ON public.profiles;
CREATE POLICY "Users Update Self" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. GATILHO AUTOMÁTICO (Cria o perfil assim que o usuário se cadastra)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, pm_number, email, full_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'pm_number',
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. FUNÇÃO DE REDEFINIÇÃO DE SENHA (A Mágica acontece aqui)
-- Permite trocar a senha usando apenas PM + Código Mestre + Nova Senha
CREATE OR REPLACE FUNCTION public.reset_password_via_pm(
    target_pm text, 
    new_password text, 
    secret_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissão de administrador
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Valida o Código Mestre
  IF secret_code <> 'FROTA5RPM' THEN
     RAISE EXCEPTION 'Código Mestre da Seção incorreto.';
  END IF;

  -- Valida tamanho da senha
  IF length(new_password) < 6 THEN
     RAISE EXCEPTION 'A senha deve ter no mínimo 6 caracteres.';
  END IF;

  -- Busca o ID do usuário baseado no Nº PM
  SELECT id INTO target_user_id FROM public.profiles WHERE pm_number = target_pm;
  
  IF target_user_id IS NULL THEN
     RAISE EXCEPTION 'Nº PM não encontrado no sistema.';
  END IF;

  -- Atualiza a senha criptografada diretamente na tabela de autenticação
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN 'Senha alterada com sucesso! Faça login.';
END;
$$;


-- 5. ESTRUTURA DOS MÓDULOS (Se ainda não existirem)
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Unidade',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prefix TEXT NOT NULL,
    plate TEXT,
    model TEXT,
    fraction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    requester TEXT,
    vehicle_prefix TEXT,
    guide_number TEXT,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Materials" ON public.materials;
CREATE POLICY "Public Access Materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Vehicles" ON public.vehicles;
CREATE POLICY "Public Access Vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access Movements" ON public.movements;
CREATE POLICY "Public Access Movements" ON public.movements FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION handle_inventory_update() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF OLD.type = 'ENTRADA' THEN
            UPDATE materials SET quantity = quantity - OLD.quantity WHERE id = OLD.material_id;
        ELSE 
            UPDATE materials SET quantity = quantity + OLD.quantity WHERE id = OLD.material_id;
        END IF;
    END IF;
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.type = 'ENTRADA' THEN
            UPDATE materials SET quantity = quantity + NEW.quantity WHERE id = NEW.material_id;
        ELSE 
            UPDATE materials SET quantity = quantity - NEW.quantity WHERE id = NEW.material_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_update ON public.movements;
CREATE TRIGGER trigger_inventory_update
AFTER INSERT OR UPDATE OR DELETE ON public.movements
FOR EACH ROW EXECUTE FUNCTION handle_inventory_update();

CREATE TABLE IF NOT EXISTS public.pav_processes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fraction TEXT,
    vehicle_prefix TEXT,
    vehicle_plate TEXT,
    accident_date DATE,
    reds_number TEXT,
    pav_number TEXT,
    inquirer TEXT,
    sent_to_inquirer BOOLEAN DEFAULT FALSE,
    os_request_date DATE,
    os_number TEXT,
    os_followup_date DATE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pav_processes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access PAV" ON public.pav_processes;
CREATE POLICY "Public Access PAV" ON public.pav_processes FOR ALL USING (true) WITH CHECK (true);
  `;

  const handleCopy = () => {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-50 text-white overflow-y-auto">
      <div className="bg-gray-800 p-8 rounded-lg max-w-4xl w-full shadow-2xl my-8 border border-gray-700">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
            <Database className="text-blue-400" size={32} />
            <div>
                <h2 className="text-2xl font-bold text-white">Configuração do Banco de Dados</h2>
                <p className="text-gray-400 text-sm">Atualize o banco para ativar a nova recuperação de senha.</p>
            </div>
        </div>

        <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded mb-6">
            <h3 className="font-bold text-blue-300 mb-2">Instruções Importantes:</h3>
            <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
                <li>Copie o código SQL abaixo.</li>
                <li>Vá até o painel do Supabase do seu projeto ({'>'} SQL Editor).</li>
                <li>Cole o código e clique em <strong>Run</strong>.</li>
            </ol>
        </div>
        
        <div className="relative">
            <div className="absolute top-2 right-2">
                <button 
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold transition-all ${
                        copied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                >
                    {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar SQL</>}
                </button>
            </div>
            <div className="bg-gray-950 p-4 rounded border border-gray-700 font-mono text-xs overflow-auto max-h-[400px] mb-6 select-all custom-scrollbar">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{sql}</pre>
            </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition shadow-lg hover:shadow-blue-500/20"
        >
          Já executei o SQL, Tentar Novamente
        </button>
      </div>
    </div>
  );
};