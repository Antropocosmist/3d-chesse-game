import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Coord, GameSnapshot, Move, Piece } from "../game/chess";
import { formatCoord } from "../game/chess";
import { ShipModel } from "./Ships";

export function toWorld(
  x: number,
  y: number,
  z: number,
  spacing: number,
): [number, number, number] {
  return [x - 3.5, (z - 3.5) * spacing, y - 3.5];
}

// The armies occupy opposite corners of the Y-Z fleet plane. Rotating that
// plane 45 degrees around X turns its square silhouette into a diamond: the
// midpoint horizontal splits it into an upper and lower triangle.
const FLEET_PLANE_TILT: [number, number, number] = [Math.PI / 4, 0, 0];

/* ------------------------------------------------------------------ */
/* 3D lattice of cell cubes (8×8×8)                                    */
/* ------------------------------------------------------------------ */

function GridLattice({
  spacing,
  layerFocus,
}: {
  spacing: number;
  layerFocus: number | "all";
}) {
  const geom = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const cA = new THREE.Color("#3fe3ff");
    const cB = new THREE.Color("#a78bfa");
    const tmp = new THREE.Color();
    const B = 4;

    const push = (
      x1: number,
      y1: number,
      z1: number,
      x2: number,
      y2: number,
      z2: number,
      brightness: number,
      parity: number,
      outer: boolean,
    ) => {
      pos.push(x1, y1, z1, x2, y2, z2);
      let b = brightness;
      if (outer) b = Math.min(1, b * 1.8);
      tmp.copy(parity % 2 === 0 ? cA : cB).multiplyScalar(b);
      col.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
    };

    for (let i = 0; i <= 8; i++) {
      const bnd = i - 4; // boundary plane coordinate (-4..4)
      const y = bnd * spacing;
      // Horizontal lines live on the boundary between deck (i-1) and deck i.
      const bright =
        layerFocus === "all"
          ? 0.42
          : layerFocus === i - 1 || layerFocus === i
            ? 0.95
            : 0.08;
      for (let j = 0; j <= 8; j++) {
        const c = j - 4;
        const outer = bnd === -4 || bnd === 4 || c === -4 || c === 4;
        // Line along X at (y, z=c)
        push(-B, y, c, B, y, c, bright, i, outer);
        // Line along Z at (x=c, y)
        push(c, y, -B, c, y, B, bright, i, outer);
      }
      // Vertical lines pass through every deck — keep them modest.
      const vBright = layerFocus === "all" ? 0.3 : 0.22;
      for (let j = 0; j <= 8; j++) {
        const c = j - 4;
        const outer = bnd === -4 || bnd === 4 || c === -4 || c === 4;
        push(bnd, -B * spacing, c, bnd, B * spacing, c, vBright, bnd + c, outer);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [spacing, layerFocus]);

  return (
    <lineSegments geometry={geom} raycast={() => null}>
      <lineBasicMaterial vertexColors transparent opacity={0.9} />
    </lineSegments>
  );
}

/* ------------------------------------------------------------------ */
/* Highlight cube for a single cell                                    */
/* ------------------------------------------------------------------ */

function CellCube({
  coord,
  spacing,
  color,
  opacity = 0.9,
  fill = 0,
  pulse = false,
  scale = 1,
}: {
  coord: Coord;
  spacing: number;
  color: string;
  opacity?: number;
  fill?: number;
  pulse?: boolean;
  scale?: number;
}) {
  const edges = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(0.94 * scale, 0.94 * scale * spacing, 0.94 * scale),
      ),
    [spacing, scale],
  );
  const fillGeom = useMemo(
    () =>
      new THREE.BoxGeometry(
        0.9 * scale,
        0.9 * scale * spacing,
        0.9 * scale,
      ),
    [spacing, scale],
  );
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (pulse && matRef.current) {
      matRef.current.opacity = opacity * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 5));
    }
  });

  const [x, y, z] = toWorld(coord.x, coord.y, coord.z, spacing);
  return (
    <group position={[x, y, z]} raycast={() => null}>
      {fill > 0 && (
        <mesh geometry={fillGeom} raycast={() => null}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={fill}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Axis labels                                                         */
/* ------------------------------------------------------------------ */

function AxisLabels({
  spacing,
  layerFocus,
}: {
  spacing: number;
  layerFocus: number | "all";
}) {
  const zBase = layerFocus === "all" ? 0 : layerFocus;
  const y = (zBase - 3.5) * spacing - 0.02;
  const files = "ABCDEFGH";
  return (
    <group>
      {files.split("").map((f, i) => (
        <Html
          key={`f-${f}`}
          position={[i - 3.5, y, -4.55]}
          center
          sprite
          distanceFactor={14}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="font-display text-[10px] tracking-widest text-cyan-300/85">
            {f}
          </div>
        </Html>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Html
          key={`r-${i}`}
          position={[-4.55, y, i - 3.5]}
          center
          sprite
          distanceFactor={14}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="font-display text-[10px] tracking-widest text-cyan-300/85">
            {i + 1}
          </div>
        </Html>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Html
          key={`z-${i}`}
          position={[-4.45, (i - 3.5) * spacing, -4.45]}
          center
          sprite
          distanceFactor={16}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="font-display text-[9px] tracking-widest"
            style={{
              color:
                layerFocus === i || layerFocus === "all"
                  ? "#67e8f9"
                  : "rgba(103,232,249,0.35)",
            }}
          >
            L{i + 1}
          </div>
        </Html>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Lights / dome / camera                                              */
/* ------------------------------------------------------------------ */

function Lights() {
  return (
    <>
      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#8bdfff", "#1a1028", 0.45]} />
      <directionalLight position={[8, 14, 6]} intensity={1.15} color="#e8fbff" />
      <directionalLight position={[-10, 6, -8]} intensity={0.35} color="#ff8668" />
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#67e8f9" distance={24} />
      <pointLight position={[4, -2, -4]} intensity={0.45} color="#ff4d6d" distance={18} />
    </>
  );
}

function SpaceDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vPos;
          void main() {
            vec3 n = normalize(vPos);
            float h = n.y * 0.5 + 0.5;
            vec3 col = mix(vec3(0.012, 0.004, 0.04), vec3(0.02, 0.05, 0.14), h);
            col += vec3(0.18, 0.02, 0.1) * pow(max(n.x * 0.55 + 0.25, 0.0), 5.0);
            col += vec3(0.0, 0.12, 0.22) * pow(max(-n.z * 0.4 + 0.15, 0.0), 4.0);
            col += vec3(0.04, 0.0, 0.08) * pow(max(-n.y, 0.0), 2.0);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[140, 32, 32]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function CameraRig({
  controlsRef,
  autoRotate,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  autoRotate: boolean;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={7}
      maxDistance={36}
      autoRotate={autoRotate}
      autoRotateSpeed={0.45}
      maxPolarAngle={Math.PI * 0.92}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Move beacon (click target)                                          */
/* ------------------------------------------------------------------ */

function Beacon({
  coord,
  spacing,
  capture,
  onClick,
}: {
  coord: Coord;
  spacing: number;
  capture: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 0.9 + Math.sin(clock.elapsedTime * 5) * 0.12;
    ref.current.scale.setScalar(s);
    ref.current.rotation.y = clock.elapsedTime * 1.5;
  });
  const pos = toWorld(coord.x, coord.y, coord.z, spacing);
  const color = capture ? "#ff5a6a" : "#7dffe0";
  return (
    <group
      ref={ref}
      position={[pos[0], pos[1], pos[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "grab";
      }}
    >
      {/* generous invisible hit volume so beacons are easy to click */}
      <mesh visible={false}>
        <sphereGeometry args={[0.34, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.13, 0]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {capture && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.018, 6, 24]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Ships                                                               */
/* ------------------------------------------------------------------ */

function FleetPiece({
  piece,
  spacing,
  dimmed,
  interactive,
  onSelect,
}: {
  piece: Piece;
  spacing: number;
  dimmed: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(
    new THREE.Vector3(...toWorld(piece.x, piece.y, piece.z, spacing)),
  );
  const initialized = useRef(false);

  useEffect(() => {
    target.current.set(...toWorld(piece.x, piece.y, piece.z, spacing));
  }, [piece.x, piece.y, piece.z, spacing]);

  useLayoutEffect(() => {
    if (!group.current) return;
    const w = toWorld(piece.x, piece.y, piece.z, spacing);
    group.current.position.set(...w);
    target.current.set(...w);
    initialized.current = true;
    // mount snap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    if (!initialized.current) {
      group.current.position.copy(target.current);
      initialized.current = true;
    }
    group.current.position.lerp(target.current, 1 - Math.pow(0.0008, dt));
    const bob =
      Math.sin(clock.elapsedTime * 2.2 + piece.x * 1.3 + piece.z) * 0.03;
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      target.current.y + bob,
      0.2,
    );
  });

  return (
    <group
      ref={group}
      // Align +Z (the ship nose) with the board's Y-Z diagonal. The parent
      // lattice tilt makes this direction horizontal on screen, toward Nyx.
      rotation={[-Math.PI / 4, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onSelect(piece.id);
      }}
      onPointerOver={() => {
        if (interactive) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "grab";
      }}
    >
      <mesh visible={false}>
        <sphereGeometry args={[0.42, 10, 10]} />
        <meshBasicMaterial />
      </mesh>
      <group rotation={[0, piece.color === "black" ? Math.PI : 0, 0]} scale={dimmed ? 0.9 : 1}>
        <ShipModel type={piece.type} faction={piece.color} />
      </group>
      {dimmed && (
        <mesh raycast={() => null}>
          <sphereGeometry args={[0.38, 10, 10]} />
          <meshBasicMaterial
            color="#070218"
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export interface SceneProps {
  snapshot: GameSnapshot;
  selectedId: string | null;
  legal: Move[];
  previewPiece: Piece | null;
  previewMoves: Move[];
  layerFocus: number | "all";
  spacing: number;
  interactive: boolean;
  autoRotate: boolean;
  onSelectPiece: (id: string) => void;
  onMoveTo: (coord: Coord) => void;
  onHover: (label: string | null) => void;
  onHoverPiece: (id: string | null) => void;
  onDeselect: () => void;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}

function SceneInner({
  snapshot,
  selectedId,
  legal,
  previewPiece,
  previewMoves,
  layerFocus,
  spacing,
  interactive,
  autoRotate,
  onSelectPiece,
  onMoveTo,
  onHover,
  onHoverPiece,
  controlsRef,
}: SceneProps) {
  const occ = useMemo(() => {
    const m = new Map<string, Piece>();
    for (const p of snapshot.pieces) m.set(`${p.x},${p.y},${p.z}`, p);
    return m;
  }, [snapshot.pieces]);

  const selected = snapshot.pieces.find((p) => p.id === selectedId) ?? null;
  const threatened =
    snapshot.status === "check" || snapshot.status === "checkmate"
      ? snapshot.pieces.find(
          (p) => p.type === "king" && p.color === snapshot.turn,
        )
      : undefined;

  return (
    <>
      <color attach="background" args={["#05010d"]} />
      <fog attach="fog" args={["#070218", 22, 70]} />
      <SpaceDome />
      <Stars radius={80} depth={40} count={5000} factor={3.2} saturation={0} fade speed={0.5} />
      <Lights />
      <CameraRig controlsRef={controlsRef} autoRotate={autoRotate} />

      {/* Side-on to the fleet plane: its 45° rotation reads as a true diamond,
          with Helios and Nyx on opposite vertices and triangles above/below. */}
      <group rotation={FLEET_PLANE_TILT}>
      {/* the 8×8×8 lattice of cells */}
      <GridLattice spacing={spacing} layerFocus={layerFocus} />
      <AxisLabels spacing={spacing} layerFocus={layerFocus} />

      {/* last move: from / to cells + flight vector */}
      {snapshot.lastMove && (
        <>
          <CellCube
            coord={snapshot.lastMove.from}
            spacing={spacing}
            color="#fbbf24"
            opacity={0.55}
          />
          <CellCube
            coord={snapshot.lastMove.to}
            spacing={spacing}
            color="#f8fafc"
            opacity={0.7}
          />
          <Line
            points={[
              toWorld(
                snapshot.lastMove.from.x,
                snapshot.lastMove.from.y,
                snapshot.lastMove.from.z,
                spacing,
              ),
              toWorld(
                snapshot.lastMove.to.x,
                snapshot.lastMove.to.y,
                snapshot.lastMove.to.z,
                spacing,
              ),
            ]}
            color="#fff7ed"
            lineWidth={1.5}
            transparent
            opacity={0.55}
            dashed
            dashScale={8}
          />
        </>
      )}

      {/* selected ship's own cell */}
      {selected && (
        <CellCube
          coord={selected}
          spacing={spacing}
          color="#7df9ff"
          opacity={0.95}
          fill={0.14}
          pulse
        />
      )}

      {/* Hover previews use the same legal-move engine but are not clickable. */}
      {previewPiece && (
        <CellCube
          coord={previewPiece}
          spacing={spacing}
          color={previewPiece.color === "white" ? "#7df9ff" : "#ff7b8e"}
          opacity={0.55}
          fill={0.06}
        />
      )}
      {previewMoves.map((m) => (
        <CellCube
          key={`preview-${m.pieceId}-${m.to.x}-${m.to.y}-${m.to.z}`}
          coord={m.to}
          spacing={spacing}
          color={m.capturedId ? "#ff5a6a" : previewPiece?.color === "black" ? "#ff7b8e" : "#4de4ff"}
          opacity={m.capturedId ? 0.65 : 0.38}
          fill={m.capturedId ? 0.09 : 0.035}
          scale={0.88}
        />
      ))}

      {/* king in danger */}
      {threatened && (
        <CellCube
          coord={threatened}
          spacing={spacing}
          color="#ff4466"
          opacity={0.9}
          fill={0.12}
          pulse
        />
      )}

      {/* legal targets: cube outline + beacon */}
      {legal.map((m) => {
        const hit = occ.get(`${m.to.x},${m.to.y},${m.to.z}`);
        return (
          <group key={`${m.pieceId}-${m.to.x}-${m.to.y}-${m.to.z}-${m.castle ?? ""}`}>
            <CellCube
              coord={m.to}
              spacing={spacing}
              color={hit ? "#ff5a6a" : "#4de4ff"}
              opacity={hit ? 0.85 : 0.45}
              scale={0.92}
            />
            <Beacon
              coord={m.to}
              spacing={spacing}
              capture={Boolean(hit)}
              onClick={() => onMoveTo(m.to)}
            />
          </group>
        );
      })}

      {/* ships, sitting inside their cells */}
      {snapshot.pieces.map((p) => {
        const focused = layerFocus === "all" || layerFocus === p.z;
        return (
          <group
            key={p.id}
            onPointerOver={() => {
              onHover(`${p.color === "white" ? "Helios" : "Nyx"} ${p.type}  ·  ${formatCoord(p)}`);
              onHoverPiece(p.id);
            }}
            onPointerOut={() => {
              onHover(null);
              onHoverPiece(null);
            }}
          >
            <FleetPiece
              piece={p}
              spacing={spacing}
              dimmed={!focused}
              interactive={interactive}
              onSelect={onSelectPiece}
            />
          </group>
        );
      })}
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.35} intensity={0.85} mipmapBlur luminanceSmoothing={0.2} />
      </EffectComposer>
    </>
  );
}

export function BoardCanvas(props: SceneProps) {
  const ptr = useRef({ x: 0, y: 0 });
  return (
    <Canvas
      camera={{ position: [20, 0, 0], fov: 40, near: 0.1, far: 220 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onPointerDown={(e) => {
        ptr.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMissed={(e) => {
        document.body.style.cursor = "grab";
        const dx = e.clientX - ptr.current.x;
        const dy = e.clientY - ptr.current.y;
        if (dx * dx + dy * dy < 25) props.onDeselect();
      }}
    >
      <SceneInner {...props} />
    </Canvas>
  );
}
