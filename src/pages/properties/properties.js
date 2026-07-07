import './properties.scss';
import template from './properties.html?raw';
import { propertyCard } from '../../components/property-card/property-card.js';
import { fetchActiveProperties } from '../../lib/properties.js';
import { cities, neighborhoods, regions } from '../../data/bg-locations.js';
import {
  constructionStageLabels,
  constructionTypeLabels,
  escapeHtml,
  furnishingLabels,
  heatingLabels,
  propertyTypeLabels,
  transactionTypeLabels,
} from '../../lib/format.js';

export function render() {
  return template;
}

function fillOptions(select, options, allLabel) {
  const optionsHtml = options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${option.key ? ` data-key="${escapeHtml(option.key)}"` : ''}>${escapeHtml(option.label ?? option.value)}</option>`,
    )
    .join('');

  select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>${optionsHtml}`;
}

function fillLabelOptions(select, labels, allLabel) {
  fillOptions(
    select,
    Object.entries(labels).map(([key, label]) => ({ value: key, label })),
    allLabel,
  );
}

function citiesForRegionCode(regionCode) {
  return cities
    .filter((city) => city.regionCode === regionCode)
    .map((city) => ({ value: city.name, key: city.id, label: city.name }));
}

function resetNeighborhoodSelect(root) {
  const neighborhoodSelect = root.querySelector('[data-neighborhood-select]');
  fillOptions(neighborhoodSelect, [], 'Всички квартали');
  neighborhoodSelect.disabled = true;
}

function onRegionChange(root) {
  const regionSelect = root.querySelector('[data-region-select]');
  const citySelect = root.querySelector('[data-city-select]');
  const regionCode = regionSelect.selectedOptions[0]?.dataset.key;
  const cityItems = regionCode ? citiesForRegionCode(regionCode) : [];

  fillOptions(citySelect, cityItems, cityItems.length ? 'Всички градове' : 'Първо изберете област');
  citySelect.disabled = cityItems.length === 0;
  resetNeighborhoodSelect(root);
}

function onCityChange(root) {
  const citySelect = root.querySelector('[data-city-select]');
  const neighborhoodSelect = root.querySelector('[data-neighborhood-select]');
  const cityId = citySelect.selectedOptions[0]?.dataset.key;
  const list = cityId ? neighborhoods[cityId] : undefined;

  if (list && list.length > 0) {
    fillOptions(
      neighborhoodSelect,
      list.map((name) => ({ value: name, label: name })),
      'Всички квартали',
    );
    neighborhoodSelect.disabled = false;
  } else {
    fillOptions(neighborhoodSelect, [], 'Няма квартали');
    neighborhoodSelect.disabled = true;
  }
}

function populateFilterSelects(root) {
  fillLabelOptions(root.querySelector('[data-transaction-select]'), transactionTypeLabels, 'Всички сделки');
  fillLabelOptions(root.querySelector('[data-property-type-select]'), propertyTypeLabels, 'Всички видове');
  fillLabelOptions(root.querySelector('[data-construction-type-select]'), constructionTypeLabels, 'Всички конструкции');
  fillLabelOptions(root.querySelector('[data-construction-stage-select]'), constructionStageLabels, 'Всички етапи');
  fillLabelOptions(root.querySelector('[data-heating-select]'), heatingLabels, 'Всички видове отопление');
  fillLabelOptions(root.querySelector('[data-furnishing-select]'), furnishingLabels, 'Всички видове обзавеждане');

  fillOptions(
    root.querySelector('[data-region-select]'),
    regions.map((region) => ({ value: region.name, key: region.code, label: region.name })),
    'Всички области',
  );

  fillOptions(root.querySelector('[data-city-select]'), [], 'Първо изберете област');
  resetNeighborhoodSelect(root);
}

function numberOrNull(formData, name) {
  const raw = String(formData.get(name) ?? '').trim();

  if (!raw) {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

function textOrNull(formData, name) {
  const value = String(formData.get(name) ?? '').trim();

  return value || null;
}

function readFilters(form) {
  const formData = new FormData(form);

  return {
    q: textOrNull(formData, 'q'),
    transactionType: textOrNull(formData, 'transaction_type'),
    propertyType: textOrNull(formData, 'property_type'),
    region: textOrNull(formData, 'region'),
    city: textOrNull(formData, 'city'),
    neighborhood: textOrNull(formData, 'neighborhood'),
    minPrice: numberOrNull(formData, 'min_price'),
    maxPrice: numberOrNull(formData, 'max_price'),
    minArea: numberOrNull(formData, 'min_area'),
    maxArea: numberOrNull(formData, 'max_area'),
    minBedrooms: numberOrNull(formData, 'min_bedrooms'),
    minBathrooms: numberOrNull(formData, 'min_bathrooms'),
    minFloor: numberOrNull(formData, 'min_floor'),
    maxFloor: numberOrNull(formData, 'max_floor'),
    constructionType: textOrNull(formData, 'construction_type'),
    constructionStage: textOrNull(formData, 'construction_stage'),
    heating: textOrNull(formData, 'heating'),
    furnishing: textOrNull(formData, 'furnishing'),
  };
}

function debounce(fn, delay) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const SIMPLE_FILTER_FIELDS = [
  'q',
  'transaction_type',
  'property_type',
  'construction_type',
  'construction_stage',
  'heating',
  'furnishing',
  'min_price',
  'max_price',
  'min_area',
  'max_area',
  'min_bedrooms',
  'min_bathrooms',
  'min_floor',
  'max_floor',
];

function applyIncomingFilters(root, form) {
  const params = new URLSearchParams(window.location.search);

  if ([...params.keys()].length === 0) {
    return;
  }

  SIMPLE_FILTER_FIELDS.forEach((name) => {
    const value = params.get(name);
    const field = form.elements.namedItem(name);

    if (value && field) {
      field.value = value;
    }
  });

  const region = params.get('region');

  if (region) {
    const field = form.elements.namedItem('region');

    if (field) {
      field.value = region;
      onRegionChange(root);
    }
  }
}

export function hydrate(root) {
  const grid = root.querySelector('[data-properties-grid]');
  const form = root.querySelector('[data-filters-form]');
  const countLabel = root.querySelector('[data-filters-count]');

  if (!grid || !form) {
    return;
  }

  populateFilterSelects(root);
  applyIncomingFilters(root, form);

  const runSearch = async () => {
    grid.innerHTML = '<p class="text-slate-500">Зареждане на обявите…</p>';
    countLabel.textContent = '';

    const { data, error } = await fetchActiveProperties(readFilters(form));

    if (error) {
      grid.innerHTML = '<p class="text-rose-600">Обявите не можаха да бъдат заредени. Опитайте отново по-късно.</p>';
      return;
    }

    if (data.length === 0) {
      grid.innerHTML = '<p class="text-slate-500">Няма обяви, отговарящи на избраните филтри.</p>';
      countLabel.textContent = '';
      return;
    }

    grid.innerHTML = data.map(propertyCard).join('');
    countLabel.textContent = `${data.length} ${data.length === 1 ? 'резултат' : 'резултата'}`;
  };

  const debouncedSearch = debounce(runSearch, 400);

  root.querySelector('[data-region-select]').addEventListener('change', () => {
    onRegionChange(root);
    void runSearch();
  });

  root.querySelector('[data-city-select]').addEventListener('change', () => {
    onCityChange(root);
    void runSearch();
  });

  form.querySelectorAll('select:not([data-region-select]):not([data-city-select])').forEach((select) => {
    select.addEventListener('change', () => void runSearch());
  });

  form.querySelectorAll('input[type="text"], input[type="number"]').forEach((input) => {
    input.addEventListener('input', debouncedSearch);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void runSearch();
  });

  form.querySelector('[data-filters-reset]').addEventListener('click', () => {
    form.reset();
    populateFilterSelects(root);
    void runSearch();
  });

  void runSearch();
}
