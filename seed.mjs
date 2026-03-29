import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync'; // We need a simple parser, or we can just split by line

dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://lqmrfwvxlsicncohzmnj.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

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
    // Basic CSV parsing splitting by comma (fails if commas are inside quotes, but URLs/names here don't have commas)
    const values = lines[i].split(',');
    
    // If there's an issue with splits (e.g. fewer or more columns), we handle it
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
  const teamsRaw = parseSimpleCsv('../Team_Details - Sheet1.csv');
  const teamsData = teamsRaw.map(t => ({
    name: t['TEAM_NAME'],
    captain_name: t['CAPTAIN_NAME'],
    logo_url: t['TEAM_IMAGE_LINK'],
    total_budget: 100, // 100 VP base budget
    points_spent: 0
  }));

  console.log("Loading players...");
  const playersRaw = parseSimpleCsv('../Book(Sheet1).csv');
  const playersData = playersRaw.map((p, index) => {
    let position = p['Position'].toUpperCase();
    if (position === 'ATT') position = 'FWD';
    if (position === 'DEF/GK') position = 'DEF';
    
    let basePrice = parseInt(p['Base price']) || 3;
    let tier = 'Bronze';
    if (basePrice === 5) tier = 'Silver';
    if (basePrice >= 7) tier = 'Gold';

    return {
      name: p['Name'],
      position: position,
      base_price: basePrice, // matching Supabase snake_case typically
      basePrice: basePrice,   // sometimes it's camelCase based on types.ts. The DB will ignore unknown columns or fail. We'll try camelCase to match types.ts, then snake_case if error
      image: p['Image Link'],
      tier: tier,
      status: 'UPCOMING',
      queue_order: index + 1 // Add a queue order
    };
  });

  // First let's test deleting existing
  console.log("Clearing existing data...");
  const { error: delTeamsErr } = await supabase.from('teams').delete().neq('id', 'dummy');
  if (delTeamsErr) console.log("Failed to delete teams (may not exist):", delTeamsErr.message);
  
  const { error: delPlayersErr } = await supabase.from('players').delete().neq('id', 'dummy');
  if (delPlayersErr) console.log("Failed to delete players (may not exist):", delPlayersErr.message);

  console.log("Inserting teams...");
  let teamResults = await supabase.from('teams').insert(teamsData);
  if (teamResults.error) {
    console.error("Teams insert error:", teamResults.error);
  } else {
    console.log("Teams inserted successfully!");
  }

  // To avoid column errors, let's just insert basic player object.
  // We don't know if database uses basePrice or base_price
  console.log("Inserting players...");
  // Try with standard matching `types.ts`
  let playerDataToInsert = playersData.map(p => ({
    name: p.name,
    position: p.position,
    basePrice: p.basePrice,
    image: p.image,
    tier: p.tier,
    status: p.status,
    queue_order: p.queue_order
  }));

  let playerResults = await supabase.from('players').insert(playerDataToInsert);
  if (playerResults.error && playerResults.error.code === 'PGRST204') {
    // Column not found, try snake case
    console.log("Retrying players with snake_case...");
    playerDataToInsert = playersData.map(p => ({
      name: p.name,
      position: p.position,
      base_price: p.basePrice,
      image: p.image,
      tier: p.tier,
      status: p.status,
      queue_order: p.queue_order
    }));
    playerResults = await supabase.from('players').insert(playerDataToInsert);
  }
  
  if (playerResults.error) {
    console.error("Players insert error:", playerResults.error);
  } else {
    console.log("Players inserted successfully!");
  }
}

seed();
