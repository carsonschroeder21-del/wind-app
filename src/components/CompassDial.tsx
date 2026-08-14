import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { palette } from '../theme/palette';
import { mono } from '../theme/typography';
import { isWindUnfavorable, windTravelDirection } from '../utils/compass';

interface CompassDialProps {
  /** Direction the wind is blowing FROM, in degrees. */
  windDir: number;
  /** Bearing to where the hunter expects game — from the active stand's real dropped
   * game-area pin when set, else its facing angle (see `gameAreaBearingDeg`). Pass null
   * when there's no active stand to compare against. */
  gameBearingDeg: number | null;
  size?: number;
}

const CARDINALS = ['N', 'E', 'S', 'W'];
const CONE_HALF_ANGLE_DEG = 16;

export function CompassDial({ windDir, gameBearingDeg, size = 240 }: CompassDialProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 24;
  const coneRadius = r - 8;
  const gameLineRadius = r - 4;

  const toXY = (deg: number, radius = r): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  // windDir is where the wind is coming FROM; the cone shows where it's headed.
  const goingDir = windTravelDirection(windDir);
  const isBad = gameBearingDeg != null && isWindUnfavorable(windDir, gameBearingDeg);
  const coneColor = gameBearingDeg == null ? palette.amber : isBad ? palette.bad : palette.good;

  const [tipX, tipY] = toXY(goingDir, coneRadius);
  const [leftX, leftY] = toXY(goingDir - CONE_HALF_ANGLE_DEG, coneRadius);
  const [rightX, rightY] = toXY(goingDir + CONE_HALF_ANGLE_DEG, coneRadius);

  const gameLineEnd = gameBearingDeg != null ? toXY(gameBearingDeg, gameLineRadius) : null;

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

      {/* wind cone — the fan of directions the wind could realistically be carrying scent
          through, narrow at the stand (apex) and widening as it travels outward */}
      <G>
        <Polygon
          points={`${cx},${cy} ${leftX},${leftY} ${rightX},${rightY}`}
          fill={`${coneColor}33`}
          stroke={coneColor}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <Line x1={cx} y1={cy} x2={tipX} y2={tipY} stroke={coneColor} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={tipX} cy={tipY} r={3} fill={coneColor} />
      </G>

      {/* expected game direction — visually distinct (cool color, fine dotted line) so it
          reads clearly against the cone whether they overlap (bad) or diverge (good) */}
      {gameLineEnd && (
        <G>
          <Line
            x1={cx}
            y1={cy}
            x2={gameLineEnd[0]}
            y2={gameLineEnd[1]}
            stroke={palette.gameDir}
            strokeWidth={2}
            strokeDasharray="1,5"
            strokeLinecap="round"
          />
          <Circle cx={gameLineEnd[0]} cy={gameLineEnd[1]} r={4} fill={palette.gameDir} />
        </G>
      )}

      <Circle cx={cx} cy={cy} r={4} fill={palette.amber} />
    </Svg>
  );
}
