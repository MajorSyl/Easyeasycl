import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadListingPhoto } from '../lib/upload';
import { colors, fontSize, radius, spacing } from '../constants/theme';

const MAX_PHOTOS = 10;

export function PhotoPicker({
  photos,
  onChange,
  userId,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  userId: string;
}) {
  const [uploading, setUploading] = useState(false);

  function pickAndUpload() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    // react-native-web's Alert.alert is a no-op (it never renders anything),
    // so the native action-sheet chooser below silently does nothing on
    // web — go straight to the file/gallery picker there instead, which
    // does have real web support and still lets a mobile browser offer its
    // camera as one of the picker's own options.
    if (Platform.OS === 'web') {
      chooseFromGallery(remaining);
      return;
    }
    Alert.alert('Add photos', undefined, [
      { text: 'Take a photo', onPress: () => captureFromCamera() },
      { text: 'Choose from gallery', onPress: () => chooseFromGallery(remaining) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function captureFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access to take listing photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    await uploadAssets(result);
  }

  async function chooseFromGallery(remaining: number) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Please allow photo library access to add listing photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    await uploadAssets(result);
  }

  async function uploadAssets(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || result.assets.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        const url = await uploadListingPhoto(asset.uri, userId);
        uploaded.push(url);
      }
      onChange([...photos, ...uploaded]);
    } catch {
      Alert.alert('Upload failed', 'One or more photos could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    onChange(photos.filter((p) => p !== url));
  }

  if (photos.length === 0) {
    return (
      <Pressable
        style={styles.emptyBox}
        onPress={pickAndUpload}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Upload listing photos"
      >
        {uploading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyBoxTitle}>Tap to upload photos</Text>
            <Text style={styles.emptyBoxCaption}>UP TO {MAX_PHOTOS} IMAGES</Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
      {photos.map((url, index) => (
        <View key={url} style={styles.thumbWrap}>
          <Image
            source={{ uri: url }}
            style={styles.thumb}
            contentFit="cover"
            accessible
            accessibilityLabel={`Listing photo ${index + 1}`}
          />
          <Pressable
            style={styles.removeButton}
            onPress={() => removePhoto(url)}
            hitSlop={13}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
          >
            <Ionicons name="close" size={12} color="#fff" />
          </Pressable>
        </View>
      ))}
      {photos.length < MAX_PHOTOS && (
        <Pressable
          style={styles.addTile}
          onPress={pickAndUpload}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Add another photo"
        >
          {uploading ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="add" size={24} color={colors.textMuted} />}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyBoxTitle: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  emptyBoxCaption: { fontSize: 10, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  thumbRow: { gap: spacing.sm },
  thumbWrap: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
