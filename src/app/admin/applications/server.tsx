import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { readApplicationsFromSheet } from '@/lib/fallbacks/googleSheets';
import AdminApplicationsClient from './client';

export default async function AdminApplicationsPage() {
  const supabase = createServerSupabase();

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
