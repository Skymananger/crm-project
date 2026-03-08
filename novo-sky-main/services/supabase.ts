
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verificação mais simples e direta
const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10 && supabaseAnonKey.length > 20);

if (!isConfigured) {
  console.error("❌ SKY MANAGER: ERRO DE CONFIGURAÇÃO!");
  console.warn("As variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não foram encontradas.");
  console.info("Acesse o painel da Vercel > Settings > Environment Variables e adicione-as.");
} else {
  console.log("🚀 SKY MANAGER: Conectado ao Supabase Cloud.");
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl as string, supabaseAnonKey as string) 
  : null;

export const isSupabaseReady = isConfigured;
