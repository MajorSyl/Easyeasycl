import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { appAlert } from './alert';

export type Coords = { lat: number; lng: number };

// Shared "ask for and fetch device location" flow for Near Me / Browse by
// Location -- one permission prompt path, one place to explain a denial,
// reused by every screen that wants the user's coordinates.
export function useDeviceLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [requesting, setRequesting] = useState(false);

  const request = useCallback(async (): Promise<Coords | null> => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        appAlert(
          'Location access needed',
          Platform.OS === 'web'
            ? 'Allow location access in your browser to see nearby listings.'
            : 'Allow location access in Settings to see nearby listings.'
        );
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCoords(next);
      return next;
    } catch {
      appAlert('Could not get your location', 'Please try again.');
      return null;
    } finally {
      setRequesting(false);
    }
  }, []);

  return { coords, requesting, request };
}
