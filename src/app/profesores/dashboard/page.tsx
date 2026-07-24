// =============================================
// ClasesYa - Página: Dashboard Profesor
// =============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import ProfesorForm from "@/components/profesores/ProfesorForm";
import ReservaCard from "@/components/reservas/ReservaCard";
import Modal from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface Servicio {
  id: string;
  materia: string;
  descripcion: string | null;
  precioHora: number;
  modalidad: string;
  nivel: string;
  duracionMin: number;
  activo: boolean;
}

interface Reserva {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  notas: string | null;
  servicio: { materia: string; precioHora: number; modalidad: string; profesor: { nombre: string } };
  estudiante: { nombre: string };
  resena: { calificacion: number } | null;
}

interface Disponibilidad {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  foto: string | null;
  telefono: string | null;
  bio: string | null;
  ubicacion: string | null;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function ProfesorDashboardPage() {
  const router = useRouter();
  const confirmar = useConfirm();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"servicios" | "reservas" | "disponibilidad" | "perfil">("servicios");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);
  // Disponibilidad form state
  const [nuevoDia, setNuevoDia] = useState(0);
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState("09:00");
  const [nuevaHoraFin, setNuevaHoraFin] = useState("10:00");
  const [dispError, setDispError] = useState("");
  // Perfil form state
  const [perfilForm, setPerfilForm] = useState({ nombre: "", telefono: "", bio: "", ubicacion: "", foto: "" });
  const [perfilGuardando, setPerfilGuardando] = useState(false);
  const [perfilMensaje, setPerfilMensaje] = useState("");

  const fetchDatos = useCallback(async () => {
    try {
      // Verificar auth
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      if (meData.usuario.rol !== "PROFESOR") {
        router.push("/");
        return;
      }
      setUsuario(meData.usuario);

      // Cargar servicios, reservas, disponibilidad y perfil en paralelo
      const [serviciosRes, reservasRes, dispRes, perfilRes] = await Promise.all([
        fetch(`/api/clases?profesorId=${meData.usuario.id}&propios=true`),
        fetch("/api/reservas"),
        fetch("/api/disponibilidad"),
        fetch("/api/perfil"),
      ]);

      if (serviciosRes.ok) {
        const serviciosData = await serviciosRes.json();
        setServicios(serviciosData.servicios || []);
      }

      if (reservasRes.ok) {
        const reservasData = await reservasRes.json();
        setReservas(reservasData.reservas || []);
      }

      if (dispRes.ok) {
        const dispData = await dispRes.json();
        setDisponibilidades(dispData.disponibilidad || []);
      }

      if (perfilRes.ok) {
        const perfilData = await perfilRes.json();
        setPerfil(perfilData.usuario);
        setPerfilForm({
          nombre: perfilData.usuario.nombre || "",
          telefono: perfilData.usuario.telefono || "",
          bio: perfilData.usuario.bio || "",
          ubicacion: perfilData.usuario.ubicacion || "",
          foto: perfilData.usuario.foto || "",
        });
      }
    } catch {
      router.push("/login");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  const handleCrearServicio = async (datos: { materia: string; descripcion: string; precioHora: number; modalidad: string; nivel: string; duracionMin: number }) => {
    const res = await fetch("/api/clases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      setMostrarFormulario(false);
      fetchDatos();
    }
  };

  const handleEditarServicio = async (datos: { materia: string; descripcion: string; precioHora: number; modalidad: string; nivel: string; duracionMin: number }) => {
    if (!servicioEditando) return;

    const res = await fetch(`/api/clases/${servicioEditando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      setServicioEditando(null);
      fetchDatos();
    }
  };

  const handleEliminarServicio = async (id: string) => {
    const ok = await confirmar({
      titulo: "Eliminar servicio",
      mensaje: "¿Seguro que quieres eliminar este servicio? Dejará de aparecer en el catálogo.",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/clases/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Servicio eliminado");
      fetchDatos();
    } else {
      toast.error("No se pudo eliminar el servicio");
    }
  };

  const handleCambiarEstadoReserva = async (id: string, estado: string) => {
    const res = await fetch(`/api/reservas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) fetchDatos();
  };

  const handleCrearDisponibilidad = async () => {
    setDispError("");
    if (nuevaHoraFin <= nuevaHoraInicio) {
      setDispError("La hora de fin debe ser posterior a la de inicio");
      return;
    }
    const res = await fetch("/api/disponibilidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diaSemana: nuevoDia, horaInicio: nuevaHoraInicio, horaFin: nuevaHoraFin }),
    });
    if (res.ok) {
      fetchDatos();
      setNuevoDia(0);
      setNuevaHoraInicio("09:00");
      setNuevaHoraFin("10:00");
    } else {
      const data = await res.json();
      setDispError(data.error || "Error al crear disponibilidad");
    }
  };

  const handleEliminarDisponibilidad = async (id: string) => {
    const res = await fetch(`/api/disponibilidad?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchDatos();
  };

  const handleGuardarPerfil = async () => {
    setPerfilGuardando(true);
    setPerfilMensaje("");
    const res = await fetch("/api/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: perfilForm.nombre || undefined,
        telefono: perfilForm.telefono || null,
        bio: perfilForm.bio || null,
        ubicacion: perfilForm.ubicacion || null,
        foto: perfilForm.foto || null,
      }),
    });
    if (res.ok) {
      setPerfilMensaje("Perfil actualizado correctamente");
      fetchDatos();
    } else {
      const data = await res.json();
      setPerfilMensaje(data.error || "Error al actualizar");
    }
    setPerfilGuardando(false);
  };

  if (cargando) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const reservasPendientes = reservas.filter(r => r.estado === "PENDIENTE").length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Hola, {usuario?.nombre} 👋
        </h1>
        <p className="mt-1 text-gray-600">Panel de profesor</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Servicios activos</p>
          <p className="text-2xl font-bold text-gray-900">
            {servicios.filter(s => s.activo).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Reservas pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{reservasPendientes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total reservas</p>
          <p className="text-2xl font-bold text-gray-900">{reservas.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("servicios")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "servicios" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mis servicios
        </button>
        <button
          onClick={() => setTab("reservas")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "reservas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Reservas {reservasPendientes > 0 && (
            <span className="ml-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
              {reservasPendientes}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("disponibilidad")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "disponibilidad" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Horarios
        </button>
        <button
          onClick={() => setTab("perfil")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "perfil" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mi perfil
        </button>
      </div>

      {/* Tab content */}
      {tab === "servicios" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mis servicios</h2>
            <Button onClick={() => setMostrarFormulario(true)}>+ Nuevo servicio</Button>
          </div>

          {servicios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 mb-4">Aún no tienes servicios publicados.</p>
              <Button onClick={() => setMostrarFormulario(true)}>Publicar mi primer servicio</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {servicios.map((servicio) => (
                <div
                  key={servicio.id}
                  className={`bg-white rounded-lg border border-gray-200 p-4 ${
                    !servicio.activo ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{servicio.materia}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {servicio.modalidad} · {servicio.nivel} · {servicio.duracionMin} min
                      </p>
                      {servicio.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">{servicio.descripcion}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">€{servicio.precioHora}/h</p>
                      {!servicio.activo && (
                        <span className="text-xs text-red-500">Inactivo</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      tamano="sm"
                      variante="ghost"
                      onClick={() => setServicioEditando(servicio)}
                    >
                      Editar
                    </Button>
                    <Button
                      tamano="sm"
                      variante="danger"
                      onClick={() => handleEliminarServicio(servicio.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal crear servicio */}
          <Modal
            abierto={mostrarFormulario}
            onCerrar={() => setMostrarFormulario(false)}
            titulo="Nuevo servicio"
          >
            <ProfesorForm onSubmit={handleCrearServicio} />
          </Modal>

          {/* Modal editar servicio */}
          <Modal
            abierto={!!servicioEditando}
            onCerrar={() => setServicioEditando(null)}
            titulo="Editar servicio"
          >
            {servicioEditando && (
              <ProfesorForm
                onSubmit={handleEditarServicio}
                datosIniciales={{ ...servicioEditando, descripcion: servicioEditando.descripcion || "" }}
              />
            )}
          </Modal>
        </div>
      )}

      {tab === "reservas" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservas recibidas</h2>
          {reservas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Aún no tienes reservas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((reserva) => (
                <ReservaCard
                  key={reserva.id}
                  id={reserva.id}
                  fecha={reserva.fecha}
                  horaInicio={reserva.horaInicio}
                  horaFin={reserva.horaFin}
                  estado={reserva.estado}
                  notas={reserva.notas}
                  materia={reserva.servicio.materia}
                  profesorNombre={reserva.servicio.profesor?.nombre || ""}
                  estudianteNombre={reserva.estudiante.nombre}
                  precioHora={reserva.servicio.precioHora}
                  modalidad={reserva.servicio.modalidad}
                  tieneResena={!!reserva.resena}
                  rolUsuario="PROFESOR"
                  onCambiarEstado={handleCambiarEstadoReserva}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "disponibilidad" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestionar horarios</h2>

          {/* Formulario para agregar disponibilidad */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar bloque horario</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Día</label>
                <select
                  value={nuevoDia}
                  onChange={(e) => setNuevoDia(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {DIAS_SEMANA.map((dia, i) => (
                    <option key={i} value={i}>{dia}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hora inicio</label>
                <input
                  type="time"
                  value={nuevaHoraInicio}
                  onChange={(e) => setNuevaHoraInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hora fin</label>
                <input
                  type="time"
                  value={nuevaHoraFin}
                  onChange={(e) => setNuevaHoraFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCrearDisponibilidad} className="w-full">Agregar</Button>
              </div>
            </div>
            {dispError && <p className="text-red-500 text-sm mt-2">{dispError}</p>}
          </div>

          {/* Lista de disponibilidades agrupadas por día */}
          {disponibilidades.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">No tienes horarios configurados. Los estudiantes no podrán reservar contigo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DIAS_SEMANA.map((dia, i) => {
                const bloques = disponibilidades.filter(d => d.diaSemana === i);
                if (bloques.length === 0) return null;
                return (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{dia}</h3>
                    <div className="flex flex-wrap gap-2">
                      {bloques.map((bloque) => (
                        <div key={bloque.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                          <span>{bloque.horaInicio} - {bloque.horaFin}</span>
                          <button
                            onClick={() => handleEliminarDisponibilidad(bloque.id)}
                            className="text-blue-400 hover:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "perfil" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Editar perfil</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={perfilForm.nombre}
                  onChange={(e) => setPerfilForm({ ...perfilForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={perfil?.email || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={perfilForm.telefono}
                  onChange={(e) => setPerfilForm({ ...perfilForm, telefono: e.target.value })}
                  placeholder="Ej: +34 612 345 678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={perfilForm.ubicacion}
                  onChange={(e) => setPerfilForm({ ...perfilForm, ubicacion: e.target.value })}
                  placeholder="Ej: Madrid, España"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de foto</label>
                <input
                  type="url"
                  value={perfilForm.foto}
                  onChange={(e) => setPerfilForm({ ...perfilForm, foto: e.target.value })}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                <textarea
                  value={perfilForm.bio}
                  onChange={(e) => setPerfilForm({ ...perfilForm, bio: e.target.value })}
                  placeholder="Cuéntanos sobre ti, tu experiencia y metodología..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleGuardarPerfil} cargando={perfilGuardando}>
                  Guardar cambios
                </Button>
                {perfilMensaje && (
                  <p className={`text-sm ${perfilMensaje.includes("Error") ? "text-red-500" : "text-green-600"}`}>
                    {perfilMensaje}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
