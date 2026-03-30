import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .order('created_at');
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Admin only logic should be here (add role check if needed)
    const { name, color, logo_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert([{ name, color, logo_url, total_budget: 100, points_spent: 0 }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).end();
}
