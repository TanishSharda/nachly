import React from 'react';
import Link from 'next/link';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { readApplicationsFromSheet } from '@/lib/fallbacks/googleSheets';
import AdminApplicationsClient from './client';

export default async function AdminApplicationsPage() {
  const supabase = createServerSupabase();
  
  // Check authentication
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Admin - Choreographer Applications</h1>
          <p className="mb-4">Please <Link href="/login?redirect=%2Fadmin%2Fapplications">log in</Link> to view submissions.</p>
        </div>
      </main>
    );
  }

  // Verify admin role
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You do not have permission to view this page.</p>
          <Link href="/explore" className="text-blue-400">Back to Explore</Link>
        </div>
      </main>
    );
  }

  // Fetch DB submissions
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;
  
  let dbRows = [];
  try {
    const { data } = await db
      .from('choreographer_applications')
      .select('id,user_id,portfolio_url,sample_video,experience,specialties,status,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    dbRows = data || [];
  } catch (err) {
    console.error('Error fetching DB applications', err);
  }

  // Fetch Sheet submissions (fallback)
  let sheetRows = [];
  try {
    const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT;
    const sheetId = process.env.CHOREO_APPS_SPREADSHEET_ID;
    if (saJson && sheetId) {
      sheetRows = await readApplicationsFromSheet({ serviceAccountJson: saJson, spreadsheetId: sheetId });
    }
  } catch (err) {
    console.error('Error reading sheet rows', err);
  }

  return <AdminApplicationsClient dbRows={dbRows} sheetRows={sheetRows} />;
}
