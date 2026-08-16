import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { requestEmailCode, signOut, verifyEmailCode } from '../services/supabase/auth';
import { supabase } from '../services/supabase/client';
import { useAppStore } from '../state/store';
import { palette } from '../theme/palette';
import { ToggleRow } from './ToggleRow';

type Stage = 'idle' | 'code-sent';

export function AccountSyncSection() {
  const authEmail = useAppStore((s) => s.authEmail);
  const huntLog = useAppStore((s) => s.huntLog);
  const thermalLogs = useAppStore((s) => s.thermalLogs);
  const syncedEntryIds = useAppStore((s) => s.syncedEntryIds);
  const shareForTraining = useAppStore((s) => s.shareForTraining);
  const setShareForTraining = useAppStore((s) => s.setShareForTraining);

  const [stage, setStage] = useState<Stage>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CLOUD SYNC</Text>
        <Text style={styles.mutedText}>Cloud sync isn't configured for this build yet.</Text>
      </View>
    );
  }

  if (authEmail) {
    const pendingCount =
      huntLog.filter((e) => !syncedEntryIds.includes(e.id)).length +
      thermalLogs.filter((e) => !syncedEntryIds.includes(e.id)).length;

    return (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CLOUD SYNC</Text>
          <Text style={styles.bodyText}>Signed in as {authEmail}</Text>
          <Text style={styles.mutedText}>
            {pendingCount > 0 ? `${pendingCount} entr${pendingCount === 1 ? 'y' : 'ies'} syncing…` : 'All entries synced'}
          </Text>
          <Pressable onPress={() => signOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ToggleRow
            label="Contribute to shared AI training"
            sub="Off by default — a separate choice from cloud backup"
            checked={shareForTraining}
            onChange={setShareForTraining}
          />
          <Text style={styles.explainText}>
            When on, an anonymized copy of your thermal predictions (predicted direction, confidence, what you
            actually observed, terrain, and wind) is added to a shared dataset used to improve the prediction
            model. Your account, your stand names, and any notes you've written are never included — there's no
            way to trace a contributed row back to you or to a location. Your personal hunt log and thermal data
            back up to your account either way; this only controls whether an anonymized copy also helps train a
            better model for everyone.
          </Text>
        </View>
      </>
    );
  }

  const handleSendCode = async () => {
    setError(null);
    setLoading(true);
    const result = await requestEmailCode(email.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStage('code-sent');
  };

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    const result = await verifyEmailCode(email.trim(), code.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode('');
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>CLOUD SYNC</Text>
      <Text style={styles.explainText}>
        Create a free account to back up your hunt log and thermal data — safe even if you lose your phone. Sync
        happens automatically once you're signed in.
      </Text>

      {stage === 'idle' ? (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={palette.textLo}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Pressable onPress={handleSendCode} disabled={loading || !email.trim()} style={styles.primaryButton}>
            {loading ? <ActivityIndicator size="small" color={palette.onAmber} /> : <Text style={styles.primaryButtonText}>Send Code</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.bodyText}>Enter the 6-digit code sent to {email}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={palette.textLo}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          <Pressable onPress={handleVerify} disabled={loading || code.trim().length < 6} style={styles.primaryButton}>
            {loading ? <ActivityIndicator size="small" color={palette.onAmber} /> : <Text style={styles.primaryButtonText}>Verify</Text>}
          </Pressable>
          <Pressable onPress={() => { setStage('idle'); setCode(''); setError(null); }} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: palette.line },
  sectionLabel: { color: palette.textHi, fontSize: 13, letterSpacing: 1, marginBottom: 8 },
  bodyText: { color: palette.textHi, fontSize: 13, marginBottom: 4 },
  mutedText: { color: palette.textLo, fontSize: 12, marginBottom: 8 },
  explainText: { color: palette.textLo, fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 12 },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    color: palette.textHi,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: palette.onAmber, fontSize: 13, fontWeight: '500' },
  secondaryButton: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  secondaryButtonText: { color: palette.textLo, fontSize: 13 },
  errorText: { color: palette.bad, fontSize: 12, marginTop: 8 },
});
