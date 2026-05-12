"use client";

import { useEffect, useState } from "react";
import SubscriptionModal from "@/components/explore/SubscriptionModal";

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  interval_months: number;
  price_inr: number;
}

function formatPrice(priceInr: number) {
  const amountInr = Math.max(1, Math.round(priceInr / 100));
  return new Intl.NumberFormat("en-IN").format(amountInr);
}

export default function SubscribePage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPlans() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/subscriptions/plans");
        const payload = await response.json();
        if (!response.ok) {
          setError(payload?.error || "Failed to load plans");
          return;
        }
        setPlans(payload?.plans || []);
      } catch {
        setError("Failed to load plans");
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  return (
    <main className="min-h-screen bg-[#fbf9f4] text-[#2a261f] px-6 py-12 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#725b3f]">Premium</p>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-[#2a261f]">Unlock Naachly Plus</h1>
          <p className="mt-3 text-sm md:text-base text-[#6f675b]">Unlimited premium routines, masterclasses, and creator drops.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {loading && (
            <div className="col-span-3 rounded-2xl border border-[#e7ded2] bg-white/60 p-8 text-center text-sm text-[#7b7268]">
              Loading plans...
            </div>
          )}
          {!loading && plans.length === 0 && (
            <div className="col-span-3 rounded-2xl border border-[#e7ded2] bg-white/60 p-8 text-center text-sm text-[#7b7268]">
              No active plans found.
            </div>
          )}
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`rounded-[1.8rem] border bg-white p-6 shadow-sm ${
                index === 1 ? "border-[#725b3f]/40 shadow-[0_20px_40px_rgba(114,91,63,0.15)]" : "border-[#e7ded2]"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#725b3f]">{plan.name}</p>
              <p className="mt-3 text-3xl font-bold text-[#2a261f]">₹{formatPrice(plan.price_inr)}</p>
              <p className="text-xs text-[#7b7268]">Every {plan.interval_months} month(s)</p>
              <p className="mt-4 text-sm text-[#5f564c]">{plan.description || "Premium access to Naachly."}</p>
              <button
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className="mt-6 w-full rounded-full bg-[#725b3f] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white"
              >
                Subscribe
              </button>
            </div>
          ))}
        </div>
      </div>

      <SubscriptionModal
        open={Boolean(selectedPlan)}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onSubscribeComplete={() => {
          setSelectedPlan(null);
        }}
      />
    </main>
  );
}
