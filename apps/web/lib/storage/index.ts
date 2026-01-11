/**
 * Storage abstraction layer
 *
 * Re-exports R2 storage functions as the primary storage mechanism.
 * This provides a consistent API and makes it easy to switch providers if needed.
 */

export {
  put,
  del,
  list,
  exists,
  get,
  convertBlobUrlToR2,
  isR2Url,
  isBlobUrl,
  type PutOptions,
  type PutResult,
  type ListOptions,
  type ListResult,
} from './r2';
