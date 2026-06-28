import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment, SoftShadows, Bounds } from '@react-three/drei'
import { useMemo } from 'react'
import { useHouse } from '../state/houseStore'
import { Room3D } from './Room3D'
import { DeviceMarker } from './DeviceMarker'

export function House3D() {
  const { house, select } = useHouse()

  // Center the camera target on the house footprint.
  const center = useMemo(() => {
    const xs = house.rooms.flatMap((r) => [r.x, r.x + r.width])
    const zs = house.rooms.flatMap((r) => [r.z, r.z + r.depth])
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2 || 0
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2 || 0
    return [cx, cz] as const
  }, [house.rooms])

  return (
    <Canvas
      shadows
      camera={{ position: [center[0] + 9, 20, center[1] + 13], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0b1020']} />
      <fog attach="fog" args={['#0b1020', 28, 60]} />
      <SoftShadows size={28} samples={12} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[center[0] + 8, 18, center[1] + 6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <Environment preset="city" />

      {/* Ground plane — click to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[center[0], -0.01, center[1]]}
        receiveShadow
        onClick={() => select(null)}
      >
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0b1020" roughness={1} metalness={0} />
      </mesh>

      <ContactShadows
        position={[center[0], 0.02, center[1]]}
        scale={50}
        blur={2.4}
        far={8}
        opacity={0.5}
      />

      {/* Auto-frame the house to fill the view regardless of aspect ratio. */}
      <Bounds fit clip observe margin={1.15}>
        {house.rooms.map((room) => (
          <Room3D key={room.id} room={room} />
        ))}

        {house.devices.map((device) => {
          const room = house.rooms.find((r) => r.id === device.roomId)
          if (!room) return null
          return <DeviceMarker key={device.id} device={device} room={room} />
        })}
      </Bounds>

      <OrbitControls
        makeDefault
        target={[center[0], 1, center[1]]}
        enablePan
        minDistance={6}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.15}
      />
    </Canvas>
  )
}
