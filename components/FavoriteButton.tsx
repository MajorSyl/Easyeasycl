import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors } from '../constants/theme';

type ItemType = 'listing' | 'hotel' | 'service';

export function FavoriteButton({ itemType, itemId }: { itemType: ItemType; itemId: string }) {
  const { session } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsFavorited(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsFavorited(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [session, itemType, itemId]);

  async function toggle() {
    if (!session) {
      router.push('/auth');
      return;
    }
    if (busy) return;
    setBusy(true);
    const nextValue = !isFavorited;
    setIsFavorited(nextValue);
    if (nextValue) {
      await supabase.from('favorites').insert({ user_id: session.user.id, item_type: itemType, item_id: itemId });
    } else {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId);
    }
    setBusy(false);
  }

  return (
    <Pressable style={styles.button} onPress={toggle} hitSlop={8}>
      <Ionicons
        name={isFavorited ? 'heart' : 'heart-outline'}
        size={18}
        color={isFavorited ? colors.favoriteIcon : colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
