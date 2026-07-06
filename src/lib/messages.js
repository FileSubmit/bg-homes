import { supabase } from './supabase.js';

const CONVERSATION_SELECT = `
  id, property_id, buyer_id, owner_id, created_at, updated_at,
  property:properties (id, title, status),
  buyer:profiles!conversations_buyer_id_fkey (id, first_name, last_name, email),
  owner:profiles!conversations_owner_id_fkey (id, first_name, last_name, email),
  messages (id, sender_id, body, created_at, read_at)
`;

export function otherParticipant(conversation, userId) {
  return conversation.buyer_id === userId ? conversation.owner : conversation.buyer;
}

export function sortedMessages(conversation) {
  return [...(conversation.messages ?? [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export function lastMessage(conversation) {
  const messages = sortedMessages(conversation);
  return messages[messages.length - 1] ?? null;
}

export function unreadCountFor(conversation, userId) {
  return (conversation.messages ?? []).filter((message) => message.sender_id !== userId && !message.read_at).length;
}

export async function fetchConversations(userId) {
  if (!supabase) {
    return { data: [], error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function fetchUnreadMessageCount(userId) {
  if (!supabase) {
    return { count: 0, error: null };
  }

  const { data: conversationRows, error: conversationsError } = await supabase
    .from('conversations')
    .select('id')
    .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`);

  if (conversationsError) {
    return { count: 0, error: conversationsError };
  }

  const conversationIds = conversationRows.map((row) => row.id);

  if (conversationIds.length === 0) {
    return { count: 0, error: null };
  }

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .is('read_at', null)
    .neq('sender_id', userId);

  return { count: count ?? 0, error };
}

export async function sendPropertyMessage({ propertyId, ownerId, senderId, body }) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase не е конфигуриран.') };
  }

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('property_id', propertyId)
    .eq('buyer_id', senderId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (findError) {
    return { data: null, error: findError };
  }

  let conversationId = existing?.id;

  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({ property_id: propertyId, buyer_id: senderId, owner_id: ownerId })
      .select('id')
      .single();

    if (createError) {
      return { data: null, error: createError };
    }

    conversationId = created.id;
  }

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('id, created_at')
    .single();

  return { data: { conversationId, message }, error: messageError };
}

export async function sendReply({ conversationId, senderId, body }) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase не е конфигуриран.') };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('id, created_at')
    .single();

  return { data, error };
}

export async function markConversationRead(conversationId, currentUserId) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .is('read_at', null);

  return { error };
}
