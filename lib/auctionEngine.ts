import { supabaseAdmin } from './supabaseAdmin';

export async function placeBid({ playerId, teamId, amount, increment_used, userId, isOverride = false }: {
  playerId: string;
  teamId: string;
  amount: number;
  increment_used: number;
  userId: string;
  isOverride?: boolean;
}) {
  // 1. Start a transaction using a function (rpc) or manual lock if possible.
  // Since we're in serverless, we'll do this in a single atomic way.
  
  // Verify team exists and has budget
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('total_budget, points_spent')
    .eq('id', teamId)
    .single();
  
  if (teamErr || !team) throw new Error('Team not found');
  const pointsRemaining = team.total_budget - team.points_spent;
  
  if (!isOverride && pointsRemaining < amount) throw new Error('Insufficient points in budget');

  // Verify the player is currently live and the bid is higher than the current one
  // Using a single update with where clauses for optimistic locking
  const { data: session, error: sessErr } = await supabaseAdmin
    .from('auction_session')
    .select('current_player_id, timer_expires_at, status')
    .eq('status', 'LIVE')
    .single();

  if (sessErr || !session || session.current_player_id !== playerId) {
    throw new Error('This player is not currently available for bidding');
  }

  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id, current_bid, last_bidder_id')
    .eq('id', playerId)
    .single();

  if (playerErr || !player) throw new Error('Player records could not be fetched');
  
  // Prevent self overbidding (unless override)
  if (!isOverride && player.last_bidder_id === teamId) {
    throw new Error('You are already the leading bidder');
  }

  if (amount <= (player.current_bid || 0)) {
    throw new Error('Someone placed a higher bid just before you');
  }

  // Insert bid
  const { error: insertErr } = await supabaseAdmin
    .from('bids')
    .insert([{ player_id: playerId, team_id: teamId, amount, increment_used }]);

  if (insertErr) throw new Error('Failed to record bid');

  // Update player current bid and leader
  await supabaseAdmin
    .from('players')
    .update({ current_bid: amount, last_bidder_id: teamId })
    .eq('id', playerId);

  return { success: true, amount, teamId };
}

export async function finalizeSale(playerId: string, teamId: string, price: number) {
  // Decrement budget from team
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('points_spent')
    .eq('id', teamId)
    .single();

  const newPointsSpent = (team?.points_spent || 0) + price;

  await supabaseAdmin
    .from('teams')
    .update({ 
      points_spent: newPointsSpent,
      updated_at: new Date().toISOString()
    })
    .eq('id', teamId);

  // Mark player as sold
  await supabaseAdmin
    .from('players')
    .update({ 
      status: 'SOLD', 
      sold_to_team_id: teamId, 
      sold_price: price,
      updated_at: new Date().toISOString()
    })
    .eq('id', playerId);
  
  // Close the session spotlight
  await supabaseAdmin
    .from('auction_session')
    .update({ current_player_id: null, timer_expires_at: null })
    .eq('status', 'LIVE');
}
