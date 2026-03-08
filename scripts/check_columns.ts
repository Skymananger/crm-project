import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkColumns() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Leads Columns:", Object.keys(data[0]));
  } else {
    console.log("No leads found to check columns.");
  }
  
  const { data: settData, error: settError } = await supabase.from('app_settings').select('*').eq('id', 'global').single();
  if (settError) {
    console.error("App Settings Error:", settError.message);
  } else {
    console.log("App Settings Columns:", Object.keys(settData));
  }
}

checkColumns();
