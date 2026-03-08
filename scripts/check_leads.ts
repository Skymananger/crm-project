import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  const { data, error } = await supabase.from('leads').select('*');
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total leads in DB: ${data.length}`);
  
  const byStage = data.reduce((acc, l) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1;
    return acc;
  }, {});
  console.log('Leads by STAGE:', byStage);

  const byPipeline = data.reduce((acc, l) => {
    const stage = l.stage.toLowerCase();
    let type = 'unknown';
    if (stage.includes('milionário') || stage.includes('million')) type = 'million';
    else if (stage.includes('digno') || stage.includes('dign')) type = 'dign';
    else if (stage.includes('sky')) type = 'sky';
    
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  console.log('Leads by INFERRED PIPELINE:', byPipeline);
}

checkLeads();
