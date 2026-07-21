import { supabase } from './supabase';

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  listingId: string | null = null
): Promise<string> {
  const [participantOne, participantTwo] = [userId, otherUserId].sort();

  let existingQuery = supabase
    .from('conversations')
    .select('id')
    .eq('participant_one', participantOne)
    .eq('participant_two', participantTwo);
  existingQuery = listingId ? existingQuery.eq('listing_id', listingId) : existingQuery.is('listing_id', null);

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_one: participantOne, participant_two: participantTwo, listing_id: listingId })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}
