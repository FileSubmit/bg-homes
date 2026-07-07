import template from './home.html?raw';
import { propertyCard } from '../../components/property-card/property-card.js';
import { fetchActiveProperties } from '../../lib/properties.js';
import { regions } from '../../data/bg-locations.js';
import { escapeHtml, propertyTypeLabels } from '../../lib/format.js';
import { navigateTo } from '../../router.js';

export function render() {
  return template;
}

function fillSelect(select, entries, allLabel) {
  const optionsHtml = entries
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join('');

  select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>${optionsHtml}`;
}

function hydrateHeroSearch(root) {
  const form = root.querySelector('[data-hero-search]');

  if (!form) {
    return;
  }

  const propertyTypeSelect = form.querySelector('[data-hero-property-type]');
  const regionSelect = form.querySelector('[data-hero-region]');
  const toggleButtons = [...form.querySelectorAll('[data-transaction-toggle] button')];
  let transactionValue = '';

  fillSelect(propertyTypeSelect, Object.entries(propertyTypeLabels), 'Всички видове');
  fillSelect(regionSelect, regions.map((region) => [region.name, region.name]), 'Цяла България');

  const setActiveTransaction = (value) => {
    transactionValue = value;
    toggleButtons.forEach((button) => {
      const isActive = button.dataset.transactionValue === value;
      button.className = `rounded-full px-4 py-2 text-sm font-semibold transition ${
        isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`;
    });
  };

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTransaction(button.dataset.transactionValue ?? ''));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const params = new URLSearchParams();
    const q = String(formData.get('q') ?? '').trim();
    const propertyType = String(formData.get('property_type') ?? '').trim();
    const region = String(formData.get('region') ?? '').trim();

    if (q) params.set('q', q);
    if (transactionValue) params.set('transaction_type', transactionValue);
    if (propertyType) params.set('property_type', propertyType);
    if (region) params.set('region', region);

    const query = params.toString();
    navigateTo(`/properties${query ? `?${query}` : ''}`);
  });
}

export function hydrate(root) {
  hydrateHeroSearch(root);

  const grid = root.querySelector('[data-latest-grid]');

  if (!grid) {
    return;
  }

  void (async () => {
    const { data, error } = await fetchActiveProperties({ limit: 6 });

    if (error) {
      grid.innerHTML = '<p class="text-rose-600">Последните обяви не можаха да бъдат заредени. Опитайте отново по-късно.</p>';
      return;
    }

    if (data.length === 0) {
      grid.innerHTML = '<p class="text-slate-500">Все още няма обяви. Бъдете първият, който добавя имот!</p>';
      return;
    }

    grid.innerHTML = data.map(propertyCard).join('');
  })();
}
