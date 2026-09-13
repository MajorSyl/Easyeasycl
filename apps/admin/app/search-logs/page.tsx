import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', kri: 'Krio', other: 'Unsupported' };

export default async function SearchLogsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  // Low keyword coverage (0-1 matched filters) or a zero-result search --
  // these are the queries worth reviewing to add new dictionary terms for.
  const { data: logs } = await supabase
    .from('search_query_logs')
    .select('id, raw_query, detected_language, matched_filter_count, result_count, created_at')
    .or('matched_filter_count.lte.1,result_count.eq.0')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: langCounts } = await supabase.from('search_query_logs').select('detected_language');
  const counts: Record<string, number> = {};
  for (const row of langCounts ?? []) {
    counts[row.detected_language ?? 'unknown'] = (counts[row.detected_language ?? 'unknown'] ?? 0) + 1;
  }

  return (
    <>
      <div className="topbar">
        <h1>Search Logs</h1>
      </div>
      <div className="content">
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Detected language (all searches)</span></div>
          <div style={{ padding: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([lang, count]) => (
              <div key={lang}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{count}</div>
                <div className="muted" style={{ fontSize: 12 }}>{LANGUAGE_LABELS[lang] ?? lang}</div>
              </div>
            ))}
            {!Object.keys(counts).length && <div className="muted">No searches logged yet.</div>}
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 16, maxWidth: 680 }}>
          Searches that matched one filter or fewer, or returned zero results -- review these to spot missing
          vocabulary and add it on the{' '}
          <a href="/search-dictionary" style={{ color: '#3E6FBF' }}>Search Dictionary</a> page.
        </p>

        <div className="card">
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Language</th>
                  <th>Filters matched</th>
                  <th>Results</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.raw_query}</td>
                    <td>
                      <span className={`badge ${l.detected_language === 'other' ? 'badge-red' : l.detected_language === 'kri' ? 'badge-amber' : 'badge-blue'}`}>
                        {LANGUAGE_LABELS[l.detected_language ?? ''] ?? l.detected_language ?? '—'}
                      </span>
                    </td>
                    <td className="muted">{l.matched_filter_count}</td>
                    <td className="muted">{l.result_count}</td>
                    <td className="muted">{new Date(l.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!logs?.length && <div className="empty">No low-coverage searches yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
