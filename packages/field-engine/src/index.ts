// @noroset/field-engine — هسته‌ی فرم، بدون React/DB/Nest (docs/architecture.md §8.6).
// تنها وابستگی runtime: zod. همه‌ی توابع خالص و قطعی‌اند (زمان و تولید id تزریق می‌شوند).

export * from './contract';
export * from './schema';
export { LIMITS } from './limits';
export { ID_PATTERNS, generateId, type IdKind } from './ids';
export { isHttpsUrl, toAsciiDigits } from './text';
export { fieldTypes, contentTypes, chromeTypes } from './registry';

export {
  defineValueType,
  formatJalali,
  normalizeIranianMobile,
  parseIsoDate,
  pickConstraints,
  valueTypes,
  type ValueResult,
  type ValueType,
} from './values';
export { richTextPlain, richTextSchema, type RichText } from './rich-text';
export {
  VIDEO_FRAME_ORIGINS,
  VIDEO_PROVIDERS,
  buildEmbedUrl,
  parseVideoUrl,
  type VideoProvider,
} from './content/video';
export { LICENSE_BADGE } from './chrome/simple';
export type { NavButton } from './chrome/nav-buttons';

export {
  buildRuntimeState,
  computeVisiblePages,
  evaluateCondition,
  evaluateConditions,
  isEmptyValue,
  isShown,
  type Answers,
} from './conditions';
export {
  SYNTHETIC_IDS,
  applyBranding,
  ensureNavigation,
  resolveBottomBar,
  resolveFooter,
  resolveHeader,
  resolvePageChrome,
  resolveSidebar,
  resolveTopBar,
} from './layout';
export {
  validateDefinition,
  type DefinitionIssue,
  type IssuePath,
  type ValidateDefinitionResult,
} from './validate-definition';
export { formPreview, PREVIEW_MAX_ITEMS, type FormPreview, type FormPreviewItem } from './preview';
export {
  validateSubmission,
  type SubmissionError,
  type ValidateSubmissionResult,
} from './validate-submission';
