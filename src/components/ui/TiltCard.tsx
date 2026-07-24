// =============================================
// ClasesYa - Componente: TiltCard
// Tarjeta con efecto 3D de inclinación que sigue al cursor (perspectiva).
// =============================================

"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";

export default function TiltCard({
  children,
  className = "",
  intensidad = 10,
}: {
  children: ReactNode;
  className?: string;
  intensidad?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensidad, -intensidad]), {
    stiffness: 200,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensidad, intensidad]), {
    stiffness: 200,
    damping: 18,
  });

  const alMover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const alSalir = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={alMover}
      onMouseLeave={alSalir}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", transformPerspective: 900 }}
      whileHover={{ scale: 1.02 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
