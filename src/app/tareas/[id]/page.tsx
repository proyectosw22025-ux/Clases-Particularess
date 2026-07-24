// =============================================
// ClasesYa - Página: Detalle de tarea (entregar / calificar)
// =============================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Cargando from "@/components/ui/Cargando";

interface EntregaBase {
  id: string;
  comentario: string | null;
  url: string | null;
  formato: string | null;
  bytes: number | null;
  calificacion: number | null;
  retroalimentacion: string | null;
  createdAt: string;
}

interface EntregaProfesor extends EntregaBase {
  estudiante: { id: string; nombre: string; foto: string | null };
}

interface TareaDetalle {
  tarea: {
    id: string;
    titulo: string;
    descripcion: string;
    fechaLimite: string | null;
    createdAt: string;
    curso: { id: string; titulo: string };
  };
  esDueño: boolean;
  entregas?: EntregaProfesor[];
  miEntrega?: EntregaBase | null;
}

function fechaLegible(f: string): string {
  return new Date(f).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

// Fila de entrega con formulario de calificación (vista del profesor)
function FilaEntrega({ tareaId, entrega, onCalificado }: { tareaId: string; entrega: EntregaProfesor; onCalificado: () => void }) {
  const [nota, setNota] = useState(entrega.calificacion?.toString() ?? "");
  const [retro, setRetro] = useState(entrega.retroalimentacion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const calificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const valor = parseInt(nota, 10);
    if (isNaN(valor) || valor < 0 || valor > 100) {
      setError("La nota debe estar entre 0 y 100");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/tareas/${tareaId}/entregas/${entrega.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calificacion: valor, retroalimentacion: retro || null }),
      });
      if (res.ok) onCalificado();
      else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo guardar la nota");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
            {entrega.estudiante.nombre.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{entrega.estudiante.nombre}</span>
          {entrega.calificacion != null && (
            <span className="text-xs font-medium bg-green-50 text-green-700 rounded-full px-2 py-0.5">
              {entrega.calificacion}/100
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{fechaLegible(entrega.createdAt)}</span>
      </div>

      {entrega.comentario && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{entrega.comentario}</p>}
      {entrega.url && (
        <a href={entrega.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
          <Button variante="secondary" tamano="sm">Descargar entrega</Button>
        </a>
      )}

      <form onSubmit={calificar} className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-start">
        {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        <input
          type="number"
          min={0}
          max={100}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota"
          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <input
          value={retro}
          onChange={(e) => setRetro(e.target.value)}
          placeholder="Retroalimentación (opcional)"
          maxLength={2000}
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <Button type="submit" tamano="sm" cargando={guardando}>Guardar nota</Button>
      </form>
    </div>
  );
}

export default function TareaDetallePage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<TareaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Formulario de entrega (estudiante)
  const [comentario, setComentario] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/tareas/${id}`, { cache: "no-store" });
    if (!res.ok) {
      setError("No tienes acceso a esta tarea");
      return;
    }
    setData(await res.json());
  }, [id]);

  useEffect(() => {
    (async () => {
      await cargar();
      setCargando(false);
    })();
  }, [cargar]);

  const entregar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio("");
    if (!comentario.trim() && !archivo) {
      setErrorEnvio("Adjunta un archivo o escribe un comentario");
      return;
    }
    setEnviando(true);
    try {
      const fd = new FormData();
      if (comentario.trim()) fd.append("comentario", comentario.trim());
      if (archivo) fd.append("archivo", archivo);
      const res = await fetch(`/api/tareas/${id}/entrega`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorEnvio(d.error || "No se pudo registrar la entrega");
        return;
      }
      setComentario("");
      setArchivo(null);
      const input = document.getElementById("entrega-archivo") as HTMLInputElement | null;
      if (input) input.value = "";
      await cargar();
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <Cargando />;
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin acceso</h1>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/cursos"><Button>Volver a cursos</Button></Link>
      </div>
    );
  }

  const { tarea, esDueño, entregas, miEntrega } = data;
  const vencida = tarea.fechaLimite ? new Date(tarea.fechaLimite).getTime() < Date.now() : false;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/cursos/${tarea.curso.id}`} className="text-sm text-blue-600 hover:text-blue-700">
        ← {tarea.curso.titulo}
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">{tarea.titulo}</h1>
        {tarea.fechaLimite && (
          <p className={`text-sm mt-1 ${vencida ? "text-red-600" : "text-gray-500"}`}>
            Fecha límite: {fechaLegible(tarea.fechaLimite)} {vencida && "(vencida)"}
          </p>
        )}
        <p className="text-gray-700 whitespace-pre-wrap mt-4">{tarea.descripcion}</p>
      </div>

      {/* Vista del profesor: todas las entregas */}
      {esDueño ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Entregas ({entregas?.length ?? 0})
          </h2>
          {!entregas || entregas.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay entregas.</p>
          ) : (
            <div className="space-y-3">
              {entregas.map((en) => (
                <FilaEntrega key={en.id} tareaId={id} entrega={en} onCalificado={cargar} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Vista del estudiante: su entrega */
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Tu entrega</h2>

          {miEntrega && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-500">
                Entregado el {fechaLegible(miEntrega.createdAt)}
                {miEntrega.calificacion != null ? (
                  <span className="ml-2 font-medium text-green-700">Nota: {miEntrega.calificacion}/100</span>
                ) : (
                  <span className="ml-2 text-amber-600">Pendiente de calificar</span>
                )}
              </p>
              {miEntrega.retroalimentacion && (
                <p className="mt-1 text-gray-700"><strong>Retroalimentación:</strong> {miEntrega.retroalimentacion}</p>
              )}
              {miEntrega.url && (
                <a href={miEntrega.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-blue-600 hover:underline">
                  Ver archivo entregado
                </a>
              )}
            </div>
          )}

          <form onSubmit={entregar} className="space-y-3">
            {errorEnvio && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{errorEnvio}</div>}
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Comentario para el profesor (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <input
              id="entrega-archivo"
              type="file"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-400">Máximo 15 MB. {miEntrega ? "Reenviar reemplaza tu entrega anterior y vuelve a estado pendiente." : ""}</p>
            <Button type="submit" cargando={enviando}>{miEntrega ? "Reenviar entrega" : "Entregar"}</Button>
          </form>
        </div>
      )}
    </div>
  );
}
