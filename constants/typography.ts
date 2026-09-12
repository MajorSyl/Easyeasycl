// Three families, three jobs -- not three fonts sprinkled evenly everywhere:
//
// Poppins  -- headlines, section titles, and price. The one place personality
//             shows (geometric warmth, not sterile).
// Inter    -- everything dense and functional: descriptions, form fields,
//             secondary text. Built for legibility at small sizes.
// Montserrat -- micro-labels and stat text, in normal case by default.
//             Uppercase + letter-spacing is reserved for the category badge
//             only (it borrows real-estate yard-sign convention there) --
//             not stamped on every label, which is the generic "AI app" tell.
export const fontFamily = {
  headlineBold: 'Poppins_700Bold',
  headlineSemibold: 'Poppins_600SemiBold',
  headlineMedium: 'Poppins_500Medium',

  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',

  labelMedium: 'Montserrat_500Medium',
  labelSemibold: 'Montserrat_600SemiBold',
} as const;

export const fontsToLoad = {
  Poppins_700Bold: require('@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf'),
  Poppins_600SemiBold: require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'),
  Poppins_500Medium: require('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf'),
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
  Montserrat_600SemiBold: require('@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf'),
};

// Named roles -- import `type` and spread onto a Text style rather than
// hand-picking family/size/weight per screen. Line heights are set
// explicitly because custom fonts (unlike the system font) don't get a
// sensible default from React Native.
export const type = {
  // One-per-screen hero headline (home greeting, empty states, welcome).
  display: { fontFamily: fontFamily.headlineBold, fontSize: 32, lineHeight: 38 },
  // Section/page headers ("New Listings", "Recommended").
  sectionTitle: { fontFamily: fontFamily.headlineSemibold, fontSize: 20, lineHeight: 26 },
  // Screen-level titles (header bars).
  screenTitle: { fontFamily: fontFamily.headlineSemibold, fontSize: 18, lineHeight: 24 },
  // Listing/card titles.
  cardTitle: { fontFamily: fontFamily.bodySemibold, fontSize: 14, lineHeight: 19 },
  // The single most important number on a card or detail page.
  priceLarge: { fontFamily: fontFamily.headlineBold, fontSize: 22, lineHeight: 27 },
  priceMedium: { fontFamily: fontFamily.headlineSemibold, fontSize: 17, lineHeight: 21 },
  // Body copy, descriptions, form values.
  body: { fontFamily: fontFamily.bodyRegular, fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 23 },
  // Secondary/supporting text (locations, timestamps, helper text).
  secondary: { fontFamily: fontFamily.bodyRegular, fontSize: 13, lineHeight: 18 },
  // Buttons and interactive labels.
  button: { fontFamily: fontFamily.bodySemibold, fontSize: 15, lineHeight: 20 },
  // Micro-labels, stat pills, normal case.
  label: { fontFamily: fontFamily.labelMedium, fontSize: 11, lineHeight: 14 },
  labelStrong: { fontFamily: fontFamily.labelSemibold, fontSize: 11, lineHeight: 14 },
  // The one deliberately uppercase+tracked role -- category badges only.
  eyebrow: {
    fontFamily: fontFamily.labelSemibold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
} as const;
