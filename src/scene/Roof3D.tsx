import * as THREE from 'three'
import { Edges } from '@react-three/drei'

interface Props {
  cx: number
  cz: number
  width: number // along x (eave to eave)
  depth: number // along z (ridge length)
  baseY: number // y of the roof eaves
  ridgeH: number
  revealInterior?: boolean
}

// Gable roof: two warm clay-colored slopes meeting at a ridge, triangular
// white gable ends, subtle tile ribs and a chimney.
export function Roof3D({ cx, cz, width, depth, baseY, ridgeH, revealInterior }: Props) {
  const half = width / 2
  const slope = Math.hypot(half, ridgeH)
  const angle = Math.atan2(ridgeH, half)

  return (
    <group position={[cx, baseY, cz]}>
      {/* Left slope */}
      <mesh position={[-half / 2, ridgeH / 2, 0]} rotation={[0, 0, angle]} castShadow>
        <boxGeometry args={[slope, 0.12, depth + 0.34]} />
        <meshStandardMaterial color="#9e3f2f" roughness={0.86} metalness={0.02} transparent={revealInterior} opacity={revealInterior ? 0.78 : 1} />
        <Edges threshold={15} color="#6f2e25" />
      </mesh>
      {/* Right slope */}
      <mesh position={[half / 2, ridgeH / 2, 0]} rotation={[0, 0, -angle]} castShadow>
        <boxGeometry args={[slope, 0.12, depth + 0.34]} />
        <meshStandardMaterial color="#a94735" roughness={0.86} metalness={0.02} transparent={revealInterior} opacity={revealInterior ? 0.78 : 1} />
        <Edges threshold={15} color="#6f2e25" />
      </mesh>

      {/* Gable end triangles (front & back) */}
      {[depth / 2, -depth / 2].map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <shapeGeometry args={[gable(half, ridgeH)]} />
          <meshStandardMaterial color="#fffaf2" roughness={0.72} side={2} transparent={revealInterior && z > 0} opacity={revealInterior && z > 0 ? 0.2 : 1} />
        </mesh>
      ))}

      {/* Ridge cap */}
      <mesh position={[0, ridgeH + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, depth + 0.42, 18]} />
        <meshStandardMaterial color="#7c3027" roughness={0.8} />
      </mesh>

      {/* Tile ribs across both slopes */}
      {Array.from({ length: Math.max(6, Math.floor(depth / 0.65)) }, (_, i) => {
        const z = -depth / 2 + ((i + 0.5) * depth) / Math.max(6, Math.floor(depth / 0.65))
        return (
          <group key={i}>
            <mesh position={[-half / 2, ridgeH / 2 + 0.075, z]} rotation={[0, 0, angle]} castShadow>
              <boxGeometry args={[slope * 0.98, 0.035, 0.045]} />
              <meshStandardMaterial color="#7f342b" roughness={0.9} />
            </mesh>
            <mesh position={[half / 2, ridgeH / 2 + 0.075, z]} rotation={[0, 0, -angle]} castShadow>
              <boxGeometry args={[slope * 0.98, 0.035, 0.045]} />
              <meshStandardMaterial color="#85362b" roughness={0.9} />
            </mesh>
          </group>
        )
      })}

      <group position={[half * 0.34, ridgeH * 0.74, -depth * 0.18]} rotation={[0, 0, -angle]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.92, 0.42]} />
          <meshStandardMaterial color="#d9d2c5" roughness={0.82} />
          <Edges threshold={15} color="#9b9181" />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.52, 0.12, 0.52]} />
          <meshStandardMaterial color="#8b3a2e" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

// Triangle in the x-y plane for a gable end.
function gable(half: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(-half, 0)
  s.lineTo(half, 0)
  s.lineTo(0, h)
  s.closePath()
  return s
}
