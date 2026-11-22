import { describe, expect, it } from 'vitest';
import { formPreview, validateDefinition } from '@noroset/field-engine';
import { FORM_TEMPLATES, templateDefinition } from '../src/app/(panel)/form/templates';

describe('form templates', () => {
  it('every template is a publishable definition with fresh ids', () => {
    const ids = new Set<string>();
    for (const t of FORM_TEMPLATES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      const result = validateDefinition(templateDefinition(t));
      if (!result.ok) throw new Error(`${t.id}: ${JSON.stringify(result.issues)}`);
      expect(formPreview(templateDefinition(t)).primaryColor).toBe(t.primaryColor);
    }
    const [a, b] = [templateDefinition(FORM_TEMPLATES[0]!), templateDefinition(FORM_TEMPLATES[0]!)];
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
