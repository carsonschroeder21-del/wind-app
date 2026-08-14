import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { PanoramaHotspotData } from '../services/panorama/panoramaHtml';
import { buildPanoramaHtml } from '../services/panorama/panoramaHtml';
import { palette } from '../theme/palette';
import { bearingToYaw, calibrateNorthOffset } from '../utils/panoramaBearing';

export interface PanoramaHotspotInput {
  id: string;
  bearingDeg: number;
  colorHex: string;
  label: string;
}

interface PanoramaViewerProps {
  uri: string;
  /** Null means uncalibrated — the viewer shows the "face North and confirm" flow instead
   * of direction markers. */
  northOffsetDeg: number | null;
  hotspots: PanoramaHotspotInput[];
  onCalibrated: (northOffsetDeg: number) => void;
  height?: number;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
};

function toHotspotData(hotspots: PanoramaHotspotInput[], northOffsetDeg: number): PanoramaHotspotData[] {
  return hotspots.map((h) => ({
    id: h.id,
    yaw: bearingToYaw(h.bearingDeg, northOffsetDeg),
    colorHex: h.colorHex,
    label: h.label,
  }));
}

/** Renders a 360° panorama photo (via a vendored, fully offline Pannellum viewer running
 * in a WebView) with the wind cone / expected-game direction pinned to their real-world
 * compass bearings as look-around hotspots. Requires a one-time calibration per photo
 * (rotate to face true north, confirm) since an uploaded photo has no inherent heading. */
export function PanoramaViewer({ uri, northOffsetDeg, hotspots, onCalibrated, height = 320 }: PanoramaViewerProps) {
  const webviewRef = useRef<WebView>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setImageDataUri(null);
    setLoadError(false);
    let cancelled = false;
    (async () => {
      try {
        const file = new File(uri);
        const base64 = await file.base64();
        const ext = file.extension.replace('.', '').toLowerCase();
        const mime = MIME_BY_EXT[ext] ?? 'image/jpeg';
        if (!cancelled) setImageDataUri(`data:${mime};base64,${base64}`);
      } catch (err) {
        console.warn('[PanoramaViewer] failed to read panorama file:', err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const calibrating = northOffsetDeg == null;

  // Only the image itself and the calibrating/not-calibrating mode should trigger a full
  // WebView reload (reloading on every hotspot bearing change would reload the whole
  // multi-MB panorama image on every time-slider drag tick). Bearing updates after the
  // initial load go through injectJavaScript below instead.
  const html = useMemo(() => {
    if (!imageDataUri) return null;
    const initialHotspots = calibrating || northOffsetDeg == null ? [] : toHotspotData(hotspots, northOffsetDeg);
    return buildPanoramaHtml({ imageDataUri, calibrating, initialHotspots });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUri, calibrating]);

  useEffect(() => {
    if (calibrating || northOffsetDeg == null || !imageDataUri) return;
    const data = toHotspotData(hotspots, northOffsetDeg);
    webviewRef.current?.injectJavaScript(`window.__setHotspots(${JSON.stringify(JSON.stringify(data))}); true;`);
  }, [hotspots, northOffsetDeg, calibrating, imageDataUri]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'calibrated' && typeof payload.yaw === 'number') {
        onCalibrated(calibrateNorthOffset(payload.yaw));
      }
    } catch (err) {
      console.warn('[PanoramaViewer] failed to parse WebView message:', err);
    }
  };

  if (loadError) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>Couldn't load this stand's 360° photo.</Text>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={[styles.fallback, { height }]}>
        <ActivityIndicator color={palette.amber} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView ref={webviewRef} source={{ html }} style={styles.webview} originWhitelist={['*']} onMessage={handleMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: palette.bgAlt },
  webview: { flex: 1, backgroundColor: 'transparent' },
  fallback: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: palette.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { color: palette.textLo, fontSize: 12, paddingHorizontal: 16, textAlign: 'center' },
});
