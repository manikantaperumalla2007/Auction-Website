import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .order('queue_order', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, position, tier, base_price, status, queue_order, department, year } = req.body;
    const { data, error } = await supabaseAdmin
      .from('players')
      .insert([{ name, position, tier, base_price, status: status || 'UPCOMING', queue_order, department, year }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).end();
}
