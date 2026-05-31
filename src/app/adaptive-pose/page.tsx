import AdaptivePoseCoachClient from "@/components/practice/AdaptivePoseCoachClient";

export default function AdaptivePosePage() {
  return (
    <main className="min-h-screen bg-black p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Flexible AI Pose Detection</h1>
        <p className="mb-5 text-sm text-zinc-400">
          Works with partial body visibility and scores only the joints currently visible on camera.
        </p>
        <AdaptivePoseCoachClient />
      </div>
    </main>
  );
}
