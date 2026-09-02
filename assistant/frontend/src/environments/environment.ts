export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000',
  /**
   * Gates features that are not finished enough to ship.
   *
   * There is no beta build any more — the separate APK, its environment file and its
   * Angular configuration are gone — so nothing sets this to true today. The flag stays
   * because it is what hands-free voice mode is gated on, and deleting it would either
   * ship that feature to everyone or delete it outright; neither is what "remove the beta
   * for now" asked for. Flip it here, or reintroduce a build configuration, when there is
   * somewhere for unfinished work to go again.
   */
  beta: false,
};
