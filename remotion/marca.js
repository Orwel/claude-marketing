import { createContext, useContext } from 'react';

/**
 * La marca viaja por contexto y no por props: todas las escenas la necesitan
 * y pasarla a mano por cada nivel es donde se cuelan los colores hardcodeados.
 */
export const ContextoMarca = createContext(null);

export function useMarca() {
  const marca = useContext(ContextoMarca);
  if (!marca) throw new Error('Falta <ContextoMarca.Provider> alrededor de la plantilla');
  return marca;
}
