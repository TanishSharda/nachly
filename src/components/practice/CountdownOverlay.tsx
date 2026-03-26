"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CountdownOverlayProps {
  count: number;
  visible: boolean;
}

export default function CountdownOverlay({ count, visible }: CountdownOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-dark flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={count}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center"
            >
              <span className="font-display text-[120px] font-bold text-gold-400 drop-shadow-[0_0_40px_rgba(197,165,114,0.4)]">
                {count === 0 ? "GO!" : count}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Subtle pulsing ring */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.1, 0.2],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute w-60 h-60 rounded-full border-2 border-gold-400/30"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
