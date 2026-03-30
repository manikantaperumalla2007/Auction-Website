export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  tier: 'GOLD' | 'SILVER' | 'BRONZE';
  base_price: number;
  current_bid?: number;
  currentBidder?: string;
  photo_url?: string;
  department?: string;
  stats?: {
    overall: number;
    pace: number;
    precision: number;
    impact: number;
  };
  status: 'UPCOMING' | 'LIVE' | 'SOLD' | 'UNSOLD';
}
