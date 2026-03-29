import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = "https://lqmrfwvxlsicncohzmnj.supabase.co";
const supabaseKey = "sb_publishable_GM4R6t4uUpNQlVbppctqtA_terHXETt";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseSimpleCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    // Note: This does not handle commas inside quotes, but the provided sample doesn't have them
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ? values[j].trim() : '';
    }
    results.push(row);
  }
  return results;
}

async function seed() {
  console.log("Loading teams...");
  let teamsRaw;
  try {
     teamsRaw = parseSimpleCsv('../Team_Details - Sheet1.csv');
  } catch(e) { console.error("Could not read teams csv", e.message); return; }

  const teamsData = teamsRaw.map(t => ({
    name: t['TEAM_NAME'],
    logo_url: t['TEAM_IMAGE_LINK'],
    total_budget: 100,
    points_spent: 0
  }));

  console.log("Loading players...");
  let playersRaw;
  try {
    playersRaw = parseSimpleCsv('../Book(Sheet1).csv');
  } catch(e) { console.error("Could not read players csv", e.message); return; }
  
  const playersData = playersRaw.map((p, index) => {
    let rawPos = p['Position'] ? p['Position'].toUpperCase().trim() : 'MID';
    let position = rawPos;
    if (position === 'DEF/GK') position = 'DEF/GK';
    else if (position === 'ATT' || position === 'FORWARD' || position === 'FWD') position = 'FWD';
    else if (position === 'DEFENDER' || position === 'DEF') position = 'DEF';
    else if (position === 'MIDFIELDER' || position === 'MID') position = 'MID';
    else if (position === 'GK') position = 'GK';
    else position = 'MID';
    
    let basePrice = parseInt(p['Base price']) || 3;
    let tier = 'BRONZE';
    if (basePrice === 5) tier = 'SILVER';
    if (basePrice >= 7) tier = 'GOLD';

    return {
      name: p['Name'],
      position: position,
      department: rawPos,
      base_price: basePrice,
      photo_url: p['Image Link'],
      tier: tier,
      status: 'UPCOMING',
      queue_order: index + 1
    };
  });

  console.log("Clearing existing data...");
  await supabase.from('teams').delete().neq('id', 'dummy');
  await supabase.from('players').delete().neq('id', 'dummy');

  console.log("Inserting teams...");
  let { error: teamsErr } = await supabase.from('teams').insert(teamsData);
  if (teamsErr) console.error("Teams insert error:", teamsErr);
  else console.log("Teams inserted perfectly.");

  console.log("Inserting players...");
  let { error: pErr } = await supabase.from('players').insert(playersData);
  
  if (pErr) console.error("Failed completely", pErr);
  else console.log("Players inserted successfully.");
}

seed();
