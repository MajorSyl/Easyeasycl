import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';
import {
  applyLocationSuggestion,
  matchLocationText,
  suggestLocations,
  type LocationMatch,
} from '../lib/location-match';

// One free-text "Where is the property?" field, replacing the old
// District -> City/Town -> Location three-step picker. District/City are
// derived automatically in the background by matching the typed text
// against the known Sierra Leone city/town list (lib/location-match.ts) --
// the agent never selects them, just types where the property is (e.g. "Bo
// Town" or "Goderich, Freetown"), with suggestions to make common places
// quick to pick without typing the full name. Unmatched text still saves as
// entered; `onResolvedChange` reports the outcome so the caller can flag it
// for admin review.
export function LocationFields({
  location,
  onLocationChange,
  onResolvedChange,
}: {
  location: string;
  onLocationChange: (location: string) => void;
  onResolvedChange?: (match: LocationMatch | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => (focused ? suggestLocations(location) : []), [focused, location]);
  const match = useMemo(() => matchLocationText(location), [location]);

  useEffect(() => {
    onResolvedChange?.(match);
    // onResolvedChange deliberately excluded from deps -- callers pass an
    // inline setter that's a new function reference every render, which
    // would otherwise re-fire this effect on every keystroke instead of
    // only when the resolved match itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Where is the property? e.g. Goderich, Freetown"
        placeholderTextColor={colors.textMuted}
        value={location}
        onChangeText={onLocationChange}
        onFocus={() => setFocused(true)}
        // Delayed so a tap on a suggestion below registers before the list
        // unmounts -- blur fires before the suggestion's onPress otherwise.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />

      {location.trim().length > 0 &&
        (match ? (
          <Text style={styles.matchHint}>
            📍 {match.city ? `${match.city}, ` : ''}
            {match.district}
          </Text>
        ) : (
          <Text style={styles.noMatchHint}>
            We don't recognize this area yet — it'll still save, and we'll add it to our list.
          </Text>
        ))}

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.city}
              style={styles.suggestionRow}
              onPress={() => onLocationChange(applyLocationSuggestion(location, suggestion))}
            >
              <Text style={styles.suggestionCity}>{suggestion.label}</Text>
              <Text style={styles.suggestionDistrict}>{suggestion.district}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  fieldLabel: {
    ...type.labelStrong,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    ...type.body,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  matchHint: { ...type.secondary, fontSize: fontSize.xs, color: colors.success, marginTop: 6 },
  noMatchHint: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 6 },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    // Web and Android both need an explicit stacking hint to render this
    // above the form fields that follow it in the scroll view.
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionCity: { ...type.body, fontSize: fontSize.sm, color: colors.textPrimary },
  suggestionDistrict: { ...type.secondary, fontSize: fontSize.xs, color: colors.textMuted },
});
