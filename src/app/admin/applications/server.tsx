import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { logServiceRoleUsage } from '@/lib/security/serviceRoleAudit';
import { notFound } from 'next/navigation';
import { readApplicationsFromSheet } from '@/lib/fallbacks/googleSheets';
import AdminApplicationsClient from './client';

export default async function AdminApplicationsPage() {
  const supabase = await createServerSupabase();
  // Verify current user is an admin before using service-role client
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') return notFound();

  // Fetch DB submissions with service role when available
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      logServiceRoleUsage({ caller: 'app/admin/applications/server', note: `admin:${user.id}:fetch_applications` });
    } catch (_) {}
  }
  
  let dbRows: any[] = [];
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
  let sheetRows: any[] = [];
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
