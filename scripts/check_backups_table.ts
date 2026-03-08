import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBackupsTable() {
  const { data, error } = await supabase.from('backups').select('*').limit(1);
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('not found')) {
      console.log("Table 'backups' does not exist.");
    } else {
      console.error("Error checking backups table:", error);
    }
  } else {
    console.log("Table 'backups' exists!");
  }
}

checkBackupsTable();
