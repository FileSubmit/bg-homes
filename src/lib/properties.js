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

export async function fetchActiveProperties({ limit } = {}) {
  if (!supabase) {
    const data = limit ? sampleProperties.slice(0, limit) : sampleProperties;
    return { data, error: null };
  }

  let query = supabase
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

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
    .select(`${PROPERTY_SELECT}, property_features (feature_id)`)
    .eq('id', id)
    .maybeSingle();

  return { data, error };
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
