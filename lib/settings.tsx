import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DATA_LITE_KEY = 'easyfen_data_lite_mode';

type SettingsContextValue = {
  dataLiteMode: boolean;
  setDataLiteMode: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dataLiteMode, setDataLiteModeState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DATA_LITE_KEY).then((value) => {
      if (value === '1') setDataLiteModeState(true);
    });
  }, []);

  function setDataLiteMode(value: boolean) {
    setDataLiteModeState(value);
    AsyncStorage.setItem(DATA_LITE_KEY, value ? '1' : '0');
  }

  return (
    <SettingsContext.Provider value={{ dataLiteMode, setDataLiteMode }}>{children}</SettingsContext.Provider>
  );
}

// Falls back to "off" if called outside the provider (shouldn't happen —
// SettingsProvider is mounted once at the app root) rather than throwing,
// since a missing low-data toggle should never be able to crash a screen.
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  return ctx ?? { dataLiteMode: false, setDataLiteMode: () => {} };
}
