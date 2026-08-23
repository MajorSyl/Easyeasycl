import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useFavorites } from '../lib/favorites-context';
import { colors } from '../constants/theme';

type ItemType = 'listing' | 'hotel' | 'service';

export function FavoriteButton({ itemType, itemId }: { itemType: ItemType; itemId: string }) {
  const { session } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const favorited = isFavorited(itemType, itemId);

  function handlePress() {
    if (!session) {
      router.push('/auth');
      return;
    }
    toggle(itemType, itemId);
  }

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
      accessibilityState={{ selected: favorited }}
    >
      <Ionicons
        name={favorited ? 'heart' : 'heart-outline'}
        size={18}
        color={favorited ? colors.favoriteIcon : colors.textSecondary}
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
