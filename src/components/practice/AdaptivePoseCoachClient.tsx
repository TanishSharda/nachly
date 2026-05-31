"use client";

import dynamic from "next/dynamic";

const AdaptivePoseCoach = dynamic(
  () => import("@/components/practice/AdaptivePoseCoach"),
  { ssr: false }
);

export default function AdaptivePoseCoachClient() {
  return <AdaptivePoseCoach />;
}
