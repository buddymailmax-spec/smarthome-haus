import { Edges } from '@react-three/drei'
import * as THREE from 'three'

interface Props {
  cx: number
  cz: number
  width: number // along x (eave to eave)
  depth: number // along z (ridge length)
  baseY: number // y of the roof eaves
  ridgeH: number
  revealInterior?: boolean
}

// Classic detached-house roof: brown-red roof tiles, deep eaves and a clean
// front gable. In interior mode the front gable fades out for a clear cutaway.
export function Roof3D({ cx, cz, width, depth, baseY, ridgeH, revealInterior }: Props) {
  const half = width / 2
  const slope = Math.hypot(half, ridgeH)
  const angle = Math.atan2(ridgeH, half)
  const tileCount = Math.max(7, Math.floor(depth / 0.58))

  return (
    <group position={[cx, baseY, cz]}>
      <mesh position={[-half / 2, ridgeH / 2, 0]} rotation={[0, 0, angle]} castShadow receiveShadow>
        <boxGeometry args={[slope, 0.16, depth + 0.7]} />
        <meshStandardMaterial color="#8a3b2e" roughness={0.86} />
        <Edges threshold={15} color="#6a2e26" />
      </mesh>
      <mesh position={[half / 2, ridgeH / 2, 0]} rotation={[0, 0, -angle]} castShadow receiveShadow>
        <boxGeometry args={[slope, 0.16, depth + 0.7]} />
        <meshStandardMaterial color="#9a4533" roughness={0.86} />
        <Edges threshold={15} color="#6a2e26" />
      </mesh>

      <mesh position={[0, ridgeH + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, depth + 0.78, 18]} />
        <meshStandardMaterial color="#6f3028" roughness={0.8} />
      </mesh>

      {Array.from({ length: tileCount }, (_, i) => {
        const z = -depth / 2 + ((i + 0.5) * depth) / tileCount
        return (
          <group key={i}>
            <mesh position={[-half / 2, ridgeH / 2 + 0.095, z]} rotation={[0, 0, angle]} castShadow>
              <boxGeometry args={[slope * 0.96, 0.035, 0.055]} />
              <meshStandardMaterial color="#743429" roughness={0.9} />
            </mesh>
            <mesh position={[half / 2, ridgeH / 2 + 0.095, z]} rotation={[0, 0, -angle]} castShadow>
              <boxGeometry args={[slope * 0.96, 0.035, 0.055]} />
              <meshStandardMaterial color="#7f392d" roughness={0.9} />
            </mesh>
          </group>
        )
      })}

      <mesh position={[0, ridgeH * 0.42, depth / 2 + 0.01]}>
        <shapeGeometry args={[gable(half, ridgeH)]} />
        <meshStandardMaterial color="#fffdf7" roughness={0.64} side={THREE.DoubleSide} transparent={revealInterior} opacity={revealInterior ? 0 : 1} depthWrite={!revealInterior} />
      </mesh>
      <mesh position={[0, ridgeH * 0.42, -depth / 2 - 0.01]}>
        <shapeGeometry args={[gable(half, ridgeH)]} />
        <meshStandardMaterial color="#fffdf7" roughness={0.64} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[width * 0.25, ridgeH * 0.72, -depth * 0.16]} castShadow>
        <boxGeometry args={[0.46, 0.92, 0.46]} />
        <meshStandardMaterial color="#d7d0c3" roughness={0.82} />
        <Edges threshold={15} color="#9d9283" />
      </mesh>
      <mesh position={[width * 0.25, ridgeH * 1.2, -depth * 0.16]} castShadow>
        <boxGeometry args={[0.58, 0.14, 0.58]} />
        <meshStandardMaterial color="#743028" roughness={0.78} />
      </mesh>
    </group>
  )
}

function gable(half: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(-half, -h * 0.42)
  s.lineTo(half, -h * 0.42)
  s.lineTo(0, h * 0.58)
  s.closePath()
  return s
}
