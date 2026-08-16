import { ChevronDown } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type MapViewType from 'react-native-maps';
import Animated, {
  Extrapolation,
  clamp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '../theme/palette';
import type { Stand } from '../types';
import { AllStandsMapView, isLocated, regionForStands } from './AllStandsMap';

// Height of the map card in its resting (collapsed) state — sized to roughly match the
// footprint the status badge + compass dial + wind banner used to take up on their own.
export const HOME_MAP_COMPACT_HEIGHT = 420;

const ANIM_MS = 380;
// Below this progress (or a fast-enough downward flick) on gesture release, the drag
// commits to collapsing rather than snapping back open.
const COLLAPSE_COMMIT_THRESHOLD = 0.6;
const COLLAPSE_COMMIT_VELOCITY = 800;

interface HomeMapRevealProps {
  stands: Stand[];
  activeStand: Stand | null;
  activeStandId: string | null;
  onSelectStand: (id: string) => void;
  /** Measured height of the space this card can grow into — the same content area the
   * Stand tab's map view fills. Falls back to the compact height until measured. */
  fullHeight: number;
  /** The compass dial / wind banner content shown over the map while collapsed. */
  children: ReactNode;
}

/** Map layer behind the Home screen's compass dial — collapsed, it's a compact card
 * tightly zoomed on the active stand with the dial/banner overlaid on a dark scrim; tap
 * anywhere to expand it into the exact same all-stands view the Stand tab's map shows
 * (AllStandsMapView, reused directly — not a second map implementation), animating size,
 * scrim, and the map's own region together. Collapse back via the header's back button or
 * an interactive swipe-down on its grabber handle. */
export function HomeMapReveal({ stands, activeStand, activeStandId, onSelectStand, fullHeight, children }: HomeMapRevealProps) {
  const mapRef = useRef<MapViewType>(null);
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const activeRegion = regionForStands(activeStand && isLocated(activeStand) ? [activeStand] : []);
  const allStandsRegion = regionForStands(stands.filter(isLocated));
  const targetHeight = fullHeight > HOME_MAP_COMPACT_HEIGHT ? fullHeight : HOME_MAP_COMPACT_HEIGHT;

  const expand = () => {
    if (expanded) return;
    setExpanded(true);
    mapRef.current?.animateToRegion(allStandsRegion, ANIM_MS);
    progress.value = withTiming(1, { duration: ANIM_MS });
  };

  const collapse = () => {
    mapRef.current?.animateToRegion(activeRegion, ANIM_MS);
    progress.value = withTiming(0, { duration: ANIM_MS }, (finished) => {
      if (finished) runOnJS(setExpanded)(false);
    });
  };

  const collapseGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onChange((e) => {
      const dragRange = Math.max(targetHeight - HOME_MAP_COMPACT_HEIGHT, 1);
      progress.value = clamp(1 - e.translationY / dragRange, 0, 1);
    })
    .onEnd((e) => {
      if (progress.value < COLLAPSE_COMMIT_THRESHOLD || e.velocityY > COLLAPSE_COMMIT_VELOCITY) {
        runOnJS(collapse)();
      } else {
        progress.value = withSpring(1);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [HOME_MAP_COMPACT_HEIGHT, targetHeight], Extrapolation.CLAMP),
    borderRadius: interpolate(progress.value, [0, 1], [16, 0], Extrapolation.CLAMP),
  }));

  const collapsedGroupStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const expandedGroupStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={StyleSheet.absoluteFill}>
        <AllStandsMapView
          ref={mapRef}
          stands={stands}
          activeStandId={activeStandId}
          onSelectStand={onSelectStand}
          initialRegion={activeRegion}
        />
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, collapsedGroupStyle]} pointerEvents={expanded ? 'none' : 'auto'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={expand}>
          <View style={styles.scrim} />
          <View style={styles.overlayContent} pointerEvents="none">
            {children}
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.header, expandedGroupStyle]} pointerEvents={expanded ? 'auto' : 'none'}>
        <GestureDetector gesture={collapseGesture}>
          <View style={styles.grabberArea}>
            <View style={styles.grabber} />
          </View>
        </GestureDetector>
        <Pressable onPress={collapse} style={styles.backButton} hitSlop={8}>
          <ChevronDown size={18} color={palette.textHi} />
          <Text style={styles.backText}>Collapse Map</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: palette.bg,
    zIndex: 10,
    elevation: 10,
  },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,23,15,0.6)' },
  overlayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(20,23,15,0.55)',
  },
  grabberArea: { paddingVertical: 8, paddingHorizontal: 40 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.line },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4 },
  backText: { color: palette.textHi, fontSize: 13 },
});
