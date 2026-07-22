// Tiny pub/sub so screens that mutate listings/hotels/services (Add Listing,
// Edit Listing, delete from Profile) can tell Home's cached tabs to refetch,
// without wiring up a full global store just for cache invalidation.
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeListingsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyListingsChanged() {
  listeners.forEach((listener) => listener());
}
