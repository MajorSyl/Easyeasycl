import { Platform, Share } from 'react-native';
import { appAlert } from './alert';

// react-native-web's Share.share() calls the browser's navigator.share(),
// which most desktop browsers don't implement — it rejects instead of
// falling back to anything, so an un-caught call throws an unhandled
// promise rejection and the Share button silently "does nothing." Catch
// that specifically on web and fall back to copying the text to the
// clipboard instead, so sharing always does *something* useful.
export async function shareText(message: string) {
  try {
    await Share.share({ message });
  } catch (err) {
    if (Platform.OS !== 'web') return;
    try {
      await navigator.clipboard.writeText(message);
      appAlert('Copied to clipboard', 'Your browser can’t open the share menu, so we copied the listing details instead.');
    } catch {
      // Clipboard access also unavailable (e.g. insecure context) — nothing
      // more we can do without a paid/native share dependency.
    }
  }
}
