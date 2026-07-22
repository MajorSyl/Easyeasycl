import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Android draws edge-to-edge in SDK 57, so the keyboard overlays the app
// instead of resizing it; track its height so bottom-pinned UI can move up.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
