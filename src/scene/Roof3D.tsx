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

// Modern new-build roof: a flat roof with an anthracite parapet, subtle roof
// surface and slim technical boxes. No gable, no cottage look.
export function Roof3D({ cx, cz, width, depth, baseY, revealInterior }: Props) {
  return (
    <group position={[cx, baseY, cz]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial color="#e8e8e3" roughness={0.86} transparent={revealInterior} opacity={revealInterior ? 0.7 : 1} />
        <Edges threshold={15} color="#bfc3bf" />
      </mesh>

      <mesh position={[0, 0.32, -depth / 2 + 0.12]} castShadow>
        <boxGeometry args={[width, 0.48, 0.24]} />
        <meshStandardMaterial color="#2f3538" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.32, depth / 2 - 0.12]} castShadow>
        <boxGeometry args={[width, 0.48, 0.24]} />
        <meshStandardMaterial color="#2f3538" roughness={0.62} transparent={revealInterior} opacity={revealInterior ? 0.2 : 1} depthWrite={!revealInterior} />
      </mesh>
      <mesh position={[-width / 2 + 0.12, 0.32, 0]} castShadow>
        <boxGeometry args={[0.24, 0.48, depth]} />
        <meshStandardMaterial color="#2f3538" roughness={0.62} />
      </mesh>
      <mesh position={[width / 2 - 0.12, 0.32, 0]} castShadow>
        <boxGeometry args={[0.24, 0.48, depth]} />
        <meshStandardMaterial color="#2f3538" roughness={0.62} />
      </mesh>

      <mesh position={[width * 0.24, 0.58, -depth * 0.18]} castShadow>
        <boxGeometry args={[1.2, 0.36, 0.72]} />
        <meshStandardMaterial color="#b9bfbd" roughness={0.78} />
        <Edges threshold={15} color="#8e9895" />
      </mesh>
      <mesh position={[-width * 0.22, 0.5, depth * 0.12]} castShadow>
        <boxGeometry args={[0.72, 0.2, 0.72]} />
        <meshStandardMaterial color="#202629" roughness={0.72} />
      </mesh>
    </group>
  )
}
