import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const processPhone = (fone: string, celular: string) => {
  const clean = (s: string) => s?.replace(/\D/g, '') || '';
  let f = clean(fone);
  let c = clean(celular);
  
  let target = c.length >= 8 ? c : (f.length >= 8 ? f : (c || f));
  if (!target) return '';

  if (target.startsWith('55') && target.length > 10) {
    target = target.substring(2);
  }

  if (target.length === 10) {
    const ddd = target.substring(0, 2);
    const numberPart = target.substring(2);
    if (/^[6-9]/.test(numberPart)) {
      target = ddd + '9' + numberPart;
    }
  }

  if (!target.startsWith('55')) {
    target = '55' + target;
  }
  
  return target;
};

const desktopPath = path.join('C:', 'Users', 'Cristiano', 'Desktop', 'clientges');

async function importLeads() {
  console.log("SKY MANAGER: Iniciando Importação Rigorosa do Desktop...");

  // 1. Million Leads (Arquivo: Lista do Pipeline Million.csv, Delimitador ;)
  console.log("Processando Million...");
  const millionRaw = fs.readFileSync(path.join(desktopPath, 'Lista do Pipeline Million.csv'), 'latin1');
  const millionLines = millionRaw.trim().split(/\r?\n/).slice(1);
  const millionData = millionLines.map(line => {
    const [nome, cidade, fone, celular] = line.split(';');
    const whatsapp = processPhone(fone, celular);
    return {
      prospect_name: nome?.trim(),
      prospect_city: cidade?.trim(),
      prospect_phone: whatsapp || null,
      stage: 'Clientes Milionário',
      prospect_notes: '[PIPELINE_MILLION]\nImportado via Desktop CSV',
      product_interest: 'Importação Million',
      estimated_value: 0
    };
  }).filter(l => l.prospect_name);

  // 2. Dign Leads (Arquivo: Lista do Pipeline Dign.csv, Delimitador ,)
  console.log("Processando Dign...");
  const dignRaw = fs.readFileSync(path.join(desktopPath, 'Lista do Pipeline Dign.csv'), 'latin1');
  const dignLines = dignRaw.trim().split(/\r?\n/).slice(1);
  const dignData = dignLines.map(line => {
    const [nome, cidade, fone] = line.split(',');
    const whatsapp = processPhone('', fone);
    return {
      prospect_name: nome?.trim(),
      prospect_city: cidade?.trim(),
      prospect_phone: whatsapp || null,
      stage: 'Clientes Digno',
      prospect_notes: '[PIPELINE_DIGN]\nImportado via Desktop CSV',
      product_interest: 'Importação DIGN',
      estimated_value: 0
    };
  }).filter(l => l.prospect_name);

  // 3. Sky Leads (Arquivo: Lista do Pipeline Sky.csv, Delimitador ;)
  console.log("Processando Sky...");
  const skyRaw = fs.readFileSync(path.join(desktopPath, 'Lista do Pipeline Sky.csv'), 'latin1');
  const skyLines = skyRaw.trim().split(/\r?\n/).slice(1);
  const skyData = skyLines.map(line => {
    const parts = line.split(';');
    const nome = parts[0];
    const cidade = parts[1];
    const fone = parts[2];
    const celular = parts[3];
    const ordens = parts.slice(4).join(';').replace(/^"|"$/g, '');
    
    const whatsapp = processPhone(fone, celular);
    return {
      prospect_name: nome?.trim(),
      prospect_city: cidade?.trim(),
      prospect_phone: whatsapp || null,
      stage: 'Clientes Sky',
      prospect_notes: ordens ? `[PIPELINE_SKY]\nHistórico: ${ordens}` : '[PIPELINE_SKY]\nImportado via Desktop CSV',
      product_interest: 'Upgrade / Novos Produtos',
      estimated_value: 0
    };
  }).filter(l => l.prospect_name);

  console.log(`Contagem Final: Million=${millionData.length}, Dign=${dignData.length}, Sky=${skyData.length}`);
  const allLeads = [...millionData, ...dignData, ...skyData];
  console.log(`Total para importar: ${allLeads.length}`);

  // Inserir
  const batchSize = 100;
  for (let i = 0; i < allLeads.length; i += batchSize) {
    const batch = allLeads.slice(i, i + batchSize);
    const { error } = await supabase.from('leads').insert(batch);
    if (error) console.error(`Erro no lote ${i}:`, error);
  }

  console.log("Importação concluída!");
}

importLeads();
