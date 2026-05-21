"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  interval_months: number;
  price_inr: number;
}

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSubscribeComplete: () => void;
}

export default function SubscriptionModal({ open, onClose, plan, onSubscribeComplete }: SubscriptionModalProps) {
  const [step, setStep] = useState<"confirm" | "processing" | "success">("confirm");
  const [error, setError] = useState("");

  if (!plan) return null;

  const amountPaise = Number(plan.price_inr || 0);
  const amountInr = Math.max(1, Math.round(amountPaise / 100));
  const formattedAmount = new Intl.NumberFormat("en-IN").format(amountInr);

  async function loadRazorpayScript() {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleSubscribe() {
    setError("");
    setStep("processing");

    if (!plan) {
      setError("No plan selected.");
      setStep("confirm");
      return;
    }

    try {
      if (!amountPaise || amountPaise < 100) {
        setError("Invalid subscription price. Please try again later.");
        setStep("confirm");
        return;
      }

      const orderResponse = await fetch("/api/subscriptions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const orderPayload = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setError(orderPayload?.error || "Unable to start subscription.");
        setStep("confirm");
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        setError("Razorpay SDK failed to load. Please check your network and retry.");
        setStep("confirm");
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderPayload.keyId,
        amount: orderPayload.amount,
        currency: orderPayload.currency || "INR",
        name: "Nachly",
        description: `${plan.name} subscription`,
        order_id: orderPayload.orderId,
        prefill: {
          name: orderPayload?.user?.name || "",
          email: orderPayload?.user?.email || "",
        },
        notes: {
          planId: plan.id,
        },
        handler: async (response: Record<string, string>) => {
          const verifyResponse = await fetch("/api/subscriptions/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planId: plan.id,
              amountPaise,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyPayload = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verifyPayload?.verified) {
            setError(verifyPayload?.error || "Subscription verification failed. Please contact support.");
            setStep("confirm");
            return;
          }

          setStep("success");
          setTimeout(() => {
            onSubscribeComplete();
            onClose();
            setStep("confirm");
          }, 1500);
        },
        modal: {
          ondismiss: () => setStep("confirm"),
        },
        theme: {
          color: "#725b3f",
        },
      });

      razorpay.open();
    } catch {
      setError("Unable to start subscription. Please try again.");
      setStep("confirm");
    }
  }

  function handleClose() {
    if (step === "processing") return;
    onClose();
    setStep("confirm");
    setError("");
  }

  return (
    <Modal open={open} onClose={handleClose} title={step === "success" ? undefined : `Subscribe to ${plan?.name}`}>
      {step === "confirm" && (
        <div>
          <div className="rounded-xl border border-dark-100 bg-cream-100 p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Plan</span>
              <span className="font-semibold text-dark">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Billing</span>
              <span className="font-semibold text-dark">Every {plan.interval_months} month(s)</span>
            </div>
            <div className="border-t border-dark-200 mt-3 pt-3 flex justify-between items-center">
              <span className="font-semibold text-dark">Total</span>
              <span className="text-2xl font-display font-bold text-wine-900">₹{formattedAmount}</span>
            </div>
          </div>

          {error ? <p className="text-xs text-red-500 mb-4 text-center">{error}</p> : null}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubscribe} className="flex-1">
              Subscribe ₹{formattedAmount}
            </Button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-3 border-dark-200 border-t-wine-900 rounded-full animate-spin" />
          <p className="font-semibold text-dark">Processing subscription...</p>
          <p className="text-sm text-dark-400 mt-1">Please wait</p>
        </div>
      )}

      {step === "success" && (
        <div className="py-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="font-display text-xl font-bold text-dark mb-1">Subscription active!</h3>
          <p className="text-sm text-dark-400">You now have access to premium routines.</p>
        </div>
      )}
    </Modal>
  );
}
