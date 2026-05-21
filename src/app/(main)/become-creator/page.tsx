"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BecomeCreatorPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/upgrade-role", { method: "POST" });
      if (!res.ok) throw new Error("Upgrade failed");
      router.push("/choreographer");
    } catch (err) {
      // noop
      setLoading(false);
      alert("Could not upgrade role right now.");
    }
  }

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-4">Start creating on Nachly</h1>
        <p className="text-sm text-muted-text mb-6">Upgrade your account to a creator and start publishing choreography instantly.</p>
        <div className="space-y-4">
          <button onClick={handleUpgrade} disabled={loading} className="rounded-full bg-[#7a5c3a] px-6 py-3 text-sm font-semibold text-white">
            {loading ? "Upgrading..." : "Become a Creator"}
          </button>
        </div>
      </div>
    </main>
  );
}
