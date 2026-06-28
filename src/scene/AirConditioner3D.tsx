import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html, Edges } from '@react-three/drei'
import type { ClimateDevice, Room } from '../types'
import { useHouse } from '../state/houseStore'
import { FLOOR_H } from './constants'

interface Props {
  device: ClimateDevice
  room: Room
}

const MODE_COLOR: Record<string, string> = {
  cool: '#3aa0ff',
  heat: '#ff7a4d',
  dry: '#16b8c8',
  fan: '#8aa0b5',
  auto: '#5cc6b3',
}

const N_FLOW = 5 // animated airflow ribbons

export function AirConditioner3D({ device, room }: Props) {
  const { select, selectedId } = useHouse()
  const selected = selectedId === device.id
  const on = device.state.power
  const color = MODE_COLOR[device.state.mode] ?? MODE_COLOR.auto

  // Mount on the back wall (-z) of the room, near the ceiling.
  const wx = room.x + (device.pos?.x ?? 0.5) * room.width
  const wz = room.z + 0.18
  const wy = room.level * FLOOR_H + FLOOR_H * 0.74

  const louver = useRef<THREE.Group>(null)
  const flowRefs = useRef<(THREE.Mesh | null)[]>([])
  const phases = useMemo(() => Array.from({ length: N_FLOW }, (_, i) => i / N_FLOW), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    // Gentle louver tilt when running.
    if (louver.current) {
      const target = on ? -0.5 + Math.sin(t * 1.6) * 0.18 : 0
      louver.current.rotation.x += (target - louver.current.rotation.x) * Math.min(1, dt * 4)
    }
    // Airflow ribbons drift down-and-out, fading as they go.
    flowRefs.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshBasicMaterial
      if (!on) {
        mat.opacity += (0 - mat.opacity) * Math.min(1, dt * 6)
        return
      }
      phases[i] = (phases[i] + dt * 0.5) % 1
      const p = phases[i]
      m.position.y = -0.18 - p * 1.15
      m.position.z = 0.28 + p * 0.55
      const s = 0.5 + p * 1.1
      m.scale.set(s, s, s)
      mat.opacity = Math.sin(p * Math.PI) * 0.5
    })
  })

  return (
    <group position={[wx, wy, wz]} onClick={(e) => { e.stopPropagation(); select(device.id) }}>
      {/* Indoor split-unit body */}
      <RoundedBox args={[1.06, 0.3, 0.26]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color="#f7fafd" roughness={0.3} metalness={0.05} />
        <Edges threshold={15} color={selected ? color : '#aebfd1'} />
      </RoundedBox>
      {/* Front face accent line */}
      <mesh position={[0, -0.06, 0.135]}>
        <boxGeometry args={[0.96, 0.015, 0.01]} />
        <meshStandardMaterial color="#cdd9e6" />
      </mesh>
      {/* Status LED */}
      <mesh position={[0.42, 0.06, 0.14]}>
        <circleGeometry args={[0.022, 16]} />
        <meshStandardMaterial color={on ? color : '#c4cdd6'} emissive={on ? color : '#000000'} emissiveIntensity={on ? 2 : 0} />
      </mesh>

      {/* Louver flap at the bottom outlet */}
      <group ref={louver} position={[0, -0.15, 0.12]}>
        <mesh>
          <boxGeometry args={[0.94, 0.04, 0.14]} />
          <meshStandardMaterial color="#eef3f8" roughness={0.5} />
        </mesh>
      </group>

      {/* Airflow ribbons */}
      {phases.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { flowRefs.current[i] = el }}
          rotation={[-Math.PI / 2.2, 0, 0]}
        >
          <ringGeometry args={[0.16, 0.24, 24, 1, Math.PI * 0.15, Math.PI * 0.7]} />
          <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      {/* Glow when running */}
      {on && <pointLight position={[0, -0.3, 0.3]} color={color} intensity={selected ? 3 : 1.4} distance={2.4} />}

      {/* Temperature label, reference-style */}
      <Html center distanceFactor={11} position={[0, 0.42, 0]} pointerEvents="none">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            transform: selected ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform .15s',
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8aa0b5', whiteSpace: 'nowrap' }}>
            {on ? 'Ziel ' + device.state.target.toFixed(0) + '°' : 'Aus'}
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1b2a3a', lineHeight: 1 }}>
            {device.state.current.toFixed(1)}°
          </span>
        </div>
      </Html>
    </group>
  )
}
