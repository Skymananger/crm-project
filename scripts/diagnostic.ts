import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  const { count: apptsCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
  const { count: custsCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
  
  console.log('--- SUPABASE COUNTS ---');
  console.log('Leads:', leadsCount);
  console.log('Appointments:', apptsCount);
  console.log('Customers:', custsCount);
  
  // Check some leads to see their pipeline types
  const { data: leadSample } = await supabase.from('leads').select('prospect_name, stage').limit(5);
  console.log('\n--- LEAD SAMPLE ---');
  console.log(JSON.stringify(leadSample, null, 2));
}

check();
