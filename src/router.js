const routeMatchers = [
  {
    title: 'Home',
    test: (pathname) => pathname === '/',
    load: () => import('./pages/home/home.js'),
  },
  {
    title: 'Login',
    test: (pathname) => pathname === '/login',
    load: () => import('./pages/login/login.js'),
  },
  {
    title: 'Register',
    test: (pathname) => pathname === '/register',
    load: () => import('./pages/register/register.js'),
  },
  {
    title: 'Properties',
    test: (pathname) => pathname === '/properties',
    load: () => import('./pages/properties/properties.js'),
  },
  {
    title: 'Property details',
    test: (pathname) => /^\/properties\/[^/]+$/.test(pathname),
    load: () => import('./pages/property-details/property-details.js'),
  },
  {
    title: 'Admin',
    test: (pathname) => pathname === '/admin',
    load: () => import('./pages/admin/admin.js'),
  },
];

const notFoundRoute = {
  title: 'Page not found',
  load: () => import('./pages/not-found/not-found.js'),
};

function matchRoute(pathname) {
  return routeMatchers.find((route) => route.test(pathname)) ?? notFoundRoute;
}

function getRouteParams(pathname) {
  const propertyMatch = pathname.match(/^\/properties\/([^/]+)$/);

  if (propertyMatch) {
    return { id: propertyMatch[1] };
  }

  return {};
}

async function renderRoute(pageSlot, onRouteChange) {
  if (!pageSlot) {
    return;
  }

  const pathname = window.location.pathname;
  const route = matchRoute(pathname);
  const params = getRouteParams(pathname);
  const module = await route.load();

  pageSlot.innerHTML = await module.render(params);
  document.title = `${route.title} | BG Homes`;

  if (typeof module.hydrate === 'function') {
    module.hydrate(pageSlot, params);
  }

  onRouteChange?.({ pathname, route: route.title, params });
}

export function initRouter({ pageSlot, onRouteChange }) {
  const navigate = async (nextPath) => {
    if (nextPath === window.location.pathname) {
      return;
    }

    window.history.pushState({}, '', nextPath);
    await renderRoute(pageSlot, onRouteChange);
  };

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');

    if (!anchor) {
      return;
    }

    const url = new URL(anchor.href, window.location.origin);

    if (url.origin !== window.location.origin) {
      return;
    }

    if (anchor.hasAttribute('download') || anchor.target === '_blank') {
      return;
    }

    event.preventDefault();
    void navigate(url.pathname);
  });

  window.addEventListener('popstate', () => {
    void renderRoute(pageSlot, onRouteChange);
  });

  void renderRoute(pageSlot, onRouteChange);
}