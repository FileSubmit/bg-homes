import template from './home.html?raw';
import { propertyCard } from '../../components/property-card/property-card.js';
import { fetchActiveProperties } from '../../lib/properties.js';

export function render() {
  return template;
}

export function hydrate(root) {
  const grid = root.querySelector('[data-latest-grid]');

  if (!grid) {
    return;
  }

  void (async () => {
    const { data, error } = await fetchActiveProperties({ limit: 6 });

    if (error) {
      grid.innerHTML = '<p class="text-rose-600">Could not load the latest listings. Please try again later.</p>';
      return;
    }

    if (data.length === 0) {
      grid.innerHTML = '<p class="text-slate-500">No listings yet. Be the first to add a property!</p>';
      return;
    }

    grid.innerHTML = data.map(propertyCard).join('');
  })();
}
