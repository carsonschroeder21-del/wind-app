import { PANNELLUM_CSS, PANNELLUM_JS } from './pannellumLib';

export interface PanoramaHotspotData {
  id: string;
  yaw: number;
  colorHex: string;
  label: string;
}

interface BuildPanoramaHtmlParams {
  imageDataUri: string;
  /** True while the hunter is aligning the view to true north — shows the calibration
   * button/instructions and no direction markers instead of the normal overlay. */
  calibrating: boolean;
  initialHotspots: PanoramaHotspotData[];
}

/** A single WebView page embedding the vendored Pannellum viewer, fully self-contained
 * (library source and the panorama image are both inlined — no network access needed, so
 * it works with no signal in the field). Direction markers are added via Pannellum's own
 * hotSpots system, which keeps them pinned to their real-world bearing automatically as
 * the hunter looks around; `window.__setHotspots` lets the RN side update marker bearings
 * live (as the time slider moves) without reloading the whole panorama image. */
export function buildPanoramaHtml({ imageDataUri, calibrating, initialHotspots }: BuildPanoramaHtmlParams): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${PANNELLUM_CSS}
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #14170f; overflow: hidden; }
#panorama { width: 100%; height: 100%; }
.marker-label { font-family: monospace; font-size: 11px; letter-spacing: 1px; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9); margin-top: 4px; }
.calibrate-overlay { position: fixed; left: 0; right: 0; bottom: 0; padding: 16px; background: linear-gradient(rgba(20,23,15,0), rgba(20,23,15,0.92)); z-index: 10; }
.calibrate-text { color: #f0ead8; font-family: -apple-system, Roboto, sans-serif; font-size: 13px; text-align: center; margin: 0 0 12px 0; }
.calibrate-button { display: block; width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: none; background: #d1832f; color: #191b12; font-size: 14px; font-weight: 600; font-family: -apple-system, Roboto, sans-serif; }
</style>
</head>
<body>
<div id="panorama"></div>
${
  calibrating
    ? `<div class="calibrate-overlay">
  <p class="calibrate-text">Drag to look around. Rotate until you're facing true North, then tap below.</p>
  <button class="calibrate-button" onclick="window.__confirmNorth()">I'm Facing North</button>
</div>`
    : ''
}
<script>${PANNELLUM_JS}</script>
<script>
function markerTooltipFunc(div, args) {
  div.style.width = '0px';
  div.style.height = '0px';
  var svg = args.kind === 'wind'
    ? '<svg width="60" height="80" viewBox="0 0 60 80" style="position:absolute;left:-30px;top:-70px;overflow:visible">' +
      '<polygon points="30,80 10,30 50,30" fill="' + args.colorHex + '55" stroke="' + args.colorHex + '" stroke-width="2"/>' +
      '<circle cx="30" cy="28" r="4" fill="' + args.colorHex + '"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 20 20" style="position:absolute;left:-10px;top:-10px;overflow:visible">' +
      '<circle cx="10" cy="10" r="5" fill="' + args.colorHex + '" stroke="#0a0c07" stroke-width="1.5"/></svg>';
  var label = '<div class="marker-label" style="position:absolute;left:-40px;top:6px;width:80px;text-align:center;color:' + args.colorHex + '">' + args.label + '</div>';
  div.innerHTML = svg + label;
}

var viewer = pannellum.viewer('panorama', {
  type: 'equirectangular',
  panorama: ${JSON.stringify(imageDataUri)},
  autoLoad: true,
  compass: false,
  showZoomCtrl: true,
  showFullscreenCtrl: false,
  hotSpotDebug: false,
});

var viewerReady = false;
var pendingHotspots = ${JSON.stringify(initialHotspots)};

function applyHotspots(list) {
  (viewer.getConfig().hotSpots || []).slice().forEach(function (hs) {
    try { viewer.removeHotSpot(hs.id); } catch (e) {}
  });
  list.forEach(function (hs) {
    viewer.addHotSpot({
      id: hs.id,
      pitch: 0,
      yaw: hs.yaw,
      type: 'info',
      cssClass: 'pnlm-hotspot-base',
      createTooltipFunc: markerTooltipFunc,
      createTooltipArgs: { kind: hs.id, colorHex: hs.colorHex, label: hs.label },
    });
  });
}

window.__setHotspots = function (json) {
  var list = JSON.parse(json);
  if (!viewerReady) { pendingHotspots = list; return; }
  applyHotspots(list);
};

window.__confirmNorth = function () {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'calibrated', yaw: viewer.getYaw() }));
};

viewer.on('load', function () {
  viewerReady = true;
  applyHotspots(pendingHotspots);
});
</script>
</body>
</html>`;
}
