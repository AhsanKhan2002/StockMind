// ── app.js ───────────────────────────────────────────────────
// Entry point — registers routes and boots the router.

(function init() {
  Router.register('dashboard', () => Dashboard.render());
  Router.register('stock',     (sym) => StockDetail.render(sym));
  Router.init();
})();
