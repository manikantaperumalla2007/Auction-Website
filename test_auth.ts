import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testAuth() {
  console.log('Testing SignUp...');
  const res1 = await supabase.auth.signUp({
    email: 'admin_test123@vpl.com',
    password: 'password123',
  });
  console.log('SignUp Data:', res1.data);
  console.log('SignUp Error:', res1.error?.message);

  console.log('\nTesting SignIn...');
  const res2 = await supabase.auth.signInWithPassword({
    email: 'manikantaperumalla2007@gmail.com',
    password: 'password123', // I used 585758 earlier for manikantaperumalla2007@gmail.com
  });
  console.log('SignIn Data user exists:', !!res2.data?.user);
  console.log('SignIn Error:', res2.error?.message);

  console.log('\nTesting SignIn true password...');
  const res3 = await supabase.auth.signInWithPassword({
    email: 'manikantaperumalla2007@gmail.com',
    password: '585758',
  });
  console.log('SignIn Data user exists:', !!res3.data?.user);
  console.log('SignIn Error:', res3.error?.message);
}

testAuth();
