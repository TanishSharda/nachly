"use client";
import React, { useEffect } from "react";

export default function MainShellError({ error, reset }: { error: Error; reset?: () => void }) {
  useEffect(() => {
    console.error("Main shell error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="max-w-lg text-center">
        <h2 className="text-xl font-semibold">Something went wrong in the app</h2>
        <p className="mt-2 text-sm text-gray-300">We encountered an error in the main app shell. You can try again or go back to the home page.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => reset?.()} className="px-4 py-2 bg-white text-black rounded">Try again</button>
          <a href="/" className="px-4 py-2 border border-white rounded text-white">Home</a>
        </div>
      </div>
    </div>
  );
}
