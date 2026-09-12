import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SelectField, type SelectOption } from './SelectField';
import { SIERRA_LEONE_DISTRICTS, OTHER_CITY, citiesForDistrict } from '../constants/locations';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { type } from '../constants/typography';

const districtOptions: SelectOption<string>[] = SIERRA_LEONE_DISTRICTS.map((d) => ({ value: d.name, label: d.name }));

// District -> City/Town -> Location, in that order, reused by both the Add
// Listing and Edit Listing forms. City/Town always offers "Other" so an
// agent in a town too small to be on our list can still list -- picking it
// reveals a free-text input instead of leaving them stuck.
export function LocationFields({
  district,
  city,
  location,
  onDistrictChange,
  onCityChange,
  onLocationChange,
}: {
  district: string;
  city: string;
  location: string;
  onDistrictChange: (district: string) => void;
  onCityChange: (city: string) => void;
  onLocationChange: (location: string) => void;
}) {
  const knownCities = district ? citiesForDistrict(district) : [];
  const hasCity = city.trim().length > 0;
  const isOtherCity = hasCity && !knownCities.includes(city);
  const citySelectValue = !hasCity ? null : isOtherCity ? OTHER_CITY : city;
  const cityOptions: SelectOption<string>[] = [
    ...knownCities.map((c) => ({ value: c, label: c })),
    { value: OTHER_CITY, label: 'Other (type your town)' },
  ];

  function handleDistrictChange(next: string) {
    onDistrictChange(next);
    // Only clear the city if the district actually changed -- SelectField
    // fires onChange even when re-tapping the option that's already
    // selected, so without this guard, opening the District picker just to
    // look and tapping the same value again would silently wipe out a
    // City/Town the agent had already picked.
    if (next !== district) onCityChange('');
  }

  function handleCitySelect(next: string) {
    onCityChange(next === OTHER_CITY ? '' : next);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <SelectField
            label="District"
            placeholder="Select district"
            value={district || null}
            options={districtOptions}
            onChange={handleDistrictChange}
          />
        </View>
        <View style={styles.flex1}>
          <SelectField
            label="City / Town"
            placeholder={district ? 'Select city/town' : 'Select a district first'}
            value={citySelectValue}
            options={cityOptions}
            onChange={handleCitySelect}
          />
        </View>
      </View>

      {isOtherCity && (
        <View>
          <Text style={styles.fieldLabel}>Your City / Town</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bumpe"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={onCityChange}
          />
        </View>
      )}

      <View>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Goderich"
          placeholderTextColor={colors.textMuted}
          value={location}
          onChangeText={onLocationChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
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
});
