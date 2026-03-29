import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Get current session status
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('auction_session')
      .select('status')
      .eq('status', 'LIVE')
      .single();

    if (sessErr || !session) {
      return res.status(400).json({ error: 'No active auction session found' });
    }

    const newStatus = session.status === 'PAUSED' ? 'LIVE' : 'PAUSED';

    const { error: updateErr } = await supabaseAdmin
      .from('auction_session')
      .update({ status: newStatus })
      .eq('status', 'LIVE');

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.status(200).json({ success: true, status: newStatus });
  }

  return res.status(405).end();
}
