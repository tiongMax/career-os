import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { getApplication, getCompany, getContact, getReminder } from "@/lib/api";
import { REMINDER_STATUS_BADGE_CLASSES } from "@/lib/domain/reminders";
import { formatDate, formatRelative } from "@/lib/utils";

export default async function ReminderDetailPage(props: PageProps<"/reminders/[id]">) {
  const { id } = await props.params;

  const reminder = await getReminder(id).catch(() => null);
  if (!reminder) notFound();

  const [application, contact] = await Promise.all([
    getApplication(reminder.application_id).catch(() => null),
    reminder.contact_id ? getContact(reminder.contact_id).catch(() => null) : Promise.resolve(null),
  ]);
  const company = application ? await getCompany(application.company_id).catch(() => null) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/reminders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-700">
          <ArrowLeft className="h-3.5 w-3.5" />
          Reminders
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{reminder.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Due {formatDate(reminder.due_at)} · {formatRelative(reminder.due_at)}
            </p>
          </div>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${REMINDER_STATUS_BADGE_CLASSES[reminder.status] ?? "bg-neutral-100 text-neutral-600"}`}>
            {reminder.status}
          </span>
        </div>
      </div>

      <Card title="Reminder">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Due" value={formatDate(reminder.due_at)} />
          <Detail label="Created" value={formatDate(reminder.created_at)} />
          <Detail label="Updated" value={formatDate(reminder.updated_at)} />
          <Detail label="Retries" value={String(reminder.retry_count)} />
          {reminder.delivered_at && <Detail label="Delivered" value={formatDate(reminder.delivered_at)} />}
          {reminder.last_error && <Detail label="Last error" value={reminder.last_error} />}
        </dl>
        {reminder.description && (
          <div className="mt-5 border-t border-neutral-100 pt-4">
            <p className="text-xs text-neutral-400">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{reminder.description}</p>
          </div>
        )}
      </Card>

      <Card title="Related">
        <div className="space-y-4">
          {application ? (
            <Link href={`/applications/${application.id}`} className="block rounded-md border border-neutral-100 px-4 py-3 transition-colors hover:bg-neutral-50">
              <p className="text-sm font-medium text-neutral-900">{application.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{company?.name ?? "Unknown company"}</p>
            </Link>
          ) : (
            <p className="text-sm text-neutral-400">Application unavailable</p>
          )}
          {contact && (
            <Link href={`/contacts/${contact.id}`} className="block rounded-md border border-neutral-100 px-4 py-3 transition-colors hover:bg-neutral-50">
              <p className="text-sm font-medium text-neutral-900">{contact.name}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{contact.role ?? "Contact"}</p>
            </Link>
          )}
        </div>
      </Card>

      <Card title="Delivery">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-4 w-4 text-neutral-400" />
          <div>
            <p className="text-sm text-neutral-700">Idempotency key</p>
            <p className="mt-1 break-all text-xs text-neutral-400">{reminder.idempotency_key}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <h2 className="border-b border-neutral-100 px-5 py-3.5 text-sm font-medium text-neutral-700">{title}</h2>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-700">{value}</dd>
    </div>
  );
}
