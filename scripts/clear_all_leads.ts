import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllLeads() {
  console.log("⚠️  LIMPEZA TOTAL: Excluindo TODOS os leads do banco de dados...");

  // Conta antes de excluir
  const { count: beforeCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`Leads encontrados no banco: ${beforeCount}`);

  if (beforeCount === 0) {
    console.log("Nenhum lead para excluir. Banco já está limpo.");
    return;
  }

  // Exclui todos os leads (neq com id vazio = seleciona tudo)
  const { error } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error("Erro ao excluir leads:", error);
    return;
  }

  // Confirma
  const { count: afterCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`✅ Limpeza concluída! Leads restantes: ${afterCount}`);
  console.log("\nAgora você pode importar novamente com:");
  console.log("  cmd /c npx tsx scripts/import_leads.ts");
}

clearAllLeads();
