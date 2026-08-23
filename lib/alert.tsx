import { createContext, useCallback, useState, type ReactNode } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../constants/theme';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertState = { visible: boolean; title: string; message?: string; buttons: AlertButton[] };

const AlertContext = createContext<null>(null);

// react-native-web's Alert.alert is a hard no-op (its implementation is
// literally `static alert() {}`), so every Alert.alert call in the app —
// error messages, confirmations, action-sheet choices — silently does
// nothing on web. This module-level ref lets the imperative `appAlert()`
// API below reach the one AlertProvider modal mounted at the app root,
// without every call site needing to be a component that can useContext.
let showAlertRef: ((title: string, message: string | undefined, buttons: AlertButton[]) => void) | null = null;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState>({ visible: false, title: '', buttons: [] });

  const show = useCallback((title: string, message: string | undefined, buttons: AlertButton[]) => {
    setState({ visible: true, title, message, buttons: buttons.length > 0 ? buttons : [{ text: 'OK' }] });
  }, []);

  showAlertRef = show;

  function close() {
    setState((s) => ({ ...s, visible: false }));
  }

  function handlePress(button: AlertButton) {
    close();
    button.onPress?.();
  }

  return (
    <AlertContext.Provider value={null}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{state.title}</Text>
            {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
            <View style={styles.buttonStack}>
              {state.buttons.map((button, i) => (
                <Pressable
                  key={`${button.text}-${i}`}
                  style={[styles.button, i > 0 && styles.buttonBorder]}
                  onPress={() => handlePress(button)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'destructive' && styles.buttonTextDestructive,
                      button.style === 'cancel' && styles.buttonTextCancel,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

// Drop-in replacement for RN's Alert.alert(title, message, buttons) that
// actually works on web. Uses the platform's real native Alert on
// iOS/Android (unchanged, already correct there) and the modal above only
// on web.
export function appAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as Parameters<typeof Alert.alert>[2]);
    return;
  }
  if (!showAlertRef) return;
  showAlertRef(title, message, buttons ?? []);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
    ...shadow.raised,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  buttonStack: { marginTop: spacing.xl, marginHorizontal: -spacing.xl },
  button: { paddingVertical: spacing.md, alignItems: 'center' },
  buttonBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  buttonText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.accent },
  buttonTextDestructive: { color: colors.danger },
  buttonTextCancel: { color: colors.textSecondary, fontWeight: fontWeight.regular },
});
