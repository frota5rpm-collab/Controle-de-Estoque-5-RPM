
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com a chave correta fornecida
const SUPABASE_URL = 'https://yaoebstgiagmrvlbozny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhb2Vic3RnaWFnbXJ2bGJvem55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDY3OTAsImV4cCI6MjA4MDg4Mjc5MH0.HxwZYxqaGtYcE-md9XdK7VHKTc6UVV4x0JHopS7oNiM'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Converte um objeto de erro do Supabase ou do Browser em uma string legível.
 * Evita o problema do '[object Object]'.
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return "Erro desconhecido";
  if (typeof error === 'string') return error;
  
  // Se for um erro de rede do browser (TypeError: Failed to fetch)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return "Falha de rede: Não foi possível contactar o servidor (pode estar hibernando ou bloqueado por firewall).";
  }

  // Tenta extrair a mensagem do objeto do Supabase
  const msg = error.message || error.error_description || error.details;
  if (msg) return msg;

  // Fallback: Tenta stringify mas trata erros circulares
  try {
    const stringified = JSON.stringify(error);
    if (stringified === '{}') {
      // Se for um objeto de Erro nativo, JSON.stringify retorna {}
      return error.name ? `${error.name}: ${error.message}` : "Erro de sistema (detalhes no console)";
    }
    return stringified;
  } catch (e) {
    return String(error);
  }
};

/**
 * Verifica se o erro é estritamente de conectividade.
 */
export const isNetworkError = (error: any) => {
  if (!error) return false;
  const msg = getErrorMessage(error).toLowerCase();
  
  return msg.includes("failed to fetch") || 
         msg.includes("network error") || 
         msg.includes("load failed") ||
         msg.includes("falha de rede") ||
         msg.includes("dns_probe_finished_nxdomain");
};

export const checkConnection = async () => {
  try {
    // Teste simples na tabela profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      const msg = getErrorMessage(error);
      console.error("DETALHE DO ERRO DE CONEXÃO:", msg, error);

      // Se for erro de rede real
      if (isNetworkError(error)) {
        return { ok: false, type: 'NETWORK' as const, message: msg };
      }
      
      // Se a tabela não existe (Erro 404 / PGRST116)
      if (error.code === 'PGRST116' || msg.includes('relation "public.profiles" does not exist')) {
          return { ok: false, type: 'SQL' as const, message: "Banco online, mas tabelas não configuradas." };
      }

      // Se for erro de permissão (RLS) ou JWT, o banco está ONLINE e respondendo
      if (error.status === 401 || error.status === 403 || msg.includes("JWT") || msg.includes("ApiKey")) {
          if (msg.includes("ApiKey") || msg.includes("invalid api key")) {
              return { ok: false, type: 'AUTH_CONFIG' as const, message: "Chave API Inválida." };
          }
          return { ok: true, type: 'SUCCESS' as const };
      }
      
      // Se o servidor respondeu qualquer coisa que não seja falha de fetch, ele está vivo
      return { ok: true, type: 'SUCCESS' as const };
    }
    return { ok: true, type: 'SUCCESS' as const };
  } catch (e: any) {
    const msg = getErrorMessage(e);
    console.error("EXCEÇÃO AO CONECTAR:", msg, e);
    if (isNetworkError(e)) {
        return { ok: false, type: 'NETWORK' as const, message: msg };
    }
    return { ok: true, type: 'SUCCESS' as const };
  }
};
