"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UsageGuide } from "./usage-guide";

interface TelegramBot {
  id: string;
  name: string;
  chatId: string;
  isActive: number;
}

interface WebhookStatus {
  loading: boolean;
  connected: boolean;
  pendingUpdateCount: number;
  lastErrorMessage?: string;
}

export function TelegramClient() {
  const [bots, setBots] = useState<TelegramBot[] | null>(null);
  const [webhooks, setWebhooks] = useState<Record<string, WebhookStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const fetchBots = () => {
    fetch("/api/panel/telegram")
      .then((r) => {
        if (r.status === 403) { setAllowed(false); return { bots: [] }; }
        setAllowed(true);
        return r.json();
      })
      .then((data) => setBots(data.bots || []))
      .catch(() => setBots([]));
  };

  const fetchWebhook = async (id: string) => {
    setWebhooks((prev) => ({
      ...prev,
      [id]: {
        loading: true,
        connected: prev[id]?.connected ?? false,
        pendingUpdateCount: prev[id]?.pendingUpdateCount ?? 0,
        lastErrorMessage: prev[id]?.lastErrorMessage,
      },
    }));
    try {
      const res = await fetch(
        `/api/panel/telegram/webhook?id=${encodeURIComponent(id)}`,
      );
      if (!res.ok) {
        setWebhooks((prev) => ({
          ...prev,
          [id]: { loading: false, connected: false, pendingUpdateCount: 0 },
        }));
        return;
      }
      const data = await res.json();
      setWebhooks((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          connected: !!data.connected,
          pendingUpdateCount: data.pendingUpdateCount || 0,
          lastErrorMessage: data.lastErrorMessage,
        },
      }));
    } catch {
      setWebhooks((prev) => ({
        ...prev,
        [id]: { loading: false, connected: false, pendingUpdateCount: 0 },
      }));
    }
  };

  useEffect(() => { fetchBots(); }, []);

  useEffect(() => {
    if (!bots) return;
    bots.forEach((bot) => fetchWebhook(bot.id));
  }, [bots]);

  if (allowed === false) {
    return (
      <div className="mx-auto w-full max-w-screen-lg px-3 py-6 sm:px-6 lg:px-8">
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="rounded-full bg-neutral-100 p-3">
            <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-sm text-neutral-500">Telegram feature is not enabled for your account.</p>
          <p className="text-xs text-neutral-400">Contact your administrator to get access.</p>
        </div>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!name || !botToken || !chatId) { toast.error("All fields are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/panel/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, botToken, chatId }),
      });
      if (res.ok) {
        toast.success("Bot added");
        setShowAdd(false); setName(""); setBotToken(""); setChatId("");
        fetchBots();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add bot");
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this bot?")) return;
    const res = await fetch("/api/panel/telegram", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { toast.success("Bot deleted"); fetchBots(); }
  };

  const handleTest = async (id: string) => {
    const res = await fetch("/api/panel/telegram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) toast.success("Test message sent");
    else { const err = await res.json(); toast.error(err.error || "Test failed"); }
  };

  const handleConnect = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/panel/telegram/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Webhook connected");
        await fetchWebhook(id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to connect webhook");
      }
    } finally { setBusy(null); }
  };

  const handleDisconnect = async (id: string) => {
    if (!window.confirm("Disconnect this webhook? The bot will stop receiving updates.")) return;
    setBusy(id);
    try {
      const res = await fetch("/api/panel/telegram/webhook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Webhook disconnected");
        await fetchWebhook(id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to disconnect webhook");
      }
    } finally { setBusy(null); }
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-3 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Telegram Bots</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Get notified after bulk replacements</p>
        </div>
        {bots && bots.length < 5 && (
          <Button
            text="Add Bot"
            onClick={() => setShowAdd(true)}
            className="h-9 w-auto rounded-lg px-4"
          />
        )}
      </div>

      {/* Add Bot Form */}
      {showAdd && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-neutral-700">New Bot</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Name</label>
              <Input type="text" placeholder="My Bot" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Bot Token</label>
              <Input type="text" placeholder="123456:ABC-DEF" value={botToken} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBotToken(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Chat ID</label>
              <Input type="text" placeholder="-100123456789" value={chatId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatId(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button text="Save Bot" onClick={handleAdd} loading={saving} className="h-9 w-auto rounded-lg px-4" />
            <Button text="Cancel" variant="secondary" onClick={() => setShowAdd(false)} className="h-9 w-auto rounded-lg px-4" />
          </div>
        </div>
      )}

      {/* Bots Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {bots === null ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : bots.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div className="rounded-full bg-neutral-100 p-3">
              <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-500">No Telegram bots configured</p>
            <p className="text-xs text-neutral-400">Add a bot to receive notifications</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Chat ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Webhook</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {bots.map((bot) => (
                <tr key={bot.id} className="transition-colors hover:bg-neutral-50/60">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{bot.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-neutral-500">{bot.chatId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bot.isActive ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {bot.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!webhooks[bot.id] || webhooks[bot.id].loading ? (
                      <span className="text-xs text-neutral-400">Checking</span>
                    ) : (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${webhooks[bot.id]?.connected ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {webhooks[bot.id]?.connected
                          ? webhooks[bot.id].pendingUpdateCount > 0
                            ? `Connected, ${webhooks[bot.id].pendingUpdateCount} pending`
                            : "Connected"
                          : "Not connected"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {webhooks[bot.id]?.connected ? (
                        <button onClick={() => handleDisconnect(bot.id)} disabled={busy === bot.id}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                          Disconnect
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(bot.id)} disabled={busy === bot.id}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50">
                          Connect
                        </button>
                      )}
                      <button onClick={() => handleTest(bot.id)}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
                        Test
                      </button>
                      <button onClick={() => handleDelete(bot.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UsageGuide />
    </div>
  );
}
