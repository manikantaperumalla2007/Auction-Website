import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function placeTestBid() {
  console.log('Fetching active auction session...');
  const { data: session, error: sessErr } = await supabase
    .from('auction_session')
    .select('current_player_id, status')
    .single();

  if (sessErr || !session || !session.current_player_id) {
    console.error('No active player in session to bid on.', sessErr);
    return;
  }

  const playerId = session.current_player_id;
  console.log(`Active player ID: ${playerId}`);

  console.log('Fetching player base price and current bids...');
  const { data: player, error: playErr } = await supabase
    .from('players')
    .select('base_price')
    .eq('id', playerId)
    .single();

  if (playErr || !player) {
    console.error('Could not fetch player details.', playErr);
    return;
  }

  // To find the highest current bid, query the bids table
  const { data: bidsData } = await supabase
    .from('bids')
    .select('amount')
    .eq('player_id', playerId)
    .order('amount', { ascending: false })
    .limit(1);

  const highestBid = bidsData && bidsData.length > 0 ? bidsData[0].amount : 0;
  const currentHighest = highestBid || player.base_price || 0;
  const bidAmount = currentHighest + 2; // Testing with a +2 increment

  console.log('Fetching a random team...');
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .select('id, name')
    .limit(1);

  if (teamErr || !teams || teams.length === 0) {
    console.error('No teams found in database.', teamErr);
    return;
  }

  const teamId = teams[0].id;
  console.log(`Bidding ${bidAmount} VLL on behalf of ${teams[0].name}...`);

  console.log('Placing bid...');
  const { error: bidErr } = await supabase.from('bids').insert({
    player_id: playerId,
    team_id: teamId,
    amount: bidAmount,
    increment_used: 2
  });

  if (bidErr) {
    console.error('Error placing bid:', bidErr);
    return;
  }

  console.log('✅ Test bid placed successfully!');
}

placeTestBid();
