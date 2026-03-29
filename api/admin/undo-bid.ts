import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { bidId, playerId, undoneBy } = req.body;

    if (!bidId || !playerId) {
      return res.status(400).json({ error: 'bidId and playerId are required' });
    }

    // Mark the bid as undone
    const { error: bidErr } = await supabaseAdmin
      .from('bids')
      .update({ is_undone: true, undone_by: undoneBy || null })
      .eq('id', bidId);

    if (bidErr) return res.status(500).json({ error: bidErr.message });

    // Find the next highest non-undone bid
    const { data: remainingBids } = await supabaseAdmin
      .from('bids')
      .select('amount, team_id')
      .eq('player_id', playerId)
      .eq('is_undone', false)
      .order('amount', { ascending: false })
      .limit(1);

    const newTopBid = remainingBids && remainingBids.length > 0 ? remainingBids[0] : null;

    await supabaseAdmin
      .from('players')
      .update({
        current_bid: newTopBid ? newTopBid.amount : null,
        last_bidder_id: newTopBid ? newTopBid.team_id : null,
      })
      .eq('id', playerId);

    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
