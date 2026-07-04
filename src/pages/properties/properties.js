import template from './properties.html?raw';
import { properties } from '../../data/properties.js';

function propertyCard(property) {
  return `
    <article class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">${property.type}</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-900">${property.title}</h2>
      <p class="mt-2 text-sm text-slate-500">${property.city}</p>
      <p class="mt-4 text-3xl font-bold text-slate-900">${property.price}</p>
      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div><dt class="font-medium text-slate-900">Rooms</dt><dd>${property.rooms}</dd></div>
        <div><dt class="font-medium text-slate-900">Area</dt><dd>${property.area}</dd></div>
      </dl>
      <p class="mt-4 text-sm leading-6 text-slate-600">${property.description}</p>
      <a class="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white" href="/properties/${property.id}">View details</a>
    </article>
  `;
}

export function render() {
  return template;
}

export function hydrate(root) {
  const grid = root.querySelector('[data-properties-grid]');

  if (grid) {
    grid.innerHTML = properties.map(propertyCard).join('');
  }
}