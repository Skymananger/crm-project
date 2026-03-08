import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: leads, error } = await supabase.from('leads').select('stage');
  
  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  const stages: Record<string, number> = {};
  leads?.forEach(l => {
    const s = l.stage || 'Unknown';
    stages[s] = (stages[s] || 0) + 1;
  });
  
  console.log('--- STAGE DISTRIBUTION (ALL) ---');
  console.log(JSON.stringify(stages, null, 2));

  // Specifically check for Pipeline de Vendas stages (from constants.ts)
  const salesStages = [
    "Abordagem",
    "Follow-up",
    "Em Conversa",
    "Proposta Enviada",
    "Vendido",
    "Perdido",
    "Frente"
  ];
  
  console.log('\n--- SALES PIPELINE STAGES ---');
  salesStages.forEach(s => {
    console.log(`${s}: ${stages[s] || 0}`);
  });
}

check();
