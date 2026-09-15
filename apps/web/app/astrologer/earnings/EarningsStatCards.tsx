export function EarningsStatCards({
  earnings_total,
  earnings_this_month,
  total_sessions,
  rating,
}: {
  earnings_total: number;
  earnings_this_month: number;
  total_sessions: number;
  rating: number | null;
}) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase text-slate-500">
          Total earned
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          ₹{earnings_total.toFixed(0)}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase text-slate-500">
          This month
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          ₹{earnings_this_month.toFixed(0)}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase text-slate-500">
          Total sessions
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{total_sessions}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase text-slate-500">
          Average rating
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          {rating != null ? `${rating.toFixed(1)} ★` : "—"}
        </p>
      </div>
    </div>
  );
}
