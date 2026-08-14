import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import type { StandMedia, StandMediaType } from '../../types';

export type PickStandMediaResult =
  | { ok: true; media: StandMedia }
  | { ok: false; reason: 'permission-denied' | 'canceled' | 'failed' };

const MEDIA_DIR_NAME = 'stand-media';

function extensionFor(uri: string, fallback: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(uri);
  return match ? match[0] : fallback;
}

/** Opens the system media picker for a 360° photo or video, then copies the picked file
 * into the app's document directory so it persists independently of the OS picker's cache
 * (which the system can clear at any time). */
export async function pickStandMedia(standId: string): Promise<PickStandMediaResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission-denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'canceled' };

  const asset = result.assets[0];
  const mediaType: StandMediaType = asset.type === 'video' ? 'video360' : 'photo360';

  try {
    const dir = new Directory(Paths.document, MEDIA_DIR_NAME, standId);
    dir.create({ intermediates: true, idempotent: true });

    const ext = extensionFor(asset.uri, mediaType === 'video360' ? '.mp4' : '.jpg');
    const dest = new File(dir, `pano-${Date.now()}${ext}`);
    const source = new File(asset.uri);
    source.copy(dest);

    return {
      ok: true,
      media: { type: mediaType, uri: dest.uri, northOffsetDeg: null, createdAt: Date.now() },
    };
  } catch (err) {
    console.warn('[standMedia] pickStandMedia failed:', err);
    return { ok: false, reason: 'failed' };
  }
}

/** Deletes a stand's persisted media file from disk — call when replacing or removing it,
 * otherwise orphaned panorama files (which can be several MB each) accumulate silently. */
export function deleteStandMediaFile(media: StandMedia): void {
  try {
    new File(media.uri).delete();
  } catch (err) {
    console.warn('[standMedia] deleteStandMediaFile failed:', err);
  }
}
