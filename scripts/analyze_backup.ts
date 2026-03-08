import fs from 'fs';

const backupPath = 'C:\\Users\\Cristiano\\Downloads\\sky_manager_backup_2026-03-07.json';

try {
  const content = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const leads = JSON.parse(content.sky_leads);
  
  const stagesCount: Record<string, number> = {};
  leads.forEach((l: any) => {
    stagesCount[l.stage] = (stagesCount[l.stage] || 0) + 1;
  });
  
  console.log('--- ALL BACKUP STAGES ---');
  console.log(JSON.stringify(stagesCount, null, 2));

  // Also check sky_appointments
  const appts = JSON.parse(content.sky_appointments || '[]');
  console.log('\n--- BACKUP APPOINTMENTS ---');
  console.log('Total:', appts.length);
  if (appts.length > 0) {
    console.log('Sample:', JSON.stringify(appts[0], null, 2));
  }
} catch (error) {
  console.error('Error analyzing backup:', error);
}
