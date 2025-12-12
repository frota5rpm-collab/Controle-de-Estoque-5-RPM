import React from 'react';

export const DatabaseSetup: React.FC = () => {
  const sql = `
-- Execute este SQL no Editor SQL do seu projeto Supabase para configurar o banco corretamente

-- 1. TABELA DE CONTROLE DE PAV (NOVO MÓDULO)
CREATE TABLE IF NOT EXISTS public.pav_processes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fraction TEXT,              -- Unidade / Fração
    vehicle_prefix TEXT,        -- Prefixo
    vehicle_plate TEXT,         -- Placa
    accident_date DATE,         -- Data do Acidente
    reds_number TEXT,           -- Nº REDS
    sicor_number TEXT,          -- Nº SICOR
    pav_number TEXT,            -- Nº PAV
    inquirer TEXT,              -- Encarregado
    sent_to_inquirer BOOLEAN DEFAULT FALSE, -- Enviado ao encarregado?
    os_request_date DATE,       -- Data Solicitação OS
    os_number TEXT,             -- Nº OS Portal
    os_followup_date DATE,      -- Data Reforço Cobrança
    observations TEXT,          -- Observações
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de segurança para PAV
ALTER TABLE public.pav_processes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access PAV" ON public.pav_processes;
CREATE POLICY "Public Access PAV" ON public.pav_processes FOR ALL USING (true) WITH CHECK (true);


-- 2. ALTERAÇÕES ANTIGAS (ESTOQUE)
-- Remove a obrigatoriedade de Responsável e Prefixo
ALTER TABLE public.movements ALTER COLUMN requester DROP NOT NULL;
ALTER TABLE public.movements ALTER COLUMN vehicle_prefix DROP NOT NULL;

-- Garante coluna de unidade na tabela de materiais
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='unit') THEN
        ALTER TABLE public.materials ADD COLUMN unit TEXT DEFAULT 'Unidade';
    END IF;
END $$;

-- Garante coluna de observação na tabela de movimentações
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movements' AND column_name='observation') THEN
        ALTER TABLE public.movements ADD COLUMN observation TEXT;
    END IF;
END $$;

-- 3. TABELAS BÁSICAS (Caso não existam)
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

-- 4. SEGURANÇA GERAL
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access materials" ON public.materials;
DROP POLICY IF EXISTS "Allow public access vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public Select Movements" ON public.movements;
DROP POLICY IF EXISTS "Public Insert Movements" ON public.movements;
DROP POLICY IF EXISTS "Public Update Movements" ON public.movements;
DROP POLICY IF EXISTS "Public Delete Movements" ON public.movements;

CREATE POLICY "Public Select Movements" ON public.movements FOR SELECT USING (true);
CREATE POLICY "Public Insert Movements" ON public.movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Movements" ON public.movements FOR UPDATE USING (true);
CREATE POLICY "Public Delete Movements" ON public.movements FOR DELETE USING (true);
CREATE POLICY "Allow public access materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- 5. TRIGGER DE ESTOQUE
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
  `;

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-50 text-white overflow-y-auto">
      <div className="bg-gray-800 p-8 rounded-lg max-w-3xl w-full shadow-2xl my-8">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Atualização do Banco de Dados</h2>
        <p className="mb-4 text-gray-300">
          Foi adicionado o módulo <strong>Controle de PAV</strong>. É necessário criar a tabela no Supabase.
        </p>
        <p className="mb-2 font-semibold">Copie o código SQL abaixo:</p>
        <div className="bg-gray-950 p-4 rounded border border-gray-700 font-mono text-sm overflow-auto max-h-64 mb-4 select-all">
          <pre>{sql}</pre>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Vá ao painel do Supabase {'>'} SQL Editor {'>'} Cole e execute (Run).
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition"
        >
          Já executei o SQL, entrar no sistema
        </button>
      </div>
    </div>
  );
};