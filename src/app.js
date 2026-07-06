import { initRouter } from './router.js';
import { hydrateFooter, renderFooter } from './components/footer/footer.js';
import { hydrateHeader, renderHeader } from './components/header/header.js';
import { getAuthState, initializeAuth, subscribeAuthState } from './lib/auth.js';

export async function bootstrapApp() {
  const app = document.querySelector('#app');

  if (!app) {
    return;
  }

  await initializeAuth();

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

  const renderShellHeader = () => {
    if (!headerSlot) {
      return;
    }

    headerSlot.innerHTML = renderHeader(window.location.pathname, getAuthState());
    hydrateHeader(headerSlot);
  };

  renderShellHeader();

  if (footerSlot) {
    footerSlot.innerHTML = renderFooter();
    hydrateFooter(footerSlot);
  }

  const router = initRouter({
    pageSlot,
    onRouteChange: () => {
      renderShellHeader();
    },
  });

  const authKey = (snapshot) => `${snapshot.user?.id ?? ''}:${snapshot.isAdmin}:${snapshot.recoveryMode}`;
  let lastAuthKey = authKey(getAuthState());

  subscribeAuthState((snapshot) => {
    renderShellHeader();

    // Re-render the page only when the identity actually changes (sign in/out,
    // role, recovery mode) - not on every profile refresh, which would wipe
    // in-page form state and messages.
    const key = authKey(snapshot);

    if (key !== lastAuthKey) {
      lastAuthKey = key;
      router.refresh();
    }
  });
}