// =============================================
// ClasesYa - API: Reseñas
// POST /api/resenas → crear una reseña (solo estudiantes, solo reservas completadas)
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioActual } from "@/lib/auth";
import { resenaSchema } from "@/lib/validations";
import { notificar } from "@/lib/notificaciones";

// Crear una reseña
export async function POST(request: NextRequest) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (payload.rol !== "ESTUDIANTE") {
      return NextResponse.json(
        { error: "Solo los estudiantes pueden dejar reseñas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const resultado = resenaSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { reservaId, calificacion, comentario } = resultado.data;

    // Verificar que la reserva existe, está completada y pertenece al estudiante
    const reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
      select: {
        id: true,
        estudianteId: true,
        estado: true,
        resena: { select: { id: true } },
        servicio: { select: { materia: true, profesorId: true } },
      },
    });

    if (!reserva) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (reserva.estudianteId !== payload.userId) {
      return NextResponse.json(
        { error: "No tienes permiso para reseñar esta reserva" },
        { status: 403 }
      );
    }

    if (reserva.estado !== "COMPLETADA") {
      return NextResponse.json(
        { error: "Solo puedes reseñar reservas completadas" },
        { status: 400 }
      );
    }

    if (reserva.resena) {
      return NextResponse.json(
        { error: "Esta reserva ya tiene una reseña" },
        { status: 409 }
      );
    }

    const resena = await prisma.resena.create({
      data: {
        reservaId,
        calificacion,
        comentario,
      },
    });

    // Notificar al profesor de la nueva reseña
    await notificar({
      usuarioId: reserva.servicio.profesorId,
      tipo: "RESENA_NUEVA",
      mensaje: `Nueva reseña (${calificacion}★) en ${reserva.servicio.materia}`,
      enlace: `/profesores/dashboard`,
    });

    return NextResponse.json(
      { mensaje: "Reseña creada exitosamente", resena },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando reseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
