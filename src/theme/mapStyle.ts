/** Google Maps custom style matching the app's dark olive/amber palette (see palette.ts).
 * Passed to MapView's customMapStyle prop. Schema: https://mapstyle.withgoogle.com/ */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#14170f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#14170f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa085' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#33391f' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1c2015' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9aa085' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#22271a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#7fae76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#33391f' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#14170f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a5a24' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#8a5a24' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#14170f' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#d1832f' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#22271a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1720' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5b9bd1' }] },
];
