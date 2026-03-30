import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuctionSessionRecord, supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { playerId } = req.body;

  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    const session = await getAuctionSessionRecord();

    if (session.current_player_id) {
      await supabaseAdmin
        .from('players')
        .update({ status: 'UPCOMING', current_bid: 0, last_bidder_id: null })
        .eq('id', session.current_player_id);
    }

    const { data: player, error: playerErr } = await supabaseAdmin
      .from('players')
      .select('base_price')
      .eq('id', playerId)
      .single();

    if (playerErr || !player) {
      return res.status(400).json({ error: playerErr?.message || 'Player not found' });
    }
    
    const { error: sessErr } = await supabaseAdmin
      .from('auction_session')
      .update({
        current_player_id: playerId,
        timer_expires_at: null,
        status: 'LIVE'
      })
      .eq('id', session.id);

    const { error: playErr } = await supabaseAdmin
      .from('players')
      .update({ status: 'LIVE', current_bid: player.base_price, last_bidder_id: null })
      .eq('id', playerId);

    if (sessErr || playErr) return res.status(500).json({ error: (sessErr || playErr)?.message });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
