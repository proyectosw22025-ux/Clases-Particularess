// =============================================
// ClasesYa - API: Reservas
// GET  /api/reservas → listar reservas del usuario autenticado
// POST /api/reservas → crear una nueva reserva (solo estudiantes)
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioActual } from "@/lib/auth";
import { reservaSchema } from "@/lib/validations";
import { esDiaPasado, jsDayADiaSemana, filtroSolapamientoPrisma } from "@/lib/dominio";
import { notificar } from "@/lib/notificaciones";

// Error interno para abortar la transacción cuando un horario ya está ocupado.
class ConflictoReserva extends Error {}

// Listar reservas del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1"));
    const porPagina = Math.min(50, Math.max(1, parseInt(searchParams.get("porPagina") || "10")));

    // Si es estudiante: ver sus reservas
    // Si es profesor: ver reservas de sus servicios
    const where =
      payload.rol === "ESTUDIANTE"
        ? { estudianteId: payload.userId }
        : { servicio: { profesorId: payload.userId } };

    const [reservas, total] = await Promise.all([
      prisma.reserva.findMany({
        where,
        select: {
          id: true,
          fecha: true,
          horaInicio: true,
          horaFin: true,
          estado: true,
          notas: true,
          createdAt: true,
          servicio: {
            select: {
              id: true,
              materia: true,
              precioHora: true,
              modalidad: true,
              profesor: {
                select: { id: true, nombre: true, foto: true },
              },
            },
          },
          estudiante: {
            select: { id: true, nombre: true, foto: true },
          },
          resena: {
            select: { calificacion: true },
          },
        },
        orderBy: { fecha: "desc" },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.reserva.count({ where }),
    ]);

    return NextResponse.json({
      reservas,
      paginacion: {
        pagina,
        porPagina,
        total,
        totalPaginas: Math.ceil(total / porPagina),
      },
    });
  } catch (error) {
    console.error("Error listando reservas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Crear una nueva reserva (solo estudiantes)
export async function POST(request: NextRequest) {
  try {
    const payload = await obtenerUsuarioActual();
    if (!payload) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (payload.rol !== "ESTUDIANTE") {
      return NextResponse.json(
        { error: "Solo los estudiantes pueden crear reservas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const resultado = reservaSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { servicioId, fecha, horaInicio, horaFin, notas } = resultado.data;

    // Parsear fecha explícitamente como YYYY-MM-DD. Se construye a mediodía UTC
    // para que el día calendario sea estable independientemente de la zona
    // horaria del servidor (ver nota sobre la variable TZ en el README).
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const fechaReserva = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));

    // Verificar que la fecha no sea en el pasado
    if (esDiaPasado(fechaReserva)) {
      return NextResponse.json(
        { error: "No se pueden crear reservas en fechas pasadas" },
        { status: 400 }
      );
    }

    // Verificar que el servicio existe y está activo
    const servicio = await prisma.servicio.findFirst({
      where: { id: servicioId, activo: true },
      select: { id: true, profesorId: true },
    });

    if (!servicio) {
      return NextResponse.json(
        { error: "Servicio no encontrado o no disponible" },
        { status: 404 }
      );
    }

    // Evitar que un profesor se reserve a sí mismo
    if (servicio.profesorId === payload.userId) {
      return NextResponse.json(
        { error: "No puedes reservar tu propio servicio" },
        { status: 400 }
      );
    }

    // Verificar disponibilidad del profesor en el día/hora solicitados
    const diaSemana = jsDayADiaSemana(fechaReserva.getUTCDay()); // Schema: 0=Lun
    const disponibilidad = await prisma.disponibilidad.findFirst({
      where: {
        profesorId: servicio.profesorId,
        diaSemana,
        horaInicio: { lte: horaInicio },
        horaFin: { gte: horaFin },
      },
    });

    if (!disponibilidad) {
      return NextResponse.json(
        { error: "El profesor no tiene disponibilidad en ese día y horario" },
        { status: 400 }
      );
    }

    // Las verificaciones de solapamiento y la creación se ejecutan dentro de una
    // transacción Serializable: si dos estudiantes intentan reservar el mismo
    // hueco a la vez, PostgreSQL aborta una de las transacciones (error P2034) y
    // respondemos 409 en lugar de crear una doble reserva (condición de carrera).
    let reserva;
    try {
      reserva = await prisma.$transaction(
        async (tx) => {
          // El estudiante no puede tener otra reserva que se solape
          const reservaEstudiante = await tx.reserva.findFirst({
            where: {
              estudianteId: payload.userId,
              fecha: fechaReserva,
              estado: { in: ["PENDIENTE", "CONFIRMADA"] },
              ...filtroSolapamientoPrisma(horaInicio, horaFin),
            },
          });
          if (reservaEstudiante) {
            throw new ConflictoReserva("Ya tienes otra reserva en ese horario");
          }

          // El profesor no puede tener otra reserva que se solape
          const reservaProfesor = await tx.reserva.findFirst({
            where: {
              servicio: { profesorId: servicio.profesorId },
              fecha: fechaReserva,
              estado: { in: ["PENDIENTE", "CONFIRMADA"] },
              ...filtroSolapamientoPrisma(horaInicio, horaFin),
            },
          });
          if (reservaProfesor) {
            throw new ConflictoReserva("El profesor ya tiene una reserva en ese horario");
          }

          return tx.reserva.create({
            data: {
              servicioId,
              estudianteId: payload.userId,
              fecha: fechaReserva,
              horaInicio,
              horaFin,
              notas,
            },
            include: {
              servicio: {
                select: { materia: true, profesor: { select: { id: true, nombre: true } } },
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof ConflictoReserva) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      // Conflicto de serialización: dos reservas concurrentes sobre el mismo hueco
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        return NextResponse.json(
          { error: "Ese horario acaba de ser reservado. Intenta con otro." },
          { status: 409 }
        );
      }
      throw error;
    }

    // Notificar al profesor de la nueva reserva
    await notificar({
      usuarioId: reserva.servicio.profesor.id,
      tipo: "RESERVA_NUEVA",
      mensaje: `Nueva reserva de ${payload.nombre} para ${reserva.servicio.materia}`,
      enlace: `/profesores/dashboard`,
    });

    return NextResponse.json(
      { mensaje: "Reserva creada exitosamente", reserva },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando reserva:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
