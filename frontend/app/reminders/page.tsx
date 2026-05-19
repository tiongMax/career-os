import { getReminders, getFailedReminders } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { RetryButton } from "./retry-button";

const REMINDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
  cancelled: "bg-neutral-100 text-neutral-500",
};

export default async function RemindersPage() {
  const reminders = await getReminders().catch(() => []);
  const failedJobs = await getFailedReminders().catch(() => []);

  const pending = reminders.filter((r) => r.status === "pending");
  const rest = reminders.filter((r) => r.status !== "pending");
  const sorted = [...pending, ...rest];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reminders</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {pending.length} pending · {reminders.length} total
        </p>
      </div>

      {reminders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-sm text-neutral-400">No reminders yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Due</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-800">{r.title}</p>
                    {r.description && <p className="text-xs text-neutral-400 mt-0.5">{r.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-neutral-500 text-xs">{formatDate(r.due_at)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${REMINDER_STATUS_STYLES[r.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">{r.retry_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {failedJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            Failed Jobs ({failedJobs.length})
          </h2>
          <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Error Message</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Retry Count</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Failed At</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {failedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 text-neutral-800">{job.error_message}</td>
                    <td className="px-5 py-3 text-xs text-neutral-400">{job.retry_count}</td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{formatDate(job.failed_at)}</td>
                    <td className="px-5 py-3">
                      {job.reminder_id ? <RetryButton reminderId={job.reminder_id} /> : <span className="text-xs text-neutral-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
