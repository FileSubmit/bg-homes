import { supabase } from './supabase.js';

const PROFILE_ADMIN_COLUMNS = 'id, first_name, last_name, email, phone, role, created_at';
const PROPERTY_ADMIN_COLUMNS =
  'id, owner_id, title, transaction_type, property_type, price, currency, region, city, neighborhood, status, created_at, owner:profiles!properties_owner_id_fkey (first_name, last_name, email)';
const INQUIRY_ADMIN_COLUMNS =
  'id, property_id, sender_name, sender_email, sender_phone, message, status, created_at, property:properties (title)';

export async function fetchAllProfiles() {
  if (!supabase) {
    return { data: [], error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_ADMIN_COLUMNS)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function fetchAllPropertiesForAdmin() {
  if (!supabase) {
    return { data: [], error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTY_ADMIN_COLUMNS)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function fetchAllInquiries() {
  if (!supabase) {
    return { data: [], error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('inquiries')
    .select(INQUIRY_ADMIN_COLUMNS)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

function countBy(rows, key) {
  const counts = new Map();

  for (const row of rows) {
    const value = row[key] ?? 'other';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function topEntries(counts, limit) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function buildAdminStats({ profiles, properties, inquiries }) {
  const propertiesByOwner = countBy(properties, 'owner_id');

  return {
    users: {
      total: profiles.length,
      admins: profiles.filter((profile) => profile.role === 'admin').length,
    },
    properties: {
      total: properties.length,
      byStatus: countBy(properties, 'status'),
      byTransactionType: countBy(properties, 'transaction_type'),
      byPropertyType: countBy(properties, 'property_type'),
      topCities: topEntries(countBy(properties, 'city'), 5),
      byOwner: propertiesByOwner,
    },
    inquiries: {
      total: inquiries.length,
      byStatus: countBy(inquiries, 'status'),
    },
  };
}
