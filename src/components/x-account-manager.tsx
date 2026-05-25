"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { XAccountRow } from "@/lib/supabase/types";

export function NewXAccountForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/x-accounts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              handle: String(form.get("handle") || ""),
              display_name: String(form.get("display_name") || "") || null,
              role: String(form.get("role") || "") || null,
              importance: Number(form.get("importance") || 5),
              category: String(form.get("category") || "politics"),
              notes: String(form.get("notes") || "") || null,
              enabled: true,
            }),
          });
          if (!res.ok) throw new Error((await res.json()).error || "Save failed");
          event.currentTarget.reset();
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <Label>Handle</Label>
        <Input name="handle" placeholder="CENTCOM" required />
      </div>
      <div className="space-y-1">
        <Label>Display name</Label>
        <Input name="display_name" placeholder="US Central Command" />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Input name="role" placeholder="Military / official / OSINT" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select name="category" defaultValue="politics">
            <option value="politics">politics</option>
            <option value="war">war</option>
            <option value="geopolitics">geopolitics</option>
            <option value="other">other</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Weight</Label>
          <Input name="importance" type="number" min={1} max={10} defaultValue={5} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} placeholder="Why this account matters" />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Adding..." : "Add X account"}
      </Button>
      {error ? <div className="text-xs text-[var(--danger)]">{error}</div> : null}
    </form>
  );
}

export function XAccountActions({ account }: { account: XAccountRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Partial<XAccountRow>) {
    setBusy(true);
    try {
      await fetch(`/api/x-accounts/${account.handle}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove @${account.handle} from the watchlist?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/x-accounts/${account.handle}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function edit() {
    const role = prompt("Role / why this account matters", account.role ?? "");
    if (role === null) return;
    const importanceRaw = prompt("Importance 1-10", String(account.importance));
    if (importanceRaw === null) return;
    const category = prompt(
      "Category: politics, war, geopolitics, or other",
      account.category,
    );
    if (category === null) return;
    await patch({
      role,
      importance: Math.max(1, Math.min(10, Number(importanceRaw) || 5)),
      category: category as XAccountRow["category"],
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={edit}>
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => patch({ enabled: !account.enabled })}
      >
        {account.enabled ? "Pause" : "Resume"}
      </Button>
      <Button type="button" size="sm" variant="danger" disabled={busy} onClick={remove}>
        Remove
      </Button>
    </div>
  );
}
