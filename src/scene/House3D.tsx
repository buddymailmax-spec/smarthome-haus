import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, SoftShadows, Bounds, RoundedBox } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useHouse } from '../state/houseStore'
import { Floor3D } from './Floor3D'
import { Roof3D } from './Roof3D'
import { FLOOR_H, ROOF_H } from './constants'

const ATTIC_WALL_H = 1.35

interface Props {
  revealInterior: boolean
}

export function House3D({ revealInterior }: Props) {
  const { house, select } = useHouse()

  // Group rooms by storey.
  const levels = useMemo(() => {
    const map = new Map<number, typeof house.rooms>()
    for (const r of house.rooms) {
      if (!map.has(r.level)) map.set(r.level, [])
      map.get(r.level)!.push(r)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [house.rooms])

  const topLevel = levels.length ? levels[levels.length - 1][0] : 0

  const footprint = useMemo(() => {
    const xs = house.rooms.flatMap((r) => [r.x, r.x + r.width])
    const zs = house.rooms.flatMap((r) => [r.z, r.z + r.depth])
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const z0 = Math.min(...zs)
    const z1 = Math.max(...zs)
    return { x0, x1, z0, z1, width: x1 - x0, depth: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }
  }, [house.rooms])
  const center = [footprint.cx, footprint.cz] as const

  const roof = useMemo(() => {
    return {
      cx: footprint.cx,
      cz: footprint.cz,
      width: footprint.width + 1.2,
      depth: footprint.depth + 1,
      baseY: topLevel * FLOOR_H + ATTIC_WALL_H + 0.08,
    }
  }, [footprint, topLevel])
  return (
    <Canvas
      shadows
      camera={{ position: [center[0] + 11, 9.5, center[1] + 13], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#cfe6f7']} />
      <fog attach="fog" args={['#dcecf4', 45, 92]} />
      <SoftShadows size={26} samples={12} />

      <ambientLight intensity={0.68} />
      <hemisphereLight args={['#ffffff', '#cdddee', 0.9]} />
      <directionalLight
        position={[center[0] - 12, 24, center[1] + 12]}
        intensity={2.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      <OutdoorScene center={[center[0], center[1]]} footprint={footprint} revealInterior={revealInterior} onGroundClick={() => select(null)} />

      <ContactShadows position={[center[0], 0, center[1]]} scale={40} blur={2.6} far={10} opacity={0.35} />

      <Bounds fit clip observe margin={1.1}>
        {levels.map(([lvl, rooms]) => (
          <Floor3D
            key={lvl}
            level={lvl}
            rooms={rooms}
            devices={house.devices}
            isTop={lvl === topLevel}
            revealInterior={revealInterior}
          />
        ))}
        {roof && <Roof3D cx={roof.cx} cz={roof.cz} width={roof.width} depth={roof.depth} baseY={roof.baseY} ridgeH={ROOF_H} revealInterior={revealInterior} />}
      </Bounds>

      <SmoothCamera revealInterior={revealInterior} center={[center[0], center[1]]} />
    </Canvas>
  )
}

function SmoothCamera({ revealInterior, center }: { revealInterior: boolean; center: readonly [number, number] }) {
  const controls = useRef<any>(null)
  const { camera } = useThree()
  const exteriorPos = useMemo(() => new THREE.Vector3(center[0] + 11, 9.5, center[1] + 13), [center])
  const interiorPos = useMemo(() => new THREE.Vector3(center[0], 8.5, center[1] + 20), [center])
  const exteriorTarget = useMemo(() => new THREE.Vector3(center[0], FLOOR_H * 1.2, center[1]), [center])
  const interiorTarget = useMemo(() => new THREE.Vector3(center[0], FLOOR_H * 1.25, center[1]), [center])

  useFrame((_, dt) => {
    const targetPos = revealInterior ? interiorPos : exteriorPos
    const targetLook = revealInterior ? interiorTarget : exteriorTarget
    const k = 1 - Math.exp(-dt * 3.2)
    camera.position.lerp(targetPos, k)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += ((revealInterior ? 34 : 36) - camera.fov) * k
      camera.updateProjectionMatrix()
    }
    if (controls.current) {
      controls.current.target.lerp(targetLook, k)
      controls.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={exteriorTarget}
      enablePan
      minDistance={6}
      maxDistance={48}
      maxPolarAngle={Math.PI / 2.05}
    />
  )
}

function OutdoorScene({
  center,
  footprint,
  revealInterior,
  onGroundClick,
}: {
  center: readonly [number, number]
  footprint: { x0: number; x1: number; z0: number; z1: number; width: number; depth: number; cx: number; cz: number }
  revealInterior: boolean
  onGroundClick: () => void
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.05, center[1]]} receiveShadow onClick={onGroundClick}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color={revealInterior ? '#9ab887' : '#7faa63'} roughness={0.92} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[footprint.cx, -0.035, footprint.z1 + 4.2]} receiveShadow>
        <planeGeometry args={[footprint.width + 2.4, 5.2]} />
        <meshStandardMaterial color="#7a837a" roughness={0.96} transparent={revealInterior} opacity={revealInterior ? 0.28 : 1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[footprint.x0 + 1.1, -0.025, footprint.z1 + 2.2]} receiveShadow>
        <planeGeometry args={[1.4, 4.7]} />
        <meshStandardMaterial color="#d4c2a0" roughness={0.9} transparent={revealInterior} opacity={revealInterior ? 0.42 : 1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[footprint.x1 + 3.2, -0.03, footprint.cz]} receiveShadow>
        <planeGeometry args={[4.2, footprint.depth + 8]} />
        <meshStandardMaterial color="#b9b8b0" roughness={0.86} transparent={revealInterior} opacity={revealInterior ? 0.2 : 1} />
      </mesh>

      {!revealInterior && (
        <>
          <Patio x={footprint.x1 + 2.8} z={footprint.z0 + 1.8} />
          <Pool x={footprint.x0 - 5.2} z={footprint.z0 + 0.8} />
          <Garage x={footprint.x1 + 3.2} z={footprint.z1 + 0.35} />
          <Car x={footprint.x1 + 3.2} z={footprint.z1 + 3.1} />
          <GardenBeds footprint={footprint} />
          <Fence footprint={footprint} />
        </>
      )}
    </group>
  )
}

function Garage({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.02, z]}>
      <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 2.24, 2.6]} />
        <meshStandardMaterial color="#f4f4ef" roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.1, 1.32]} castShadow>
        <boxGeometry args={[2.55, 1.42, 0.08]} />
        <meshStandardMaterial color="#30363a" roughness={0.56} metalness={0.12} />
      </mesh>
      {[-0.72, 0, 0.72].map((y, i) => (
        <mesh key={i} position={[0, 1.1 + y, 1.37]}>
          <boxGeometry args={[2.42, 0.035, 0.025]} />
          <meshStandardMaterial color="#586065" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.34, 0]} castShadow>
        <boxGeometry args={[3.9, 0.28, 2.9]} />
        <meshStandardMaterial color="#2f3538" roughness={0.62} />
      </mesh>
      <mesh position={[-1.74, 1.18, -0.2]} castShadow>
        <boxGeometry args={[0.18, 2.3, 2.8]} />
        <meshStandardMaterial color="#bd875d" roughness={0.72} />
      </mesh>
    </group>
  )
}

function Pool({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[4.4, 0.18, 2.7]} radius={0.18} smoothness={5} receiveShadow>
        <meshStandardMaterial color="#e8e1d6" roughness={0.72} />
      </RoundedBox>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.9, 2.2]} />
        <meshPhysicalMaterial color="#38a9d8" roughness={0.08} transmission={0.18} transparent opacity={0.82} />
      </mesh>
      {[-1.2, 0, 1.2].map((sx) => (
        <mesh key={sx} position={[sx, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.39, 32]} />
          <meshBasicMaterial color="#bfefff" transparent opacity={0.42} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function Car({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.18, z]} rotation={[0, Math.PI / 2, 0]}>
      <RoundedBox args={[2.55, 0.55, 1.25]} radius={0.16} smoothness={5} castShadow>
        <meshStandardMaterial color="#233449" roughness={0.42} metalness={0.35} />
      </RoundedBox>
      <RoundedBox position={[0.14, 0.42, 0]} args={[1.25, 0.5, 1.02]} radius={0.13} smoothness={4} castShadow>
        <meshStandardMaterial color="#4d6d87" roughness={0.18} metalness={0.1} transparent opacity={0.86} />
      </RoundedBox>
      {[-0.85, 0.85].map((cx) =>
        [-0.68, 0.68].map((cz) => (
          <mesh key={`${cx}-${cz}`} position={[cx, -0.05, cz]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.16, 24]} />
            <meshStandardMaterial color="#202124" roughness={0.7} />
          </mesh>
        )),
      )}
      <mesh position={[-1.3, 0.08, -0.42]}>
        <boxGeometry args={[0.04, 0.13, 0.26]} />
        <meshStandardMaterial color="#ffe7a8" emissive="#ffe7a8" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

function Patio({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.8, 2.8]} />
        <meshStandardMaterial color="#c7b69b" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 16]} />
        <meshStandardMaterial color="#8b775f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.12, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[1.25, 0.32, 32]} />
        <meshStandardMaterial color="#f2f0e8" roughness={0.55} />
      </mesh>
      <mesh position={[-0.85, 0.22, 0.75]} castShadow>
        <boxGeometry args={[1.4, 0.18, 0.55]} />
        <meshStandardMaterial color="#7a684f" roughness={0.78} />
      </mesh>
    </group>
  )
}

function GardenBeds({
  footprint,
}: {
  footprint: { x0: number; x1: number; z0: number; z1: number; width: number; depth: number; cx: number; cz: number }
}) {
  const shrubs = [
    [footprint.x0 - 1.8, footprint.z1 + 0.4],
    [footprint.x0 - 2.5, footprint.z0 - 0.6],
    [footprint.x1 + 1.1, footprint.z0 - 0.8],
    [footprint.x1 + 1.4, footprint.z1 + 0.2],
    [footprint.cx - 2.5, footprint.z0 - 1.2],
    [footprint.cx + 2.5, footprint.z0 - 1.2],
  ] as const
  return (
    <group>
      {shrubs.map(([x, z], i) => (
        <group key={i} position={[x, 0.25, z]}>
          <mesh castShadow>
            <sphereGeometry args={[0.45, 18, 12]} />
            <meshStandardMaterial color={i % 2 ? '#446f3c' : '#557f45'} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.28, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 0.4, 10]} />
            <meshStandardMaterial color="#74543a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Fence({
  footprint,
}: {
  footprint: { x0: number; x1: number; z0: number; z1: number; width: number; depth: number; cx: number; cz: number }
}) {
  const z = footprint.z0 - 3
  return (
    <group>
      {Array.from({ length: 12 }, (_, i) => {
        const x = footprint.x0 - 4 + (i * (footprint.width + 8)) / 11
        return (
          <mesh key={i} position={[x, 0.42, z]} castShadow>
            <boxGeometry args={[0.12, 0.84, 0.12]} />
            <meshStandardMaterial color="#f0eadf" roughness={0.7} />
          </mesh>
        )
      })}
      <mesh position={[footprint.cx, 0.58, z]} castShadow>
        <boxGeometry args={[footprint.width + 8.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#f0eadf" roughness={0.7} />
      </mesh>
      <mesh position={[footprint.cx, 0.28, z]} castShadow>
        <boxGeometry args={[footprint.width + 8.4, 0.1, 0.1]} />
        <meshStandardMaterial color="#f0eadf" roughness={0.7} />
      </mesh>
    </group>
  )
}
