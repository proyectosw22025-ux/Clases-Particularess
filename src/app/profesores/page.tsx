// =============================================
// ClasesYa - Página: Lista de Profesores
// =============================================

"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProfesorCard from "@/components/profesores/ProfesorCard";
import { FadeIn } from "@/components/ui/Motion";
import Button from "@/components/ui/Button";

interface Profesor {
  id: string;
  nombre: string;
  foto: string | null;
  bio: string | null;
  ubicacion: string | null;
  verificado?: boolean;
  calificacionPromedio: number | null;
  totalResenas: number;
  servicios: {
    materia: string;
    precioHora: number;
    modalidad: string;
  }[];
}

export default function ProfesoresPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <ProfesoresContent />
    </Suspense>
  );
}

function ProfesoresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtros
  const [materia, setMateria] = useState(searchParams.get("materia") || "");
  const [modalidad, setModalidad] = useState(searchParams.get("modalidad") || "");
  const [ubicacion, setUbicacion] = useState(searchParams.get("ubicacion") || "");

  const fetchProfesores = useCallback(async (pagina: number) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (materia) params.set("materia", materia);
      if (modalidad) params.set("modalidad", modalidad);
      if (ubicacion) params.set("ubicacion", ubicacion);
      params.set("pagina", String(pagina));
      params.set("limite", "12");

      const res = await fetch(`/api/profesores?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setProfesores(data.profesores);
        setTotalPaginas(data.paginacion.totalPaginas);
        setPaginaActual(data.paginacion.pagina);
      }
    } catch {
      // Error silencioso
    } finally {
      setCargando(false);
    }
  }, [materia, modalidad, ubicacion]);

  useEffect(() => {
    fetchProfesores(1);
  }, [fetchProfesores]);

  const handleBuscar = () => {
    const params = new URLSearchParams();
    if (materia) params.set("materia", materia);
    if (modalidad) params.set("modalidad", modalidad);
    if (ubicacion) params.set("ubicacion", ubicacion);
    router.push(`/profesores?${params.toString()}`);
    fetchProfesores(1);
  };

  const limpiarFiltros = () => {
    setMateria("");
    setModalidad("");
    setUbicacion("");
    router.push("/profesores");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Encuentra tu profesor ideal</h1>
        <p className="mt-2 text-gray-600">Explora profesores verificados y encuentra quien mejor se adapte a tus necesidades</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Materia</label>
            <input
              type="text"
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              placeholder="Ej: Matemáticas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="AMBOS">Ambas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: Madrid"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleBuscar}>Buscar</Button>
          <Button variante="ghost" onClick={limpiarFiltros}>Limpiar</Button>
        </div>
      </div>

      {/* Resultados */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      ) : profesores.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No se encontraron profesores con esos filtros.</p>
          <Button variante="ghost" onClick={limpiarFiltros} className="mt-4">
            Ver todos los profesores
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profesores.map((profesor, i) => (
              <FadeIn key={profesor.id} delay={Math.min(i * 0.05, 0.3)} className="h-full">
                <ProfesorCard
                  id={profesor.id}
                  nombre={profesor.nombre}
                  foto={profesor.foto}
                  bio={profesor.bio}
                  ubicacion={profesor.ubicacion}
                  verificado={profesor.verificado}
                  calificacionPromedio={profesor.calificacionPromedio}
                  totalResenas={profesor.totalResenas}
                  servicios={profesor.servicios}
                />
              </FadeIn>
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variante="ghost"
                disabled={paginaActual <= 1}
                onClick={() => fetchProfesores(paginaActual - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Página {paginaActual} de {totalPaginas}
              </span>
              <Button
                variante="ghost"
                disabled={paginaActual >= totalPaginas}
                onClick={() => fetchProfesores(paginaActual + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
