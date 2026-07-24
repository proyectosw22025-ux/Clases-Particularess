// =============================================
// ClasesYa - Notificaciones
// Helper único para crear notificaciones: las persiste y las emite en tiempo
// real por el bus SSE (evento "notificacion:nueva") para la campana del navbar.
// =============================================

import type { TipoNotificacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { busRealtime } from "@/lib/realtime/bus";

export async function notificar(params: {
  usuarioId: string;
  tipo: TipoNotificacion;
  mensaje: string;
  enlace?: string | null;
}) {
  const notificacion = await prisma.notificacion.create({
    data: {
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      mensaje: params.mensaje,
      enlace: params.enlace ?? null,
    },
    select: { id: true, tipo: true, mensaje: true, enlace: true, leida: true, createdAt: true },
  });

  busRealtime.publicar(params.usuarioId, "notificacion:nueva", notificacion);
  return notificacion;
}
