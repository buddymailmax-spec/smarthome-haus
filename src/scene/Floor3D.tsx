import { useMemo } from 'react'
import { Edges, Html, RoundedBox } from '@react-three/drei'
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
  revealInterior: boolean
}

function bbox(rooms: Room[]) {
  const x0 = Math.min(...rooms.map((r) => r.x))
  const x1 = Math.max(...rooms.map((r) => r.x + r.width))
  const z0 = Math.min(...rooms.map((r) => r.z))
  const z1 = Math.max(...rooms.map((r) => r.z + r.depth))
  return { x0, x1, z0, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }
}

export function Floor3D({ level, rooms, devices, isTop, revealInterior }: Props) {
  const { select, selectedId, hovered, setHovered } = useHouse()
  const bb = useMemo(() => bbox(rooms), [rooms])
  const baseY = level * FLOOR_H
  const wallH = isTop ? FLOOR_H * 0.72 : FLOOR_H
  const wallY = baseY + wallH / 2 + 0.12

  return (
    <group>
      {/* Floor slab */}
      <RoundedBox position={[bb.cx, baseY + 0.07, bb.cz]} args={[bb.w + 0.32, 0.14, bb.d + 0.32]} radius={0.03} smoothness={2} receiveShadow>
        <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
        <Edges threshold={15} color="#cbbfae" />
      </RoundedBox>

      <ExteriorWalls bb={bb} wallY={wallY} wallH={wallH} isTop={!!isTop} revealInterior={revealInterior} />
      {revealInterior && <InteriorWalls rooms={rooms} baseY={baseY} />}

      {/* Per-room colored floor pad + label */}
      {revealInterior && rooms.map((room) => {
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
      {revealInterior && devices.filter(isClimate).map((d) => {
        const room = rooms.find((r) => r.id === d.roomId)
        if (!room) return null
        return <AirConditioner3D key={d.id} device={d} room={room} revealInterior={revealInterior} />
      })}

    </group>
  )
}

function ExteriorWalls({
  bb,
  wallY,
  wallH,
  isTop,
  revealInterior,
}: {
  bb: ReturnType<typeof bbox>
  wallY: number
  wallH: number
  isTop: boolean
  revealInterior: boolean
}) {
  const t = 0.16
  const color = isTop ? '#fff9f0' : '#fffdf8'
  const edge = '#d6d0c6'
  const windowY = wallY + wallH * 0.08
  const frontOpacity = revealInterior ? 0.18 : 1
  const sideOpacity = revealInterior ? 0.72 : 1

  return (
    <group>
      <mesh position={[bb.cx, wallY, bb.z0 - t / 2]} castShadow receiveShadow>
        <boxGeometry args={[bb.w + t, wallH, t]} />
        <meshStandardMaterial color={color} roughness={0.64} metalness={0.02} />
        <Edges threshold={18} color={edge} />
      </mesh>
      <mesh position={[bb.cx, wallY, bb.z1 + t / 2]} castShadow receiveShadow>
        <boxGeometry args={[bb.w + t, wallH, t]} />
        <meshStandardMaterial color={color} roughness={0.64} metalness={0.02} transparent={revealInterior} opacity={frontOpacity} depthWrite={!revealInterior} />
        <Edges threshold={18} color={edge} />
      </mesh>
      <mesh position={[bb.x0 - t / 2, wallY, bb.cz]} castShadow receiveShadow>
        <boxGeometry args={[t, wallH, bb.d + t]} />
        <meshStandardMaterial color={color} roughness={0.64} metalness={0.02} />
        <Edges threshold={18} color={edge} />
      </mesh>
      <mesh position={[bb.x1 + t / 2, wallY, bb.cz]} castShadow receiveShadow>
        <boxGeometry args={[t, wallH, bb.d + t]} />
        <meshStandardMaterial color={color} roughness={0.64} metalness={0.02} transparent={revealInterior} opacity={sideOpacity} />
        <Edges threshold={18} color={edge} />
      </mesh>

      <WindowRow count={Math.max(2, Math.round(bb.w / 3))} start={bb.x0} length={bb.w} fixed="z" value={bb.z1 + t + 0.006} y={windowY} />
      <WindowRow count={Math.max(1, Math.round(bb.d / 3))} start={bb.z0} length={bb.d} fixed="x" value={bb.x1 + t + 0.006} y={windowY} />
    </group>
  )
}

function InteriorWalls({ rooms, baseY }: { rooms: Room[]; baseY: number }) {
  return (
    <group>
      {rooms.map((room) => {
        const y = baseY + 0.86
        return (
          <group key={`walls-${room.id}`}>
            <mesh position={[room.x + room.width / 2, y, room.z]} castShadow receiveShadow>
              <boxGeometry args={[room.width, 1.45, 0.07]} />
              <meshStandardMaterial color="#f3eee4" roughness={0.72} transparent opacity={0.62} />
            </mesh>
            <mesh position={[room.x, y, room.z + room.depth / 2]} castShadow receiveShadow>
              <boxGeometry args={[0.07, 1.45, room.depth]} />
              <meshStandardMaterial color="#f3eee4" roughness={0.72} transparent opacity={0.62} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function WindowRow({
  count,
  start,
  length,
  fixed,
  value,
  y,
}: {
  count: number
  start: number
  length: number
  fixed: 'x' | 'z'
  value: number
  y: number
}) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const pos = start + ((i + 1) * length) / (count + 1)
        const position: [number, number, number] = fixed === 'z' ? [pos, y, value] : [value, y, pos]
        const rotation: [number, number, number] = fixed === 'z' ? [0, 0, 0] : [0, Math.PI / 2, 0]
        return (
          <group key={`${fixed}-${i}`} position={position} rotation={rotation}>
            <mesh>
              <boxGeometry args={[0.82, 0.82, 0.018]} />
              <meshStandardMaterial color="#9fc7e6" roughness={0.18} metalness={0.05} transparent opacity={0.72} />
            </mesh>
            <mesh position={[0, 0, 0.012]}>
              <boxGeometry args={[0.92, 0.08, 0.02]} />
              <meshStandardMaterial color="#f9fbfd" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.014]}>
              <boxGeometry args={[0.08, 0.92, 0.02]} />
              <meshStandardMaterial color="#f9fbfd" roughness={0.4} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
