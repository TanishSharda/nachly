"use client";
import React from "react";
import LearnModePlayer from "./LearnModePlayer";

export default function ClientLearnPlayer({ choreo }: { choreo: any }) {
  return (
    <div>
      <LearnModePlayer choreo={choreo} mode="stepwise" />
    </div>
  );
}
