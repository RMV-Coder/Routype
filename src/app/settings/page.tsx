"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile").then(async (res) => {
      if (!res.ok) return;
      const { profile } = await res.json();
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
      setIsPrivate(profile.is_private);
      setLoaded(true);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving…");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, bio, isPrivate }),
    });
    const json = await res.json().catch(() => ({}));
    setStatus(res.ok ? "Saved." : json.error || "Failed to save");
  };

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-2xl grid gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How other writers see you.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span>Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!loaded} maxLength={255} />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Bio</span>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} disabled={!loaded} maxLength={500} rows={3} placeholder="Poet by night, typist by day." />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>Use Routype as a private online diary.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-primary" checked={isPrivate} disabled={!loaded} onChange={(e) => setIsPrivate(e.target.checked)} />
            <span className="grid gap-1">
              <span className="font-medium">Private profile</span>
              <span className="text-muted-foreground">
                Nobody else can read your pieces (whatever their individual visibility), they are not offered in TypeArena,
                and you are hidden from leaderboards.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-3">
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
        <Button type="submit" disabled={!loaded}>Save changes</Button>
      </div>
    </form>
  );
}
