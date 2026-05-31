"use client";

import dynamic from "next/dynamic";

const AtmosphereController = dynamic(
  () => import("@/components/marketing/AtmosphereController"),
  { ssr: false }
);

export default function AtmosphereControllerClient() {
  return <AtmosphereController />;
}
