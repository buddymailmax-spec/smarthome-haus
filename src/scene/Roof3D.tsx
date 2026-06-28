import * as THREE from 'three'
import { Edges } from '@react-three/drei'

interface Props {
  cx: number
  cz: number
  width: number // along x (eave to eave)
  depth: number // along z (ridge length)
  baseY: number // y of the roof eaves
  ridgeH: number
}

// A semi-transparent blue gable roof: two sloped planes meeting at a ridge that
// runs along z, plus two triangular gable ends. Transparent so the attic AC
// stays visible.
export function Roof3D({ cx, cz, width, depth, baseY, ridgeH }: Props) {
  const half = width / 2
  const slope = Math.hypot(half, ridgeH)
  const angle = Math.atan2(ridgeH, half)

  return (
    <group position={[cx, baseY, cz]}>
      {/* Left slope */}
      <mesh position={[-half / 2, ridgeH / 2, 0]} rotation={[0, 0, angle]} castShadow>
        <boxGeometry args={[slope, 0.08, depth]} />
        <meshStandardMaterial color="#4f74a8" transparent opacity={0.62} roughness={0.6} />
        <Edges threshold={15} color="#3a5a86" />
      </mesh>
      {/* Right slope */}
      <mesh position={[half / 2, ridgeH / 2, 0]} rotation={[0, 0, -angle]} castShadow>
        <boxGeometry args={[slope, 0.08, depth]} />
        <meshStandardMaterial color="#4f74a8" transparent opacity={0.62} roughness={0.6} />
        <Edges threshold={15} color="#3a5a86" />
      </mesh>

      {/* Gable end triangles (front & back) */}
      {[depth / 2, -depth / 2].map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <shapeGeometry args={[gable(half, ridgeH)]} />
          <meshStandardMaterial color="#dfeaf5" transparent opacity={0.5} side={2} />
        </mesh>
      ))}
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
