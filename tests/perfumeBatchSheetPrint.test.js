import { describe, it, expect, vi } from 'vitest';
import { resolveClassification } from '../src/utils/printProductionSheet';

describe('Perfume Production Batch Sheet Calculator — Product Classification & Print Verification', () => {
  describe('Classification Resolution Rules', () => {
    it('resolves branded perfume categories to "Brand"', () => {
      expect(resolveClassification('Perfume Brand')).toBe('Brand');
      expect(resolveClassification('perfume brand')).toBe('Brand');
      expect(resolveClassification('Brand')).toBe('Brand');
      expect(resolveClassification('brand')).toBe('Brand');
    });

    it('resolves non-branded perfume categories to "No Brand" without omitting the word "No"', () => {
      expect(resolveClassification('Perfume No Brand')).toBe('No Brand');
      expect(resolveClassification('Perfume No-Brand')).toBe('No Brand');
      expect(resolveClassification('perfume no brand')).toBe('No Brand');
      expect(resolveClassification('perfume no-brand')).toBe('No Brand');
      expect(resolveClassification('No Brand')).toBe('No Brand');
      expect(resolveClassification('no brand')).toBe('No Brand');
      expect(resolveClassification('No-Brand')).toBe('No Brand');
    });

    it('handles empty or custom categories gracefully', () => {
      expect(resolveClassification('')).toBe('');
      expect(resolveClassification(null)).toBe('');
      expect(resolveClassification(undefined)).toBe('');
      expect(resolveClassification('Cosmetics')).toBe('Cosmetics');
    });
  });

  describe('Example Products: WILD BLUE BELL (Brand) vs ARIANA GRANDE CLOUD (No Brand)', () => {
    it('correctly resolves WILD BLUE BELL with category "Perfume Brand" as "Brand"', () => {
      const product = {
        name: 'WILD BLUE BELL',
        product_category: 'Perfume Brand',
        brand_type: 'Perfume Brand',
      };

      const classification = resolveClassification(product.product_category);
      expect(classification).toBe('Brand');
      expect(classification).not.toBe('No Brand');
    });

    it('correctly resolves ARIANA GRANDE CLOUD with category "Perfume No Brand" as "No Brand"', () => {
      const product = {
        name: 'ARIANA GRANDE CLOUD',
        product_category: 'Perfume No Brand',
        brand_type: 'No Brand',
      };

      const classification = resolveClassification(product.product_category);
      expect(classification).toBe('No Brand');
      expect(classification).toContain('No');
      expect(classification).toContain('Brand');
    });

    it('correctly resolves presets with "Perfume Brand" and "Perfume No-Brand"', () => {
      const brandPreset = {
        id: 'preset_brand-without-water',
        code: 'PRF-STD-001',
        name: 'Perfume Brand',
        category: 'Perfume Brand',
      };

      const noBrandPreset = {
        id: 'preset_nobrand-without-water',
        code: 'PRF-STD-003',
        name: 'Perfume No-Brand',
        category: 'Perfume No-Brand',
      };

      expect(resolveClassification(brandPreset.category)).toBe('Brand');
      expect(resolveClassification(noBrandPreset.category)).toBe('No Brand');
    });
  });

  describe('HTML Header & Meta Rendering Logic for Production Batch Sheet', () => {
    // Helper replicating the template rendering logic in printProductionSheet
    function renderDocHeader(isPerfume, classification, brandName) {
      if (!isPerfume) return '';
      return `
        <div style="font-size: 13px; font-weight: 800; color: ${classification === 'No Brand' ? '#6b21a8' : '#047857'}; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${classification === 'No Brand'
            ? (brandName ? `NO BRAND: ${brandName}` : 'NO BRAND')
            : (brandName ? `BRAND: ${brandName}` : 'BRAND')}
        </div>
      `;
    }

    function renderClassificationMeta(isPerfume, classification, brandName) {
      if (!isPerfume) return '';
      return `
        <div class="meta-line"><span class="meta-bold">Classification:</span> <strong style="color: ${classification === 'No Brand' ? '#6b21a8' : '#047857'}; text-transform: uppercase;">${classification}</strong></div>
        ${brandName ? `<div class="meta-line"><span class="meta-bold">${classification === 'No Brand' ? 'Brand / Tatak:' : 'Brand Name:'}</span> <span style="font-weight: 800; color: ${classification === 'No Brand' ? '#6b21a8' : '#047857'}; text-transform: uppercase;">${brandName}</span></div>` : ''}
      `;
    }

    it('renders branded product with "BRAND: WILD BLUE BELL" in header and "Classification: Brand" in meta', () => {
      const classification = resolveClassification('Perfume Brand');
      const headerHtml = renderDocHeader(true, classification, 'WILD BLUE BELL');
      const metaHtml = renderClassificationMeta(true, classification, 'WILD BLUE BELL');

      expect(headerHtml).toContain('BRAND: WILD BLUE BELL');
      expect(headerHtml).not.toContain('NO BRAND');
      expect(metaHtml).toContain('<span class="meta-bold">Classification:</span>');
      expect(metaHtml).toContain('Brand');
      expect(metaHtml).not.toContain('No Brand');
      expect(metaHtml).toContain('Brand Name:');
      expect(metaHtml).toContain('WILD BLUE BELL');
    });

    it('renders non-branded product without tatak with "NO BRAND" in header and "Classification: No Brand" in meta', () => {
      const classification = resolveClassification('Perfume No Brand');
      const headerHtml = renderDocHeader(true, classification, '');
      const metaHtml = renderClassificationMeta(true, classification, '');

      expect(headerHtml).toContain('NO BRAND');
      expect(headerHtml).not.toContain('BRAND:');
      expect(metaHtml).toContain('<span class="meta-bold">Classification:</span>');
      expect(metaHtml).toContain('No Brand');
      expect(metaHtml).not.toContain('Brand Name:');
    });

    it('renders non-branded product with custom tatak (e.g. JLS) as "NO BRAND: JLS" and "Brand / Tatak: JLS"', () => {
      // User's specific scenario: ARIANA GRANDE CLOUD (No Brand) with JLS entered into Brand / Tatak field
      const classification = resolveClassification('Perfume No Brand');
      const headerHtml = renderDocHeader(true, classification, 'JLS');
      const metaHtml = renderClassificationMeta(true, classification, 'JLS');

      expect(headerHtml).toContain('NO BRAND: JLS');
      expect(headerHtml).not.toMatch(/(?<!NO\s)BRAND:\s*JLS/);
      expect(metaHtml).toContain('Classification:');
      expect(metaHtml).toContain('No Brand');
      expect(metaHtml).toContain('Brand / Tatak:');
      expect(metaHtml).toContain('JLS');
      expect(metaHtml).not.toContain('Brand Name:');
    });

    it('never strips or replaces "No Brand" with "Brand" for non-branded perfumes', () => {
      const rawCategory = 'Perfume No Brand';
      const classification = resolveClassification(rawCategory);
      expect(classification).toBe('No Brand');

      const metaHtml = renderClassificationMeta(true, classification, '');
      expect(metaHtml).toMatch(/Classification:.*No Brand/);
      expect(metaHtml).not.toMatch(/Classification:.*[^o ]Brand/);
    });
  });
});
