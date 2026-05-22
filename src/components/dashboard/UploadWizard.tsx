"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Step {
  label: string;
  shortLabel?: string;
}

interface UploadWizardProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  children: React.ReactNode;
  draftSaved?: boolean;
}

export default function UploadWizard({ steps, currentStep, onStepClick, children, draftSaved }: UploadWizardProps) {
  return (
    <div>
      {/* Progress bar */}
      <div className="mb-2 flex items-center gap-1.5">
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepClick?.(stepNum)}
              disabled={stepNum > currentStep}
              className={`relative h-1.5 flex-1 rounded-full transition-all duration-300 ${
                isComplete ? "bg-[#F3B2AB]" : isActive ? "bg-[#F3B2AB]/60" : "bg-white/15"
              } ${stepNum <= currentStep ? "cursor-pointer" : "cursor-not-allowed"}`}
            />
          );
        })}
      </div>

      {/* Step label */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Step {currentStep} of {steps.length}
          <span className="ml-2 text-zinc-500">— {steps[currentStep - 1]?.label}</span>
        </p>
        {draftSaved !== undefined && (
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${draftSaved ? "text-emerald-400" : "text-zinc-500"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${draftSaved ? "bg-emerald-400" : "bg-zinc-600 animate-pulse"}`} />
            {draftSaved ? "Draft saved" : "Saving..."}
          </span>
        )}
      </div>

      {/* Animated content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
