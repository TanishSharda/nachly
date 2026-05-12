"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { DanceStyle } from "@/types/database";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  style: DanceStyle;
  onPurchaseComplete: () => void;
}

export default function PurchaseModal({ open, onClose, style, onPurchaseComplete }: PurchaseModalProps) {
  const [step, setStep] = useState<"confirm" | "processing" | "success">("confirm");
  const [error, setError] = useState("");
  const amountPaise = Number(style.price_inr || 0);
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

  async function handlePurchase() {
    setError("");
    setStep("processing");

    try {
      if (!amountPaise || amountPaise < 100) {
        setError("Invalid style price. Please try again later.");
        setStep("confirm");
        return;
      }

      const orderResponse = await fetch("/api/purchases/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleSlug: style.slug,
          styleName: style.name,
          amountPaise,
        }),
      });

      const orderPayload = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setError(orderPayload?.error || "Unable to start payment. Please try again.");
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
        description: `Unlock ${style.name}`,
        order_id: orderPayload.orderId,
        method: {
          upi: true,
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        prefill: {
          name: orderPayload?.user?.name || "",
          email: orderPayload?.user?.email || "",
        },
        notes: {
          styleSlug: style.slug,
        },
        handler: async (response: Record<string, string>) => {
          const verifyResponse = await fetch("/api/purchases/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              styleSlug: style.slug,
              amountPaise,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyPayload = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verifyPayload?.verified) {
            setError(verifyPayload?.error || "Payment verification failed. Please contact support.");
            setStep("confirm");
            return;
          }

          setStep("success");
          setTimeout(() => {
            onPurchaseComplete();
            onClose();
            setStep("confirm");
          }, 1500);
        },
        modal: {
          ondismiss: () => {
            setStep("confirm");
          },
        },
        theme: {
          color: "#cafd00",
        },
      });

      razorpay.open();
    } catch {
      setError("Unable to start payment. Please try again.");
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
    <Modal open={open} onClose={handleClose} title={step === "success" ? undefined : `Unlock ${style.name}`}>
      {step === "confirm" && (
        <div>
          <div className="bg-cream-100 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Dance Style</span>
              <span className="font-semibold text-dark">{style.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Content</span>
              <span className="font-semibold text-dark">10 routines</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Access</span>
              <span className="font-semibold text-dark">Lifetime</span>
            </div>
            <div className="border-t border-dark-200 mt-3 pt-3 flex justify-between items-center">
              <span className="font-semibold text-dark">Total</span>
              <span className="text-2xl font-display font-bold text-wine-900">&#8377;{formattedAmount}</span>
            </div>
          </div>

          {error ? <p className="text-xs text-red-500 mb-4 text-center">{error}</p> : null}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handlePurchase} className="flex-1">
              Pay &#8377;{formattedAmount}
            </Button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-3 border-dark-200 border-t-wine-900 rounded-full animate-spin" />
          <p className="font-semibold text-dark">Processing payment...</p>
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
          <h3 className="font-display text-xl font-bold text-dark mb-1">You&apos;re in!</h3>
          <p className="text-sm text-dark-400">{style.name} is now unlocked. Start learning!</p>
        </div>
      )}
    </Modal>
  );
}
