/**
 * Security Utility: Protects the application from unauthorized inspections
 * Features: Console clearing, Debugger traps, and Right-click/F12 prevention.
 */

export function initSecurity() {

  // 1. Disable Right Click (Context Menu)
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // 2. Disable Keyboard Shortcuts for DevTools
  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
    if (
      e.ctrlKey &&
      e.shiftKey &&
      (e.key === "I" ||
        e.key === "i" ||
        e.key === "J" ||
        e.key === "j" ||
        e.key === "C" ||
        e.key === "c")
    ) {
      e.preventDefault();
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
      e.preventDefault();
    }

    // Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === "S" || e.key === "s")) {
      e.preventDefault();
    }
  });

  // 3. Clear and Override Console
  // Prevents internal data from being accidentally leaked if the console is somehow opened
  if (typeof console !== "undefined") {
    console.log = function () {};
    console.info = function () {};
    console.warn = function () {};
    console.error = function () {};
    console.debug = function () {};
    console.clear();
  }

  // 3. Anti-Scraping / Debugger Trap
  // Continuously triggers debugger statement so if someone opens devtools, their browser freezes
  const _debuggerTrap = () => {
    // A small obfuscated function so it doesn't look obvious
    // (function () { return false; })["constructor"]("debugger")["call"]();
  };

  // Run the trap on a loop
  // setInterval(() => {
  //   debuggerTrap();
  // }, 1000);
}
