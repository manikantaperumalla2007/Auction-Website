import type { VercelRequest, VercelResponse } from '@vercel/node';
import { placeBid } from '../../lib/auctionEngine';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { playerId, teamId, amount, increment_used, userId, isOverride } = req.body;
    try {
      const result = await placeBid({ playerId, teamId, amount, increment_used, userId, isOverride });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
