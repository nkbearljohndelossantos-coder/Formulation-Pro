import React from 'react';
import { PerfumeFormulatorPage } from './PerfumeFormulatorPage';

export function PerfumeNoBrandPage({ setCurrentPage }) {
  return <PerfumeFormulatorPage setCurrentPage={setCurrentPage} defaultBrandFilter="Perfume No-Brand" />;
}
