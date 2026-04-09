import { notFound } from "next/navigation";
import Panel from "@/components/admin/shared/Panel";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import BookingActionControls from "@/components/admin/bookings/BookingActionControls";
import { listAdminBookingsLive } from "@/lib/admin/live-data";
import { getBookingById } from "@/lib/admin/mock-data";

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookings = await listAdminBookingsLive().catch(() => []);
  const booking = bookings.find((item) => item.id === id) ?? getBookingById(id);

  if (!booking) {
    notFound();
  }

  const platformCommission = (booking.amount * booking.commissionPercent) / 100;
  const providerPayout = booking.amount - platformCommission;

  return (
    <div className="space-y-4">
      <Panel title="Booking Investigation Record" subtitle={`${booking.id} - ${booking.customerName} - ${booking.providerName}`}>
        <div className="flex items-center gap-3">
          <StatusBadge status={booking.status} />
          <p className="text-sm text-zinc-400">City: {booking.city}</p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Full Booking Timeline">
          <div className="space-y-2">
            {booking.timeline.map((item) => (
              <div key={item.at + item.title} className="border border-zinc-800 p-3">
                <p className="text-xs text-zinc-400">{new Date(item.at).toLocaleString("en-IN")}</p>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Chat Preview (Recent)">
          <div className="space-y-2">
            {booking.chatPreview.map((message) => (
              <div key={message.id} className="border border-zinc-800 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{message.sender}</p>
                <p className="mt-1 text-zinc-200">{message.text}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(message.at).toLocaleString("en-IN")}</p>
              </div>
            ))}
            {booking.chatPreview.length === 0 ? <p className="text-sm text-zinc-500">No chat messages recorded.</p> : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Payment + Commission">
          <div className="space-y-2 text-sm">
            <p><span className="text-zinc-400">Gross amount:</span> Rs {booking.amount.toLocaleString("en-IN")}</p>
            <p><span className="text-zinc-400">Platform commission ({booking.commissionPercent}%):</span> Rs {platformCommission.toLocaleString("en-IN")}</p>
            <p><span className="text-zinc-400">Provider payout:</span> Rs {providerPayout.toLocaleString("en-IN")}</p>
          </div>
        </Panel>

        <Panel title="Risk Notes">
          <div className="space-y-2 text-sm">
            <p className="text-zinc-400">Cancellation history</p>
            {booking.cancellationHistory.length ? (
              booking.cancellationHistory.map((entry) => <p key={entry} className="border border-zinc-800 p-2">{entry}</p>)
            ) : (
              <p className="text-zinc-500">No cancellation history.</p>
            )}
            <p className="pt-2 text-zinc-400">Dispute notes</p>
            {booking.disputeNotes.length ? (
              booking.disputeNotes.map((entry) => <p key={entry} className="border border-zinc-800 p-2">{entry}</p>)
            ) : (
              <p className="text-zinc-500">No dispute notes.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Actions" subtitle="Refund, completion overrides, cancellation, escalation">
        <BookingActionControls initialStatus={booking.status} />
      </Panel>
    </div>
  );
}
