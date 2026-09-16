/**
 * رسوم بيانية بسيطة مكتوبة بـ SVG/CSS مباشرة.
 * تعمّدنا عدم إضافة مكتبة رسوم: احتياجنا شريطان فقط، والمكتبات الجاهزة
 * تضيف مئات الكيلوبايتات بلا فائدة حقيقية هنا.
 */

export function BarChart({
  points,
  label,
}: {
  points: { label: string; value: number }[];
  label: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <div className="chart" role="img" aria-label={label}>
      <div className="chart-bars">
        {points.map((point) => (
          <div className="chart-bar-col" key={point.label} title={`${point.label}: ${point.value}`}>
            <span
              className="chart-bar"
              style={{ height: `${Math.max((point.value / max) * 100, 2)}%` }}
            />
            <span className="chart-bar-label">{point.label}</span>
          </div>
        ))}
      </div>
      <span className="sr-only">
        {points.map((point) => `${point.label}: ${point.value}`).join('، ')}
      </span>
    </div>
  );
}

export function RankBars({
  items,
  emptyText = 'لا توجد بيانات بعد.',
}: {
  items: { label: string; value: number; color?: string }[];
  emptyText?: string;
}) {
  if (items.length === 0) return <p className="muted small">{emptyText}</p>;
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="rank-list">
      {items.map((item) => (
        <li className="rank-item" key={item.label}>
          <div className="rank-head">
            <span className="rank-label">{item.label}</span>
            <span className="rank-value numeric">{item.value}</span>
          </div>
          <span className="rank-track">
            <span
              className="rank-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color ?? 'var(--brand)',
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
