// =============================================
// ClasesYa - Página: Mensajes (chat en tiempo real vía SSE)
// =============================================

"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Cargando from "@/components/ui/Cargando";

interface UsuarioBasico {
  id: string;
  nombre: string;
  foto?: string | null;
}

interface Mensaje {
  id: string;
  emisorId: string;
  contenido: string;
  leido?: boolean;
  createdAt: string;
}

interface Conversacion {
  usuario: UsuarioBasico;
  ultimoMensaje: string;
  fecha: string;
  leido: boolean;
}

function horaCorta(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function MensajesContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conUsuarioId = searchParams.get("conUsuarioId");

  const [yoId, setYoId] = useState<string | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [activoId, setActivoId] = useState<string | null>(conUsuarioId);
  const [interlocutor, setInterlocutor] = useState<UsuarioBasico | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Ref para leer el interlocutor activo dentro de los handlers SSE (evita
  // closures obsoletas).
  const activoIdRef = useRef<string | null>(activoId);
  useEffect(() => {
    activoIdRef.current = activoId;
  }, [activoId]);

  const finRef = useRef<HTMLDivElement>(null);
  const scrollAlFinal = useCallback(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const cargarConversaciones = useCallback(async () => {
    const res = await fetch("/api/mensajes", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setConversaciones(data.conversaciones ?? []);
    }
  }, []);

  const abrirConversacion = useCallback(
    async (id: string) => {
      setActivoId(id);
      const res = await fetch(`/api/mensajes?conUsuarioId=${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMensajes(data.mensajes ?? []);
        setInterlocutor(data.interlocutor ?? null);
        // Al abrir se marcaron como leídos: refrescar la lista para el badge.
        cargarConversaciones();
      }
    },
    [cargarConversaciones]
  );

  // Carga inicial: auth + conversaciones + conversación de la query.
  useEffect(() => {
    let activo = true;
    (async () => {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      if (!activo) return;
      setYoId(meData.usuario.id);
      await cargarConversaciones();
      if (conUsuarioId) await abrirConversacion(conUsuarioId);
      if (activo) setCargando(false);
    })();
    return () => {
      activo = false;
    };
    // Solo en montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conexión SSE: escucha mensajes nuevos y confirmaciones de lectura.
  useEffect(() => {
    const es = new EventSource("/api/mensajes/stream");

    es.addEventListener("mensaje:nuevo", (e) => {
      const datos = JSON.parse((e as MessageEvent).data) as Mensaje & { emisor?: UsuarioBasico };
      // Refrescar la lista lateral (orden, último mensaje, no leídos).
      cargarConversaciones();
      // Si el mensaje pertenece a la conversación abierta, añadirlo y marcar leído.
      if (datos.emisorId === activoIdRef.current) {
        setMensajes((prev) =>
          prev.some((m) => m.id === datos.id) ? prev : [...prev, datos]
        );
        fetch("/api/mensajes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conUsuarioId: datos.emisorId }),
        }).catch(() => {});
      }
    });

    es.addEventListener("mensaje:leido", (e) => {
      const datos = JSON.parse((e as MessageEvent).data) as { lectorId: string };
      // El interlocutor abierto leyó mis mensajes: marcar mis burbujas como leídas.
      if (datos.lectorId === activoIdRef.current) {
        setMensajes((prev) => prev.map((m) => (m.emisorId === activoIdRef.current ? m : { ...m, leido: true })));
      }
    });

    return () => es.close();
  }, [cargarConversaciones]);

  useEffect(() => {
    scrollAlFinal();
  }, [mensajes, scrollAlFinal]);

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || !activoId) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptorId: activoId, contenido }),
      });
      if (res.ok) {
        const data = await res.json();
        setMensajes((prev) => [...prev, { ...data.datos, leido: false }]);
        setTexto("");
        cargarConversaciones();
      }
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <Cargando texto="Cargando mensajes…" />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 px-2">Mensajes</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4 h-[70vh] border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Lista de conversaciones */}
        <aside
          className={`md:col-span-1 border-r border-gray-200 overflow-y-auto ${
            activoId ? "hidden md:block" : "block"
          }`}
        >
          {conversaciones.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Aún no tienes conversaciones.</p>
          ) : (
            conversaciones.map((c) => (
              <button
                key={c.usuario.id}
                onClick={() => abrirConversacion(c.usuario.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 ${
                  activoId === c.usuario.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-semibold">
                  {c.usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{c.usuario.nombre}</span>
                    {!c.leido && <span className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{c.ultimoMensaje}</p>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Panel del chat */}
        <section className={`md:col-span-2 flex flex-col ${activoId ? "flex" : "hidden md:flex"}`}>
          {!activoId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecciona una conversación para empezar a chatear.
            </div>
          ) : (
            <>
              {/* Encabezado */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <button className="md:hidden text-gray-500" onClick={() => setActivoId(null)} aria-label="Volver">
                  ←
                </button>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  {(interlocutor?.nombre ?? "?").charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-gray-900">{interlocutor?.nombre ?? "Usuario"}</span>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                {mensajes.length === 0 && (
                  <p className="text-center text-sm text-gray-400 mt-8">
                    No hay mensajes todavía. ¡Escribe el primero!
                  </p>
                )}
                {mensajes.map((m) => {
                  const mio = m.emisorId === yoId;
                  return (
                    <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mio ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end ${mio ? "text-blue-100" : "text-gray-400"}`}>
                          {horaCorta(m.createdAt)}
                          {mio && <span>{m.leido ? "✓✓" : "✓"}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={finRef} />
              </div>

              {/* Entrada */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviar();
                }}
                className="p-3 border-t border-gray-200 flex gap-2"
              >
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe un mensaje…"
                  maxLength={2000}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button type="submit" cargando={enviando} disabled={!texto.trim()}>
                  Enviar
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <MensajesContenido />
    </Suspense>
  );
}
