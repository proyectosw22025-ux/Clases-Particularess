// =============================================
// ClasesYa - Sistema de confirmación (reemplaza window.confirm)
// Provee un hook useConfirm() que abre un modal propio y resuelve una promesa.
// =============================================

"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface OpcionesConfirm {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean;
}

type ConfirmFn = (opciones: OpcionesConfirm) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Devuelve la función de confirmación. Si el proveedor no está montado, cae en
// window.confirm para no romper la funcionalidad.
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  return ctx ?? (async (o) => window.confirm(o.mensaje));
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirm | null>(null);
  const resolver = useRef<((valor: boolean) => void) | null>(null);

  const confirmar = useCallback<ConfirmFn>((op) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpciones(op);
    });
  }, []);

  const cerrar = (valor: boolean) => {
    resolver.current?.(valor);
    resolver.current = null;
    setOpciones(null);
  };

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal abierto={opciones !== null} onCerrar={() => cerrar(false)} titulo={opciones?.titulo ?? "Confirmar"}>
        <p className="text-gray-600">{opciones?.mensaje}</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variante="ghost" onClick={() => cerrar(false)}>
            {opciones?.textoCancelar ?? "Cancelar"}
          </Button>
          <Button variante={opciones?.peligro ? "danger" : "primary"} onClick={() => cerrar(true)}>
            {opciones?.textoConfirmar ?? "Confirmar"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
