import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, findInternalForm, insertInternalSubmission, tenantMemberships, TENANT_CONTEXT, withTenant, type TenantContext } from '@noroset/core';
import { validateSubmission, type FormDefinition, type SubmissionError } from '@noroset/field-engine';
import type { SubmitAnswersDto } from '../public/dto';

export interface InternalFormView {
  channel: 'internal';
  formId: string;
  status: 'published' | 'closed';
  title: string;
  versionId: string;
  versionNumber: number;
  definition: FormDefinition;
  closedMessage?: string;
}

@Injectable()
export class InternalFormsService {
  constructor(@Inject(TENANT_CONTEXT) private readonly ctx: TenantContext) {}

  async read(id: string): Promise<InternalFormView> {
    const form = await findInternalForm(id);
    if (!form) throw new NotFoundException();
    await this.assertMember(form.tenantId);
    const definition = form.definition as FormDefinition;
    if (form.status === 'closed') {
      return {
        channel: 'internal',
        formId: form.formId,
        status: 'closed',
        title: form.title,
        versionId: form.versionId,
        versionNumber: form.versionNumber,
        definition,
        closedMessage: definition.settings?.closed_message ?? '',
      };
    }
    return {
      channel: 'internal',
      formId: form.formId,
      status: 'published',
      title: form.title,
      versionId: form.versionId,
      versionNumber: form.versionNumber,
      definition,
    };
  }

  async submit(id: string, dto: SubmitAnswersDto, _ip: string | undefined): Promise<{ ok: true }> {
    const form = await findInternalForm(id);
    if (!form) throw new NotFoundException();
    await this.assertMember(form.tenantId);
    if (form.status !== 'published') throw new ConflictException('form_closed');

    const result = validateSubmission(form.definition as FormDefinition, dto.answers);
    if (!result.ok) {
      const errors: SubmissionError[] = result.errors;
      throw new UnprocessableEntityException({ message: 'invalid_answers', errors });
    }

    const saved = await insertInternalSubmission({
      formId: form.formId,
      versionId: form.versionId,
      answers: result.answers,
      idempotencyKey: dto.idempotencyKey,
      submittedBy: this.ctx.userId(),
      ipHash: null,
    });
    switch (saved.status) {
      case 'created':
      case 'duplicate':
        return { ok: true };
      case 'closed':
        throw new ConflictException('form_closed');
      case 'invalid_version':
        throw new ConflictException('version_not_found');
      case 'not_found':
        throw new NotFoundException();
    }
  }

  /** عضویت فعال همان فضای کاری فرم؛ غیرعضو ← ۴۰۴ تا وجود فرم افشا نشود. */
  private async assertMember(tenantId: string): Promise<void> {
    const userId = this.ctx.userId();
    const membership = await withTenant(tenantId, (tx) =>
      tx
        .select({ id: tenantMemberships.id })
        .from(tenantMemberships)
        .where(
          and(
            eq(tenantMemberships.tenantId, tenantId),
            eq(tenantMemberships.userId, userId),
            eq(tenantMemberships.status, 'active'),
          ),
        )
        .limit(1),
    );
    if (!membership[0]) throw new NotFoundException();
  }
}
