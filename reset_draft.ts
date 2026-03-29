import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function resetDraft() {
  console.log('--- RESETTING VPL DRAFT ARENA ---');

  // 1. CLEAR ALL BIDS
  console.log('1/5 Deleting all bids...');
  const { error: bidErr } = await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (bidErr) console.error('❌ Bid Reset Error:', bidErr.message);
  else console.log('✅ Bids cleared');

  // 2. RESET PLAYERS STATUS AND SALE INFO
  console.log('2/5 Resetting player data to UPCOMING...');
  const { error: playErr } = await supabase.from('players').update({
    status: 'UPCOMING',
    sold_to_team_id: null,
    sold_price: null
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (playErr) console.error('❌ Player Reset Error:', playErr.message);
  else console.log('✅ Players reset to bench');

  // 3. RESET TEAM SPENDING (set points_spent to 0)
  console.log('3/5 Recalibrating team budgets (spent = 0)...');
  const { error: teamErr } = await supabase.from('teams').update({
    points_spent: 0
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (teamErr) console.error('❌ Team Reset Error:', teamErr.message);
  else console.log('✅ Budgets restored to 100%');

  // 4. CLEAR THE ACTIVE SESSION
  console.log('4/5 Closing all draft sessions...');
  const { error: sessErr } = await supabase.from('auction_session').update({
    current_player_id: null,
    status: 'NOT_STARTED'
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (sessErr) console.error('❌ Session Reset Error:', sessErr.message);
  else console.log('✅ Sessions closed');

  // 5. CLEAR ALL ANNOUNCEMENTS
  console.log('5/5 Clearing broadcast signals...');
  const { error: annErr } = await supabase.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (annErr) console.error('❌ Announcement Clear Error:', annErr.message);
  else console.log('✅ Broadcast history cleared');

  console.log('\n🎉 ARENA IS NOW CLEAN. Good luck with the draft!');
}

resetDraft();
