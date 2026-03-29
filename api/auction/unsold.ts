import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { playerId } = req.body;

    // Reset current auction_session state
    await supabaseAdmin
      .from('auction_session')
      .update({ current_player_id: null, timer_expires_at: null })
      .eq('status', 'LIVE');

    const { error: playErr } = await supabaseAdmin
      .from('players')
      .update({ status: 'UNSOLD' })
      .eq('id', playerId);

    if (playErr) return res.status(500).json({ error: playErr.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
