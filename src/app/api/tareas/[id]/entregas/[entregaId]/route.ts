// =============================================
// ClasesYa - API: Calificar una entrega (profesor dueño)
// PATCH /api/tareas/[id]/entregas/[entregaId]
// Body: { calificacion: number(0..100), retroalimentacion?: string }
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioActual } from "@/lib/auth";
import { calificacionSchema } from "@/lib/validations";
import { notificar } from "@/lib/notificaciones";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; entregaId: string } }
) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id, entregaId } = params;

    const entrega = await prisma.entrega.findFirst({
      where: { id: entregaId, tareaId: id },
      select: {
        id: true,
        estudianteId: true,
        tarea: { select: { titulo: true, curso: { select: { profesorId: true } } } },
      },
    });
    if (!entrega) {
      return NextResponse.json({ error: "Entrega no encontrada" }, { status: 404 });
    }
    if (entrega.tarea.curso.profesorId !== payload.userId) {
      return NextResponse.json({ error: "Solo el profesor del curso puede calificar" }, { status: 403 });
    }

    const body = await request.json();
    const resultado = calificacionSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { calificacion, retroalimentacion } = resultado.data;
    const actualizada = await prisma.entrega.update({
      where: { id: entregaId },
      data: { calificacion, retroalimentacion: retroalimentacion ?? null },
      select: { id: true, calificacion: true, retroalimentacion: true },
    });

    // Notificar al estudiante que su entrega fue calificada
    await notificar({
      usuarioId: entrega.estudianteId,
      tipo: "ENTREGA_CALIFICADA",
      mensaje: `Tu entrega de "${entrega.tarea.titulo}" fue calificada: ${calificacion}/100`,
      enlace: `/cursos`,
    });

    return NextResponse.json({ mensaje: "Entrega calificada", entrega: actualizada });
  } catch (error) {
    console.error("Error calificando entrega:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
