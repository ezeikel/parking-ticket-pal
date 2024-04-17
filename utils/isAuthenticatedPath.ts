/**
 * checks if the given path matches any of the authenticated paths.
 * @param path The current path to check.
 * @returns true if the path is authenticated, false otherwise.
 */

import { AUTHENTICATED_PATHS } from '@/constants';

// eslint-disable-next-line import/prefer-default-export
export function isPathAuthenticated(path: string): boolean {
  return AUTHENTICATED_PATHS.some((authPath) => {
    if (typeof authPath === 'string') {
      return authPath === path;
    }

    return authPath.test(path);
  });
}
