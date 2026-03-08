import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanLeads() {
  console.log("SKY MANAGER: Iniciando limpeza seletiva de leads...");

  // Estágios que o usuário pediu para limpar
  const stagesToClear = [
    'Clientes Sky',
    'Clientes Milionário',
    'Clientes Digno'
  ];

  try {
    // 1. Verificar quantos leads existem nesses estágios
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, prospect_name, stage')
      .in('stage', stagesToClear);

    if (fetchError) throw fetchError;

    if (!leads || leads.length === 0) {
      console.log("Nenhum lead encontrado para os estágios Million, Sky ou Dign.");
      return;
    }

    console.log(`Encontrados ${leads.length} leads para remover.`);

    // 2. Remover os leads
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('stage', stagesToClear);

    if (deleteError) throw deleteError;

    console.log("Limpeza concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a limpeza:", error);
  }
}

cleanLeads();
