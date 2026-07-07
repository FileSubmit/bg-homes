import './add-property.scss';
import template from './add-property.html?raw';
import {
  constructionStageLabels,
  constructionTypeLabels,
  currencyLabels,
  escapeHtml,
  furnishingLabels,
  heatingLabels,
  isUuid,
  propertyTypeLabels,
  transactionTypeLabels,
} from '../../lib/format.js';
import { cities, neighborhoods, regions } from '../../data/bg-locations.js';
import {
  createProperty,
  fetchFeatures,
  fetchPropertyById,
  sortedPhotos,
  updateProperty,
} from '../../lib/properties.js';
import {
  deletePropertyPhotosByUrl,
  MAX_PHOTOS,
  uploadPropertyPhoto,
  validatePhotoFile,
} from '../../lib/photo-upload.js';
import { navigateTo } from '../../router.js';

const MAX_PRICE = 999999999999.99;
const MAX_AREA = 99999999.99;

export function render() {
  return template;
}

function setMessage(root, message, tone = 'error') {
  const messageSlot = root.querySelector('[data-property-message]');

  if (!messageSlot) {
    return;
  }

  if (!message) {
    messageSlot.classList.add('d-none');
    messageSlot.textContent = '';
    return;
  }

  const tones = {
    error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  };

  messageSlot.className = `mt-4 whitespace-pre-line rounded-5 px-3 py-6 fs-sm ${tones[tone] ?? tones.error}`;
  messageSlot.textContent = message;

  if (tone === 'error' || tone === 'warning') {
    messageSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.dataset.key = item.key;
    option.textContent = item.value;
    select.appendChild(option);
  }
}

function ensureOption(select, value) {
  if (!value) {
    return;
  }

  const exists = [...select.options].some((option) => option.value === value);

  if (!exists) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  select.value = value;
}

function fillLabelSelect(select, labels) {
  fillSelect(
    select,
    Object.entries(labels).map(([key, value]) => ({ value: key, key })),
    'Изберете…',
  );

  for (const option of select.options) {
    if (option.value) {
      option.textContent = labels[option.value];
    }
  }
}

function populateStaticSelects(root) {
  fillLabelSelect(root.querySelector('[data-transaction-select]'), transactionTypeLabels);
  fillLabelSelect(root.querySelector('[data-property-type-select]'), propertyTypeLabels);
  fillLabelSelect(root.querySelector('[data-construction-type-select]'), constructionTypeLabels);
  fillLabelSelect(root.querySelector('[data-construction-stage-select]'), constructionStageLabels);
  fillLabelSelect(root.querySelector('[data-heating-select]'), heatingLabels);
  fillLabelSelect(root.querySelector('[data-furnishing-select]'), furnishingLabels);

  const currencySelect = root.querySelector('[data-currency-select]');
  currencySelect.innerHTML = '';
  for (const [code, label] of Object.entries(currencyLabels)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    currencySelect.appendChild(option);
  }

  const regionSelect = root.querySelector('[data-region-select]');
  fillSelect(
    regionSelect,
    regions.map((region) => ({ value: region.name, key: region.code })),
    'Изберете област…',
  );
}

function citiesForRegionCode(regionCode) {
  return cities
    .filter((city) => city.regionCode === regionCode)
    .map((city) => ({ value: city.name, key: city.id }));
}

function showNeighborhoodSelect(root) {
  root.querySelector('[data-neighborhood-select]').classList.remove('d-none');
  root.querySelector('[data-neighborhood-input]').classList.add('d-none');
}

function showNeighborhoodInput(root) {
  root.querySelector('[data-neighborhood-select]').classList.add('d-none');
  root.querySelector('[data-neighborhood-input]').classList.remove('d-none');
}

function resetNeighborhood(root) {
  const neighborhoodSelect = root.querySelector('[data-neighborhood-select]');
  const neighborhoodInput = root.querySelector('[data-neighborhood-input]');

  neighborhoodSelect.innerHTML = '<option value="">Изберете квартал…</option>';
  neighborhoodSelect.disabled = true;
  neighborhoodInput.value = '';
  neighborhoodInput.disabled = true;
  neighborhoodInput.placeholder = 'Първо изберете град…';
  showNeighborhoodInput(root);
}

function onCityChange(root) {
  const citySelect = root.querySelector('[data-city-select]');
  const neighborhoodSelect = root.querySelector('[data-neighborhood-select]');
  const neighborhoodInput = root.querySelector('[data-neighborhood-input]');
  const cityOption = citySelect.selectedOptions[0];
  const cityId = cityOption?.dataset.key;
  const list = cityId ? neighborhoods[cityId] : undefined;

  if (list && list.length > 0) {
    fillSelect(
      neighborhoodSelect,
      list.map((name) => ({ value: name, key: name })),
      'Изберете квартал…',
    );
    neighborhoodSelect.disabled = false;
    neighborhoodInput.disabled = true;
    neighborhoodInput.value = '';
    showNeighborhoodSelect(root);
  } else {
    neighborhoodSelect.disabled = true;
    neighborhoodInput.disabled = !cityId;
    neighborhoodInput.placeholder = cityId ? 'Квартал (по избор)' : 'Първо изберете град…';
    showNeighborhoodInput(root);
  }
}

function onRegionChange(root) {
  const regionSelect = root.querySelector('[data-region-select]');
  const citySelect = root.querySelector('[data-city-select]');
  const regionOption = regionSelect.selectedOptions[0];
  const regionCode = regionOption?.dataset.key;
  const cityItems = regionCode ? citiesForRegionCode(regionCode) : [];

  fillSelect(citySelect, cityItems, cityItems.length ? 'Изберете град…' : 'Първо изберете област…');
  citySelect.disabled = cityItems.length === 0;
  resetNeighborhood(root);
}

function wireLocationSelects(root) {
  populateStaticSelects(root);
  resetNeighborhood(root);

  root.querySelector('[data-region-select]').addEventListener('change', () => onRegionChange(root));
  root.querySelector('[data-city-select]').addEventListener('change', () => onCityChange(root));
}

function prefillLocation(root, property) {
  const regionSelect = root.querySelector('[data-region-select]');
  const citySelect = root.querySelector('[data-city-select]');
  const neighborhoodSelect = root.querySelector('[data-neighborhood-select]');
  const neighborhoodInput = root.querySelector('[data-neighborhood-input]');

  ensureOption(regionSelect, property.region);

  const regionOption = regionSelect.selectedOptions[0];
  const regionCode = regionOption?.dataset.key;
  const cityItems = regionCode ? citiesForRegionCode(regionCode) : [];

  fillSelect(citySelect, cityItems, cityItems.length ? 'Изберете град…' : 'Изберете област…');
  citySelect.disabled = false;
  ensureOption(citySelect, property.city);

  const cityOption = citySelect.selectedOptions[0];
  const cityId = cityOption?.dataset.key;
  const list = cityId ? neighborhoods[cityId] : undefined;

  if (list && list.length > 0) {
    fillSelect(
      neighborhoodSelect,
      list.map((name) => ({ value: name, key: name })),
      'Изберете квартал…',
    );
    neighborhoodSelect.disabled = false;
    ensureOption(neighborhoodSelect, property.neighborhood);
    neighborhoodInput.disabled = true;
    showNeighborhoodSelect(root);
  } else {
    neighborhoodInput.disabled = false;
    neighborhoodInput.value = property.neighborhood ?? '';
    neighborhoodInput.placeholder = 'Квартал (по избор)';
    showNeighborhoodInput(root);
  }
}

function textValue(formData, name, { required = false, maxLength = 200, label }, errors) {
  const value = String(formData.get(name) ?? '').trim();

  if (!value) {
    if (required) {
      errors.push(`${label} е задължително поле.`);
    }

    return null;
  }

  if (value.length > maxLength) {
    errors.push(`${label} трябва да е най-много ${maxLength} символа.`);
    return null;
  }

  return value;
}

function numberValue(formData, name, { required = false, min, max, integer = false, label }, errors) {
  const raw = String(formData.get(name) ?? '').trim();

  if (!raw) {
    if (required) {
      errors.push(`${label} е задължително поле.`);
    }

    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    errors.push(`${label} трябва да е валидно ${integer ? 'цяло ' : ''}число.`);
    return null;
  }

  if (min !== undefined && value < min) {
    errors.push(`${label} трябва да е поне ${min}.`);
    return null;
  }

  if (max !== undefined && value > max) {
    errors.push(`${label} трябва да е най-много ${max}.`);
    return null;
  }

  return value;
}

function enumValue(formData, name, { required = false, allowed, label }, errors) {
  const value = String(formData.get(name) ?? '').trim();

  if (!value) {
    if (required) {
      errors.push(`${label} е задължително поле.`);
    }

    return null;
  }

  if (!allowed.includes(value)) {
    errors.push(`${label} съдържа невалидна стойност.`);
    return null;
  }

  return value;
}

function parseForm(formData, knownFeatureIds) {
  const errors = [];
  const currentYear = new Date().getFullYear();

  const property = {
    title: textValue(formData, 'title', { required: true, maxLength: 200, label: 'Заглавието' }, errors),
    transaction_type: enumValue(formData, 'transaction_type', {
      required: true,
      allowed: Object.keys(transactionTypeLabels),
      label: 'Сделката',
    }, errors),
    property_type: enumValue(formData, 'property_type', {
      required: true,
      allowed: Object.keys(propertyTypeLabels),
      label: 'Видът имот',
    }, errors),
    price: numberValue(formData, 'price', { required: true, min: 0, max: MAX_PRICE, label: 'Цената' }, errors),
    currency: enumValue(formData, 'currency', {
      required: true,
      allowed: Object.keys(currencyLabels),
      label: 'Валутата',
    }, errors),
    region: textValue(formData, 'region', { required: true, maxLength: 120, label: 'Областта' }, errors),
    city: textValue(formData, 'city', { required: true, maxLength: 120, label: 'Градът' }, errors),
    neighborhood: textValue(formData, 'neighborhood', { maxLength: 120, label: 'Кварталът' }, errors),
    address: textValue(formData, 'address', { required: true, maxLength: 200, label: 'Адресът' }, errors),
    net_area: numberValue(formData, 'net_area', { min: 1, max: MAX_AREA, label: 'Полезната площ' }, errors),
    gross_area: numberValue(formData, 'gross_area', { min: 1, max: MAX_AREA, label: 'Общата площ' }, errors),
    bedrooms: numberValue(formData, 'bedrooms', { min: 0, max: 100, integer: true, label: 'Спалните' }, errors),
    bathrooms: numberValue(formData, 'bathrooms', { min: 0, max: 100, label: 'Банните' }, errors),
    floor: numberValue(formData, 'floor', { min: -5, max: 200, integer: true, label: 'Етажът' }, errors),
    total_floors: numberValue(formData, 'total_floors', { min: 1, max: 200, integer: true, label: 'Общо етажите' }, errors),
    construction_type: enumValue(formData, 'construction_type', {
      allowed: Object.keys(constructionTypeLabels),
      label: 'Конструкцията',
    }, errors),
    construction_year: numberValue(formData, 'construction_year', {
      min: 1800,
      max: currentYear + 1,
      integer: true,
      label: 'Годината на строеж',
    }, errors),
    construction_stage: enumValue(formData, 'construction_stage', {
      allowed: Object.keys(constructionStageLabels),
      label: 'Етапът на строителство',
    }, errors),
    heating: enumValue(formData, 'heating', { allowed: Object.keys(heatingLabels), label: 'Отоплението' }, errors),
    furnishing: enumValue(formData, 'furnishing', { allowed: Object.keys(furnishingLabels), label: 'Обзавеждането' }, errors),
    description: textValue(formData, 'description', { maxLength: 5000, label: 'Описанието' }, errors),
  };

  if (property.bathrooms !== null) {
    property.bathrooms = Math.round(property.bathrooms * 10) / 10;
  }

  const featureIds = formData
    .getAll('features')
    .map((value) => String(value))
    .filter((value) => isUuid(value) && knownFeatureIds.has(value));

  return { property, featureIds, errors };
}

function renderFeatures(root, features) {
  const section = root.querySelector('[data-features-section]');
  const list = root.querySelector('[data-features-list]');

  if (!section || !list || features.length === 0) {
    return;
  }

  section.classList.remove('d-none');
  list.innerHTML = features
    .map(
      (feature) => `
        <label class="col d-flex align-items-center gap-2 rounded-5 border border-slate-200 px-3 py-18 fs-sm text-slate-700">
          <input type="checkbox" name="features" value="${escapeHtml(feature.id)}" class="form-check-input mt-0" />
          <span>${escapeHtml(feature.name)}</span>
        </label>
      `,
    )
    .join('');
}

function prefillForm(form, property) {
  const fields = [
    'title',
    'transaction_type',
    'property_type',
    'price',
    'currency',
    'address',
    'net_area',
    'gross_area',
    'bedrooms',
    'bathrooms',
    'floor',
    'total_floors',
    'construction_type',
    'construction_year',
    'construction_stage',
    'heating',
    'furnishing',
    'description',
  ];

  for (const field of fields) {
    const element = form.elements.namedItem(field);

    if (element) {
      element.value = property[field] ?? '';
    }
  }
}

function checkFeatureBoxes(form, featureIds) {
  const selected = new Set(featureIds);

  form.querySelectorAll('input[name="features"]').forEach((checkbox) => {
    checkbox.checked = selected.has(checkbox.value);
  });
}

function createPhotoManager(root) {
  const previews = root.querySelector('[data-photo-previews]');
  const input = root.querySelector('[data-photo-input]');
  const uploadLabel = root.querySelector('[data-photo-upload-label]');
  let items = [];

  function render() {
    previews.innerHTML = items
      .map(
        (item, index) => `
          <div class="col property-photo-thumb position-relative overflow-hidden rounded-5 ring-1 ring-slate-200" data-photo-item="${escapeHtml(item.id)}">
            <img src="${escapeHtml(item.previewUrl)}" alt="" class="h-28 w-100 object-fit-cover" />
            ${index === 0 ? '<span class="photo-badge-cover rounded-pill bg-slate-900-80 px-2 py-16 fs-10 fw-semibold text-uppercase tracking-wide text-white">Корица</span>' : ''}
            <button type="button" data-photo-remove="${escapeHtml(item.id)}" class="photo-badge-remove d-flex h-6 w-6 align-items-center justify-content-center rounded-pill bg-slate-900-80 fs-xs fw-bold text-white transition hover-bg-rose-600" aria-label="Премахни снимка">×</button>
            ${index !== 0 ? `<button type="button" data-photo-cover="${escapeHtml(item.id)}" class="photo-badge-setcover photo-badge-reveal rounded-pill bg-white-90 px-2 py-16 fs-10 fw-semibold text-slate-700 opacity-0 transition hover-bg-white">Направи основна</button>` : ''}
          </div>
        `,
      )
      .join('');

    uploadLabel.classList.toggle('d-none', items.length >= MAX_PHOTOS);

    previews.querySelectorAll('[data-photo-remove]').forEach((button) => {
      button.addEventListener('click', () => remove(button.dataset.photoRemove));
    });

    previews.querySelectorAll('[data-photo-cover]').forEach((button) => {
      button.addEventListener('click', () => makeCover(button.dataset.photoCover));
    });
  }

  function remove(id) {
    const item = items.find((entry) => entry.id === id);

    if (item?.file) {
      URL.revokeObjectURL(item.previewUrl);
    }

    items = items.filter((entry) => entry.id !== id);
    render();
  }

  function makeCover(id) {
    const index = items.findIndex((entry) => entry.id === id);

    if (index > 0) {
      const [item] = items.splice(index, 1);
      items.unshift(item);
      render();
    }
  }

  function addExisting(photoUrl) {
    items.push({ id: crypto.randomUUID(), isExisting: true, url: photoUrl, previewUrl: photoUrl });
  }

  function addFiles(fileList, onError) {
    const remaining = MAX_PHOTOS - items.length;
    const files = [...fileList].slice(0, Math.max(remaining, 0));

    if (fileList.length > remaining) {
      onError(`Можете да добавите най-много ${MAX_PHOTOS} снимки.`);
    }

    for (const file of files) {
      const validationError = validatePhotoFile(file);

      if (validationError) {
        onError(validationError);
        continue;
      }

      items.push({
        id: crypto.randomUUID(),
        isExisting: false,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    render();
  }

  input.addEventListener('change', () => {
    addFiles(input.files, (message) => setMessage(root, message, 'warning'));
    input.value = '';
  });

  return {
    addExisting,
    render,
    getItems: () => items,
  };
}

export function hydrate(root, params, { authState }) {
  const form = root.querySelector('[data-property-form]');
  const submitButton = root.querySelector('[data-property-submit]');

  if (!form || !authState?.user) {
    return;
  }

  wireLocationSelects(root);
  const photoManager = createPhotoManager(root);

  const isEdit = Boolean(params?.id);
  let propertyId = isEdit ? params.id : null;
  const knownFeatureIds = new Set();
  let originalPhotoUrls = [];

  if (isEdit) {
    root.querySelector('[data-form-title]').textContent = 'Редактиране на имот';
    root.querySelector('[data-form-subtitle]').textContent = 'Обновете данните на обявата си по-долу.';
    submitButton.textContent = 'Запазване на промените';
    root.querySelector('[data-property-cancel]')?.setAttribute('href', '/profile');
  }

  const setBusy = (busy) => {
    submitButton.disabled = busy;
    submitButton.textContent = busy
      ? 'Запазване…'
      : isEdit || propertyId
        ? 'Запазване на промените'
        : 'Публикуване на обявата';
  };

  const loadInitialData = async () => {
    const { data: features } = await fetchFeatures();

    features.forEach((feature) => knownFeatureIds.add(feature.id));
    renderFeatures(root, features);

    if (!isEdit) {
      return;
    }

    if (!isUuid(propertyId)) {
      form.classList.add('d-none');
      setMessage(root, 'Имотът не е намерен.');
      return;
    }

    const { data: property, error } = await fetchPropertyById(propertyId);

    if (error || !property) {
      form.classList.add('d-none');
      setMessage(root, 'Имотът не е намерен или вече не е наличен.');
      return;
    }

    if (property.owner_id !== authState.user.id && !authState.isAdmin) {
      form.classList.add('d-none');
      setMessage(root, 'Можете да редактирате само своите обяви.');
      return;
    }

    prefillForm(form, property);
    prefillLocation(root, property);
    checkFeatureBoxes(form, (property.property_features ?? []).map((row) => row.feature_id));

    originalPhotoUrls = sortedPhotos(property).map((photo) => photo.photo_url);
    originalPhotoUrls.forEach((url) => photoManager.addExisting(url));
    photoManager.render();
  };

  void loadInitialData();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(root, '');

    const { property, featureIds, errors } = parseForm(new FormData(form), knownFeatureIds);

    if (errors.length > 0) {
      setMessage(root, errors.join('\n'));
      return;
    }

    setBusy(true);

    const photoItems = photoManager.getItems();
    const finalPhotoUrls = [];
    let uploadError = null;

    for (const item of photoItems) {
      if (item.isExisting) {
        finalPhotoUrls.push(item.url);
        continue;
      }

      const { url, error } = await uploadPropertyPhoto(item.file, authState.user.id);

      if (error || !url) {
        uploadError = `Неуспешно качване на снимка "${item.file.name}".`;
        break;
      }

      finalPhotoUrls.push(url);
    }

    if (uploadError) {
      setBusy(false);
      setMessage(root, uploadError);
      return;
    }

    const payload = { property, photoUrls: finalPhotoUrls, featureIds };
    const result = propertyId
      ? await updateProperty(propertyId, payload)
      : await createProperty({ ...payload, property: { ...property, owner_id: authState.user.id } });

    setBusy(false);

    if (result.error) {
      setMessage(root, result.error.message || 'Обявата не можа да бъде запазена.');
      return;
    }

    propertyId = result.data.id;

    const removedPhotoUrls = originalPhotoUrls.filter((url) => !finalPhotoUrls.includes(url));

    if (removedPhotoUrls.length > 0) {
      void deletePropertyPhotosByUrl(removedPhotoUrls);
    }

    if (result.photosError || result.featuresError) {
      setMessage(
        root,
        'Обявата беше запазена, но някои снимки или особености не бяха съхранени. Прегледайте ги и запазете отново.',
        'warning',
      );
      return;
    }

    navigateTo(`/properties/${result.data.id}`);
  });
}
