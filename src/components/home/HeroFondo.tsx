// =============================================
// ClasesYa - Fondo animado del hero (blobs en movimiento)
// =============================================

"use client";

import { motion } from "framer-motion";

export default function HeroFondo() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Rejilla sutil */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* Blobs difuminados en movimiento lento */}
      <motion.div
        className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-sky-400/30 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-32 right-0 w-80 h-80 rounded-full bg-indigo-400/30 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-16 left-1/3 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, -24, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
