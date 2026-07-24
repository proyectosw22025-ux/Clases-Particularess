// =============================================
// ClasesYa - Página principal (Home)
// =============================================

import Link from "next/link";
import HeroFondo from "@/components/home/HeroFondo";
import TiltCard from "@/components/ui/TiltCard";
import { FadeIn, AppearOnMount } from "@/components/ui/Motion";

const PASOS = [
  {
    paso: "1",
    titulo: "Busca tu clase",
    descripcion: "Explora cientos de profesores y materias. Filtra por modalidad, precio y nivel.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    paso: "2",
    titulo: "Reserva tu horario",
    descripcion: "Elige la fecha y hora que mejor te convenga. El profesor confirmará tu reserva.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    paso: "3",
    titulo: "Aprende y califica",
    descripcion: "Toma tu clase y deja una reseña para ayudar a otros estudiantes.",
    icono: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <HeroFondo />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <AppearOnMount>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm text-blue-100 backdrop-blur-sm">
                ✨ Aprende con los mejores profesores particulares
              </span>
            </AppearOnMount>
            <AppearOnMount delay={0.08}>
              <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Aprende lo que quieras,{" "}
                <span className="bg-gradient-to-r from-sky-200 to-cyan-100 bg-clip-text text-transparent">
                  cuando quieras
                </span>
              </h1>
            </AppearOnMount>
            <AppearOnMount delay={0.16}>
              <p className="mt-6 text-lg md:text-xl text-blue-100 max-w-2xl">
                Conectamos estudiantes con los mejores profesores particulares.
                Clases presenciales o virtuales, a tu ritmo y necesidad.
              </p>
            </AppearOnMount>
            <AppearOnMount delay={0.24}>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/clases"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow-lg shadow-blue-900/20 hover:bg-blue-50 hover:-translate-y-0.5 transition-all"
                >
                  Buscar clases
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white/70 text-white font-semibold rounded-lg hover:bg-white/10 hover:-translate-y-0.5 transition-all"
                >
                  Soy profesor
                </Link>
              </div>
            </AppearOnMount>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold text-center text-gray-900">¿Cómo funciona?</h2>
            <p className="mt-4 text-center text-gray-600 max-w-2xl mx-auto">
              En tres simples pasos puedes encontrar al profesor perfecto
            </p>
          </FadeIn>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {PASOS.map((item, i) => (
              <FadeIn key={item.paso} delay={i * 0.1}>
                <TiltCard className="h-full">
                  <div className="h-full text-center bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
                      {item.icono}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{item.titulo}</h3>
                    <p className="mt-2 text-gray-600">{item.descripcion}</p>
                  </div>
                </TiltCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA para profesores */}
      <section className="relative overflow-hidden bg-gray-900 text-white py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950" />
        <FadeIn className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">¿Eres profesor?</h2>
          <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
            Publica tus servicios, llega a más estudiantes y gestiona tus reservas
            desde un solo lugar. Empieza gratis.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center mt-8 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/40 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
          >
            Registrarme como profesor
          </Link>
        </FadeIn>
      </section>
    </>
  );
}
