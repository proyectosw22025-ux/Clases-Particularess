// =============================================
// ClasesYa - Página: Lista de Clases/Servicios
// =============================================

"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClaseCard from "@/components/clases/ClaseCard";
import Button from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/Motion";

interface Servicio {
  id: string;
  materia: string;
  descripcion: string | null;
  precioHora: number;
  modalidad: string;
  nivel: string;
  duracionMin: number;
  calificacionPromedio: number | null;
  totalResenas: number;
  profesor: {
    id: string;
    nombre: string;
    foto: string | null;
    verificado?: boolean;
  };
}

export default function ClasesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <ClasesContent />
    </Suspense>
  );
}

function ClasesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);

  // Filtros
  const [materia, setMateria] = useState(searchParams.get("materia") || "");
  const [modalidad, setModalidad] = useState(searchParams.get("modalidad") || "");
  const [nivel, setNivel] = useState(searchParams.get("nivel") || "");
  const [precioMin, setPrecioMin] = useState(searchParams.get("precioMin") || "");
  const [precioMax, setPrecioMax] = useState(searchParams.get("precioMax") || "");

  const fetchServicios = useCallback(async (pagina: number) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (materia) params.set("materia", materia);
      if (modalidad) params.set("modalidad", modalidad);
      if (nivel) params.set("nivel", nivel);
      if (precioMin) params.set("precioMin", precioMin);
      if (precioMax) params.set("precioMax", precioMax);
      params.set("pagina", String(pagina));
      params.set("limite", "12");

      const res = await fetch(`/api/clases?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setServicios(data.servicios);
        setTotalPaginas(data.paginacion.totalPaginas);
        setPaginaActual(data.paginacion.pagina);
      }
    } catch {
      // Error silencioso
    } finally {
      setCargando(false);
    }
  }, [materia, modalidad, nivel, precioMin, precioMax]);

  useEffect(() => {
    fetchServicios(1);
  }, [fetchServicios]);

  const handleBuscar = () => {
    const params = new URLSearchParams();
    if (materia) params.set("materia", materia);
    if (modalidad) params.set("modalidad", modalidad);
    if (nivel) params.set("nivel", nivel);
    if (precioMin) params.set("precioMin", precioMin);
    if (precioMax) params.set("precioMax", precioMax);
    router.push(`/clases?${params.toString()}`);
    fetchServicios(1);
  };

  const limpiarFiltros = () => {
    setMateria("");
    setModalidad("");
    setNivel("");
    setPrecioMin("");
    setPrecioMax("");
    router.push("/clases");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clases disponibles</h1>
        <p className="mt-2 text-gray-600">Encuentra la clase particular perfecta para ti</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="PRIMARIA">Primaria</option>
              <option value="SECUNDARIA">Secundaria</option>
              <option value="BACHILLERATO">Bachillerato</option>
              <option value="UNIVERSIDAD">Universidad</option>
              <option value="ADULTOS">Adultos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio mín.</label>
            <input
              type="number"
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              placeholder="€0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio máx.</label>
            <input
              type="number"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              placeholder="$∞"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleBuscar}>Buscar</Button>
          <Button variante="ghost" onClick={limpiarFiltros}>Limpiar filtros</Button>
        </div>
      </div>

      {/* Resultados */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
          ))}
        </div>
      ) : servicios.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No se encontraron clases con esos filtros.</p>
          <Button variante="ghost" onClick={limpiarFiltros} className="mt-4">
            Ver todas las clases
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicios.map((servicio, i) => (
              <FadeIn key={servicio.id} delay={Math.min(i * 0.05, 0.3)} className="h-full">
                <ClaseCard
                  id={servicio.id}
                  materia={servicio.materia}
                  descripcion={servicio.descripcion || ""}
                  precioHora={servicio.precioHora}
                  modalidad={servicio.modalidad}
                  nivel={servicio.nivel}
                  duracionMin={servicio.duracionMin}
                  calificacionPromedio={servicio.calificacionPromedio}
                  totalResenas={servicio.totalResenas}
                  profesor={servicio.profesor}
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
                onClick={() => fetchServicios(paginaActual - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Página {paginaActual} de {totalPaginas}
              </span>
              <Button
                variante="ghost"
                disabled={paginaActual >= totalPaginas}
                onClick={() => fetchServicios(paginaActual + 1)}
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
