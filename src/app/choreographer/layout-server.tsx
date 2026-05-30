import { createServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import ChoreographerLayoutClient from './layout-client';

export default async function ChoreographerLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const supabase = await createServerSupabase();
  
  // Check authentication
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Creator Access</h1>
          <p className="mb-6 text-zinc-400">
            You must be logged in to access creator tools.
          </p>
          <Link href="/auth?redirect=%2Fcreator%2Fdashboard" className="text-blue-400 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return <ChoreographerLayoutClient>{children}</ChoreographerLayoutClient>;
}
