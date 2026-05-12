/**
 * Security Utility: Protects the application from unauthorized inspections
 * Features: Console clearing, Debugger traps, and Right-click/F12 prevention.
 */

export const initSecurity = () => {
    if (import.meta.env.DEV) return;

    // 1. Immutable Console Ghosting (Cannot be re-enabled)
    const noop = () => { };
    const methods = ['log', 'warn', 'error', 'info', 'debug', 'table', 'clear', 'dir'];
    methods.forEach(m => {
        try {
            Object.defineProperty(console, m, {
                get: () => noop,
                set: () => { throw new Error('Security Violation'); },
                configurable: false
            });
        } catch { /* Fallback for older browsers */ }
    });

    // 2. The "Honey Pot" - Triggers only when inspected
    const devtools = /./;
    devtools.toString = function () {
        window.location.replace("https://www.google.com/search?q=Stop+Attempting+To+Bypass+Anixo+Security");
        return "Anixo_Protected";
    };

    // 3. Omega Heartbeat: Performance & Recursion Check
    const omegaShield = () => {
        // Skip if we are in a browser known for timer fuzzing or if execution is expected to be slower
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        const isBrave = navigator.brave !== undefined;

        const start = performance.now();
        // eslint-disable-next-line no-debugger
        (function () { return true; })["constructor"]("debugger")();

        // Performance detection - Increased to 2000ms to avoid false positives in Firefox/Brave
        // These browsers have "Timer Fuzzing" which makes this check very unreliable.
        const limit = (isFirefox || isBrave) ? 3000 : 1000;

        if (performance.now() - start > limit) {
            console.warn("Security check failed or browser too slow.");
            // In production, you might still want to redirect, but let's be more lenient
            // document.documentElement.innerHTML = "";
            // window.location.replace("/404");
        }

        // Heuristic: Log the Honey Pot (if console is open, toString() triggers)
        // Only if console methods aren't fully ghosted
        try { console.dir(devtools); } catch {
            // Ignore errors if the devtools detector fails
        }
    };

    // Removed Recursive Freezer as it was tied to the deprecated window dimension check
    setInterval(() => {
        omegaShield();
        // Removed window dimension checks as they falsely trigger on Brave/Edge sidebars
    }, 1000);

    // 5. Hardened Keyboard & Mouse Locks
    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && [73, 74, 67, 75].includes(e.keyCode)) || (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true });

    // 3. (Optional) Disable Right-Click - Currently ENABLED for user experience
    // document.addEventListener('contextmenu', (e) => e.preventDefault());
};
