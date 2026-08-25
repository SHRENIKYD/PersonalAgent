/**
 * The beta build. Same code, same data shapes, different app id — so ECHO Beta installs
 * alongside the real ECHO rather than replacing it, and has its own storage. Trying an
 * unfinished feature can therefore never damage the copy you actually rely on.
 */
export const environment = {
  production: true,
  apiBaseUrl: '',
  beta: true,
};
