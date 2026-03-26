"use client";

import { cn } from "@/lib/utils/cn";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, defaultTab, onChange, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);

  function handleClick(id: string) {
    setActive(id);
    onChange?.(id);
  }

  return (
    <div className={cn("flex gap-1 p-1 bg-dark-50 rounded-xl", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab.id)}
          className={cn(
            "flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
            active === tab.id
              ? "bg-white text-dark shadow-sm"
              : "text-dark-400 hover:text-dark-600"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
