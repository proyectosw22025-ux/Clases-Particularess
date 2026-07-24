// =============================================
// ClasesYa - Componente: Navbar
// =============================================

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import CampanaNotificaciones from "@/components/layout/CampanaNotificaciones";
import { puedeModerar } from "@/lib/dominio/permisos";

interface Usuario {
  id: string;
  nombre: string;
  rol: "PROFESOR" | "ESTUDIANTE" | "ADMIN" | "MODERADOR";
  foto?: string | null;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);

  // Revalidar la sesión en cada cambio de ruta. La barra vive en el layout raíz
  // y no se re-monta al navegar por el cliente (p. ej. tras iniciar sesión con
  // router.push), por lo que sin esto mostraría un estado de sesión obsoleto.
  useEffect(() => {
    let activo = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (activo) setUsuario(data?.usuario ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargandoAuth(false);
      });
    return () => {
      activo = false;
    };
  }, [pathname]);

  // Contador de mensajes no leídos (se recarga al navegar y tras leer).
  useEffect(() => {
    if (!usuario) {
      setNoLeidos(0);
      return;
    }
    let activo = true;
    fetch("/api/mensajes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (activo && data) setNoLeidos(data.totalNoLeidos ?? 0);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [usuario, pathname]);

  // Actualización en vivo del badge: al llegar un mensaje nuevo por SSE se
  // recalcula el total no leído desde el servidor (fuente de verdad).
  useEffect(() => {
    if (!usuario?.id) return;
    const es = new EventSource("/api/mensajes/stream");
    es.addEventListener("mensaje:nuevo", () => {
      fetch("/api/mensajes", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setNoLeidos(data.totalNoLeidos ?? 0);
        })
        .catch(() => {});
    });
    return () => es.close();
  }, [usuario?.id]);

  const cerrarSesion = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    setUsuario(null);
    setMenuAbierto(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">ClasesYa</span>
          </Link>

          {/* Links de navegación (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/clases"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Buscar clases
            </Link>
            <Link
              href="/profesores"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Profesores
            </Link>
            <Link
              href="/cursos"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cursos
            </Link>

            {usuario && (
              <Link
                href="/mensajes"
                className="relative text-gray-600 hover:text-gray-900 transition-colors"
              >
                Mensajes
                {noLeidos > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-600 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {noLeidos > 9 ? "9+" : noLeidos}
                  </span>
                )}
              </Link>
            )}

            {usuario && <CampanaNotificaciones />}

            {cargandoAuth ? (
              <div className="w-24 h-8" />
            ) : usuario ? (
              <div className="relative">
                <button
                  onClick={() => setMenuAbierto(!menuAbierto)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {usuario.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{usuario.nombre.split(" ")[0]}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {menuAbierto && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
                      <p className="text-xs text-gray-500 capitalize">{usuario.rol.toLowerCase()}</p>
                    </div>
                    <Link
                      href={usuario.rol === "PROFESOR" ? "/profesores/dashboard" : "/estudiantes/dashboard"}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuAbierto(false)}
                    >
                      Mi panel
                    </Link>
                    {puedeModerar(usuario.rol) && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuAbierto(false)}
                      >
                        Administración
                      </Link>
                    )}
                    <button
                      onClick={cerrarSesion}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variante="ghost" tamano="sm">Iniciar sesión</Button>
                </Link>
                <Link href="/registro">
                  <Button tamano="sm">Registrarse</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Botón menú móvil */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMenuMovil(!menuMovil)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuMovil ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Menú móvil */}
        {menuMovil && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-3">
              <Link href="/clases" className="text-gray-600 hover:text-gray-900 py-2" onClick={() => setMenuMovil(false)}>
                Buscar clases
              </Link>
              <Link href="/profesores" className="text-gray-600 hover:text-gray-900 py-2" onClick={() => setMenuMovil(false)}>
                Profesores
              </Link>
              <Link href="/cursos" className="text-gray-600 hover:text-gray-900 py-2" onClick={() => setMenuMovil(false)}>
                Cursos
              </Link>
              {cargandoAuth ? null : usuario ? (
                <>
                  <Link
                    href="/mensajes"
                    className="text-gray-600 hover:text-gray-900 py-2 flex items-center gap-2"
                    onClick={() => setMenuMovil(false)}
                  >
                    Mensajes
                    {noLeidos > 0 && (
                      <span className="bg-red-600 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                        {noLeidos > 9 ? "9+" : noLeidos}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={usuario.rol === "PROFESOR" ? "/profesores/dashboard" : "/estudiantes/dashboard"}
                    className="text-gray-600 hover:text-gray-900 py-2"
                    onClick={() => setMenuMovil(false)}
                  >
                    Mi panel
                  </Link>
                  {puedeModerar(usuario.rol) && (
                    <Link
                      href="/admin"
                      className="text-gray-600 hover:text-gray-900 py-2"
                      onClick={() => setMenuMovil(false)}
                    >
                      Administración
                    </Link>
                  )}
                  <button onClick={cerrarSesion} className="text-red-600 hover:text-red-700 py-2 text-left">
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link href="/login" onClick={() => setMenuMovil(false)}>
                    <Button variante="ghost" tamano="sm">Iniciar sesión</Button>
                  </Link>
                  <Link href="/registro" onClick={() => setMenuMovil(false)}>
                    <Button tamano="sm">Registrarse</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
