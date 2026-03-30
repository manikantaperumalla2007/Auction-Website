import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function getAuctionSessionRecord() {
  const { data, error } = await supabaseAdmin
    .from('auction_session')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No auction session found');
  }

  return data;
}

export async function updateAuctionSessionRecord(values: Record<string, unknown>) {
  const session = await getAuctionSessionRecord();
  const { error } = await supabaseAdmin
    .from('auction_session')
    .update(values)
    .eq('id', session.id);

  if (error) {
    throw new Error(error.message);
  }

  return session;
}
