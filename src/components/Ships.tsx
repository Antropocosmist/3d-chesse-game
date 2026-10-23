import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Faction, PieceType } from "../game/chess";

export const FACTION_PALETTE = {
  white: {
    hull: "#d7fbff",
    accent: "#5ee7ff",
    dark: "#16324a",
    engine: "#7af7ff",
    emissive: "#2bd4ff",
  },
  black: {
    hull: "#2a0f16",
    accent: "#ff6b4a",
    dark: "#12060a",
    engine: "#ff4d6d",
    emissive: "#ff3b5c",
  },
} as const;

function Hull({
  color,
  emissive,
  metalness = 0.72,
  roughness = 0.28,
  emissiveIntensity = 0.35,
}: {
  color: string;
  emissive: string;
  metalness?: number;
  roughness?: number;
  emissiveIntensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      metalness={metalness}
      roughness={roughness}
    />
  );
}

function Engine({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const s = scale * (0.82 + Math.sin(clock.elapsedTime * 11 + position[0] * 7) * 0.18);
    if (ref.current) ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Drone({ faction }: { faction: Faction }) {
  const pal = FACTION_PALETTE[faction];
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.34, 6]} />
        <Hull color={pal.hull} emissive={pal.emissive} />
      </mesh>
      <mesh position={[0, 0.02, -0.02]}>
        <octahedronGeometry args={[0.1, 0]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.6} />
      </mesh>
      <Engine position={[0, 0, -0.2]} color={pal.engine} />
    </group>
  );
}

function Interceptor({ faction }: { faction: Faction }) {
  const pal = FACTION_PALETTE[faction];
  return (
    <group>
      <mesh position={[0.06, 0.04, 0.04]}>
        <boxGeometry args={[0.14, 0.1, 0.36]} />
        <Hull color={pal.hull} emissive={pal.emissive} />
      </mesh>
      <mesh position={[-0.12, 0.0, -0.02]} rotation={[0, 0.2, 0.4]}>
        <boxGeometry args={[0.28, 0.03, 0.16]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0.16, -0.02, 0.02]} rotation={[0, -0.35, -0.25]}>
        <boxGeometry args={[0.22, 0.025, 0.12]} />
        <Hull color={pal.dark} emissive={pal.emissive} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.06, 0.08, 0.16]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <Hull color={pal.accent} emissive={pal.engine} emissiveIntensity={0.8} metalness={0.2} roughness={0.15} />
      </mesh>
      <Engine position={[0.04, 0.02, -0.2]} color={pal.engine} />
      <Engine position={[-0.08, 0, -0.14]} color={pal.engine} scale={0.7} />
    </group>
  );
}

function Wraith({ faction }: { faction: Faction }) {
  const pal = FACTION_PALETTE[faction];
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.55, 1.15, 0.28]}>
        <octahedronGeometry args={[0.28, 0]} />
        <Hull color={pal.hull} emissive={pal.emissive} />
      </mesh>
      <mesh position={[0.22, 0, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.32, 0.02, 0.18]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-0.22, 0, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.32, 0.02, 0.18]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0.02, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.16, 4]} />
        <Hull color={pal.dark} emissive={pal.emissive} />
      </mesh>
      <Engine position={[0.1, 0, -0.26]} color={pal.engine} />
      <Engine position={[-0.1, 0, -0.26]} color={pal.engine} />
    </group>
  );
}

function Destroyer({ faction }: { faction: Faction }) {
  const pal = FACTION_PALETTE[faction];
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
        <Hull color={pal.hull} emissive={pal.emissive} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.18]} />
        <Hull color={pal.dark} emissive={pal.emissive} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.16, 6]} />
        <Hull color={pal.accent} emissive={pal.engine} emissiveIntensity={0.8} />
      </mesh>
      {[
        [-0.12, 0.16, -0.12],
        [0.12, 0.16, -0.12],
        [-0.12, 0.16, 0.12],
        [0.12, 0.16, 0.12],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.06, 0.1, 0.06]} />
          <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.5} />
        </mesh>
      ))}
      <Engine position={[-0.08, -0.08, -0.16]} color={pal.engine} />
      <Engine position={[0.08, -0.08, -0.16]} color={pal.engine} />
      <Engine position={[0, -0.08, -0.18]} color={pal.engine} scale={1.15} />
    </group>
  );
}

function Dreadnought({ faction }: { faction: Faction }) {
  const pal = FACTION_PALETTE[faction];
  return (
    <group>
      <mesh position={[0, 0.02, 0.02]}>
        <boxGeometry args={[0.2, 0.12, 0.52]} />
        <Hull color={pal.hull} emissive={pal.emissive} />
      </mesh>
      <mesh position={[0, 0.08, -0.04]}>
        <boxGeometry args={[0.12, 0.1, 0.28]} />
        <Hull color={pal.dark} emissive={pal.emissive} />
      </mesh>
      <mesh position={[0, 0.02, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.2, 6]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0.22, 0.0, -0.02]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.28, 0.02, 0.22]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.75} />
      </mesh>
      <mesh position={[-0.22, 0.0, -0.02]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.28, 0.02, 0.22]} />
        <Hull color={pal.accent} emissive={pal.emissive} emissiveIntensity={0.75} />
      </mesh>
      <mesh position={[0, 0.14, 0.06]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color={pal.engine} />
      </mesh>
      <Engine position={[-0.07, 0, -0.3]} color={pal.engine} />
      <Engine position={[0.07, 0, -0.3]} color={pal.engine} />
      <Engine position={[0, 0.04, -0.32]} color={pal.engine} scale={1.2} />
    </group>
  );
}

function Sovereign({ faction }: { faction: Faction }) {
  const pal = FACTION_PALETTE[faction];
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.8;
  });
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.16, 1]} />
        <Hull color={pal.hull} emissive={pal.emissive} emissiveIntensity={0.55} metalness={0.55} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.018, 8, 40]} />
        <meshBasicMaterial color={pal.engine} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
        <Hull color={pal.accent} emissive={pal.engine} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color={pal.engine} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.2, 0.02, Math.sin(a) * 0.2]}>
            <boxGeometry args={[0.05, 0.05, 0.1]} />
            <Hull color={pal.dark} emissive={pal.emissive} />
          </mesh>
        );
      })}
      <Engine position={[0.12, -0.06, -0.16]} color={pal.engine} />
      <Engine position={[-0.12, -0.06, -0.16]} color={pal.engine} />
      <Engine position={[0, -0.08, -0.18]} color={pal.engine} scale={1.3} />
    </group>
  );
}

export function ShipModel({ type, faction }: { type: PieceType; faction: Faction }) {
  const inner = useMemo(() => {
    switch (type) {
      case "pawn":
        return <Drone faction={faction} />;
      case "knight":
        return <Interceptor faction={faction} />;
      case "bishop":
        return <Wraith faction={faction} />;
      case "rook":
        return <Destroyer faction={faction} />;
      case "queen":
        return <Dreadnought faction={faction} />;
      case "king":
        return <Sovereign faction={faction} />;
    }
  }, [type, faction]);

  const scale = type === "pawn" ? 0.92 : type === "king" ? 1.08 : type === "queen" ? 1.02 : 1;
  return <group scale={scale}>{inner}</group>;
}
