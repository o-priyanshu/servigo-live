"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import CustomerPageNav from "@/components/customer/shared/CustomerPageNav";

interface MessageItem {
  id: string;
  senderId: string;
  senderRole: string;
  text: string;
  createdAt?: unknown;
}

interface BookingItem {
  id: string;
  customerId?: string;
  customerName?: string;
  providerName?: string;
  providerPhoto?: string;
  serviceCategory?: string;
}

function formatMessageTime(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (typeof value === "object" && value !== null) {
    const maybeSeconds =
      (value as { _seconds?: number; seconds?: number })._seconds ??
      (value as { _seconds?: number; seconds?: number }).seconds;
    if (typeof maybeSeconds === "number") {
      const date = new Date(maybeSeconds * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    }
  }

  return "";
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id ?? "";
  const { user } = useAuth();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [providerName, setProviderName] = useState("Service Provider");
  const [serviceCategory, setServiceCategory] = useState("Service");

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  const loadBookingMeta = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const current: BookingItem | null =
        data?.booking && typeof data.booking === "object"
          ? (data.booking as BookingItem)
          : null;
      if (!current) return;
      const viewerIsCustomer = user?.uid ? String(current.customerId ?? "") === user.uid : true;
      setProviderName(
        String(
          viewerIsCustomer
            ? current.providerName ?? "Service Provider"
            : current.customerName ?? "Customer"
        )
      );
      setServiceCategory(String(current.serviceCategory ?? "Service"));
    } catch {
      // Non-critical UI metadata fetch.
    }
  }, [bookingId, user?.uid]);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load messages");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    loadBookingMeta();
    loadMessages();
    const timer = window.setInterval(loadMessages, 6000);
    return () => window.clearInterval(timer);
  }, [bookingId, loadBookingMeta, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSend() {
    if (!canSend) return;
    try {
      setSending(true);
      setError("");
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to send message");
      setText("");
      await loadMessages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col bg-muted/40">
      <CustomerPageNav searchPlaceholder="Search providers in Selected Area" />
      <header className="border-b border-border bg-card/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-700">
              {providerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground">{providerName}</p>
              <p className="truncate text-sm capitalize text-muted-foreground">{serviceCategory.replace("_", " ")}</p>
            </div>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">Booking ID: {bookingId}</p>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-3 sm:p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.uid ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                      msg.senderId === user?.uid
                        ? "bg-foreground text-background"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-base">{msg.text}</p>
                    <p
                      className={`mt-1 text-xs ${
                        msg.senderId === user?.uid ? "text-background/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border bg-card/95 px-3 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            className="max-h-40 min-h-11 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="Type your message..."
          />
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="h-11 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
          >
            <Send size={15} />
          </Button>
        </div>
        {error ? <p className="mx-auto mt-2 w-full max-w-6xl text-sm text-red-600">{error}</p> : null}
      </footer>
    </main>
  );
}