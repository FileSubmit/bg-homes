import template from './footer.html?raw';

export function renderFooter() {
  return template;
}

export function hydrateFooter(root) {
  const yearNode = root.querySelector('[data-footer-year]');

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}