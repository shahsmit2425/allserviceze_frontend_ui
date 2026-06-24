import { registerPlugin } from '@capacitor/core';

/**
 * iOS-only plugin that opens a URL using ASWebAuthenticationSession
 * with prefersEphemeralWebBrowserSession support.
 * On non-iOS platforms this is a no-op stub; the caller must branch
 * before calling open().
 */
const EphemeralAuthSession = registerPlugin('EphemeralAuthSession', {
  // No web implementation — only used on iOS native
  web: () => ({
    open: async () => { throw new Error('EphemeralAuthSession is iOS-only'); },
    cancel: async () => {},
  }),
});

export { EphemeralAuthSession };
