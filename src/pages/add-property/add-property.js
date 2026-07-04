import template from './add-property.html?raw';
import {
  constructionStageLabels,
  constructionTypeLabels,
  escapeHtml,
  furnishingLabels,
  heatingLabels,
  isUuid,
  propertyTypeLabels,
  sanitizeUrl,
  transactionTypeLabels,
} from '../../lib/format.js';
import {
  createProperty,
  fetchFeatures,
  fetchPropertyById,
  sortedPhotos,
  updateProperty,
} from '../../lib/properties.js';
import { navigateTo } from '../../router.js';

const MAX_PHOTOS = 10;
const MAX_PRICE = 999999999999.99;
const MAX_AREA = 99999999.99;

const CURRENCIES = ['EUR', 'BGN', 'USD'];

export function render() {
  return template;
}

function setMessage(root, message, tone = 'error') {
  const messageSlot = root.querySelector('[data-property-message]');

  if (!messageSlot) {
    return;
  }

  if (!message) {
    messageSlot.classList.add('hidden');
    messageSlot.textContent = '';
    return;
  }

  const tones = {
    error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  };

  messageSlot.className = `mt-6 whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${tones[tone] ?? tones.error}`;
  messageSlot.textContent = message;
}

function textValue(formData, name, { required = false, maxLength = 200, label }, errors) {
  const value = String(formData.get(name) ?? '').trim();

  if (!value) {
    if (required) {
      errors.push(`${label} is required.`);
    }

    return null;
  }

  if (value.length > maxLength) {
    errors.push(`${label} must be at most ${maxLength} characters.`);
    return null;
  }

  return value;
}

function numberValue(formData, name, { required = false, min, max, integer = false, label }, errors) {
  const raw = String(formData.get(name) ?? '').trim();

  if (!raw) {
    if (required) {
      errors.push(`${label} is required.`);
    }

    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    errors.push(`${label} must be a valid ${integer ? 'whole ' : ''}number.`);
    return null;
  }

  if (min !== undefined && value < min) {
    errors.push(`${label} must be at least ${min}.`);
    return null;
  }

  if (max !== undefined && value > max) {
    errors.push(`${label} must be at most ${max}.`);
    return null;
  }

  return value;
}

function enumValue(formData, name, { required = false, allowed, label }, errors) {
  const value = String(formData.get(name) ?? '').trim();

  if (!value) {
    if (required) {
      errors.push(`${label} is required.`);
    }

    return null;
  }

  if (!allowed.includes(value)) {
    errors.push(`${label} has an invalid value.`);
    return null;
  }

  return value;
}

function photoUrlsValue(formData, errors) {
  const lines = String(formData.get('photos') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > MAX_PHOTOS) {
    errors.push(`You can add at most ${MAX_PHOTOS} photos.`);
    return [];
  }

  const urls = [];

  for (const line of lines) {
    const safeUrl = sanitizeUrl(line);

    if (!safeUrl || safeUrl.length > 2048) {
      errors.push(`Photo URL is not a valid http(s) address: ${line.slice(0, 80)}`);
      continue;
    }

    urls.push(safeUrl);
  }

  return [...new Set(urls)];
}

function parseForm(formData, knownFeatureIds) {
  const errors = [];
  const currentYear = new Date().getFullYear();

  const property = {
    title: textValue(formData, 'title', { required: true, maxLength: 200, label: 'Title' }, errors),
    transaction_type: enumValue(formData, 'transaction_type', {
      required: true,
      allowed: Object.keys(transactionTypeLabels),
      label: 'Transaction',
    }, errors),
    property_type: enumValue(formData, 'property_type', {
      required: true,
      allowed: Object.keys(propertyTypeLabels),
      label: 'Property type',
    }, errors),
    price: numberValue(formData, 'price', { required: true, min: 0, max: MAX_PRICE, label: 'Price' }, errors),
    currency: enumValue(formData, 'currency', { required: true, allowed: CURRENCIES, label: 'Currency' }, errors),
    region: textValue(formData, 'region', { required: true, maxLength: 120, label: 'Region' }, errors),
    city: textValue(formData, 'city', { required: true, maxLength: 120, label: 'City' }, errors),
    neighborhood: textValue(formData, 'neighborhood', { maxLength: 120, label: 'Neighborhood' }, errors),
    address: textValue(formData, 'address', { required: true, maxLength: 200, label: 'Address' }, errors),
    net_area: numberValue(formData, 'net_area', { min: 1, max: MAX_AREA, label: 'Net area' }, errors),
    gross_area: numberValue(formData, 'gross_area', { min: 1, max: MAX_AREA, label: 'Gross area' }, errors),
    bedrooms: numberValue(formData, 'bedrooms', { min: 0, max: 100, integer: true, label: 'Bedrooms' }, errors),
    bathrooms: numberValue(formData, 'bathrooms', { min: 0, max: 100, label: 'Bathrooms' }, errors),
    floor: numberValue(formData, 'floor', { min: -5, max: 200, integer: true, label: 'Floor' }, errors),
    total_floors: numberValue(formData, 'total_floors', { min: 1, max: 200, integer: true, label: 'Total floors' }, errors),
    construction_type: enumValue(formData, 'construction_type', {
      allowed: Object.keys(constructionTypeLabels),
      label: 'Construction type',
    }, errors),
    construction_year: numberValue(formData, 'construction_year', {
      min: 1800,
      max: currentYear + 1,
      integer: true,
      label: 'Construction year',
    }, errors),
    construction_stage: enumValue(formData, 'construction_stage', {
      allowed: Object.keys(constructionStageLabels),
      label: 'Construction stage',
    }, errors),
    heating: enumValue(formData, 'heating', { allowed: Object.keys(heatingLabels), label: 'Heating' }, errors),
    furnishing: enumValue(formData, 'furnishing', { allowed: Object.keys(furnishingLabels), label: 'Furnishing' }, errors),
    description: textValue(formData, 'description', { maxLength: 5000, label: 'Description' }, errors),
  };

  if (property.bathrooms !== null) {
    property.bathrooms = Math.round(property.bathrooms * 10) / 10;
  }

  const photoUrls = photoUrlsValue(formData, errors);
  const featureIds = formData
    .getAll('features')
    .map((value) => String(value))
    .filter((value) => isUuid(value) && knownFeatureIds.has(value));

  return { property, photoUrls, featureIds, errors };
}

function renderFeatures(root, features) {
  const section = root.querySelector('[data-features-section]');
  const list = root.querySelector('[data-features-list]');

  if (!section || !list || features.length === 0) {
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = features
    .map(
      (feature) => `
        <label class="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700">
          <input type="checkbox" name="features" value="${escapeHtml(feature.id)}" class="h-4 w-4 rounded border-slate-300 text-slate-900" />
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
    'region',
    'city',
    'neighborhood',
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

  const photosField = form.elements.namedItem('photos');

  if (photosField) {
    photosField.value = sortedPhotos(property)
      .map((photo) => photo.photo_url)
      .join('\n');
  }
}

function checkFeatureBoxes(form, featureIds) {
  const selected = new Set(featureIds);

  form.querySelectorAll('input[name="features"]').forEach((checkbox) => {
    checkbox.checked = selected.has(checkbox.value);
  });
}

export function hydrate(root, params, { authState }) {
  const form = root.querySelector('[data-property-form]');
  const submitButton = root.querySelector('[data-property-submit]');

  if (!form || !authState?.user) {
    return;
  }

  const isEdit = Boolean(params?.id);
  let propertyId = isEdit ? params.id : null;
  const knownFeatureIds = new Set();

  if (isEdit) {
    root.querySelector('[data-form-title]').textContent = 'Edit property';
    root.querySelector('[data-form-subtitle]').textContent = 'Update the details of your listing below.';
    submitButton.textContent = 'Save changes';
    root.querySelector('[data-property-cancel]')?.setAttribute('href', '/profile');
  }

  const setBusy = (busy) => {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'Saving…' : isEdit || propertyId ? 'Save changes' : 'Publish listing';
  };

  const loadInitialData = async () => {
    const { data: features } = await fetchFeatures();

    features.forEach((feature) => knownFeatureIds.add(feature.id));
    renderFeatures(root, features);

    if (!isEdit) {
      return;
    }

    if (!isUuid(propertyId)) {
      form.classList.add('hidden');
      setMessage(root, 'Property not found.');
      return;
    }

    const { data: property, error } = await fetchPropertyById(propertyId);

    if (error || !property) {
      form.classList.add('hidden');
      setMessage(root, 'Property not found or it is no longer available.');
      return;
    }

    if (property.owner_id !== authState.user.id && !authState.isAdmin) {
      form.classList.add('hidden');
      setMessage(root, 'You can only edit your own listings.');
      return;
    }

    prefillForm(form, property);
    checkFeatureBoxes(form, (property.property_features ?? []).map((row) => row.feature_id));
  };

  void loadInitialData();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(root, '');

    const { property, photoUrls, featureIds, errors } = parseForm(new FormData(form), knownFeatureIds);

    if (errors.length > 0) {
      setMessage(root, errors.join('\n'));
      return;
    }

    setBusy(true);

    const payload = { property, photoUrls, featureIds };
    const result = propertyId
      ? await updateProperty(propertyId, payload)
      : await createProperty({ ...payload, property: { ...property, owner_id: authState.user.id } });

    setBusy(false);

    if (result.error) {
      setMessage(root, result.error.message || 'Could not save the listing.');
      return;
    }

    propertyId = result.data.id;

    if (result.photosError || result.featuresError) {
      setMessage(
        root,
        'The listing was saved, but some photos or features could not be stored. Review them and save again.',
        'warning',
      );
      return;
    }

    navigateTo(`/properties/${result.data.id}`);
  });
}
