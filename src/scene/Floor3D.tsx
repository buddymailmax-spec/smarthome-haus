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
  /** Highest visible level. Kept for API symmetry with the scene. */
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
  const wallH = isTop ? 1.35 : FLOOR_H
  const wallY = baseY + wallH / 2 + 0.12

  return (
    <group>
      {/* Floor slab */}
      <RoundedBox position={[bb.cx, baseY + 0.07, bb.cz]} args={[bb.w + 0.32, 0.14, bb.d + 0.32]} radius={0.03} smoothness={2} receiveShadow>
        <meshStandardMaterial color="#e6e1d8" roughness={0.9} />
        <Edges threshold={15} color="#c7c2ba" />
      </RoundedBox>

      <ExteriorWalls bb={bb} wallY={wallY} wallH={wallH} level={level} isTop={!!isTop} revealInterior={revealInterior} />
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
  level,
  isTop,
  revealInterior,
}: {
  bb: ReturnType<typeof bbox>
  wallY: number
  wallH: number
  level: number
  isTop: boolean
  revealInterior: boolean
}) {
  const t = 0.16
  const color = isTop ? '#f5f5ef' : '#fafaf6'
  const edge = '#d8ddd9'
  const frontOpacity = revealInterior ? 0.18 : 1
  const sideOpacity = revealInterior ? 0.72 : 1

  return (
    <group>
      <mesh position={[bb.cx, wallY, bb.z0 - t / 2]} castShadow receiveShadow>
        <boxGeometry args={[bb.w + t, wallH, t]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.01} />
        <Edges threshold={18} color={edge} />
      </mesh>
      <mesh position={[bb.cx, wallY, bb.z1 + t / 2]} castShadow receiveShadow>
        <boxGeometry args={[bb.w + t, wallH, t]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.01} transparent={revealInterior} opacity={frontOpacity} depthWrite={!revealInterior} />
        <Edges threshold={18} color={edge} />
      </mesh>
      <mesh position={[bb.x0 - t / 2, wallY, bb.cz]} castShadow receiveShadow>
        <boxGeometry args={[t, wallH, bb.d + t]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.01} />
        <Edges threshold={18} color={edge} />
      </mesh>
      <mesh position={[bb.x1 + t / 2, wallY, bb.cz]} castShadow receiveShadow>
        <boxGeometry args={[t, wallH, bb.d + t]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.01} transparent={revealInterior} opacity={sideOpacity} />
        <Edges threshold={18} color={edge} />
      </mesh>

      <ClassicFacade bb={bb} wallY={wallY} wallH={wallH} level={level} isTop={isTop} revealInterior={revealInterior} />
    </group>
  )
}

function ClassicFacade({
  bb,
  wallY,
  wallH,
  level,
  isTop,
  revealInterior,
}: {
  bb: ReturnType<typeof bbox>
  wallY: number
  wallH: number
  level: number
  isTop: boolean
  revealInterior: boolean
}) {
  const frontZ = bb.z1 + 0.18
  const backZ = bb.z0 - 0.18
  const rightX = bb.x1 + 0.18
  const windowY = wallY + (isTop ? 0 : wallH * 0.07)
  const frontAlpha = revealInterior ? 0.08 : 1
  const sideAlpha = revealInterior ? 0.48 : 1

  return (
    <group>
      {isTop ? (
        <>
          <FacadeWindow position={[bb.cx, windowY, frontZ]} size={[1.35, 0.72]} opacity={frontAlpha} />
          <FacadeWindow position={[bb.cx, windowY, backZ]} size={[1.35, 0.72]} opacity={1} />
        </>
      ) : (
        <>
          <FacadeWindow position={[bb.x0 + bb.w * 0.28, windowY, frontZ]} size={[1.18, 1.12]} opacity={frontAlpha} />
          <FacadeWindow position={[bb.x0 + bb.w * 0.56, windowY, frontZ]} size={[1.18, 1.12]} opacity={frontAlpha} />
          <FacadeWindow position={[bb.x0 + bb.w * 0.82, windowY, frontZ]} size={[1.05, 1.12]} opacity={frontAlpha} />
          {level === 0 && <FrontDoor x={bb.x0 + 0.78} y={wallY - 0.36} z={frontZ + 0.012} opacity={frontAlpha} />}
          <FacadeWindow position={[rightX, windowY, bb.z0 + bb.d * 0.35]} size={[1.25, 1.02]} rotationY={Math.PI / 2} opacity={sideAlpha} />
          <FacadeWindow position={[rightX, windowY, bb.z0 + bb.d * 0.68]} size={[1.25, 1.02]} rotationY={Math.PI / 2} opacity={sideAlpha} />
          <FacadeWindow position={[bb.x0 + bb.w * 0.34, windowY, backZ]} size={[1.18, 1.08]} opacity={1} />
          <FacadeWindow position={[bb.x0 + bb.w * 0.66, windowY, backZ]} size={[1.18, 1.08]} opacity={1} />
        </>
      )}
    </group>
  )
}

function FacadeWindow({
  position,
  size,
  rotationY = 0,
  opacity,
}: {
  position: [number, number, number]
  size: [number, number]
  rotationY?: number
  opacity: number
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[size[0] + 0.16, size[1] + 0.16, 0.035]} />
        <meshStandardMaterial color="#3f332e" roughness={0.58} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.024]}>
        <boxGeometry args={[size[0], size[1], 0.035]} />
        <meshPhysicalMaterial color="#a7c1cf" roughness={0.1} metalness={0.02} transparent opacity={0.56 * opacity} transmission={0.12} />
      </mesh>
      <mesh position={[0, 0, 0.046]}>
        <boxGeometry args={[0.055, size[1], 0.025]} />
        <meshStandardMaterial color="#3f332e" roughness={0.58} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0, 0.048]}>
        <boxGeometry args={[size[0], 0.055, 0.025]} />
        <meshStandardMaterial color="#3f332e" roughness={0.58} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

function FrontDoor({ x, y, z, opacity }: { x: number; y: number; z: number; opacity: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 1.68, 0.05]} />
        <meshStandardMaterial color="#6d4b34" roughness={0.68} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0.18, 0.2, 0.032]}>
        <boxGeometry args={[0.22, 0.9, 0.026]} />
        <meshPhysicalMaterial color="#9eb4bd" roughness={0.1} transparent opacity={0.52 * opacity} />
      </mesh>
      <mesh position={[0.25, -0.2, 0.05]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color="#c7b272" metalness={0.5} roughness={0.28} transparent opacity={opacity} />
      </mesh>
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
