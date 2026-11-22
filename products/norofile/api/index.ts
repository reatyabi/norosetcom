// @noroset/norofile — سمت API. فقط از همین index مصرف شود (فقط apps/api؛ محصولات دیگر Port FILE_SERVICE در core).
export { NorofileModule } from './norofile.module';
export { MANAGE_ROLES } from './access';
export { MAX_UPLOAD_BYTES, PERSONAL_MAX_BYTES } from './limits';
export {
  FilesService,
  publicFilesBaseUrl,
  type FileDetail,
  type FileItem,
  type FileList,
  type FileUsage,
  type StorageUsage,
} from './files/files.service';
