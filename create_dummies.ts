import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Need the service_role key to bypass email confirmation or just rely on the toggle being off now.
// The user already turned off email confirmation on their dashboard, so auth.signUp will work instantly!
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function createDummies() {
  console.log('Creating Captain...');
  const resCapt = await supabase.auth.signUp({
    email: 'captain@vpl.com',
    password: 'password123',
    options: { data: { full_name: 'Dummy Captain' } }
  });
  
  if (resCapt.error) {
    if (resCapt.error.message.includes('registered')) console.log('✅ Captain already exists.');
    else console.error('Error creating captain:', resCapt.error.message);
  } else {
    // Force role in public.users
    if (resCapt.data.user) {
        await supabase.from('users').update({ role: 'TEAM_OWNER', name: 'Dummy Captain' }).eq('id', resCapt.data.user.id);
        console.log('✅ Captain created (captain@vpl.com / password123)');
    }
  }

  console.log('Creating Viewer...');
  const resView = await supabase.auth.signUp({
    email: 'viewer@vpl.com',
    password: 'password123',
    options: { data: { full_name: 'Dummy Viewer' } }
  });
  
  if (resView.error) {
    if (resView.error.message.includes('registered')) console.log('✅ Viewer already exists.');
    else console.error('Error creating viewer:', resView.error.message);
  } else {
    // Force role in public.users
    if (resView.data.user) {
        await supabase.from('users').update({ role: 'VIEWER', name: 'Dummy Viewer' }).eq('id', resView.data.user.id);
        console.log('✅ Viewer created (viewer@vpl.com / password123)');
    }
  }
}

createDummies();
