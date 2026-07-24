// =============================================
// ClasesYa - API: Moderar un profesor (solo ADMIN)
// PATCH /api/admin/profesores/[id] → aprobar/revocar verificación o (des)activar
// Body: { verificado?: boolean, activo?: boolean }
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioActual } from "@/lib/auth";
import { puedeModerar } from "@/lib/dominio/permisos";
import { notificar } from "@/lib/notificaciones";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!puedeModerar(payload.rol)) {
      return NextResponse.json({ error: "Sin permisos de moderación" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { verificado, activo } = body;

    if (typeof verificado !== "boolean" && typeof activo !== "boolean") {
      return NextResponse.json(
        { error: "Nada que actualizar. Envía 'verificado' o 'activo' (boolean)." },
        { status: 400 }
      );
    }

    const profesor = await prisma.usuario.findFirst({
      where: { id, rol: "PROFESOR" },
      select: { id: true },
    });
    if (!profesor) {
      return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 });
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(typeof verificado === "boolean"
          ? { verificado, verificadoAt: verificado ? new Date() : null }
          : {}),
        ...(typeof activo === "boolean" ? { activo } : {}),
      },
      select: { id: true, nombre: true, verificado: true, verificadoAt: true, activo: true },
    });

    // Notificar al profesor cuando queda verificado.
    if (verificado === true) {
      await notificar({
        usuarioId: id,
        tipo: "PERFIL_VERIFICADO",
        mensaje: "¡Tu perfil ha sido verificado! Ahora muestras la insignia de profesor verificado.",
        enlace: "/profesores/dashboard",
      });
    }

    return NextResponse.json({ mensaje: "Profesor actualizado", profesor: actualizado });
  } catch (error) {
    console.error("Error moderando profesor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
