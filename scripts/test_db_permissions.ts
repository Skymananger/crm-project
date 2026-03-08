import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissions() {
  console.log('--- Testing RLS Permissions with ANON Key ---');
  
  // 1. Test SELECT
  console.log('Testing SELECT on "leads"...');
  const { data: selectData, error: selectError } = await supabase.from('leads').select('*').limit(1);
  if (selectError) {
    console.error('❌ SELECT failed:', selectError.message);
  } else {
    console.log('✅ SELECT worked!');
  }

  // 2. Test INSERT (dry run with a mock lead)
  console.log('\nTesting INSERT on "leads"...');
  const mockLead = {
    prospect_name: 'Permission Test Guest',
    stage: 'Leads',
    prospect_phone: '000000000',
    product_interest: 'Permission Test',
    estimated_value: 0
  };

  const { data: insertData, error: insertError } = await supabase.from('leads').insert([mockLead]).select();
  if (insertError) {
    console.error('❌ INSERT failed:', insertError.message);
    if (insertError.message.includes('permission denied') || insertError.message.includes('row-level security policy')) {
      console.log('👉 RLS is likely blocking the sync.');
    }
  } else {
    console.log('✅ INSERT worked!');
    // Delete the test lead if it worked
    if (insertData && insertData[0]) {
      await supabase.from('leads').delete().eq('id', insertData[0].id);
      console.log('🧹 Cleaned up test lead.');
    }
  }
}

testPermissions();
