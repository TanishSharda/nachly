import React from "react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-2 text-gray-300">We couldn't find that page.</p>
        <a href="/" className="mt-4 inline-block text-blue-400">Return home</a>
      </div>
    </div>
  );
}
