import type { ReactNode } from "react";
import type { Faction, GameSnapshot, Piece, PieceType } from "../game/chess";
import { FACTION_NAME, PIECE_VALUE, SHIP_CLASS } from "../game/chess";
import { cn } from "../utils/cn";

const TYPES: PieceType[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];

function countByType(pieces: Piece[], color: Faction): Record<PieceType, number> {
  const c = { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 };
  for (const p of pieces) if (p.color === color) c[p.type] += 1;
  return c;
}

function material(pieces: Piece[], color: Faction): number {
  return pieces.filter((p) => p.color === color).reduce((s, p) => s + PIECE_VALUE[p.type], 0);
}

function formatClock(seconds: number | null): string {
  if (seconds === null) return "∞";
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function Corner({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute h-5 w-5 border-cyan-300/70", className)}
    />
  );
}

function ShipGlyph({ type, className }: { type: PieceType; className?: string }) {
  const common = cn("h-4 w-4", className);
  switch (type) {
    case "king":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="7.5" strokeDasharray="2 2" />
          <path d="M12 2v3M12 19v3" />
        </svg>
      );
    case "queen":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 16h16L12 4 4 16z" />
          <path d="M7 16v3h10v-3" />
        </svg>
      );
    case "rook":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 20h12M8 20V9h8v11M7 9V5h2v2h2V5h2v2h2V5h2v4" />
        </svg>
      );
    case "bishop":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 4l6 10H6L12 4zM9 20h6M12 14v6" />
        </svg>
      );
    case "knight":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M7 20h10M8 20c0-6 2-8 6-10l2-3-4-1c-2 0-6 3-7 8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 5l4 9H8l4-9zM10 20h4" />
        </svg>
      );
  }
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(6,18,36,0.82),rgba(4,8,20,0.72))] shadow-[0_0_28px_rgba(0,200,255,0.08),inset_0_0_24px_rgba(0,180,255,0.05)] backdrop-blur-md",
        className,
      )}
    >
      <Corner className="left-1 top-1 border-l border-t" />
      <Corner className="right-1 top-1 border-r border-t" />
      <Corner className="bottom-1 left-1 border-b border-l" />
      <Corner className="bottom-1 right-1 border-b border-r" />
      {children}
    </div>
  );
}

export function TopBar({
  snapshot,
  clocks,
  thinking,
}: {
  snapshot: GameSnapshot;
  clocks: { white: number | null; black: number | null };
  thinking: boolean;
}) {
  const status =
    snapshot.status === "checkmate"
      ? "CHECKMATE"
      : snapshot.status === "stalemate"
        ? "STALEMATE"
        : snapshot.status === "check"
          ? "CHECK"
          : thinking
            ? "CPU CALCULATING"
            : "LIVE";

  const statusColor =
    snapshot.status === "checkmate"
      ? "text-rose-400"
      : snapshot.status === "check"
        ? "text-amber-300"
        : thinking
          ? "text-fuchsia-300"
          : "text-cyan-300";

  return (
    <div className="pointer-events-none flex items-start justify-between gap-4">
      <Panel className="pointer-events-auto px-4 py-3">
        <div className="font-display text-[10px] tracking-[0.35em] text-cyan-400/80">PROTOCOL</div>
        <div className="font-display text-xl font-bold tracking-[0.18em] text-cyan-50">NEXUS 8³</div>
        <div className="text-xs tracking-widest text-cyan-200/60">CUBIC FLEET CHESS</div>
      </Panel>

      <Panel className="pointer-events-auto flex items-center gap-6 px-5 py-3">
        <ClockBlock
          name="HELIOS"
          color="text-cyan-300"
          active={snapshot.turn === "white" && snapshot.status !== "checkmate"}
          value={clocks.white}
        />
        <div className="text-center">
          <div className={cn("font-display text-sm tracking-[0.3em]", statusColor)}>{status}</div>
          <div className="mt-1 font-display text-xs tracking-widest text-white/70">
            {snapshot.status === "checkmate" || snapshot.status === "stalemate"
              ? snapshot.winner
                ? `${FACTION_NAME[snapshot.winner].toUpperCase()} WINS`
                : "DRAWN FIELD"
              : `${snapshot.turn === "white" ? "HELIOS" : "NYX"} TO MOVE`}
          </div>
        </div>
        <ClockBlock
          name="NYX"
          color="text-rose-300"
          active={snapshot.turn === "black" && snapshot.status !== "checkmate"}
          value={clocks.black}
        />
      </Panel>

      <Panel className="pointer-events-auto px-4 py-3 text-right">
        <div className="font-display text-[10px] tracking-[0.35em] text-cyan-400/80">PLY</div>
        <div className="font-display text-xl font-bold text-cyan-50">{String(snapshot.ply).padStart(3, "0")}</div>
        <div className="text-xs tracking-widest text-cyan-200/60">8×8×8 LATTICE</div>
      </Panel>
    </div>
  );
}

function ClockBlock({
  name,
  color,
  active,
  value,
}: {
  name: string;
  color: string;
  active: boolean;
  value: number | null;
}) {
  return (
    <div className={cn("min-w-[88px] text-center", active && "drop-shadow-[0_0_10px_rgba(103,232,249,0.55)]")}>
      <div className={cn("font-display text-[10px] tracking-[0.28em]", color)}>{name}</div>
      <div
        className={cn(
          "font-display text-2xl font-semibold",
          active ? "text-white" : "text-white/50",
          value !== null && value < 30 ? "text-rose-400" : "",
        )}
      >
        {formatClock(value)}
      </div>
    </div>
  );
}

export function SideRoster({
  snapshot,
  side,
}: {
  snapshot: GameSnapshot;
  side: Faction;
}) {
  const live = countByType(snapshot.pieces, side);
  const lost = snapshot.captured.filter((p) => p.color === side);
  const mat = material(snapshot.pieces, side);
  const accent = side === "white" ? "text-cyan-300" : "text-rose-300";
  return (
    <Panel className="w-56 p-4">
      <div className={cn("font-display text-[10px] tracking-[0.32em]", accent)}>
        {side === "white" ? "HELIOS ARMADA" : "NYX ARMADA"}
      </div>
      <div className="mt-1 font-display text-lg text-white">{mat} MASS</div>
      <div className="mt-3 space-y-1.5">
        {TYPES.map((t) => (
          <div key={t} className="flex items-center justify-between text-sm text-cyan-100/80">
            <span className="flex items-center gap-2">
              <ShipGlyph type={t} className={accent} />
              <span className="tracking-wide">{SHIP_CLASS[t]}</span>
            </span>
            <span className="font-display text-cyan-50">{live[t]}</span>
          </div>
        ))}
      </div>
      {lost.length > 0 && (
        <div className="mt-3 border-t border-cyan-400/15 pt-2">
          <div className="mb-1 font-display text-[10px] tracking-[0.28em] text-white/40">CASUALTIES</div>
          <div className="flex flex-wrap gap-1">
            {lost.map((p) => (
              <ShipGlyph key={p.id} type={p.type} className="h-3.5 w-3.5 text-white/35" />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

export function Controls({
  layerFocus,
  spacing,
  canUndo,
  onLayer,
  onSpacing,
  onUndo,
  onReset,
  onCamera,
  onHelp,
}: {
  layerFocus: number | "all";
  spacing: number;
  canUndo: boolean;
  onLayer: (v: number | "all") => void;
  onSpacing: (v: number) => void;
  onUndo: () => void;
  onReset: () => void;
  onCamera: () => void;
  onHelp: () => void;
}) {
  return (
    <Panel className="w-56 p-4">
      <div className="font-display text-[10px] tracking-[0.32em] text-cyan-400/80">NAV / TACTICS</div>
      <div className="mt-3">
        <div className="mb-1.5 text-[11px] tracking-widest text-white/50">ALTITUDE DECK</div>
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => onLayer("all")}
            className={cn(
              "rounded-sm border px-1 py-1 font-display text-[10px] tracking-wider",
              layerFocus === "all"
                ? "border-cyan-300 bg-cyan-400/20 text-cyan-50"
                : "border-cyan-400/20 text-cyan-200/70 hover:border-cyan-300/50",
            )}
          >
            ALL
          </button>
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onLayer(i)}
              className={cn(
                "rounded-sm border px-1 py-1 font-display text-[10px]",
                layerFocus === i
                  ? "border-cyan-300 bg-cyan-400/20 text-cyan-50"
                  : "border-cyan-400/20 text-cyan-200/70 hover:border-cyan-300/50",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] tracking-widest text-white/50">
          <span>EXPLODE Z</span>
          <span className="text-cyan-200/80">{spacing.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.85}
          max={2.1}
          step={0.05}
          value={spacing}
          onChange={(e) => onSpacing(Number(e.target.value))}
          className="w-full accent-cyan-300"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn onClick={onUndo} disabled={!canUndo}>
          UNDO
        </Btn>
        <Btn onClick={onCamera}>RESET CAM</Btn>
        <Btn onClick={onHelp}>ORDERS</Btn>
        <Btn onClick={onReset} danger>
          ABORT
        </Btn>
      </div>
    </Panel>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-sm border px-2 py-1.5 font-display text-[10px] tracking-[0.18em] transition",
        danger
          ? "border-rose-400/40 text-rose-200 hover:bg-rose-500/15"
          : "border-cyan-400/30 text-cyan-100 hover:bg-cyan-400/10",
        disabled && "cursor-not-allowed opacity-35",
      )}
    >
      {children}
    </button>
  );
}

export function MoveLog({ log }: { log: string[] }) {
  return (
    <Panel className="max-h-28 min-w-[280px] flex-1 overflow-hidden p-3">
      <div className="mb-1 font-display text-[10px] tracking-[0.32em] text-cyan-400/80">TELEMETRY</div>
      <div className="max-h-16 overflow-y-auto font-mono text-[11px] leading-5 text-cyan-100/75">
        {log.length === 0 && <span className="text-white/30">Awaiting first vector…</span>}
        {log.map((line, i) => (
          <div key={`${line}-${i}`}>
            <span className="mr-2 text-cyan-500/70">{String(i + 1).padStart(2, "0")}</span>
            {line}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function HoverReadout({ label }: { label: string | null }) {
  return (
    <div className="font-display text-xs tracking-[0.22em] text-cyan-200/70">
      {label ?? "HOVER TO PREVIEW  ·  CLICK SHIP TO SELECT  ·  DRAG TO ORBIT"}
    </div>
  );
}

export function PromotionModal({
  color,
  onPick,
}: {
  color: Faction;
  onPick: (t: PieceType) => void;
}) {
  const options: PieceType[] = ["queen", "rook", "bishop", "knight"];
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Panel className="w-[420px] p-6">
        <div className="font-display text-[10px] tracking-[0.32em] text-cyan-400">REFIT PROTOCOL</div>
        <h2 className="mt-1 font-display text-2xl text-white">DRONE PROMOTION</h2>
        <p className="mt-2 text-sm text-cyan-100/70">Select a hull class for the promoted craft.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {options.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className={cn(
                "flex items-center gap-3 rounded-sm border px-3 py-3 text-left transition hover:bg-white/5",
                color === "white" ? "border-cyan-400/40 text-cyan-100" : "border-rose-400/40 text-rose-100",
              )}
            >
              <ShipGlyph type={t} className="h-6 w-6" />
              <span>
                <span className="block font-display tracking-widest">{SHIP_CLASS[t].toUpperCase()}</span>
                <span className="text-xs text-white/50">{t}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <Panel className="max-h-[80vh] w-[560px] overflow-y-auto p-6">
        <div className="font-display text-[10px] tracking-[0.32em] text-cyan-400">STANDING ORDERS</div>
        <h2 className="mt-1 font-display text-2xl text-white">3D FLEET KINEMATICS</h2>
        <p className="mt-2 text-sm leading-relaxed text-cyan-100/75">
          The lattice is a full 8×8×8 cube. Every classic chess role is preserved — pieces simply gain the Z axis
          (altitude decks 1–8). Helios deploys on deck 1, Nyx on deck 8. Checkmate the enemy Sovereign.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-cyan-50/85">
          <li>
            <strong className="text-cyan-300">Destroyer (Rook)</strong> — any distance along one axis: file, rank, or
            altitude.
          </li>
          <li>
            <strong className="text-cyan-300">Wraith (Bishop)</strong> — planar diagonals (two axes equally).
          </li>
          <li>
            <strong className="text-cyan-300">Dreadnought (Queen)</strong> — any of 26 straight 3D lines, any distance.
          </li>
          <li>
            <strong className="text-cyan-300">Sovereign (King)</strong> — one cell in any of 26 directions. Castling on
            the home deck.
          </li>
          <li>
            <strong className="text-cyan-300">Interceptor (Knight)</strong> — (2,1,0) leap in any permutation: 24
            targets.
          </li>
          <li>
            <strong className="text-cyan-300">Drone (Pawn)</strong> advances one cell in Y without moving sideways in X.
            It may rise or drop one deck while moving forward; it can also advance toward the enemy deck in Z.
            No sideways-only or backward moves. It captures enemies on forward diagonals, including diagonals
            between decks. First move: two cells straight along Y or toward the enemy deck, if clear.
            Promotes on the far rank or enemy deck.
          </li>
        </ul>
        <p className="mt-4 text-sm text-white/50">
          Hover over a ship to preview its legal destinations. Click it to select, then click a glowing beacon
          to move. Isolate a deck with the altitude keys. Drag to orbit.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-sm border border-cyan-400/40 py-2 font-display text-xs tracking-[0.3em] text-cyan-100 hover:bg-cyan-400/10"
        >
          ACKNOWLEDGE
        </button>
      </Panel>
    </div>
  );
}

export function MenuOverlay({
  onStart,
}: {
  onStart: (mode: "local" | "ai-white" | "ai-black", timed: boolean) => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[#04010c]/70 backdrop-blur-[2px]">
      <div className="relative w-[min(640px,92vw)]">
        <Panel className="p-8">
          <div className="font-display text-[11px] tracking-[0.5em] text-cyan-400">DEEP SPACE COMMAND</div>
          <h1 className="mt-2 font-display text-5xl font-bold tracking-[0.12em] text-white">NEXUS 8³</h1>
          <p className="mt-1 font-display tracking-[0.4em] text-cyan-200/70">CUBIC FLEET CHESS</p>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-cyan-100/75">
            Chess, unconstrained. Move along X, Y and Z. Same sixteen ships, same objective: pin the enemy Sovereign
            in a 512-cell lattice hanging in the void.
          </p>
          <div className="mt-8 grid gap-3">
            <MenuBtn onClick={() => onStart("local", false)} label="LOCAL DUEL" sub="Hotseat · unlimited time" />
            <MenuBtn onClick={() => onStart("ai-black", false)} label="COMMAND HELIOS" sub="You are cyan · CPU plays Nyx" />
            <MenuBtn onClick={() => onStart("ai-white", false)} label="COMMAND NYX" sub="You are crimson · CPU moves first" />
            <MenuBtn onClick={() => onStart("local", true)} label="TIMED DUEL" sub="10:00 per armada" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MenuBtn({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between rounded-sm border border-cyan-400/25 bg-cyan-400/5 px-4 py-3 text-left transition hover:border-cyan-300/70 hover:bg-cyan-400/10"
    >
      <span>
        <span className="block font-display tracking-[0.22em] text-cyan-50">{label}</span>
        <span className="text-xs text-white/45">{sub}</span>
      </span>
      <span className="font-display text-cyan-400/50 transition group-hover:text-cyan-300">ENGAGE →</span>
    </button>
  );
}

export function EndBanner({
  snapshot,
  onMenu,
  onRematch,
}: {
  snapshot: GameSnapshot;
  onMenu: () => void;
  onRematch: () => void;
}) {
  if (snapshot.status !== "checkmate" && snapshot.status !== "stalemate") return null;
  const title = snapshot.status === "stalemate" ? "STALEMATE" : "FLEET DESTROYED";
  const sub =
    snapshot.status === "stalemate"
      ? "No legal vectors remain."
      : `${FACTION_NAME[snapshot.winner ?? "white"]} holds the lattice.`;
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
      <Panel className="px-8 py-6 text-center">
        <div className="font-display text-[10px] tracking-[0.4em] text-rose-300">ENGAGEMENT CLOSED</div>
        <div className="mt-1 font-display text-3xl text-white">{title}</div>
        <div className="mt-1 text-sm text-cyan-100/70">{sub}</div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onRematch}
            className="flex-1 rounded-sm border border-cyan-400/40 py-2 font-display text-xs tracking-[0.25em] text-cyan-100 hover:bg-cyan-400/10"
          >
            REMATCH
          </button>
          <button
            type="button"
            onClick={onMenu}
            className="flex-1 rounded-sm border border-white/20 py-2 font-display text-xs tracking-[0.25em] text-white/80 hover:bg-white/5"
          >
            MENU
          </button>
        </div>
      </Panel>
    </div>
  );
}
