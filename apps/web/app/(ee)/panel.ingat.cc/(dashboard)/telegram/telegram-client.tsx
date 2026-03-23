"use client";

import { Button, Input, LoadingSpinner } from "@dub/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TelegramBot {
  id: string;
  name: string;
  chatId: string;
  isActive: number;
}

export function TelegramClient() {
  const [bots, setBots] = useState<TelegramBot[] | null>(null);
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

  useEffect(() => { fetchBots(); }, []);

  if (allowed === false) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <div className="flex h-60 items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm text-neutral-500">
          Telegram feature is not enabled for your account. Contact administrator.
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

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Telegram Bots</h1>
          <p className="mt-1 text-sm text-neutral-500">Get notified after bulk replacements</p>
        </div>
        {bots && bots.length < 5 && (
          <Button text="Add Bot" onClick={() => setShowAdd(true)} className="h-9" />
        )}
      </div>

      {showAdd && (
        <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
              <Input type="text" placeholder="My Bot" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Bot Token</label>
              <Input type="text" placeholder="123456:ABC-DEF" value={botToken} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBotToken(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Chat ID</label>
              <Input type="text" placeholder="-100123456789" value={chatId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatId(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button text="Save" onClick={handleAdd} loading={saving} className="h-8 text-xs" />
            <Button text="Cancel" variant="secondary" onClick={() => setShowAdd(false)} className="h-8 text-xs" />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {bots === null ? (
          <div className="flex h-40 items-center justify-center"><LoadingSpinner className="h-6 w-6" /></div>
        ) : bots.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-neutral-500">No Telegram bots configured</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Chat ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {bots.map((bot) => (
                <tr key={bot.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{bot.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{bot.chatId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bot.isActive ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {bot.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleTest(bot.id)} className="text-xs text-blue-600 hover:underline">Test</button>
                      <button onClick={() => handleDelete(bot.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
