import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { count: teamCount, error: teamErr } = await supabase.from('teams').select('*', { count: 'exact', head: true });
  if (teamErr) console.error('Team count error:', teamErr);
  
  const { count: playerCount, error: playerErr } = await supabase.from('players').select('*', { count: 'exact', head: true });
  if (playerErr) console.error('Player count error:', playerErr);
  
  const { data: teams, error: teamsDataErr } = await supabase.from('teams').select('total_budget');
  if (teamsDataErr) console.error('Teams data error:', teamsDataErr);
  
  const totalPool = teams?.reduce((acc: number, t: any) => acc + (t.total_budget || 0), 0) || 0;
  
  console.log(JSON.stringify({ 
    teamCount, 
    playerCount, 
    totalPool 
  }, null, 2));
}

main();
