import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Room } from '../types'

/**
 * Procedural, lightly animated inhabitants. Figures are modelled at a base
 * height of 1.8 m and scaled to the requested height, so proportions stay
 * realistic. Each one has an idle loop: breathing, a slow weight shift, a
 * gentle head turn and a subtle arm sway, offset per person via `seed`.
 */
const F = 0.14 // local floor height (matches Floor3D slab top)
const BASE = 1.8 // base model height in meters

type HairStyle = 'short' | 'long' | 'balding'

interface PersonProps {
  position: [number, number, number]
  rotation?: number
  heightM: number
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  bottom: string
  dress?: string
  seed?: number
}

export function People3D({ rooms, baseY }: { rooms: Room[]; baseY: number }) {
  return (
    <group>
      {rooms.map((room) => {
        const p = personFor(room)
        if (!p) return null
        return (
          <group key={`person-${room.id}`} position={[room.x, baseY, room.z]}>
            <Person3D {...p} />
          </group>
        )
      })}
    </group>
  )
}

/** Decide who lives in a room (by its functional name) and where they stand. */
function personFor(room: Room): PersonProps | null {
  const W = room.width
  const D = room.depth
  const name = room.name.toLowerCase()

  if (name.includes('schlaf')) {
    // Petra — 165 cm, braune Haare.
    return {
      position: [W * 0.52, F, D - 1.5],
      rotation: 0.05,
      heightM: 1.65,
      skin: '#e7b491',
      hair: '#5b3a22',
      hairStyle: 'long',
      top: '#3f8f88',
      bottom: '#39414f',
      seed: 0,
    }
  }
  if (name.includes('kind')) {
    // Max — 187 cm, blond, 20 J.
    return {
      position: [W * 0.55, F, D - 1.7],
      rotation: -0.15,
      heightM: 1.87,
      skin: '#e8bc96',
      hair: '#e3cb72',
      hairStyle: 'short',
      top: '#52606e',
      bottom: '#394656',
      seed: 2.1,
    }
  }
  if (name.includes('büro') || name.includes('buro')) {
    // Maribel — ~170 cm, blondes Mädchen.
    return {
      position: [W * 0.5, F, D - 1.6],
      rotation: 0.18,
      heightM: 1.7,
      skin: '#f0c6a2',
      hair: '#e6d27a',
      hairStyle: 'long',
      top: '#ec8fb0',
      bottom: '#4a5a8c',
      dress: '#ec8fb0',
      seed: 1.3,
    }
  }
  if (name.includes('dach')) {
    // Vater — 185 cm, Halbglatze. Stands near the high centre of the attic.
    return {
      position: [W * 0.5, F, D * 0.52],
      rotation: 0.02,
      heightM: 1.85,
      skin: '#e0a884',
      hair: '#6f5a48',
      hairStyle: 'balding',
      top: '#5a6b8c',
      bottom: '#333f4d',
      seed: 3.4,
    }
  }
  return null
}

function Person3D({ position, rotation = 0, heightM, skin, hair, hairStyle, top, bottom, dress, seed = 0 }: PersonProps) {
  const body = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const s = heightM / BASE

  useFrame((state) => {
    const t = state.clock.elapsedTime + seed
    if (body.current) {
      body.current.position.y = Math.sin(t * 1.5) * 0.006 // subtle bob
      body.current.rotation.z = Math.sin(t * 0.7) * 0.016 // weight shift
    }
    if (chest.current) {
      const b = 1 + Math.sin(t * 1.5) * 0.022 // breathing
      chest.current.scale.set(b, 1, b)
    }
    if (head.current) head.current.rotation.y = Math.sin(t * 0.45) * 0.32 // looking around
    if (armL.current) armL.current.rotation.x = 0.04 + Math.sin(t * 1.1) * 0.07
    if (armR.current) armR.current.rotation.x = 0.04 - Math.sin(t * 1.1 + 0.5) * 0.07
  })

  const skinMat = <meshStandardMaterial color={skin} roughness={0.78} />
  const topMat = <meshStandardMaterial color={top} roughness={0.82} />
  const botColor = dress ?? bottom

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={body} scale={s}>
        {/* shoes */}
        {[-0.1, 0.1].map((x, i) => (
          <mesh key={i} position={[x, 0.04, 0.05]} castShadow>
            <boxGeometry args={[0.13, 0.08, 0.27]} />
            <meshStandardMaterial color="#2b2f36" roughness={0.6} />
          </mesh>
        ))}

        {/* legs */}
        {[-0.1, 0.1].map((x, i) => (
          <mesh key={i} position={[x, 0.46, 0]} castShadow>
            <capsuleGeometry args={[0.082, 0.58, 4, 12]} />
            <meshStandardMaterial color={dress ? skin : bottom} roughness={0.82} />
          </mesh>
        ))}

        {/* hips */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[0.34, 0.24, 0.22]} />
          <meshStandardMaterial color={botColor} roughness={0.82} />
        </mesh>

        {/* skirt (dress) */}
        {dress && (
          <mesh position={[0, 0.64, 0]} castShadow>
            <coneGeometry args={[0.32, 0.56, 22]} />
            <meshStandardMaterial color={dress} roughness={0.84} />
          </mesh>
        )}

        {/* torso (breathes) */}
        <group ref={chest}>
          <mesh position={[0, 1.18, 0]} castShadow>
            <capsuleGeometry args={[0.135, 0.3, 5, 14]} />
            {topMat}
          </mesh>
          <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.07, 0.32, 4, 12]} />
            {topMat}
          </mesh>
        </group>

        {/* neck */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.1, 12]} />
          {skinMat}
        </mesh>

        {/* arms (pivot at shoulder) */}
        <group ref={armL} position={[-0.23, 1.45, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.42, 4, 10]} />
            {skinMat}
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <capsuleGeometry args={[0.058, 0.14, 4, 10]} />
            {topMat}
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.052, 12, 10]} />
            {skinMat}
          </mesh>
        </group>
        <group ref={armR} position={[0.23, 1.45, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.42, 4, 10]} />
            {skinMat}
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <capsuleGeometry args={[0.058, 0.14, 4, 10]} />
            {topMat}
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.052, 12, 10]} />
            {skinMat}
          </mesh>
        </group>

        {/* head + hair + face (turns) */}
        <group ref={head} position={[0, 1.63, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.115, 22, 18]} />
            {skinMat}
          </mesh>
          {/* eyes */}
          {[-0.045, 0.045].map((x, i) => (
            <mesh key={i} position={[x, 0.015, 0.102]}>
              <sphereGeometry args={[0.018, 12, 10]} />
              <meshStandardMaterial color="#2b2620" roughness={0.4} />
            </mesh>
          ))}
          {/* nose */}
          <mesh position={[0, -0.015, 0.115]}>
            <sphereGeometry args={[0.02, 10, 8]} />
            {skinMat}
          </mesh>
          <Hair style={hairStyle} color={hair} />
        </group>
      </group>
    </group>
  )
}

function Hair({ style, color }: { style: HairStyle; color: string }) {
  const mat = <meshStandardMaterial color={color} roughness={0.85} />

  if (style === 'balding') {
    return (
      <group>
        {/* horseshoe of hair around the sides + back, bald crown */}
        <mesh position={[0, 0.0, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.028, 10, 24, Math.PI * 1.35]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.02, -0.06]} scale={[1.04, 0.7, 1]}>
          <sphereGeometry args={[0.1, 16, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45]} />
          {mat}
        </mesh>
      </group>
    )
  }

  if (style === 'long') {
    return (
      <group>
        {/* crown cap */}
        <mesh position={[0, 0.03, -0.02]} scale={[1.08, 1.05, 1.04]}>
          <sphereGeometry args={[0.115, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          {mat}
        </mesh>
        {/* hair falling to the shoulders */}
        <mesh position={[0, -0.12, -0.07]} castShadow>
          <capsuleGeometry args={[0.12, 0.22, 6, 14]} />
          {mat}
        </mesh>
        {[-0.1, 0.1].map((x, i) => (
          <mesh key={i} position={[x, -0.1, 0.02]} castShadow>
            <capsuleGeometry args={[0.045, 0.2, 5, 10]} />
            {mat}
          </mesh>
        ))}
      </group>
    )
  }

  // short
  return (
    <mesh position={[0, 0.035, -0.015]} scale={[1.08, 1.06, 1.06]} castShadow>
      <sphereGeometry args={[0.115, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
      {mat}
    </mesh>
  )
}
