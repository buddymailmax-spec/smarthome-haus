import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Device, Room } from '../types'
import { isClimate } from '../types'
import { useHouse } from '../state/houseStore'

interface Props {
  device: Device
  room: Room
}

const KIND_COLOR: Record<Device['kind'], string> = {
  climate: '#5b8cff',
  light: '#ffd25b',
  sensor: '#4fd1c5',
  plug: '#b78cff',
}

export function DeviceMarker({ device, room }: Props) {
  const ref = useRef<THREE.Group>(null)
  const { select, selectedId } = useHouse()
  const selected = selectedId === device.id

  // Map normalized in-room position to world coordinates.
  const wx = room.x + device.pos.x * room.width
  const wz = room.z + device.pos.z * room.depth
  const baseY = 1.6

  // Gentle bob so markers feel alive.
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = baseY + Math.sin(t * 1.5 + wx) * 0.06
  })

  const color = KIND_COLOR[device.kind]
  const on = isClimate(device) ? device.state.power : !!device.state.on
  const label = isClimate(device)
    ? `${device.state.current.toFixed(1)}°`
    : device.kind === 'sensor'
      ? `${device.state.value ?? ''}${device.state.unit ?? ''}`
      : on
        ? 'An'
        : 'Aus'

  return (
    <group position={[wx, 0, wz]}>
      {/* Light beam to the floor */}
      <mesh position={[0, baseY / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, baseY, 8]} />
        <meshBasicMaterial color={color} transparent opacity={on ? 0.35 : 0.12} />
      </mesh>

      <group
        ref={ref}
        onClick={(e) => {
          e.stopPropagation()
          select(device.id)
        }}
      >
        {/* Glowing orb */}
        <mesh castShadow>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={on ? 1.4 : 0.25}
            roughness={0.3}
          />
        </mesh>
        {on && <pointLight color={color} intensity={selected ? 6 : 3} distance={3} />}

        <Html center distanceFactor={12} position={[0, 0.42, 0]} pointerEvents="none">
          <div
            style={{
              padding: '3px 9px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              color: '#0b1020',
              background: color,
              opacity: on ? 1 : 0.5,
              boxShadow: `0 4px 14px ${color}77`,
            }}
          >
            {label}
          </div>
        </Html>
      </group>
    </group>
  )
}
