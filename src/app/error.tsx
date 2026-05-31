"use client";
import React, { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-300">An unexpected error occurred. Try refreshing or return to safety.</p>
      <div className="mt-4">
        <button onClick={() => reset?.()} className="px-4 py-2 bg-white text-black rounded">Try again</button>
      </div>
    </div>
  );
}
