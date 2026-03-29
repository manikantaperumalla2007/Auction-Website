import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function createUser() {
  const { data: { user }, error: signUpError } = await supabase.auth.signUp({
    email: process.env.ADMIN_EMAIL || 'admin@vpl.com',
    password: process.env.ADMIN_PASSWORD || 'CHANGE_ME_IN_PRODUCTION'
  });

  if (signUpError) {
    console.error('Error:', signUpError.message);
  } else {
    console.log('User created successfully:', user?.id);
  }
}

createUser();
