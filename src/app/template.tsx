// =============================================
// ClasesYa - Template raíz: transición suave entre páginas
// template.tsx se re-monta en cada navegación, ideal para animar la entrada.
// =============================================

"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
