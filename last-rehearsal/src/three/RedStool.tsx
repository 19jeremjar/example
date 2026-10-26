import { RED_STOOL_BASE } from '../config/hotspots';

// The red metal bar stool beside the drum kit. The Polycam scan didn't
// capture it (that corner is a black hole in the mesh), so it's drawn here
// to match the reference photos: a square-seat, splayed-leg metal stool,
// about 66 cm tall. Everything else in the room comes from the scan.

const RED = '#e0281e';
const SEAT_Y = 0.66;
const TOP = 0.15; // half the seat width
const FOOT = 0.2; // half the footprint
const LEG = 0.022;
const RING_Y = 0.22;

const corners: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function RedStool() {
  const legLength = Math.hypot(SEAT_Y, (FOOT - TOP) * Math.SQRT2);
  const splay = Math.atan2(FOOT - TOP, SEAT_Y);
  // Where the legs are at footrest height.
  const ringOffset = FOOT - ((FOOT - TOP) * RING_Y) / SEAT_Y;
  return (
    <group position={RED_STOOL_BASE} rotation={[0, 0.25, 0]}>
      {/* Only the stool uses lit materials, so these lights touch nothing else. */}
      <hemisphereLight args={['#fff1e6', '#5a3430', 2.6]} />
      <directionalLight position={[0.5, 2, 2]} intensity={2.2} />
      {/* seat and skirt */}
      <mesh position={[0, SEAT_Y, 0]}>
        <boxGeometry args={[TOP * 2, 0.025, TOP * 2]} />
        <meshStandardMaterial color={RED} roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0, SEAT_Y - 0.035, 0]}>
        <boxGeometry args={[TOP * 2 - 0.01, 0.05, TOP * 2 - 0.01]} />
        <meshStandardMaterial color={RED} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* legs, leaning out from the seat corners */}
      {corners.map(([sx, sz]) => (
        <mesh
          key={`${sx}${sz}`}
          position={[sx * (TOP + FOOT) * 0.5, SEAT_Y / 2, sz * (TOP + FOOT) * 0.5]}
          rotation={[-sz * splay, 0, sx * splay]}
        >
          <boxGeometry args={[LEG * 2, legLength, LEG * 2]} />
          <meshStandardMaterial color={RED} roughness={0.45} metalness={0.35} />
        </mesh>
      ))}
      {/* footrest ring, joining the legs on all four sides */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <mesh position={[0, RING_Y, ringOffset]}>
            <boxGeometry args={[ringOffset * 2, 0.014, 0.014]} />
            <meshStandardMaterial color={RED} roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
