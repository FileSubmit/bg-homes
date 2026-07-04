import { initRouter } from './router.js';
import { hydrateFooter, renderFooter } from './components/footer/footer.js';
import { hydrateHeader, renderHeader, setHeaderActive } from './components/header/header.js';

export function bootstrapApp() {
  const app = document.querySelector('#app');

  if (!app) {
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <div data-header-slot></div>
      <main data-page-slot class="flex-1"></main>
      <div data-footer-slot></div>
    </div>
  `;

  const headerSlot = app.querySelector('[data-header-slot]');
  const pageSlot = app.querySelector('[data-page-slot]');
  const footerSlot = app.querySelector('[data-footer-slot]');

  if (headerSlot) {
    headerSlot.innerHTML = renderHeader();
    hydrateHeader(headerSlot);
  }

  if (footerSlot) {
    footerSlot.innerHTML = renderFooter();
    hydrateFooter(footerSlot);
  }

  initRouter({
    pageSlot,
    onRouteChange: ({ pathname }) => setHeaderActive(pathname),
  });
}