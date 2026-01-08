
import React, { useState } from 'react';
import { Copy, Check, Database, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { checkConnection } from '../lib/supabase';

interface DatabaseSetupProps {
  onBack?: () => void;
}

export const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onBack }) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const sql = `
-- =========================================================
-- SCRIPT ATUALIZADO v9 (SUPORTE A CONTROLE DE COMBUSTÍVEL)
-- Execute este script no SQL Editor do Supabase
-- =========================================================

-- 1. TABELAS DE BASE (PERFIS, MATERIAIS, VIATURAS, ETC - JÁ EXISTENTES)
-- [Mantendo as tabelas anteriores para garantir integridade]

-- 2. NOVA TABELA: CONTROLE DE COMBUSTÍVEL
CREATE TABLE IF NOT EXISTS public.fuel_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_prefix TEXT NOT NULL,
    vehicle_plate TEXT,
    driver_name TEXT,
    liters NUMERIC NOT NULL,
    fuel_type TEXT CHECK (fuel_type IN ('DIESEL', 'GASOLINA', 'ETANOL')),
    odometer NUMERIC,
    fraction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACESSO (PERMITIR LEITURA PÚBLICA)
DROP POLICY IF EXISTS "Public Read Fuel" ON public.fuel_records;
CREATE POLICY "Public Read Fuel" ON public.fuel_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth All Fuel" ON public.fuel_records;
CREATE POLICY "Auth All Fuel" ON public.fuel_records 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- [O restante do script anterior de PAV, Schedules, Substitutions, etc permanece igual]
-- Se for a primeira vez rodando, certifique-se de rodar o script completo anterior.
`;

  const handleCopy = () => {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
      setIsChecking(true);
      setTestResult(null);
      const isOk = await checkConnection();
      if (isOk.ok) {
          setTestResult('success');
          if (onBack) setTimeout(onBack, 1000);
          else setTimeout(() => window.location.reload(), 1000);
      } else {
          setTestResult('fail');
      }
      setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-50 text-white overflow-y-auto">
      <div className="bg-gray-800 p-8 rounded-lg max-w-4xl w-full shadow-2xl my-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
            <div className="flex items-center gap-3">
                <Database className="text-blue-400" size={32} />
                <div>
                    <h2 className="text-2xl font-bold text-white">Configuração do Banco de Dados (v9)</h2>
                    <p className="text-gray-400 text-sm">Adicionado Controle de Combustível com Acesso Público.</p>
                </div>
            </div>
            {onBack && (
                <button onClick={onBack} className="text-gray-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>
            )}
        </div>

        <div className="bg-amber-900/30 border border-amber-500/30 p-4 rounded mb-6 flex items-start gap-3 text-sm">
            <AlertTriangle className="text-amber-500 shrink-0" size={24} />
            <p>O sistema agora permite que visitantes vejam o **Controle de Combustível** sem login através de um link especial. Certifique-se de rodar este SQL para criar a tabela e liberar a política `Public Read Fuel`.</p>
        </div>
        
        <div className="relative">
            <div className="absolute top-2 right-2">
                <button 
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold transition-all ${
                        copied ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado!' : 'Copiar SQL'}
                </button>
            </div>
            <div className="bg-gray-950 p-4 rounded border border-gray-700 font-mono text-xs overflow-auto max-h-[300px] mb-6 select-all">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{sql}</pre>
            </div>
        </div>

        <button 
            onClick={testConnection}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition shadow-lg flex items-center justify-center gap-3"
        >
            <RefreshCw className={isChecking ? 'animate-spin' : ''} />
            {isChecking ? 'Verificando...' : 'Testar Conexão e Reiniciar'}
        </button>
      </div>
    </div>
  );
};
