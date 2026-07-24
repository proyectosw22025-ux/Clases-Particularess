// =============================================
// ClasesYa - Componente: Campana de notificaciones
// Muestra las notificaciones del usuario con un contador de no leídas que se
// actualiza en tiempo real (SSE, evento "notificacion:nueva").
// =============================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  createdAt: string;
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(fecha).toLocaleDateString("es-ES");
}

export default function CampanaNotificaciones() {
  const router = useRouter();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/notificaciones", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setNotificaciones(data.notificaciones ?? []);
      setNoLeidas(data.totalNoLeidas ?? 0);
    }
  }, []);

  // Carga inicial y al navegar
  useEffect(() => {
    cargar();
  }, [cargar, pathname]);

  // Tiempo real: nueva notificación → al principio de la lista y sube el contador
  useEffect(() => {
    const es = new EventSource("/api/mensajes/stream");
    es.addEventListener("notificacion:nueva", (e) => {
      const nueva = JSON.parse((e as MessageEvent).data) as Notificacion;
      setNotificaciones((prev) => [nueva, ...prev].slice(0, 50));
      setNoLeidas((n) => n + 1);
    });
    return () => es.close();
  }, []);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  const alternar = async () => {
    const nuevoEstado = !abierto;
    setAbierto(nuevoEstado);
    // Al abrir, marcar todas como leídas
    if (nuevoEstado && noLeidas > 0) {
      setNoLeidas(0);
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    }
  };

  const abrirNotificacion = (n: Notificacion) => {
    setAbierto(false);
    if (n.enlace) router.push(n.enlace);
  };

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={alternar}
        className="relative text-gray-600 hover:text-gray-900 transition-colors p-1"
        aria-label="Notificaciones"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">No tienes notificaciones.</p>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrirNotificacion(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex gap-2 ${
                    n.leida ? "" : "bg-blue-50/50"
                  }`}
                >
                  {!n.leida && <span className="w-2 h-2 mt-1.5 bg-blue-600 rounded-full flex-shrink-0" />}
                  <div className={`min-w-0 ${n.leida ? "pl-4" : ""}`}>
                    <p className="text-sm text-gray-800">{n.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tiempoRelativo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
