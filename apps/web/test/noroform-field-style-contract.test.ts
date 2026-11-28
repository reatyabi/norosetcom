import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fieldTypes, contentTypes } from '@noroset/field-engine';
import { BASIC_ELEMENTS, isBasicElementType } from '../src/app/(panel)/form/[id]/editor/_components/settings-spec';

describe('noroform field style contract', () => {
  const repoRoot = path.resolve(__dirname, '../../..');

  it('guarantees zero hardcoded legacy color classes in field-primitives and field-inline', () => {
    const filesToCheck = [
      path.join(repoRoot, 'products/noroform/ui/field-primitives.tsx'),
      path.join(repoRoot, 'apps/web/src/app/(panel)/form/[id]/editor/_components/field-inline.tsx'),
    ];

    const forbiddenPatterns = [
      /bg-white\b/,
      /bg-slate-\d+/,
      /bg-zinc-\d+/,
      /bg-gray-\d+/,
      /text-slate-\d+/,
      /text-zinc-\d+/,
      /text-gray-\d+/,
      /border-slate-\d+/,
      /border-zinc-\d+/,
      /border-gray-\d+/,
      /#[0-9a-fA-F]{3,6}\b/,
    ];

    for (const filePath of filesToCheck) {
      expect(fs.existsSync(filePath), `file ${filePath} must exist`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const pattern of forbiddenPatterns) {
        const match = pattern.exec(content);
        expect(
          match,
          `Found forbidden hardcoded color pattern "${pattern}" in ${path.basename(filePath)}: "${match?.[0]}"`,
        ).toBeNull();
      }
    }
  });

  it('verifies all 12 elements comply with token-driven contract', () => {
    const allFieldKeys = [...fieldTypes.keys()];
    const allContentKeys = [...contentTypes.keys()];
    const totalElements = [...allFieldKeys, ...allContentKeys];

    expect(totalElements).toHaveLength(12);

    const expected12 = [
      'short_text',
      'long_text',
      'number',
      'email',
      'phone',
      'date',
      'single_choice',
      'multi_choice',
      'rating',
      'text',
      'image',
      'video',
    ];

    expect(totalElements.sort()).toEqual(expected12.sort());

    for (const key of expected12) {
      expect(isBasicElementType(key)).toBe(true);
      const def = BASIC_ELEMENTS[key as keyof typeof BASIC_ELEMENTS];
      expect(def).toBeDefined();
      expect(def.family).toBe(fieldTypes.has(key) ? 'field' : 'content');
    }
  });

  it('contract documentation exists in docs/noroform-field-style-contract.md', () => {
    const docPath = path.join(repoRoot, 'docs/noroform-field-style-contract.md');
    expect(fs.existsSync(docPath)).toBe(true);
    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).toContain('NfFieldFrame');
    expect(content).toContain('NfControlBox');
    expect(content).toContain('NfChoiceOption');
    expect(content).toContain('NfRatingStars');
    expect(content).toContain('NfMediaPlaceholder');
  });
});
