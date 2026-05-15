'use client';

import Link from 'next/link';

interface Application {
  id: string;
  user_id: string;
  portfolio_url?: string;
  sample_video?: string;
  experience: string;
  specialties: string[] | string;
  status: string;
  created_at: string;
}

export default function AdminApplicationsClient(props: { 
  dbRows: Application[]; 
  sheetRows: any[] 
}) {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Legacy Creator Applications</h1>
          <Link href="/explore" className="text-sm text-zinc-400 hover:text-zinc-300">← Back</Link>
        </div>

        <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-xs text-yellow-100">
          Creator onboarding is now instant for all users. This view is kept for historical records only.
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Historical Application Records</h2>
          {props.dbRows.length === 0 ? (
            <p className="text-zinc-400">No submissions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="text-left text-zinc-400 border-b border-white/10">
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Portfolio</th>
                    <th className="py-3 px-3">Experience</th>
                    <th className="py-3 px-3">Specialties</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {props.dbRows.map((r: Application) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-zinc-900/50">
                      <td className="py-3 px-3 text-xs text-zinc-400 font-mono">{r.id.slice(0, 8)}</td>
                      <td className="py-3 px-3 text-xs text-zinc-300">{r.user_id.slice(0, 8)}</td>
                      <td className="py-3 px-3">
                        {r.portfolio_url ? (
                          <a href={r.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                            View
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-xs">{r.experience}</td>
                      <td className="py-3 px-3 text-xs">
                        {Array.isArray(r.specialties) ? r.specialties.join(', ') : r.specialties}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          r.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                          r.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                          'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-500">Archived</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {props.sheetRows.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Fallback (Google Sheet) Submissions</h2>
            <div className="text-xs text-zinc-400 mb-2">
              <p>These submissions were captured via email/sheet fallback when database was unavailable.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="text-left text-zinc-400 border-b border-white/10">
                    <th className="py-3 px-3">User ID</th>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Portfolio</th>
                    <th className="py-3 px-3">Experience</th>
                    <th className="py-3 px-3">Specialties</th>
                    <th className="py-3 px-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {props.sheetRows.map((r: any, idx: number) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="py-3 px-3 text-xs">{r.userId}</td>
                      <td className="py-3 px-3 text-xs">{r.name}</td>
                      <td className="py-3 px-3 text-xs">{r.email}</td>
                      <td className="py-3 px-3 text-xs">
                        {r.portfolio ? (
                          <a href={r.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs max-w-md truncate">{r.experience}</td>
                      <td className="py-3 px-3 text-xs">{Array.isArray(r.specialties) ? r.specialties.join(', ') : r.specialties}</td>
                      <td className="py-3 px-3 text-xs text-zinc-400">{r.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
