import { registerPlugin } from '@capacitor/core';

const NativeGoogleSignIn = registerPlugin('NativeGoogleSignIn', {
  web: () => ({
    signIn: async () => { throw new Error('NativeGoogleSignIn is only available on native mobile builds'); },
    signOut: async () => {},
  }),
});

export { NativeGoogleSignIn };