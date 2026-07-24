// =============================================
// ClasesYa - Página: Cursos (aula virtual)
// Catálogo público + "Mis cursos" + creación (profesores).
// =============================================

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import BadgeVerificado from "@/components/ui/BadgeVerificado";
import Cargando from "@/components/ui/Cargando";
import { FadeIn } from "@/components/ui/Motion";

interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  profesor: { id: string; nombre: string; foto: string | null; verificado?: boolean };
  _count: { inscripciones: number; materiales: number };
}

interface Usuario {
  id: string;
  rol: "PROFESOR" | "ESTUDIANTE" | "ADMIN" | "MODERADOR";
}

export default function CursosPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [tab, setTab] = useState<"catalogo" | "mios">("catalogo");
  const [cargando, setCargando] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const cargar = useCallback(async (t: "catalogo" | "mios", u: Usuario | null) => {
    let url = "/api/cursos";
    if (t === "mios" && u) {
      url += u.rol === "PROFESOR" ? "?mios=true" : "?inscrito=true";
    }
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) setCursos((await res.json()).cursos ?? []);
    else setCursos([]);
  }, []);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const u = meRes.ok ? (await meRes.json()).usuario : null;
      setUsuario(u);
      await cargar("catalogo", u);
      setCargando(false);
    })();
  }, [cargar]);

  const cambiarTab = async (t: "catalogo" | "mios") => {
    setTab(t);
    await cargar(t, usuario);
  };

  const crearCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm("");
    setCreando(true);
    try {
      const res = await fetch("/api/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descripcion }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorForm(data.error || "No se pudo crear el curso");
        return;
      }
      setModalAbierto(false);
      setTitulo("");
      setDescripcion("");
      setTab("mios");
      await cargar("mios", usuario);
    } finally {
      setCreando(false);
    }
  };

  const esProfesor = usuario?.rol === "PROFESOR";
  const etiquetaMios = esProfesor ? "Mis cursos" : "Mis inscripciones";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="text-gray-600 mt-1">Aula virtual: material, apuntes y recursos de clase.</p>
        </div>
        {esProfesor && <Button onClick={() => setModalAbierto(true)}>Crear curso</Button>}
      </div>

      {usuario && (
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => cambiarTab("catalogo")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "catalogo" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => cambiarTab("mios")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "mios" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {etiquetaMios}
          </button>
        </div>
      )}

      {cargando ? (
        <Cargando />
      ) : cursos.length === 0 ? (
        <p className="text-gray-500">
          {tab === "mios"
            ? esProfesor
              ? "Aún no has creado ningún curso."
              : "Aún no te has inscrito en ningún curso."
            : "Todavía no hay cursos publicados."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map((c, i) => (
            <FadeIn key={c.id} delay={Math.min(i * 0.05, 0.3)} className="h-full">
            <Link
              href={`/cursos/${c.id}`}
              className="h-full bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all flex flex-col"
            >
              <h3 className="font-semibold text-gray-900 line-clamp-2">{c.titulo}</h3>
              <p className="text-sm text-gray-600 mt-2 line-clamp-3 flex-1">{c.descripcion}</p>
              <div className="flex items-center gap-1.5 mt-4 text-sm text-gray-500">
                <span>{c.profesor.nombre}</span>
                {c.profesor.verificado && <BadgeVerificado soloIcono />}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>{c._count.inscripciones} inscrito{c._count.inscripciones !== 1 ? "s" : ""}</span>
                <span>{c._count.materiales} material{c._count.materiales !== 1 ? "es" : ""}</span>
              </div>
            </Link>
            </FadeIn>
          ))}
        </div>
      )}

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Crear curso">
        <form onSubmit={crearCurso} className="space-y-4">
          {errorForm && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{errorForm}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={150}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Cálculo I — Universitario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              maxLength={3000}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="¿Qué aprenderán y qué material encontrarán en el curso?"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variante="ghost" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button type="submit" cargando={creando}>Crear curso</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
