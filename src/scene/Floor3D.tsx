import { useMemo } from 'react'
import { Edges, Html } from '@react-three/drei'
import type { Device, Room } from '../types'
import { isClimate } from '../types'
import { useHouse } from '../state/houseStore'
import { AirConditioner3D } from './AirConditioner3D'
import { FLOOR_H } from './constants'

interface Props {
  level: number
  rooms: Room[]
  devices: Device[]
  /** Top floor (Dachboden) skips the box shell — the roof forms its walls. */
  isTop?: boolean
}

function bbox(rooms: Room[]) {
  const x0 = Math.min(...rooms.map((r) => r.x))
  const x1 = Math.max(...rooms.map((r) => r.x + r.width))
  const z0 = Math.min(...rooms.map((r) => r.z))
  const z1 = Math.max(...rooms.map((r) => r.z + r.depth))
  return { x0, x1, z0, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }
}

export function Floor3D({ level, rooms, devices, isTop }: Props) {
  const { select, selectedId, hovered, setHovered } = useHouse()
  const bb = useMemo(() => bbox(rooms), [rooms])
  const baseY = level * FLOOR_H

  return (
    <group>
      {/* Floor slab */}
      <mesh position={[bb.cx, baseY + 0.06, bb.cz]} receiveShadow>
        <boxGeometry args={[bb.w + 0.12, 0.12, bb.d + 0.12]} />
        <meshStandardMaterial color="#f4f8fc" roughness={0.85} />
        <Edges threshold={15} color="#c3d4e6" />
      </mesh>

      {/* Glass shell (not on the attic — the roof replaces it) */}
      {!isTop && (
        <mesh position={[bb.cx, baseY + FLOOR_H / 2 + 0.12, bb.cz]}>
          <boxGeometry args={[bb.w, FLOOR_H, bb.d]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} roughness={0.1} />
          <Edges threshold={15} color="#b7cde2" />
        </mesh>
      )}

      {/* Per-room colored floor pad + label */}
      {rooms.map((room) => {
        const cx = room.x + room.width / 2
        const cz = room.z + room.depth / 2
        const selected = selectedId === room.id
        return (
          <group key={room.id}>
            <mesh
              position={[cx, baseY + 0.13, cz]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => { e.stopPropagation(); select(room.id) }}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(room.id) }}
              onPointerOut={() => setHovered(null)}
            >
              <planeGeometry args={[room.width - 0.25, room.depth - 0.25]} />
              <meshStandardMaterial color={room.color} transparent opacity={selected ? 0.55 : 0.32} roughness={0.7} />
            </mesh>
            {(selected || hovered === room.id) && (
              <Html position={[cx, baseY + 0.22, cz]} center distanceFactor={14} pointerEvents="none">
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1b2a3a',
                    whiteSpace: 'nowrap',
                    background: 'rgba(255,255,255,0.82)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    boxShadow: '0 2px 8px rgba(31,64,104,0.18)',
                  }}
                >
                  {room.name}
                </div>
              </Html>
            )}
          </group>
        )
      })}

      {/* Air conditioners */}
      {devices.filter(isClimate).map((d) => {
        const room = rooms.find((r) => r.id === d.roomId)
        if (!room) return null
        return <AirConditioner3D key={d.id} device={d} room={room} />
      })}

    </group>
  )
}
