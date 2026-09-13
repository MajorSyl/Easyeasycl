import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { addDictionaryTerm, deleteDictionaryTerm } from '../actions';

const TYPE_LABELS: Record<string, string> = {
  category: 'Category (rent/sale/land/daily)',
  price_intent: 'Price intent (asc/desc)',
  type_keyword: 'Type keyword (title/description match)',
  bedrooms: 'Bedrooms',
  stopword: 'Stopword',
};

export default async function SearchDictionaryPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const isAdmin = session.user.app_metadata?.is_admin === true ||
    (await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()).data?.is_admin === true;
  if (!isAdmin) redirect('/login');

  const { data: terms } = await supabase
    .from('search_dictionary')
    .select('id, term, language, maps_to_type, maps_to_value, created_at')
    .order('language')
    .order('maps_to_type')
    .order('term');

  return (
    <>
      <div className="topbar">
        <h1>Search Dictionary</h1>
      </div>
      <div className="content">
        <p className="muted" style={{ marginBottom: 16, maxWidth: 680 }}>
          English and Krio words/phrases the conversational search parser recognizes -- e.g. "chip" (Krio) or
          "affordable" (English) both map to a cheap price intent. Add new terms here anytime; the app picks them up
          without a new release.
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Add a term</span></div>
          <form
            action={async (fd: FormData) => {
              'use server';
              await addDictionaryTerm(
                fd.get('term') as string,
                fd.get('language') as string,
                fd.get('maps_to_type') as string,
                fd.get('maps_to_value') as string
              );
            }}
            style={{ padding: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Term</label>
              <input name="term" required placeholder="e.g. chip" className="form-select" style={{ width: 180 }} />
            </div>
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Language</label>
              <select name="language" className="form-select">
                <option value="en">English</option>
                <option value="kri">Krio</option>
              </select>
            </div>
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Maps to</label>
              <select name="maps_to_type" className="form-select">
                <option value="category">Category</option>
                <option value="price_intent">Price intent</option>
                <option value="type_keyword">Type keyword</option>
              </select>
            </div>
            <div>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Value (for category: for_rent/for_sale/land/daily_hourly; for price intent: asc/desc; leave blank for type keyword)
              </label>
              <input name="maps_to_value" placeholder="e.g. for_rent" className="form-select" style={{ width: 260 }} />
            </div>
            <button type="submit" className="btn" style={{ background: '#3E6FBF', color: '#fff', border: 'none' }}>Add term</button>
          </form>
        </div>

        <div className="card">
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Language</th>
                  <th>Maps to</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(terms ?? []).map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.term}</td>
                    <td><span className={`badge ${t.language === 'kri' ? 'badge-amber' : 'badge-blue'}`}>{t.language === 'kri' ? 'Krio' : 'English'}</span></td>
                    <td className="muted">{TYPE_LABELS[t.maps_to_type] ?? t.maps_to_type}</td>
                    <td className="muted">{t.maps_to_value ?? '—'}</td>
                    <td>
                      <form action={async () => { 'use server'; await deleteDictionaryTerm(t.id); }}>
                        <button type="submit" className="btn btn-danger btn-sm">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!terms?.length && <div className="empty">No dictionary terms yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
