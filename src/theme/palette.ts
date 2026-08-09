export const palette = {
  bg: '#14170f',
  bgAlt: '#1c2015',
  panel: '#22271a',
  line: '#33391f',
  amber: '#d1832f',
  amberDim: '#8a5a24',
  good: '#7fae76',
  bad: '#c1573f',
  textHi: '#f0ead8',
  textLo: '#9aa085',
  onAmber: '#191b12',
  // Cool, deliberately off-palette so the "expected game direction" line on the compass
  // never gets lost against the warm amber/green/red wind cone.
  gameDir: '#5b9bd1',
} as const;
