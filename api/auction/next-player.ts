import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { playerId } = req.body;
    
    // Set spotlight on new player — no timer, admin ends bid manually
    const { error: sessErr } = await supabaseAdmin
      .from('auction_session')
      .update({
        current_player_id: playerId,
        timer_expires_at: null,
        status: 'LIVE'
      })
      .eq('status', 'LIVE');

    const { error: playErr } = await supabaseAdmin
      .from('players')
      .update({ status: 'BIDDING', current_bid: 0, last_bidder_id: null })
      .eq('id', playerId);

    if (sessErr || playErr) return res.status(500).json({ error: (sessErr || playErr)?.message });

    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
