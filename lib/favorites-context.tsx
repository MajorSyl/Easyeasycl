import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

type ItemType = 'listing' | 'hotel' | 'service';

type FavoritesCtx = {
  isFavorited: (type: ItemType, id: string) => boolean;
  toggle: (type: ItemType, id: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesCtx>({
  isFavorited: () => false,
  toggle: async () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const busyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session) {
      setFavSet(new Set());
      return;
    }
    supabase
      .from('favorites')
      .select('item_type, item_id')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        const s = new Set<string>();
        for (const row of data ?? []) s.add(`${row.item_type}-${row.item_id}`);
        setFavSet(s);
      });
  }, [session]);

  const isFavorited = useCallback(
    (type: ItemType, id: string) => favSet.has(`${type}-${id}`),
    [favSet]
  );

  const toggle = useCallback(
    async (type: ItemType, id: string) => {
      if (!session) return;
      const key = `${type}-${id}`;
      if (busyRef.current.has(key)) return;
      busyRef.current.add(key);

      const next = !favSet.has(key);
      setFavSet((prev) => {
        const copy = new Set(prev);
        next ? copy.add(key) : copy.delete(key);
        return copy;
      });

      const { error } = next
        ? await supabase.from('favorites').insert({
            user_id: session.user.id,
            item_type: type,
            item_id: id,
          })
        : await supabase
            .from('favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('item_type', type)
            .eq('item_id', id);

      if (error) {
        // Roll back the optimistic update — the server never applied it.
        setFavSet((prev) => {
          const copy = new Set(prev);
          next ? copy.delete(key) : copy.add(key);
          return copy;
        });
      }

      busyRef.current.delete(key);
    },
    [session, favSet]
  );

  return (
    <FavoritesContext.Provider value={{ isFavorited, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
