import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function resetAuction() {
  console.log('🏗️  Starting Global Arena Reset...');

  // 1. Clear Bids Ledger
  console.log('🧹 Clearing Bids Ledger...');
  const { error: bidsError } = await supabase
    .from('bids')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (bidsError) console.error('❌ Bids Clear Failed:', bidsError.message);
  else console.log('✅ Bids Ledger Purged.');

  // 2. Reset Legends to UPCOMING
  console.log('👤 Resetting Legends to Draft Queue...');
  const { error: playersError } = await supabase
    .from('players')
    .update({ 
      status: 'UPCOMING', 
      last_bid_price: 0, 
      last_bidder_id: null,
      sold_to_team_id: null,
      sold_price: null,
      updated_at: new Date().toISOString()
    })
    .neq('name', 'dummy'); 
  
  if (playersError) console.error('❌ Player Reset Failed:', playersError.message);
  else console.log('✅ All Legends returned to the pool.');

  // 3. Reset Franchise War Chests
  console.log('💰 Resetting Franchise Budgets...');
  const { error: teamsError } = await supabase
    .from('teams')
    .update({ 
      total_budget: 100, 
      points_spent: 0,
      updated_at: new Date().toISOString()
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (teamsError) console.error('❌ Team Reset Failed:', teamsError.message);
  else console.log('✅ Franchise War Chests restored to 100 VLL.');

  // 4. Reset Global Session
  console.log('📡 Resetting Live Auction Session...');
  const { error: sessionError } = await supabase
    .from('auction_session')
    .update({ 
      current_player_id: null, 
      status: 'PAUSED',
      timer_expires_at: null 
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (sessionError) console.error('❌ Session Reset Failed:', sessionError.message);
  else console.log('✅ Global Arena Session PAUSED.');

  console.log('🎉 ARENA IS NOW CLEAN. Good luck with the draft!');
}

resetAuction().catch(console.error);
