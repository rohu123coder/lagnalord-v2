export type HistorySession = {
  id: string;
  ended_at: string | null;
  started_at: string | null;
  total_minutes: number | null;
  total_charged: number | null;
  user_name: string;
};

export function EarningsSessionTable({
  sessions,
}: {
  sessions: HistorySession[];
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Session history</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Duration</th>
              <th className="px-6 py-3">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No completed sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-3 text-slate-800">
                    {s.ended_at
                      ? new Date(s.ended_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-slate-800">{s.user_name}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {s.total_minutes != null ? `${s.total_minutes} min` : "—"}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    ₹
                    {(s.total_charged != null ? s.total_charged : 0).toFixed(0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
