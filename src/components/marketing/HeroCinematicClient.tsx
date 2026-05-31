"use client";

import dynamic from "next/dynamic";

const HeroCinematic = dynamic(
  () => import("@/components/marketing/HeroCinematic"),
  { ssr: false }
);

export default function HeroCinematicClient() {
  return <HeroCinematic />;
}
