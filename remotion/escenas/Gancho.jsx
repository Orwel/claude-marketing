import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TextoCinetico } from '../componentes/TextoCinetico.jsx';

/** Los primeros 3 segundos deciden si alguien se queda: texto grande, nada mas compitiendo. */
export const Gancho = ({ texto }) => (
  <AbsoluteFill style={{ justifyContent: 'center', padding: '0 80px' }}>
    <TextoCinetico texto={texto} tamano={112} paso={3} desde={4} />
  </AbsoluteFill>
);
