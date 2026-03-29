import type { VercelRequest, VercelResponse } from '@vercel/node';
import { finalizeSale } from '../../lib/auctionEngine';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { playerId, teamId, price } = req.body;
    try {
      await finalizeSale(playerId, teamId, price);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
