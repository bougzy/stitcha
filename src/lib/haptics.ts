/* -------------------------------------------------------------------------- */
/*  Haptic Feedback Utility                                                    */
/*  Uses the Vibration API for tactile feedback on supported devices           */
/* -------------------------------------------------------------------------- */

export const haptics = {
  /** Light tap — button press, toggle */
  light() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  },

  /** Medium tap — successful action, selection change */
  medium() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(25);
    }
  },

  /** Heavy tap — important action, confirmation */
  heavy() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
  },

  /** Success pattern — double tap */
  success() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([15, 50, 15]);
    }
  },

  /** Error pattern — triple buzz */
  error() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([30, 30, 30, 30, 30]);
    }
  },

  /** Warning pattern */
  warning() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([20, 40, 20]);
    }
  },
};
