import { createServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import ChoreographerLayoutClient from './layout-client';

export default async function ChoreographerLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const supabase = createServerSupabase();
  
  // Check authentication
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Creator Access</h1>
          <p className="mb-6 text-zinc-400">
            You must be logged in and approved as a choreographer to access this area.
          </p>
          <Link href="/login?redirect=%2Fchoreographer" className="text-blue-400 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Check choreographer role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'choreographer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Creator Access Required</h1>
          <p className="mb-6 text-zinc-400">
            You have not been approved as a choreographer yet. 
          </p>
          <p className="text-sm text-zinc-500 mb-6">
            Apply at the link below to get creator access.
          </p>
          <Link href="/apply-choreographer" className="text-blue-400 hover:underline">
            Apply Now
          </Link>
          <span className="text-zinc-600 mx-2">•</span>
          <Link href="/explore" className="text-blue-400 hover:underline">
            Back to App
          </Link>
        </div>
      </div>
    );
  }

  return <ChoreographerLayoutClient>{children}</ChoreographerLayoutClient>;
}
