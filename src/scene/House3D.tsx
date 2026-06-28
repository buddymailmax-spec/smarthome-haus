import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, SoftShadows, Bounds } from '@react-three/drei'
import { useMemo } from 'react'
import { useHouse } from '../state/houseStore'
import { Floor3D } from './Floor3D'
import { Roof3D } from './Roof3D'
import { FLOOR_H, ROOF_H } from './constants'

export function House3D() {
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

  // Footprint center for camera + ground.
  const center = useMemo(() => {
    const xs = house.rooms.flatMap((r) => [r.x, r.x + r.width])
    const zs = house.rooms.flatMap((r) => [r.z, r.z + r.depth])
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2] as const
  }, [house.rooms])

  // Roof spans the top floor's footprint.
  const roof = useMemo(() => {
    const top = levels.find(([lvl]) => lvl === topLevel)?.[1] ?? []
    if (!top.length) return null
    const x0 = Math.min(...top.map((r) => r.x))
    const x1 = Math.max(...top.map((r) => r.x + r.width))
    const z0 = Math.min(...top.map((r) => r.z))
    const z1 = Math.max(...top.map((r) => r.z + r.depth))
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, width: x1 - x0 + 0.6, depth: z1 - z0 + 0.6, baseY: topLevel * FLOOR_H + FLOOR_H }
  }, [levels, topLevel])

  return (
    <Canvas
      shadows
      camera={{ position: [center[0] + 13, 14, center[1] + 15], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#dcecfb']} />
      <fog attach="fog" args={['#e8f2fb', 38, 75]} />
      <SoftShadows size={26} samples={12} />

      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#ffffff', '#cdddee', 0.9]} />
      <directionalLight
        position={[center[0] + 10, 22, center[1] + 8]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      {/* Ground — click to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[center[0], -0.02, center[1]]}
        receiveShadow
        onClick={() => select(null)}
      >
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#eaf3fb" roughness={1} />
      </mesh>

      <ContactShadows position={[center[0], 0, center[1]]} scale={40} blur={2.6} far={10} opacity={0.35} />

      <Bounds fit clip observe margin={1.1}>
        {levels.map(([lvl, rooms]) => (
          <Floor3D
            key={lvl}
            level={lvl}
            rooms={rooms}
            devices={house.devices}
            isTop={lvl === topLevel}
          />
        ))}
        {roof && <Roof3D cx={roof.cx} cz={roof.cz} width={roof.width} depth={roof.depth} baseY={roof.baseY} ridgeH={ROOF_H} />}
      </Bounds>

      <OrbitControls
        makeDefault
        target={[center[0], FLOOR_H, center[1]]}
        enablePan
        minDistance={6}
        maxDistance={48}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  )
}
