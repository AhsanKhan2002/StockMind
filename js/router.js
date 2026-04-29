// ── router.js ────────────────────────────────────────────────
// Hash-based client-side router. No server needed.

const Router = (() => {
  const routes = {};

  function register(path, handler) {
    routes[path] = handler;
  }

  function parse() {
    const hash = window.location.hash || '#/';
    const [path, ...rest] = hash.slice(1).split('?');
    const parts = path.split('/').filter(Boolean);
    return { path, parts, query: rest.join('?') };
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function handle() {
    const { parts } = parse();
    const root = parts[0] || '';

    if (root === 'stock' && parts[1]) {
      routes['stock']?.(parts[1].toUpperCase());
    } else {
      routes['dashboard']?.();
    }
  }

  function init() {
    window.addEventListener('hashchange', handle);
    handle();
  }

  return { register, navigate, init };
})();
