import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { Room } from '../types'
import { useHouse } from '../state/houseStore'

interface Props {
  room: Room
}

const WALL_T = 0.12 // wall thickness (m)

export function Room3D({ room }: Props) {
  const { selectedId, hovered, select, setHovered } = useHouse()
  const selected = selectedId === room.id
  const isHovered = hovered === room.id

  // Center of the room footprint in world space.
  const cx = room.x + room.width / 2
  const cz = room.z + room.depth / 2

  const floorColor = useMemo(() => new THREE.Color(room.color).lerp(new THREE.Color('#0b1020'), 0.55), [room.color])
  const wallColor = useMemo(() => new THREE.Color(room.color).lerp(new THREE.Color('#1a2342'), 0.7), [room.color])

  const h = room.height
  const wallY = h / 2

  return (
    <group
      position={[cx, 0, cz]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(room.id)
      }}
      onPointerOut={() => setHovered(null)}
      onClick={(e) => {
        e.stopPropagation()
        select(room.id)
      }}
    >
      {/* Floor */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial
          color={floorColor}
          emissive={room.color}
          emissiveIntensity={selected ? 0.35 : isHovered ? 0.18 : 0.06}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Glowing outline ring on floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(room.width, room.depth) / 2 - 0.15, Math.min(room.width, room.depth) / 2, 48]} />
        <meshBasicMaterial color={room.color} transparent opacity={selected ? 0.5 : 0.0} />
      </mesh>

      {/* Two back walls (so the room stays open like a dollhouse) */}
      <mesh castShadow position={[0, wallY, -room.depth / 2]}>
        <boxGeometry args={[room.width, h, WALL_T]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} transparent opacity={0.92} />
      </mesh>
      <mesh castShadow position={[-room.width / 2, wallY, 0]}>
        <boxGeometry args={[WALL_T, h, room.depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} transparent opacity={0.92} />
      </mesh>

      {/* Floating room label */}
      <Html position={[0, h + 0.4, 0]} center distanceFactor={14} pointerEvents="none">
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            color: '#e6ebff',
            background: 'rgba(17,24,46,0.78)',
            border: `1px solid ${room.color}`,
            boxShadow: selected ? `0 0 18px ${room.color}` : 'none',
            backdropFilter: 'blur(6px)',
          }}
        >
          {room.name}
        </div>
      </Html>
    </group>
  )
}
