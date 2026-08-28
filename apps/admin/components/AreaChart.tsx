// Hand-rolled inline-SVG dual-line growth chart. No charting library exists
// in this app's package.json, and adding one for a single chart isn't worth
// the dependency -- this is a simple monotonic cumulative-count plot, well
// within what plain SVG can do.
type Series = { label: string; color: string; values: number[] };

export function AreaChart({
  months,
  seriesA,
  seriesB,
}: {
  months: string[];
  seriesA: Series;
  seriesB: Series;
}) {
  const width = 720;
  const height = 220;
  const padLeft = 44;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxValue = Math.max(1, ...seriesA.values, ...seriesB.values);
  // Round the axis ceiling up to a "nice" number so ticks read as round
  // figures rather than whatever the raw max happens to be.
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue || 1)));
  const niceMax = Math.ceil(maxValue / (magnitude / 2)) * (magnitude / 2) || 1;

  const n = months.length;
  const x = (i: number) => padLeft + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v: number) => padTop + plotH - (v / niceMax) * plotH;

  function linePath(values: number[]) {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  }
  function areaPath(values: number[]) {
    const line = linePath(values);
    return `${line} L ${x(values.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="areaFillA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={seriesA.color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={seriesA.color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={padLeft} x2={width - padRight} y1={y(t)} y2={y(t)} stroke="#EEF1F4" strokeWidth={1} />
          <text x={padLeft - 8} y={y(t) + 4} fontSize={10} fill="#98A2B3" textAnchor="end">
            {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t}
          </text>
        </g>
      ))}

      <path d={areaPath(seriesA.values)} fill="url(#areaFillA)" />
      <path d={linePath(seriesA.values)} fill="none" stroke={seriesA.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={linePath(seriesB.values)} fill="none" stroke={seriesB.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {months.map((m, i) => (
        <text key={m + i} x={x(i)} y={height - 8} fontSize={10} fill="#98A2B3" textAnchor="middle">
          {m}
        </text>
      ))}
    </svg>
  );
}
