import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Edges } from '@react-three/drei'
import type { Room } from '../types'

/**
 * Modern, lightly animated interior. Rooms are dressed procedurally from their
 * name. Each piece lives in room-local coordinates: the group sits at the room
 * corner (x, z) on the floor, so a piece at [0..width, *, 0..depth] stays inside.
 * Back wall = z 0, front (open, camera side) = z depth.
 */
const F = 0.14 // local floor height (matches Floor3D slab top)

export function Furniture3D({ rooms, baseY }: { rooms: Room[]; baseY: number }) {
  return (
    <group>
      {rooms.map((room) => (
        <group key={`furn-${room.id}`} position={[room.x, baseY, room.z]}>
          <RoomFurniture room={room} />
        </group>
      ))}
    </group>
  )
}

function RoomFurniture({ room }: { room: Room }) {
  const W = room.width
  const D = room.depth
  const name = room.name.toLowerCase()

  if (name.includes('wohn')) return <LivingRoom W={W} D={D} />
  if (name.includes('küche') || name.includes('kuche')) return <Kitchen W={W} D={D} />
  if (name.includes('schlaf')) return <Bedroom W={W} D={D} />
  if (name.includes('kind')) return <KidsRoom W={W} D={D} />
  if (name.includes('büro') || name.includes('buro')) return <Office W={W} D={D} />
  if (name.includes('dach')) return <Attic W={W} D={D} />
  return <LivingRoom W={W} D={D} />
}

/* ----------------------------------------------------------------- pieces - */

function Rug({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return (
    <mesh position={[x, F + 0.008, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

/** Wall-mounted screen with a softly hue-shifting picture. */
function GlowScreen({
  position,
  size,
  rotation = [0, 0, 0],
  speed = 0.06,
}: {
  position: [number, number, number]
  size: [number, number]
  rotation?: [number, number, number]
  speed?: number
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((s) => {
    if (!mat.current) return
    const h = (s.clock.elapsedTime * speed) % 1
    mat.current.color.setHSL(h, 0.55, 0.55)
    mat.current.emissive.setHSL(h, 0.55, 0.5)
  })
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[size[0] + 0.06, size[1] + 0.06, 0.04]} />
        <meshStandardMaterial color="#23282e" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={size} />
        <meshStandardMaterial ref={mat} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Hanging pendant lamp with a warm glow that gently bobs. */
function Pendant({
  position,
  cord = 0.55,
  radius = 0.1,
  color = '#ffd9a0',
}: {
  position: [number, number, number]
  cord?: number
  radius?: number
  color?: string
}) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (g.current) g.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 1.4 + position[0]) * 0.012
  })
  return (
    <group ref={g} position={position}>
      <mesh position={[0, cord / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, cord, 6]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius, 20, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={2.4} />
    </group>
  )
}

/** Potted plant whose foliage sways. */
function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (g.current) g.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.1 + position[0]) * 0.05
  })
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.26, 18]} />
        <meshStandardMaterial color="#e7ddcc" roughness={0.85} />
      </mesh>
      <group ref={g} position={[0, 0.26, 0]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <coneGeometry args={[0.22, 0.55, 14]} />
          <meshStandardMaterial color="#3f7d4f" roughness={0.85} />
        </mesh>
        <mesh position={[0.08, 0.5, 0.05]} castShadow>
          <coneGeometry args={[0.14, 0.4, 12]} />
          <meshStandardMaterial color="#4f9a5e" roughness={0.85} />
        </mesh>
        <mesh position={[-0.07, 0.45, -0.04]} castShadow>
          <coneGeometry args={[0.12, 0.34, 12]} />
          <meshStandardMaterial color="#58a868" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}

/** Tall floor lamp with a warm glowing head. */
function FloorLamp({ position, color = '#ffe1b0' }: { position: [number, number, number]; color?: string }) {
  const head = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((s) => {
    if (head.current) head.current.emissiveIntensity = 1.1 + Math.sin(s.clock.elapsedTime * 2) * 0.12
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 18]} />
        <meshStandardMaterial color="#33404a" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.2, 8]} />
        <meshStandardMaterial color="#33404a" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.24, 0]} castShadow>
        <coneGeometry args={[0.17, 0.26, 20, 1, true]} />
        <meshStandardMaterial ref={head} color={color} emissive={color} emissiveIntensity={1.1} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.18, 0]} color={color} intensity={0.5} distance={2.6} />
    </group>
  )
}

/** Rising steam puffs (kitchen). */
function Steam({ position }: { position: [number, number, number] }) {
  const N = 5
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const phases = useMemo(() => Array.from({ length: N }, (_, i) => i / N), [])
  useFrame((_, dt) => {
    refs.current.forEach((m, i) => {
      if (!m) return
      phases[i] = (phases[i] + dt * 0.4) % 1
      const p = phases[i]
      m.position.y = p * 0.62
      m.position.x = Math.sin(p * 7 + i) * 0.045
      m.scale.setScalar(0.05 + p * 0.13)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.sin(p * Math.PI) * 0.4
    })
  })
  return (
    <group position={position}>
      {phases.map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Slowly turning baby mobile (kids). */
function Mobile({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (g.current) g.current.rotation.y = s.clock.elapsedTime * 0.55
  })
  const arms = [0, 1, 2, 3]
  const cols = ['#ff8aa0', '#ffd36b', '#8ad0ff', '#9be58a']
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.32, 6]} />
        <meshStandardMaterial color="#9aa3ab" />
      </mesh>
      <group ref={g}>
        {arms.map((i) => {
          const a = (i / arms.length) * Math.PI * 2
          const r = 0.22
          return (
            <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
              <mesh position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.24, 5]} />
                <meshStandardMaterial color="#b7bfc6" />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <sphereGeometry args={[0.065, 18, 14]} />
                <meshStandardMaterial color={cols[i]} roughness={0.6} />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

/** Bouncing toy ball. */
function Ball({ position, color = '#ff7a59' }: { position: [number, number, number]; color?: string }) {
  const m = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (m.current) m.current.position.y = position[1] + Math.abs(Math.sin(s.clock.elapsedTime * 2.1)) * 0.28
  })
  return (
    <mesh ref={m} position={position} castShadow>
      <sphereGeometry args={[0.13, 22, 18]} />
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
  )
}

/** Office chair that swivels back and forth. */
function OfficeChair({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (g.current) g.current.rotation.y = Math.PI + Math.sin(s.clock.elapsedTime * 0.5) * 0.45
  })
  return (
    <group ref={g} position={position}>
      <RoundedBox args={[0.5, 0.1, 0.5]} radius={0.04} smoothness={3} position={[0, 0.46, 0]} castShadow>
        <meshStandardMaterial color="#2f3a44" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.6, 0.1]} radius={0.05} smoothness={3} position={[0, 0.78, -0.22]} castShadow>
        <meshStandardMaterial color="#2f3a44" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 10]} />
        <meshStandardMaterial color="#7d858c" metalness={0.5} roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.24, 0.05, 0.05]} />
            <meshStandardMaterial color="#7d858c" metalness={0.5} roughness={0.4} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Twinkling string of fairy lights. */
function StringLights({
  from,
  to,
  count = 8,
}: {
  from: [number, number, number]
  to: [number, number, number]
  count?: number
}) {
  const refs = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  useFrame((s) => {
    refs.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.8 + 0.6 * Math.sin(s.clock.elapsedTime * 2.2 + i * 0.9)
    })
  })
  const pts = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    return [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 0.16,
      from[2] + (to[2] - from[2]) * t,
    ] as [number, number, number]
  })
  return (
    <group>
      {pts.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.042, 12, 10]} />
          <meshStandardMaterial ref={(el) => { refs.current[i] = el }} color="#ffe6a8" emissive="#ffcf6b" emissiveIntensity={1} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ rooms - */

function LivingRoom({ W, D }: { W: number; D: number }) {
  const sofa = '#7d9a93'
  return (
    <group>
      <Rug x={W * 0.5} z={D * 0.55} w={Math.min(2.6, W - 1)} d={2.2} color="#e7e0d2" />

      {/* TV wall + media console (back wall) */}
      <RoundedBox args={[W - 1.4, 0.4, 0.4]} radius={0.05} smoothness={3} position={[W * 0.5, F + 0.2, 0.32]} castShadow>
        <meshStandardMaterial color="#e9e4da" roughness={0.6} />
      </RoundedBox>
      <GlowScreen position={[W * 0.5, F + 1.1, 0.2]} size={[1.7, 0.95]} />

      {/* L-sectional sofa facing the TV */}
      <RoundedBox args={[2.4, 0.42, 0.9]} radius={0.1} smoothness={4} position={[W * 0.5, F + 0.21, D - 1.1]} castShadow>
        <meshStandardMaterial color={sofa} roughness={0.78} />
      </RoundedBox>
      <RoundedBox args={[2.4, 0.5, 0.26]} radius={0.08} smoothness={4} position={[W * 0.5, F + 0.5, D - 0.66]} castShadow>
        <meshStandardMaterial color="#6c887f" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.85, 0.55, 0.85]} radius={0.1} smoothness={4} position={[W * 0.5 - 1.18, F + 0.28, D - 1.55]} castShadow>
        <meshStandardMaterial color={sofa} roughness={0.78} />
      </RoundedBox>
      {/* throw cushions */}
      <RoundedBox args={[0.34, 0.34, 0.14]} radius={0.06} smoothness={3} position={[W * 0.5 - 0.7, F + 0.5, D - 1.0]} rotation={[0, 0, 0.3]} castShadow>
        <meshStandardMaterial color="#e7b06a" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.34, 0.14]} radius={0.06} smoothness={3} position={[W * 0.5 + 0.7, F + 0.5, D - 1.0]} rotation={[0, 0, -0.3]} castShadow>
        <meshStandardMaterial color="#d98f6e" roughness={0.85} />
      </RoundedBox>

      {/* round coffee table */}
      <mesh position={[W * 0.5, F + 0.2, D * 0.55]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.06, 28]} />
        <meshStandardMaterial color="#caa97e" roughness={0.5} />
      </mesh>
      <mesh position={[W * 0.5, F + 0.1, D * 0.55]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 12]} />
        <meshStandardMaterial color="#8a6f4f" roughness={0.6} />
      </mesh>

      <FloorLamp position={[W - 0.5, F, D - 0.6]} />
      <Plant position={[0.55, F, D - 0.6]} scale={1.1} />
      <Pendant position={[W * 0.5, F + 1.9, D * 0.42]} radius={0.12} color="#ffe2ad" />
    </group>
  )
}

function Kitchen({ W, D }: { W: number; D: number }) {
  return (
    <group>
      {/* base cabinet run along the right exterior wall */}
      <RoundedBox args={[0.6, 0.85, D - 0.8]} radius={0.03} smoothness={3} position={[W - 0.4, F + 0.42, D * 0.5]} castShadow>
        <meshStandardMaterial color="#dfe3e6" roughness={0.5} />
      </RoundedBox>
      <mesh position={[W - 0.4, F + 0.88, D * 0.5]} castShadow>
        <boxGeometry args={[0.66, 0.06, D - 0.74]} />
        <meshStandardMaterial color="#5d666c" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* tall fridge */}
      <RoundedBox args={[0.6, 1.7, 0.6]} radius={0.04} smoothness={3} position={[W - 0.4, F + 0.85, 0.6]} castShadow>
        <meshStandardMaterial color="#cfd6db" roughness={0.35} metalness={0.3} />
        <Edges threshold={20} color="#aab4bb" />
      </RoundedBox>
      {/* sink + steaming pot on the counter */}
      <mesh position={[W - 0.4, F + 0.92, D * 0.62]} castShadow>
        <cylinderGeometry args={[0.13, 0.11, 0.16, 18]} />
        <meshStandardMaterial color="#3a4248" metalness={0.5} roughness={0.3} />
      </mesh>
      <Steam position={[W - 0.4, F + 1.0, D * 0.62]} />

      {/* island + glowing pendants + bar stools */}
      <RoundedBox args={[1.1, 0.85, 1.5]} radius={0.05} smoothness={3} position={[W * 0.42, F + 0.42, D * 0.5]} castShadow>
        <meshStandardMaterial color="#586a72" roughness={0.55} />
      </RoundedBox>
      <mesh position={[W * 0.42, F + 0.88, D * 0.5]} castShadow>
        <boxGeometry args={[1.2, 0.06, 1.6]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.4} />
      </mesh>
      {[-0.4, 0.4].map((dz, i) => (
        <group key={i} position={[W * 0.42 - 0.85, F, D * 0.5 + dz]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 18]} />
            <meshStandardMaterial color="#caa97e" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 10]} />
            <meshStandardMaterial color="#7d858c" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <Pendant position={[W * 0.42 - 0.3, F + 1.7, D * 0.5]} radius={0.085} cord={0.45} />
      <Pendant position={[W * 0.42 + 0.3, F + 1.75, D * 0.5]} radius={0.085} cord={0.4} />
    </group>
  )
}

function Bedroom({ W, D }: { W: number; D: number }) {
  return (
    <group>
      <Rug x={W * 0.5} z={D * 0.62} w={W - 0.7} d={2.4} color="#e4ddec" />
      {/* platform bed, headboard at back wall */}
      <RoundedBox args={[W - 0.9, 0.32, 2.3]} radius={0.06} smoothness={3} position={[W * 0.5, F + 0.18, 1.55]} castShadow>
        <meshStandardMaterial color="#d8d2c6" roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[W - 0.9, 0.26, 1.9]} radius={0.08} smoothness={4} position={[W * 0.5, F + 0.42, 1.7]} castShadow>
        <meshStandardMaterial color="#f3f0ea" roughness={0.85} />
      </RoundedBox>
      {/* duvet fold + pillows */}
      <RoundedBox args={[W - 0.9, 0.16, 0.7]} radius={0.06} smoothness={4} position={[W * 0.5, F + 0.5, 2.35]} castShadow>
        <meshStandardMaterial color="#9b8cce" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.18, 0.4]} radius={0.08} smoothness={4} position={[W * 0.5 - 0.45, F + 0.56, 0.95]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.18, 0.4]} radius={0.08} smoothness={4} position={[W * 0.5 + 0.45, F + 0.56, 0.95]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[W - 0.9, 0.7, 0.12]} radius={0.05} smoothness={3} position={[W * 0.5, F + 0.5, 0.55]} castShadow>
        <meshStandardMaterial color="#cdbfae" roughness={0.7} />
      </RoundedBox>
      {/* nightstands with glowing lamps */}
      {[-1, 1].map((s, i) => (
        <group key={i} position={[W * 0.5 + s * ((W - 0.9) / 2 + 0.32), F, 0.75]}>
          <RoundedBox args={[0.4, 0.4, 0.4]} radius={0.04} smoothness={3} position={[0, 0.2, 0]} castShadow>
            <meshStandardMaterial color="#c9b59a" roughness={0.6} />
          </RoundedBox>
          <Pendant position={[0, 0.62, 0]} cord={0} radius={0.07} color="#ffcf8a" />
        </group>
      ))}
      <Plant position={[0.5, F, D - 0.55]} scale={0.95} />
    </group>
  )
}

function KidsRoom({ W, D }: { W: number; D: number }) {
  return (
    <group>
      <Rug x={W * 0.5} z={D * 0.6} w={W - 0.8} d={2.0} color="#bfe2f3" />
      {/* low bed */}
      <RoundedBox args={[W - 1.1, 0.3, 1.8]} radius={0.08} smoothness={4} position={[W * 0.5, F + 0.17, 1.25]} castShadow>
        <meshStandardMaterial color="#f0ebe2" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[W - 1.1, 0.16, 0.65]} radius={0.07} smoothness={4} position={[W * 0.5, F + 0.36, 1.7]} castShadow>
        <meshStandardMaterial color="#ffb347" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.55, 0.16, 0.34]} radius={0.07} smoothness={4} position={[W * 0.5, F + 0.42, 0.65]} castShadow>
        <meshStandardMaterial color="#ff8aa0" roughness={0.9} />
      </RoundedBox>
      {/* toy chest */}
      <RoundedBox args={[0.7, 0.45, 0.45]} radius={0.06} smoothness={3} position={[0.55, F + 0.23, D - 0.55]} castShadow>
        <meshStandardMaterial color="#6cc4e0" roughness={0.7} />
      </RoundedBox>
      {/* stacked blocks */}
      {['#ff8aa0', '#ffd36b', '#8ad0ff'].map((c, i) => (
        <RoundedBox key={i} args={[0.26, 0.26, 0.26]} radius={0.03} smoothness={3} position={[W - 0.55, F + 0.13 + i * 0.27, 0.6]} rotation={[0, i * 0.3, 0]} castShadow>
          <meshStandardMaterial color={c} roughness={0.6} />
        </RoundedBox>
      ))}
      <Ball position={[W * 0.5 - 0.2, F + 0.13, D - 0.7]} color="#ff5e7a" />
      <Mobile position={[W * 0.5, F + 1.55, 1.25]} />
    </group>
  )
}

function Office({ W, D }: { W: number; D: number }) {
  return (
    <group>
      <Rug x={W * 0.5} z={D * 0.55} w={W - 0.8} d={2.0} color="#dde3e8" />
      {/* desk along back wall */}
      <RoundedBox args={[W - 1.0, 0.06, 0.7]} radius={0.02} smoothness={3} position={[W * 0.5, F + 0.74, 0.62]} castShadow>
        <meshStandardMaterial color="#caa97e" roughness={0.5} />
      </RoundedBox>
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[W * 0.5 + s * ((W - 1.0) / 2 - 0.08), F + 0.37, 0.62]}>
          <boxGeometry args={[0.06, 0.74, 0.6]} />
          <meshStandardMaterial color="#7d858c" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* monitor with glowing screen */}
      <GlowScreen position={[W * 0.5, F + 1.05, 0.5]} size={[0.85, 0.5]} speed={0.04} />
      <mesh position={[W * 0.5, F + 0.78, 0.5]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color="#3a4248" />
      </mesh>
      {/* keyboard */}
      <RoundedBox args={[0.5, 0.03, 0.18]} radius={0.01} smoothness={2} position={[W * 0.5, F + 0.78, 0.78]} castShadow>
        <meshStandardMaterial color="#e4e7ea" roughness={0.6} />
      </RoundedBox>
      {/* desk lamp */}
      <Pendant position={[W * 0.5 + (W - 1.0) / 2 - 0.18, F + 0.95, 0.55]} cord={0} radius={0.06} color="#ffd98a" />
      {/* shelf with books */}
      <mesh position={[0.45, F + 1.2, D * 0.55]} castShadow>
        <boxGeometry args={[0.3, 0.05, 1.4]} />
        <meshStandardMaterial color="#c9b59a" roughness={0.6} />
      </mesh>
      {['#5a7d8c', '#c2715a', '#8a9b5a', '#7d6a9b', '#c2a05a'].map((c, i) => (
        <mesh key={i} position={[0.45, F + 1.32, D * 0.55 - 0.55 + i * 0.24]} castShadow>
          <boxGeometry args={[0.22, 0.22, 0.05 + (i % 2) * 0.02]} />
          <meshStandardMaterial color={c} roughness={0.7} />
        </mesh>
      ))}
      <OfficeChair position={[W * 0.5, F, 1.3]} />
      <Plant position={[W - 0.5, F, D - 0.55]} scale={1.0} />
    </group>
  )
}

function Attic({ W, D }: { W: number; D: number }) {
  return (
    <group>
      <Rug x={W * 0.5} z={D * 0.5} w={W - 1.4} d={D - 1.6} color="#e9ddc9" />
      {/* low lounge sofa */}
      <RoundedBox args={[2.0, 0.34, 0.85]} radius={0.1} smoothness={4} position={[W * 0.45, F + 0.17, D - 1.0]} castShadow>
        <meshStandardMaterial color="#b98e6e" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[2.0, 0.38, 0.2]} radius={0.07} smoothness={4} position={[W * 0.45, F + 0.4, D - 0.62]} castShadow>
        <meshStandardMaterial color="#a87d5e" roughness={0.82} />
      </RoundedBox>
      {/* beanbag */}
      <mesh position={[W * 0.5 + 1.1, F + 0.2, D * 0.42]} castShadow>
        <sphereGeometry args={[0.34, 20, 16]} />
        <meshStandardMaterial color="#e0a96b" roughness={0.9} />
      </mesh>
      {/* floor cushions */}
      {[-0.4, 0.4].map((dx, i) => (
        <RoundedBox key={i} args={[0.42, 0.16, 0.42]} radius={0.06} smoothness={3} position={[W * 0.4 + dx, F + 0.08, D * 0.4]} rotation={[0, i * 0.5, 0]} castShadow>
          <meshStandardMaterial color={i ? '#c98a6a' : '#7d9a93'} roughness={0.85} />
        </RoundedBox>
      ))}
      {/* round side table + glowing lamp */}
      <mesh position={[1.0, F + 0.22, D - 0.9]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.44, 22]} />
        <meshStandardMaterial color="#caa97e" roughness={0.55} />
      </mesh>
      <Pendant position={[1.0, F + 0.62, D - 0.9]} cord={0} radius={0.08} color="#ffcf8a" />
      <Plant position={[W - 0.9, F, 0.8]} scale={1.0} />
      <StringLights from={[0.6, F + 1.15, 0.5]} to={[W - 0.6, F + 1.15, 0.5]} count={9} />
    </group>
  )
}
