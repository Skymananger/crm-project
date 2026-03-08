import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const backupPath = 'C:\\Users\\Cristiano\\Downloads\\sky_manager_backup_2026-03-07.json';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  console.log("🚀 Starting restoration from backup (Strictly Sales Pipeline)...");
  
  const content = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const backupLeads = JSON.parse(content.sky_leads);
  const backupAppts = JSON.parse(content.sky_appointments || '[]');

  // Specific stages to restore - strictly for Sales Pipeline
  const salesStages = [
    "Reagendar",
    "Agendado",
    "Contatados",
    "+Frente",
    "Leads",
    "Pós-venda",
    "Negociação"
  ];

  const leadsToRestore = backupLeads.filter((l: any) => salesStages.includes(l.stage));
  console.log(`Found ${leadsToRestore.length} leads in target sales stages in backup.`);

  // Get current leads to avoid duplicates
  const { data: currentLeads } = await supabase.from('leads').select('prospect_name, prospect_phone');
  const currentLeadKeys = new Set(currentLeads?.map(l => `${l.prospect_name}|${l.prospect_phone}`));

  const leadsToInsert = [];
  for (const l of leadsToRestore) {
    const key = `${l.prospectName}|${l.prospectPhone}`;
    if (!currentLeadKeys.has(key)) {
      // Append nextActionDescription to notes since column doesn't exist in DB
      let finalNotes = l.prospectNotes || "";
      if (l.nextActionDescription) {
        finalNotes += `\n\n[Próxima Ação]: ${l.nextActionDescription}`;
      }

      leadsToInsert.push({
        prospect_name: l.prospectName,
        prospect_phone: l.prospectPhone,
        prospect_city: l.prospectCity,
        prospect_address: l.prospectAddress,
        prospect_notes: finalNotes,
        stage: l.stage,
        product_interest: l.productInterest,
        estimated_value: l.estimatedValue,
        last_interaction: l.lastInteraction,
        next_contact_date: l.nextContactDate,
        assigned_to: l.assignedTo || 'admin'
      });
    }
  }

  console.log(`Leads to insert after deduplication: ${leadsToInsert.length}`);

  if (leadsToInsert.length > 0) {
    const { error: leadsError } = await supabase.from('leads').insert(leadsToInsert);
    if (leadsError) {
      console.error("Error inserting leads:", leadsError);
    } else {
      console.log(`✅ Successfully restored ${leadsToInsert.length} leads.`);
    }
  } else {
    console.log("No new leads to restore (all already exist in Supabase).");
  }

  // Restore appointments
  const { data: currentAppts } = await supabase.from('appointments').select('title, date, time, client');
  const currentApptKeys = new Set(currentAppts?.map(a => `${a.title}|${a.date}|${a.time}|${a.client}`));

  const apptsToInsert = [];
  for (const a of backupAppts) {
    const key = `${a.title}|${a.date}|${a.time}|${a.client}`;
    if (!currentApptKeys.has(key)) {
      apptsToInsert.push({
        title: a.title,
        client: a.client,
        date: a.date,
        time: a.time,
        address: a.address,
        type: a.type,
        synced: a.synced,
        completed: a.completed,
        lead_id: null
      });
    }
  }

  console.log(`Appointments to restore: ${apptsToInsert.length}`);

  if (apptsToInsert.length > 0) {
    const { error: apptsError } = await supabase.from('appointments').insert(apptsToInsert);
    if (apptsError) {
       console.error("Error inserting appointments:", apptsError);
    } else {
       console.log(`✅ Successfully restored ${apptsToInsert.length} appointments.`);
    }
  }

  console.log("🎉 Restoration complete!");
}

restore();
