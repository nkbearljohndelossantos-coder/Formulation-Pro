import React from 'react';
import { PerfumeFormulatorPage } from './PerfumeFormulatorPage';

export function PerfumeBrandPage({ setCurrentPage }) {
  return <PerfumeFormulatorPage setCurrentPage={setCurrentPage} defaultBrandFilter="Perfume Brand" />;
}
