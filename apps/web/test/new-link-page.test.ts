import { describe, expect, it } from 'vitest';
import { LINK_TEMPLATES, pageContentSchema } from '@noroset/norolink/ui';
import { cleanSlugInput, isValidPageSlug, newLinkPageBody } from '../src/app/(panel)/link/new-link-page';

const avatar = { file_id: '00000000-0000-4000-8000-000000000001', width: 512, height: 512 };

describe('newLinkPageBody', () => {
  it('builds a blank page from the answers', () => {
    const body = newLinkPageBody({ name: '  کافه نور  ', bio: ' قهوه‌ی تخصصی ', avatar, template: null });
    expect(body.title).toBe('کافه نور');
    expect(body.content.profile).toMatchObject({ name: 'کافه نور', bio: 'قهوه‌ی تخصصی', avatar });
    expect(body).not.toHaveProperty('elements');
    expect(pageContentSchema.safeParse(body.content).success).toBe(true);
  });

  it('leaves skipped steps empty on a blank page', () => {
    const body = newLinkPageBody({ name: 'کافه نور', bio: '   ', avatar: null, template: null });
    expect(body.content.profile).toMatchObject({ bio: '', avatar: null });
  });

  it.each(LINK_TEMPLATES.map((t) => [t.id, t] as const))('keeps the sample of %s for skipped steps', (_id, template) => {
    const body = newLinkPageBody({ name: 'کافه نور', bio: '', avatar: null, template });
    expect(body.title).toBe('کافه نور');
    expect(body.elements).toBe(template.elements);
    expect(body.content.profile).toMatchObject({ name: 'کافه نور', bio: template.content.profile.bio, avatar: template.content.profile.avatar });
    expect(body.content.theme).toEqual(template.content.theme);
    expect(pageContentSchema.safeParse(body.content).success).toBe(true);
  });

  it.each(LINK_TEMPLATES.map((t) => [t.id, t] as const))('drops the sample search and share data of %s', (_id, template) => {
    const body = newLinkPageBody({ name: 'کافه نور', bio: 'متن من', avatar, template });
    expect(body.content.seo).toEqual({ title: '', description: '', og_image: null, indexable: false, entity: null });
    expect(JSON.stringify(body.content.seo)).not.toContain(template.content.profile.name);
  });

  it('sends the chosen slug, and none when the step was skipped', () => {
    expect(newLinkPageBody({ name: 'x', bio: '', slug: 'kafe-noor', avatar: null, template: null }).slug).toBe('kafe-noor');
    expect(newLinkPageBody({ name: 'x', bio: '', avatar: null, template: null })).not.toHaveProperty('slug');
  });

  it.each([
    ['Kafe Noor!', 'kafenoor'],
    ['کافه-noor', '-noor'],
  ])('cleans slug input %j', (input, out) => expect(cleanSlugInput(input)).toBe(out));

  it.each([
    ['kafe-noor', true],
    ['a1', true],
    ['a', false],
    ['-noor', false],
    ['noor-', false],
    ['a--b', false],
  ])('validates slug %s', (slug, ok) => expect(isValidPageSlug(slug)).toBe(ok));

  it('prefers the answers over the template sample', () => {
    const template = LINK_TEMPLATES[0]!;
    const body = newLinkPageBody({ name: 'کافه نور', bio: 'متن من', avatar, template });
    expect(body.content.profile).toMatchObject({ bio: 'متن من', avatar });
  });
});
