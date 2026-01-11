export {
  searchPhotos,
  getPhoto,
  getCuratedPhotos,
  selectPhotoFromResults,
  fetchBlogPhoto,
  fetchBlogPhotosForEvaluation,
  downloadPhoto,
  formatPhotoCredit,
  type PexelsPhoto,
  type PexelsSearchResponse,
  type SearchOptions,
  type FetchPhotoResult,
  type FetchBlogPhotosResult,
} from './client';

export {
  CATEGORY_SEARCH_TERMS,
  TOPIC_SEARCH_TERMS,
  FALLBACK_SEARCH_TERMS,
  getSearchTermsForCategory,
  getSearchTermsForTopic,
  getCombinedSearchTerms,
  generateAltText,
} from './search-terms';
