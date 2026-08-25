export function MilestoneBar({ label, current, target, pct }: { label: string; current: number; target: number; pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: '#344054' }}>{label}</span>
        <span style={{ color: '#667085' }}>{current} / {target} ({pct}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#eaecf0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#1d4ed8', borderRadius: 4 }} />
      </div>
    </div>
  );
}
