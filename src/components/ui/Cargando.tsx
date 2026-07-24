// =============================================
// ClasesYa - Componente: indicador de carga (spinner)
// =============================================

export default function Cargando({ texto = "Cargando…", className = "" }: { texto?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-16 text-gray-500 ${className}`}>
      <span className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}
