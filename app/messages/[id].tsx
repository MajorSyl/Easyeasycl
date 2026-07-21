import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize } from '../../constants/theme';

export default function ChatThreadScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat thread — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textSecondary, fontSize: fontSize.md },
});
