import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function createThreeUsers() {
  const usersToCreate = [
    { email: 'admin@vpl.com', password: 'VPLAdmin123!' },
    { email: 'captain@vpl.com', password: 'VPLCpt123!' },
    { email: 'viewer@vpl.com', password: 'VPLView123!' },
  ];

  for (const user of usersToCreate) {
    console.log(`Attempting to sign up ${user.email}...`);
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.error(`Error for ${user.email}:`, error.message);
    } else {
      console.log(`Successfully signed up ${user.email}. ID: ${data.user?.id}`);
    }
  }
}

createThreeUsers();
