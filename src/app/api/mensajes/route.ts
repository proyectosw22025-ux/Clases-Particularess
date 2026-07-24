// =============================================
// ClasesYa - API: Mensajes
// GET  /api/mensajes → listar conversaciones o mensajes con un usuario
// POST /api/mensajes → enviar un mensaje
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioActual } from "@/lib/auth";
import { mensajeSchema } from "@/lib/validations";
import { busRealtime } from "@/lib/realtime/bus";
import { notificar } from "@/lib/notificaciones";

// Listar conversaciones o mensajes con un usuario específico
export async function GET(request: NextRequest) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conUsuarioId = searchParams.get("conUsuarioId");

    // Si se pide conversación con un usuario específico
    if (conUsuarioId) {
      const mensajes = await prisma.mensaje.findMany({
        where: {
          OR: [
            { emisorId: payload.userId, receptorId: conUsuarioId },
            { emisorId: conUsuarioId, receptorId: payload.userId },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          emisorId: true,
          contenido: true,
          leido: true,
          createdAt: true,
        },
      });

      // Marcar como leídos los mensajes recibidos
      const marcados = await prisma.mensaje.updateMany({
        where: {
          emisorId: conUsuarioId,
          receptorId: payload.userId,
          leido: false,
        },
        data: { leido: true },
      });

      // Avisar al emisor (en tiempo real) que sus mensajes fueron leídos.
      if (marcados.count > 0) {
        busRealtime.publicar(conUsuarioId, "mensaje:leido", { lectorId: payload.userId });
      }

      // Datos básicos del interlocutor (para el encabezado del chat, incluso si
      // la conversación aún no tiene mensajes).
      const interlocutor = await prisma.usuario.findUnique({
        where: { id: conUsuarioId },
        select: { id: true, nombre: true, foto: true },
      });

      return NextResponse.json({ mensajes, interlocutor });
    }

    // Si no, retornar lista de conversaciones (últimos mensajes agrupados)
    const mensajesRecientes = await prisma.mensaje.findMany({
      where: {
        OR: [
          { emisorId: payload.userId },
          { receptorId: payload.userId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        emisorId: true,
        receptorId: true,
        contenido: true,
        leido: true,
        createdAt: true,
        emisor: { select: { id: true, nombre: true, foto: true } },
        receptor: { select: { id: true, nombre: true, foto: true } },
      },
    });

    // Agrupar por conversación (último mensaje por cada interlocutor)
    const conversacionesMap = new Map<string, typeof mensajesRecientes[0]>();
    for (const msg of mensajesRecientes) {
      const otroId = msg.emisorId === payload.userId ? msg.receptorId : msg.emisorId;
      if (!conversacionesMap.has(otroId)) {
        conversacionesMap.set(otroId, msg);
      }
    }

    const conversaciones = Array.from(conversacionesMap.values()).map((msg) => {
      const esEmisor = msg.emisorId === payload.userId;
      const otro = esEmisor ? msg.receptor : msg.emisor;
      return {
        usuario: otro,
        ultimoMensaje: msg.contenido,
        fecha: msg.createdAt,
        leido: esEmisor ? true : msg.leido,
      };
    });

    // Contar mensajes no leídos total
    const totalNoLeidos = await prisma.mensaje.count({
      where: { receptorId: payload.userId, leido: false },
    });

    return NextResponse.json({ conversaciones, totalNoLeidos });
  } catch (error) {
    console.error("Error listando mensajes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Enviar un mensaje
export async function POST(request: NextRequest) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const resultado = mensajeSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { receptorId, contenido } = resultado.data;

    // No puedes enviarte mensajes a ti mismo
    if (receptorId === payload.userId) {
      return NextResponse.json(
        { error: "No puedes enviarte mensajes a ti mismo" },
        { status: 400 }
      );
    }

    // Verificar que el receptor existe y está activo
    const receptor = await prisma.usuario.findFirst({
      where: { id: receptorId, activo: true },
    });

    if (!receptor) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        emisorId: payload.userId,
        receptorId,
        contenido,
      },
      select: {
        id: true,
        emisorId: true,
        contenido: true,
        createdAt: true,
      },
    });

    // Crear notificación para el receptor
    await notificar({
      usuarioId: receptorId,
      tipo: "MENSAJE_NUEVO",
      mensaje: `Nuevo mensaje de ${payload.nombre || "un usuario"}`,
      enlace: `/mensajes?conUsuarioId=${payload.userId}`,
    });

    // Empujar el mensaje en tiempo real a la conexión SSE del receptor (si la hay).
    busRealtime.publicar(receptorId, "mensaje:nuevo", {
      id: mensaje.id,
      emisorId: mensaje.emisorId,
      contenido: mensaje.contenido,
      createdAt: mensaje.createdAt,
      emisor: { id: payload.userId, nombre: payload.nombre },
    });

    return NextResponse.json({ mensaje: "Mensaje enviado", datos: mensaje }, { status: 201 });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Marcar como leídos los mensajes recibidos de un usuario (sin recargar el hilo)
export async function PATCH(request: NextRequest) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { conUsuarioId } = await request.json();
    if (typeof conUsuarioId !== "string" || !conUsuarioId) {
      return NextResponse.json({ error: "conUsuarioId requerido" }, { status: 400 });
    }

    const marcados = await prisma.mensaje.updateMany({
      where: { emisorId: conUsuarioId, receptorId: payload.userId, leido: false },
      data: { leido: true },
    });

    if (marcados.count > 0) {
      busRealtime.publicar(conUsuarioId, "mensaje:leido", { lectorId: payload.userId });
    }

    return NextResponse.json({ marcados: marcados.count });
  } catch (error) {
    console.error("Error marcando mensajes como leídos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
