import template from './property-details.html?raw';
import { findPropertyById } from '../../data/properties.js';

function propertyDetailsMarkup(property, id) {
  if (!property) {
    return `
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Property</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Property ${id} not found</h1>
      <p class="mt-4 text-slate-600">This route is ready for property detail data from Supabase later on.</p>
    `;
  }

  return `
    <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Property ${property.id}</p>
    <h1 class="mt-3 text-4xl font-bold tracking-tight text-slate-900">${property.title}</h1>
    <p class="mt-3 text-lg text-slate-600">${property.city} · ${property.type}</p>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-sm text-slate-500">Price</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">${property.price}</p>
      </div>
      <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-sm text-slate-500">Rooms</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">${property.rooms}</p>
      </div>
      <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-sm text-slate-500">Area</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">${property.area}</p>
      </div>
    </div>
    <p class="mt-8 max-w-3xl text-base leading-8 text-slate-600">${property.description}</p>
    <a class="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white" href="/properties">Back to properties</a>
  `;
}

export function render() {
  return template;
}

export function hydrate(root, params) {
  const details = root.querySelector('[data-property-details]');
  const property = findPropertyById(params.id);

  if (details) {
    details.innerHTML = propertyDetailsMarkup(property, params.id);
  }
}