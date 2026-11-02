import { Candado, Certificado, Espejismo, Firmas, Lupa, Rompecabezas, Tablero } from './documentos.jsx';
import { Alarma, Autocompletar, Balanza, Boleto, Brujula, Burbujas, Caja, Calendario, Chat, Pasos, Reloj, Semaforo, Vivo } from './ideas.jsx';

/** Nombre en la pieza (`metafora: "boleto"`) → componente. */
export const METAFORAS = {
  alarma: Alarma,
  autocompletar: Autocompletar,
  balanza: Balanza,
  boleto: Boleto,
  brujula: Brujula,
  burbujas: Burbujas,
  caja: Caja,
  calendario: Calendario,
  candado: Candado,
  certificado: Certificado,
  chat: Chat,
  espejismo: Espejismo,
  firmas: Firmas,
  lupa: Lupa,
  pasos: Pasos,
  reloj: Reloj,
  rompecabezas: Rompecabezas,
  semaforo: Semaforo,
  tablero: Tablero,
  vivo: Vivo,
};
