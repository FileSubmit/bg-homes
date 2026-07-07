import { supabase } from './supabase.js';
import { properties as sampleProperties, findPropertyById } from '../data/properties.js';

const PROPERTY_COLUMNS = [
  'id',
  'owner_id',
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
  'status',
  'created_at',
  'updated_at',
].join(', ');

const PROPERTY_SELECT = `${PROPERTY_COLUMNS}, property_photos (id, photo_url, display_order, is_cover)`;

export function coverPhotoUrl(property) {
  const photos = property?.property_photos ?? [];
  const cover = photos.find((photo) => photo.is_cover) ?? [...photos].sort((a, b) => a.display_order - b.display_order)[0];

  return cover?.photo_url ?? null;
}

export function sortedPhotos(property) {
  return [...(property?.property_photos ?? [])].sort((a, b) => a.display_order - b.display_order);
}

function matchesFilters(property, filters) {
  const {
    q,
    transactionType,
    propertyType,
    region,
    city,
    neighborhood,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minBedrooms,
    minBathrooms,
    minFloor,
    maxFloor,
    constructionType,
    constructionStage,
    heating,
    furnishing,
  } = filters;

  if (q && !property.title?.toLowerCase().includes(q.toLowerCase())) return false;
  if (transactionType && property.transaction_type !== transactionType) return false;
  if (propertyType && property.property_type !== propertyType) return false;
  if (region && property.region !== region) return false;
  if (city && property.city !== city) return false;
  if (neighborhood && property.neighborhood !== neighborhood) return false;
  if (minPrice != null && !(property.price >= minPrice)) return false;
  if (maxPrice != null && !(property.price <= maxPrice)) return false;
  if (minArea != null && !(property.net_area >= minArea)) return false;
  if (maxArea != null && !(property.net_area <= maxArea)) return false;
  if (minBedrooms != null && !(property.bedrooms >= minBedrooms)) return false;
  if (minBathrooms != null && !(property.bathrooms >= minBathrooms)) return false;
  if (minFloor != null && !(property.floor >= minFloor)) return false;
  if (maxFloor != null && !(property.floor <= maxFloor)) return false;
  if (constructionType && property.construction_type !== constructionType) return false;
  if (constructionStage && property.construction_stage !== constructionStage) return false;
  if (heating && property.heating !== heating) return false;
  if (furnishing && property.furnishing !== furnishing) return false;

  return true;
}

export async function fetchActiveProperties(filters = {}) {
  const { limit } = filters;

  if (!supabase) {
    let data = sampleProperties.filter((property) => matchesFilters(property, filters));
    data = limit ? data.slice(0, limit) : data;
    return { data, error: null };
  }

  let query = supabase.from('properties').select(PROPERTY_SELECT).eq('status', 'active');

  if (filters.q) query = query.ilike('title', `%${filters.q.trim()}%`);
  if (filters.transactionType) query = query.eq('transaction_type', filters.transactionType);
  if (filters.propertyType) query = query.eq('property_type', filters.propertyType);
  if (filters.region) query = query.eq('region', filters.region);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.neighborhood) query = query.eq('neighborhood', filters.neighborhood);
  if (filters.minPrice != null) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice);
  if (filters.minArea != null) query = query.gte('net_area', filters.minArea);
  if (filters.maxArea != null) query = query.lte('net_area', filters.maxArea);
  if (filters.minBedrooms != null) query = query.gte('bedrooms', filters.minBedrooms);
  if (filters.minBathrooms != null) query = query.gte('bathrooms', filters.minBathrooms);
  if (filters.minFloor != null) query = query.gte('floor', filters.minFloor);
  if (filters.maxFloor != null) query = query.lte('floor', filters.maxFloor);
  if (filters.constructionType) query = query.eq('construction_type', filters.constructionType);
  if (filters.constructionStage) query = query.eq('construction_stage', filters.constructionStage);
  if (filters.heating) query = query.eq('heating', filters.heating);
  if (filters.furnishing) query = query.eq('furnishing', filters.furnishing);

  query = query.order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  return { data: data ?? [], error };
}

export async function fetchPropertyById(id) {
  if (!supabase) {
    return { data: findPropertyById(id), error: null };
  }

  const { data, error } = await supabase
    .from('properties')
    .select(`${PROPERTY_SELECT}, property_features (feature_id), owner:profiles!properties_owner_id_fkey (first_name, last_name, phone, email)`)
    .eq('id', id)
    .maybeSingle();

  return { data, error };
}

export async function fetchSimilarProperties(property, { limit = 3 } = {}) {
  if (!supabase) {
    const data = sampleProperties
      .filter((candidate) => candidate.id !== property.id && candidate.status === 'active')
      .filter(
        (candidate) =>
          (property.neighborhood && candidate.neighborhood === property.neighborhood) ||
          candidate.city === property.city,
      )
      .slice(0, limit);

    return { data, error: null };
  }

  let query = supabase.from('properties').select(PROPERTY_SELECT).eq('status', 'active').neq('id', property.id);

  query = property.neighborhood
    ? query.or(`neighborhood.eq.${property.neighborhood},city.eq.${property.city}`)
    : query.eq('city', property.city);

  query = query.order('created_at', { ascending: false }).limit(limit);

  const { data, error } = await query;

  return { data: data ?? [], error };
}

export async function fetchOwnerProperties(ownerId, { excludeId, limit = 3 } = {}) {
  if (!supabase) {
    const data = sampleProperties
      .filter((candidate) => candidate.owner_id === ownerId && candidate.id !== excludeId && candidate.status === 'active')
      .slice(0, limit);

    return { data, error: null };
  }

  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('status', 'active')
    .eq('owner_id', ownerId)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

export async function fetchOwnProperties(userId) {
  if (!supabase) {
    return { data: [], error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function fetchFeatures() {
  if (!supabase) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('features')
    .select('id, name, icon_name')
    .order('name', { ascending: true });

  return { data: data ?? [], error };
}

async function replacePhotos(propertyId, photoUrls) {
  const { error: deleteError } = await supabase
    .from('property_photos')
    .delete()
    .eq('property_id', propertyId);

  if (deleteError) {
    return deleteError;
  }

  if (photoUrls.length === 0) {
    return null;
  }

  const rows = photoUrls.map((photoUrl, index) => ({
    property_id: propertyId,
    photo_url: photoUrl,
    display_order: index,
    is_cover: index === 0,
  }));

  const { error: insertError } = await supabase.from('property_photos').insert(rows);

  return insertError;
}

async function replaceFeatures(propertyId, featureIds) {
  const { error: deleteError } = await supabase
    .from('property_features')
    .delete()
    .eq('property_id', propertyId);

  if (deleteError) {
    return deleteError;
  }

  if (featureIds.length === 0) {
    return null;
  }

  const rows = featureIds.map((featureId) => ({
    property_id: propertyId,
    feature_id: featureId,
  }));

  const { error: insertError } = await supabase.from('property_features').insert(rows);

  return insertError;
}

export async function createProperty({ property, photoUrls = [], featureIds = [] }) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select(PROPERTY_COLUMNS)
    .single();

  if (error) {
    return { data: null, error };
  }

  const photosError = await replacePhotos(data.id, photoUrls);
  const featuresError = await replaceFeatures(data.id, featureIds);

  return { data, error: null, photosError, featuresError };
}

export async function updateProperty(id, { property, photoUrls = [], featureIds = [] }) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('properties')
    .update(property)
    .eq('id', id)
    .select(PROPERTY_COLUMNS)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error('Имотът не е намерен или нямате право да го редактирате.') };
  }

  const photosError = await replacePhotos(id, photoUrls);
  const featuresError = await replaceFeatures(id, featureIds);

  return { data, error: null, photosError, featuresError };
}

export async function setPropertyStatus(id, status) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error('Имотът не е намерен или нямате право да го променяте.') };
  }

  return { data, error: null };
}

export async function deleteProperty(id) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error('Имотът не е намерен или нямате право да го изтриете.') };
  }

  return { data, error: null };
}
