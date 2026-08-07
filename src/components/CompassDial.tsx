import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import { isWindUnfavorable } from '../utils/compass';

interface CompassDialProps {
  /** Direction the wind is blowing FROM, in degrees. */
  windDir: number;
  /** Direction the hunter's stand faces (where game is expected), in degrees. */
  standFacing: number;
  size?: number;
}

const CARDINALS = ['N', 'E', 'S', 'W'];

export function CompassDial({ windDir, standFacing, size = 240 }: CompassDialProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 24;

  const toXY = (deg: number, radius = r): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  // windDir is where the wind is coming FROM; the arrow shows where it's headed.
  const goingDir = (windDir + 180) % 360;
  const [tipX, tipY] = toXY(goingDir);

  const isBad = isWindUnfavorable(windDir, standFacing);
  const arrowColor = isBad ? palette.bad : palette.good;

  const headLen = 16;
  const headWidth = 10;
  const rad = ((goingDir - 90) * Math.PI) / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);
  const perpX = -dirY;
  const perpY = dirX;
  const baseX = tipX - dirX * headLen;
  const baseY = tipY - dirY * headLen;
  const leftX = baseX + perpX * headWidth * 0.5;
  const leftY = baseY + perpY * headWidth * 0.5;
  const rightX = baseX - perpX * headWidth * 0.5;
  const rightY = baseY - perpY * headWidth * 0.5;

  const [standX, standY] = toXY(standFacing);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={palette.line} strokeWidth={1.5} />
      <Circle cx={cx} cy={cy} r={r - 30} fill="none" stroke={palette.line} strokeWidth={1} opacity={0.5} />
      {CARDINALS.map((d, i) => {
        const [x, y] = toXY(i * 90);
        return (
          <SvgText
            key={d}
            x={x}
            y={y + 4}
            textAnchor="middle"
            fontSize={12}
            fill={palette.textLo}
            fontFamily={mono}
          >
            {d}
          </SvgText>
        );
      })}

      {/* stand facing marker */}
      <Line x1={cx} y1={cy} x2={standX} y2={standY} stroke={palette.textLo} strokeWidth={2} strokeDasharray="3,4" />
      <Circle cx={standX} cy={standY} r={4} fill={palette.textLo} />

      {/* wind arrow — points where the wind is traveling */}
      <G>
        <Line x1={cx} y1={cy} x2={baseX} y2={baseY} stroke={arrowColor} strokeWidth={3} strokeLinecap="round" />
        <Polygon points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`} fill={arrowColor} />
      </G>
      <Circle cx={cx} cy={cy} r={4} fill={palette.amber} />
    </Svg>
  );
}
