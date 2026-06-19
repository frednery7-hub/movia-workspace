import { Feather } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocale } from '../../context/LocaleContext';
import { useAppTheme } from '../../theme/ThemeContext';

type PermissionExplainerModalProps = {
  visible: boolean;
  kind: 'location' | 'notifications';
  onDismiss: () => void;
  onAllow: () => void;
  onOpenPrivacy: () => void;
};

export function PermissionExplainerModal({
  visible,
  kind,
  onDismiss,
  onAllow,
  onOpenPrivacy,
}: PermissionExplainerModalProps) {
  const { t } = useLocale();
  const theme = useAppTheme();
  const prefix = `permission.${kind}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surfaceElevated }]}>
          <View style={[styles.icon, { backgroundColor: theme.isDark ? '#10243E' : '#EEF6FF' }]}>
            <Feather name={kind === 'location' ? 'map-pin' : 'bell'} size={24} color="#1A73E8" />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t(`${prefix}.title`)}</Text>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{t(`${prefix}.body`)}</Text>
          <TouchableOpacity onPress={onOpenPrivacy} style={styles.privacyLink}>
            <Text style={styles.privacyLinkText}>{t('privacy.view_policy')}</Text>
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onDismiss} style={styles.secondaryButton}>
              <Text style={[styles.secondaryText, { color: theme.colors.textSecondary }]}>{t('permission.not_now')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAllow} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{t(`${prefix}.allow`)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,6,23,0.48)',
  },
  sheet: {
    padding: 24,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800' },
  body: { marginTop: 9, fontSize: 14, lineHeight: 21 },
  privacyLink: { alignSelf: 'flex-start', paddingVertical: 13 },
  privacyLinkText: { color: '#1A73E8', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  secondaryButton: { paddingHorizontal: 14, paddingVertical: 12 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  primaryButton: { backgroundColor: '#1A73E8', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
