import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Web Speech API only -- no external voice service, no API key, zero
// ongoing cost. Not part of any TypeScript lib, so declared loosely here;
// only ever touched behind the Platform.OS === 'web' + feature-detect guard
// below.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

// Krio has no widely-supported browser speech-recognition language code --
// English recognition is the closest available (Krio is an English-lexified
// creole), so the raw transcript still comes back phonetically close enough
// for the text dictionary/parser to interpret afterward.
export type SearchLanguage = 'en' | 'kri';
const RECOGNITION_LANG: Record<SearchLanguage, string> = { en: 'en-US', kri: 'en-US' };

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceSearchSupported(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export function VoiceSearchButton({
  language,
  onResult,
  size = 20,
}: {
  language: SearchLanguage;
  onResult: (text: string) => void;
  size?: number;
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const Ctor = getSpeechRecognitionCtor();

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  if (!Ctor) return null;

  function handlePress() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Ctor!();
    recognition.lang = RECOGNITION_LANG[language];
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop voice search' : 'Search by voice'}
      accessibilityState={{ selected: listening }}
      style={styles.button}
    >
      {listening ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Ionicons name="mic-outline" size={size} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 2 },
});
