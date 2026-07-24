// =============================================
// ClasesYa - Página: Detalle de Clase/Servicio
// =============================================

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import ReservaForm from "@/components/reservas/ReservaForm";
import Modal from "@/components/ui/Modal";

interface Resena {
  calificacion: number;
  comentario: string | null;
  createdAt: string;
}

interface ReservaConResena {
  resena: Resena | null;
  estudiante: { nombre: string };
}

interface ServicioDetalle {
  id: string;
  materia: string;
  descripcion: string | null;
  precioHora: number;
  modalidad: string;
  nivel: string;
  duracionMin: number;
  profesor: {
    id: string;
    nombre: string;
    foto: string | null;
    bio: string | null;
    ubicacion: string | null;
  };
  reservas: ReservaConResena[];
  calificacionPromedio: number | null;
  totalResenas: number;
}

interface Usuario {
  id: string;
  rol: string;
}

export default function ClaseDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [servicio, setServicio] = useState<ServicioDetalle | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarReserva, setMostrarReserva] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [servicioRes, meRes] = await Promise.all([
          fetch(`/api/clases/${id}`),
          fetch("/api/auth/me"),
        ]);

        if (!servicioRes.ok) {
          const data = await servicioRes.json();
          setError(data.error || "Servicio no encontrado");
          return;
        }

        const servicioData = await servicioRes.json();
        setServicio(servicioData.servicio);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUsuario(meData.usuario);
        }
      } catch {
        setError("Error al cargar el servicio");
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, [id]);

  const handleReservar = async (datos: { servicioId: string; fecha: string; horaInicio: string; horaFin: string; notas?: string }) => {
    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      setMostrarReserva(false);
      toast.success("¡Reserva creada! Te llevamos a tu panel.");
      router.push("/estudiantes/dashboard");
    } else {
      const data = await res.json();
      toast.error(data.error || "Error al crear la reserva");
    }
  };

  if (cargando) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !servicio) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Clase no encontrada</h1>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/clases">
          <Button>Volver a clases</Button>
        </Link>
      </div>
    );
  }

  const MODALIDAD_LABELS: Record<string, string> = {
    PRESENCIAL: "Presencial",
    VIRTUAL: "Virtual",
    AMBOS: "Presencial y Virtual",
  };

  const NIVEL_LABELS: Record<string, string> = {
    PRIMARIA: "Primaria",
    SECUNDARIA: "Secundaria",
    BACHILLERATO: "Bachillerato",
    UNIVERSIDAD: "Universidad",
    ADULTOS: "Adultos",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info del servicio */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{servicio.materia}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {MODALIDAD_LABELS[servicio.modalidad] || servicio.modalidad}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {NIVEL_LABELS[servicio.nivel] || servicio.nivel}
                  </span>
                  <span className="text-sm text-gray-500">{servicio.duracionMin} min</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">€{servicio.precioHora}</p>
                <p className="text-sm text-gray-500">por hora</p>
              </div>
            </div>

            {servicio.descripcion && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h2 className="font-medium text-gray-900 mb-2">Descripción</h2>
                <p className="text-gray-600">{servicio.descripcion}</p>
              </div>
            )}

            {servicio.calificacionPromedio && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <StarRating valor={servicio.calificacionPromedio} soloLectura tamano="sm" />
                <span className="text-sm text-gray-600">
                  {servicio.calificacionPromedio.toFixed(1)} ({servicio.totalResenas} reseña{servicio.totalResenas !== 1 ? "s" : ""})
                </span>
              </div>
            )}
          </div>

          {/* Profesor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Profesor</h2>
            <Link href={`/profesores/${servicio.profesor.id}`} className="flex items-center gap-4 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
              {servicio.profesor.foto ? (
                <img
                  src={servicio.profesor.foto}
                  alt={servicio.profesor.nombre}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                  {servicio.profesor.nombre.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{servicio.profesor.nombre}</p>
                {servicio.profesor.ubicacion && (
                  <p className="text-sm text-gray-500">📍 {servicio.profesor.ubicacion}</p>
                )}
              </div>
            </Link>
            {servicio.profesor.bio && (
              <p className="text-sm text-gray-600 mt-3">{servicio.profesor.bio}</p>
            )}
          </div>

          {/* Reseñas */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-3">
              Reseñas ({servicio.totalResenas})
            </h2>
            {servicio.reservas.filter(r => r.resena).length > 0 ? (
              <div className="space-y-4">
                {servicio.reservas
                  .filter((r) => r.resena)
                  .map((r, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {r.estudiante.nombre}
                      </span>
                      <StarRating valor={r.resena!.calificacion} soloLectura tamano="sm" />
                    </div>
                    {r.resena!.comentario && (
                      <p className="text-sm text-gray-600">{r.resena!.comentario}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.resena!.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aún no hay reseñas para esta clase.</p>
            )}
          </div>
        </div>

        {/* Sidebar - Reservar */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-2">Reservar esta clase</h3>
            <p className="text-sm text-gray-600 mb-4">
              Duración: {servicio.duracionMin} minutos · €{servicio.precioHora}/hora
            </p>

            {!usuario ? (
              <div>
                <p className="text-sm text-gray-500 mb-3">Inicia sesión para reservar.</p>
                <Link href="/login">
                  <Button className="w-full">Iniciar sesión</Button>
                </Link>
              </div>
            ) : usuario.rol === "ESTUDIANTE" ? (
              <Button className="w-full" onClick={() => setMostrarReserva(true)}>
                Reservar clase
              </Button>
            ) : (
              <p className="text-sm text-gray-500">
                Solo los estudiantes pueden reservar clases.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de reserva */}
      <Modal
        abierto={mostrarReserva}
        onCerrar={() => setMostrarReserva(false)}
        titulo={`Reservar: ${servicio.materia}`}
      >
        <ReservaForm
          servicioId={id}
          duracionMin={servicio.duracionMin}
          profesorId={servicio.profesor.id}
          onSubmit={handleReservar}
        />
      </Modal>
    </div>
  );
}
