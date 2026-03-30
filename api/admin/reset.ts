import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1. Clear Bids Ledger
    await supabaseAdmin
      .from('bids')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Reset Players to UPCOMING
    await supabaseAdmin
      .from('players')
      .update({ 
        status: 'UPCOMING', 
        sold_to_team_id: null,
        sold_price: null,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Reset Team Budgets
    await supabaseAdmin
      .from('teams')
      .update({ 
        points_spent: 0,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Reset Global Session
    await supabaseAdmin
      .from('auction_session')
      .update({ 
        current_player_id: null, 
        status: 'PAUSED',
        timer_expires_at: null 
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return res.status(200).json({ success: true, message: 'Arena logic reset successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
