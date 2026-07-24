// =============================================
// ClasesYa - Página: Panel de administración
// Pestaña "Profesores": moderación (ADMIN y MODERADOR).
// Pestaña "Usuarios": gestión de roles y estado (solo ADMIN).
// =============================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import BadgeVerificado from "@/components/ui/BadgeVerificado";
import Cargando from "@/components/ui/Cargando";
import { puedeModerar, puedeAdministrarUsuarios, ROLES_ASIGNABLES, type Rol } from "@/lib/dominio/permisos";

interface ProfesorAdmin {
  id: string;
  nombre: string;
  email: string;
  ubicacion: string | null;
  activo: boolean;
  verificado: boolean;
  createdAt: string;
  _count: { servicios: number };
}

interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}

type FiltroProf = "todos" | "pendientes" | "verificados";

const ETIQUETA_ROL: Record<Rol, string> = {
  ESTUDIANTE: "Estudiante",
  PROFESOR: "Profesor",
  MODERADOR: "Moderador",
  ADMIN: "Administrador",
};

export default function AdminPage() {
  const router = useRouter();
  const [miId, setMiId] = useState<string | null>(null);
  const [miRol, setMiRol] = useState<Rol | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<"profesores" | "usuarios">("profesores");

  // Estado de la pestaña Profesores
  const [profesores, setProfesores] = useState<ProfesorAdmin[]>([]);
  const [filtroProf, setFiltroProf] = useState<FiltroProf>("pendientes");

  // Estado de la pestaña Usuarios
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [procesando, setProcesando] = useState<string | null>(null);

  const cargarProfesores = useCallback(async (f: FiltroProf) => {
    const q = f === "todos" ? "" : `?estado=${f}`;
    const res = await fetch(`/api/admin/profesores${q}`, { cache: "no-store" });
    if (res.ok) setProfesores((await res.json()).profesores ?? []);
  }, []);

  const cargarUsuarios = useCallback(async (q: string) => {
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await fetch(`/api/admin/usuarios${params}`, { cache: "no-store" });
    if (res.ok) setUsuarios((await res.json()).usuarios ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const me = await meRes.json();
      if (!puedeModerar(me.usuario.rol)) {
        router.push("/");
        return;
      }
      setMiId(me.usuario.id);
      setMiRol(me.usuario.rol);
      await cargarProfesores("pendientes");
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarFiltroProf = async (f: FiltroProf) => {
    setFiltroProf(f);
    await cargarProfesores(f);
  };

  const moderarProfesor = async (id: string, cambios: { verificado?: boolean; activo?: boolean }) => {
    setProcesando(id);
    try {
      const res = await fetch(`/api/admin/profesores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (res.ok) await cargarProfesores(filtroProf);
    } finally {
      setProcesando(null);
    }
  };

  const actualizarUsuario = async (id: string, cambios: { rol?: Rol; activo?: boolean }) => {
    setProcesando(id);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "No se pudo actualizar el usuario");
      } else {
        toast.success("Usuario actualizado");
      }
      await cargarUsuarios(busqueda);
    } finally {
      setProcesando(null);
    }
  };

  if (cargando) {
    return <Cargando />;
  }

  const esAdmin = miRol ? puedeAdministrarUsuarios(miRol) : false;
  const filtrosProf: { clave: FiltroProf; etiqueta: string }[] = [
    { clave: "pendientes", etiqueta: "Pendientes" },
    { clave: "verificados", etiqueta: "Verificados" },
    { clave: "todos", etiqueta: "Todos" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
      <p className="text-gray-600 mt-1 mb-6">
        {esAdmin ? "Modera profesores y gestiona usuarios y roles." : "Modera y verifica a los profesores."}
      </p>

      {/* Pestañas principales */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setPestana("profesores")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            pestana === "profesores" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Profesores
        </button>
        {esAdmin && (
          <button
            onClick={() => {
              setPestana("usuarios");
              cargarUsuarios(busqueda);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              pestana === "usuarios" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Usuarios y roles
          </button>
        )}
      </div>

      {/* --- Pestaña Profesores --- */}
      {pestana === "profesores" && (
        <>
          <div className="flex gap-2 mb-6">
            {filtrosProf.map((f) => (
              <button
                key={f.clave}
                onClick={() => cambiarFiltroProf(f.clave)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filtroProf === f.clave ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>

          {profesores.length === 0 ? (
            <p className="text-gray-500">No hay profesores en esta categoría.</p>
          ) : (
            <div className="space-y-3">
              {profesores.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/profesores/${p.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {p.nombre}
                      </Link>
                      {p.verificado && <BadgeVerificado />}
                      {!p.activo && (
                        <span className="text-xs font-medium bg-red-50 text-red-600 rounded-full px-2 py-0.5">Desactivado</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{p.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {p._count.servicios} servicio{p._count.servicios !== 1 ? "s" : ""}
                      {p.ubicacion ? ` · ${p.ubicacion}` : ""} · Registrado el {new Date(p.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {p.verificado ? (
                      <Button variante="secondary" tamano="sm" cargando={procesando === p.id} onClick={() => moderarProfesor(p.id, { verificado: false })}>
                        Quitar verificación
                      </Button>
                    ) : (
                      <Button tamano="sm" cargando={procesando === p.id} onClick={() => moderarProfesor(p.id, { verificado: true })}>
                        Verificar
                      </Button>
                    )}
                    <Button variante={p.activo ? "danger" : "secondary"} tamano="sm" cargando={procesando === p.id} onClick={() => moderarProfesor(p.id, { activo: !p.activo })}>
                      {p.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- Pestaña Usuarios (solo ADMIN) --- */}
      {pestana === "usuarios" && esAdmin && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              cargarUsuarios(busqueda);
            }}
            className="flex gap-2 mb-6"
          >
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button type="submit" variante="secondary">Buscar</Button>
          </form>

          {usuarios.length === 0 ? (
            <p className="text-gray-500">Sin resultados. Pulsa &quot;Buscar&quot; para listar usuarios.</p>
          ) : (
            <div className="space-y-3">
              {usuarios.map((u) => {
                const esYo = u.id === miId;
                return (
                  <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{u.nombre}</span>
                        {esYo && <span className="text-xs text-blue-600">(tú)</span>}
                        {!u.activo && (
                          <span className="text-xs font-medium bg-red-50 text-red-600 rounded-full px-2 py-0.5">Desactivado</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="sr-only" htmlFor={`rol-${u.id}`}>Rol</label>
                      <select
                        id={`rol-${u.id}`}
                        value={u.rol}
                        disabled={esYo || procesando === u.id}
                        onChange={(e) => actualizarUsuario(u.id, { rol: e.target.value as Rol })}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        title={esYo ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                      >
                        {ROLES_ASIGNABLES.map((r) => (
                          <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                        ))}
                      </select>
                      <Button
                        variante={u.activo ? "danger" : "secondary"}
                        tamano="sm"
                        disabled={esYo}
                        cargando={procesando === u.id}
                        onClick={() => actualizarUsuario(u.id, { activo: !u.activo })}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
