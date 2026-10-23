export const SIZE = 8;

export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type Faction = "white" | "black";
export type GameStatus = "playing" | "check" | "checkmate" | "stalemate";

export interface Coord {
  x: number;
  y: number;
  z: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  color: Faction;
  x: number;
  y: number;
  z: number;
  hasMoved: boolean;
}

export interface Move {
  pieceId: string;
  from: Coord;
  to: Coord;
  capturedId?: string;
  promoteTo?: PieceType;
  castle?: "king" | "queen";
}

export interface GameSnapshot {
  pieces: Piece[];
  turn: Faction;
  status: GameStatus;
  winner: Faction | null;
  captured: Piece[];
  lastMove: Move | null;
  ply: number;
  log: string[];
}

export const SHIP_CLASS: Record<PieceType, string> = {
  king: "Sovereign",
  queen: "Dreadnought",
  rook: "Destroyer",
  bishop: "Wraith",
  knight: "Interceptor",
  pawn: "Drone",
};

export const FACTION_NAME: Record<Faction, string> = {
  white: "Helios Armada",
  black: "Nyx Armada",
};

export const PIECE_VALUE: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

export function opposite(color: Faction): Faction {
  return color === "white" ? "black" : "white";
}

export function keyOf(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function inBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE && z >= 0 && z < SIZE;
}

export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function formatCoord(c: Coord): string {
  return `${"abcdefgh"[c.x]}${c.y + 1}·${c.z + 1}`;
}

const LETTER: Record<PieceType, string> = {
  king: "K",
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
  pawn: "",
};

export function formatMove(move: Move, pieces: Piece[]): string {
  if (move.castle === "king") return "O-O";
  if (move.castle === "queen") return "O-O-O";
  const piece = pieces.find((p) => p.id === move.pieceId);
  if (!piece) return `${formatCoord(move.from)}→${formatCoord(move.to)}`;
  const cap = move.capturedId ? "x" : "–";
  const promo = move.promoteTo && move.promoteTo !== "pawn" && move.promoteTo !== "king"
    ? `=${LETTER[move.promoteTo]}`
    : "";
  return `${LETTER[piece.type]}${formatCoord(move.from)}${cap}${formatCoord(move.to)}${promo}`;
}

const ROOK_DIRS: number[][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const BISHOP_DIRS: number[][] = [
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [-1, 0, 1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, 1, -1],
  [0, -1, 1],
  [0, -1, -1],
];

const TRIAG_DIRS: number[][] = [
  [1, 1, 1],
  [1, 1, -1],
  [1, -1, 1],
  [1, -1, -1],
  [-1, 1, 1],
  [-1, 1, -1],
  [-1, -1, 1],
  [-1, -1, -1],
];

const QUEEN_DIRS: number[][] = [...ROOK_DIRS, ...BISHOP_DIRS, ...TRIAG_DIRS];

const KING_DIRS: number[][] = QUEEN_DIRS;

const KNIGHT_DELTAS: number[][] = [
  [2, 1, 0],
  [2, -1, 0],
  [-2, 1, 0],
  [-2, -1, 0],
  [2, 0, 1],
  [2, 0, -1],
  [-2, 0, 1],
  [-2, 0, -1],
  [1, 2, 0],
  [1, -2, 0],
  [-1, 2, 0],
  [-1, -2, 0],
  [0, 2, 1],
  [0, 2, -1],
  [0, -2, 1],
  [0, -2, -1],
  [1, 0, 2],
  [1, 0, -2],
  [-1, 0, 2],
  [-1, 0, -2],
  [0, 1, 2],
  [0, 1, -2],
  [0, -1, 2],
  [0, -1, -2],
];

export function buildOcc(pieces: Piece[]): Map<string, Piece> {
  const m = new Map<string, Piece>();
  for (const p of pieces) m.set(keyOf(p.x, p.y, p.z), p);
  return m;
}

export function createInitialState(): GameSnapshot {
  // Armies anchor at opposite cube corners — white around (x, 0, 0), black around (x, 7, 7).
  // Pawns sit on the y=1, z=1 shell for white and y=6, z=6 for black so they BLOCK every
  // triagonal (±1, ±1, ±1) line of sight from the back rank. Without this wall the queen and
  // bishop on each side see their mirror image on turn 1 and the game collapses immediately.
  // Mirror symmetry across y=3.5 and z=3.5 keeps queens facing queens and kings facing kings.
  const pieces: Piece[] = [];
  const back: PieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  back.forEach((type, x) => {
    pieces.push({ id: `w-${type}-${x}`, type, color: "white", x, y: 0, z: 0, hasMoved: false });
    pieces.push({ id: `b-${type}-${x}`, type, color: "black", x, y: 7, z: 7, hasMoved: false });
  });
  for (let x = 0; x < SIZE; x++) {
    pieces.push({ id: `w-pawn-${x}`, type: "pawn", color: "white", x, y: 1, z: 1, hasMoved: false });
    pieces.push({ id: `b-pawn-${x}`, type: "pawn", color: "black", x, y: 6, z: 6, hasMoved: false });
  }
  return {
    pieces,
    turn: "white",
    status: "playing",
    winner: null,
    captured: [],
    lastMove: null,
    ply: 0,
    log: [],
  };
}

export function isPromotionDest(piece: Piece, to: Coord): boolean {
  if (piece.type !== "pawn") return false;
  if (piece.color === "white") return to.y === SIZE - 1 || to.z === SIZE - 1;
  return to.y === 0 || to.z === 0;
}

// A pawn attacks on forward diagonals in either horizontal or vertical planes,
// plus the 3D diagonals. Straight forward/altitude advances are not attacks.
function isPawnCaptureDelta(color: Faction, dx: number, dy: number, dz: number): boolean {
  const forward = color === "white" ? 1 : -1;
  if (Math.abs(dx) > 1 || Math.abs(dz) > 1) return false;
  if (dy === forward) {
    return dx !== 0 || dz !== 0;
  }
  return dy === 0 && dz === forward && Math.abs(dx) === 1;
}

function isKnightDelta(dx: number, dy: number, dz: number): boolean {
  const a = [Math.abs(dx), Math.abs(dy), Math.abs(dz)].sort((i, j) => i - j);
  return a[0] === 0 && a[1] === 1 && a[2] === 2;
}

function slideType(dx: number, dy: number, dz: number): "rook" | "bishop" | "triag" | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const az = Math.abs(dz);
  const nz = (ax > 0 ? 1 : 0) + (ay > 0 ? 1 : 0) + (az > 0 ? 1 : 0);
  if (nz === 1) return "rook";
  if (nz === 2) {
    const vals = [ax, ay, az].filter((v) => v > 0);
    if (vals[0] === vals[1]) return "bishop";
    return null;
  }
  if (nz === 3 && ax === ay && ay === az) return "triag";
  return null;
}

function pathClear(from: Coord, to: Coord, occ: Map<string, Piece>): boolean {
  const sx = Math.sign(to.x - from.x);
  const sy = Math.sign(to.y - from.y);
  const sz = Math.sign(to.z - from.z);
  let x = from.x + sx;
  let y = from.y + sy;
  let z = from.z + sz;
  while (x !== to.x || y !== to.y || z !== to.z) {
    if (occ.has(keyOf(x, y, z))) return false;
    x += sx;
    y += sy;
    z += sz;
  }
  return true;
}

export function isSquareAttacked(
  pieces: Piece[],
  x: number,
  y: number,
  z: number,
  byColor: Faction,
): boolean {
  const occ = buildOcc(pieces);
  for (const p of pieces) {
    if (p.color !== byColor) continue;
    const dx = x - p.x;
    const dy = y - p.y;
    const dz = z - p.z;
    if (dx === 0 && dy === 0 && dz === 0) continue;
    switch (p.type) {
      case "pawn":
        if (isPawnCaptureDelta(p.color, dx, dy, dz)) return true;
        break;
      case "knight":
        if (isKnightDelta(dx, dy, dz)) return true;
        break;
      case "king":
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) === 1) return true;
        break;
      case "rook":
        if (slideType(dx, dy, dz) === "rook" && pathClear(p, { x, y, z }, occ)) return true;
        break;
      case "bishop":
        if (slideType(dx, dy, dz) === "bishop" && pathClear(p, { x, y, z }, occ)) return true;
        break;
      case "queen":
        if (slideType(dx, dy, dz) && pathClear(p, { x, y, z }, occ)) return true;
        break;
    }
  }
  return false;
}

export function isInCheck(pieces: Piece[], color: Faction): boolean {
  const king = pieces.find((p) => p.type === "king" && p.color === color);
  if (!king) return true;
  return isSquareAttacked(pieces, king.x, king.y, king.z, opposite(color));
}

function generatePseudo(piece: Piece, pieces: Piece[]): Move[] {
  const occ = buildOcc(pieces);
  const moves: Move[] = [];

  const add = (x: number, y: number, z: number) => {
    if (!inBounds(x, y, z)) return;
    const hit = occ.get(keyOf(x, y, z));
    if (hit && hit.color === piece.color) return;
    const move: Move = {
      pieceId: piece.id,
      from: { x: piece.x, y: piece.y, z: piece.z },
      to: { x, y, z },
    };
    if (hit) move.capturedId = hit.id;
    moves.push(move);
  };

  if (piece.type === "pawn") {
    const forward = piece.color === "white" ? 1 : -1;

    // X is the lateral axis. An empty-square advance can steer up or down one
    // deck while progressing in Y, but cannot slide sideways or reverse rank.
    for (const dz of [-1, 0, 1]) {
      const y = piece.y + forward;
      const z = piece.z + dz;
      if (inBounds(piece.x, y, z) && !occ.has(keyOf(piece.x, y, z))) {
        add(piece.x, y, z);
      }
    }
    const deck = piece.z + forward;
    if (inBounds(piece.x, piece.y, deck) && !occ.has(keyOf(piece.x, piece.y, deck))) {
      add(piece.x, piece.y, deck);
    }

    // As in ordinary chess, capturing requires a diagonal and an enemy target.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (!isPawnCaptureDelta(piece.color, dx, dy, dz)) continue;
          const x = piece.x + dx;
          const y = piece.y + dy;
          const z = piece.z + dz;
          if (!inBounds(x, y, z)) continue;
          const target = occ.get(keyOf(x, y, z));
          if (target && target.color !== piece.color) add(x, y, z);
        }
      }
    }

    // The initial two-cell advance stays straight along Y or toward the enemy deck.
    if (!piece.hasMoved) {
      const axes: Array<[number, number]> = [
        [forward, 0],
        [0, forward],
      ];
      for (const [dy, dz] of axes) {
        const midY = piece.y + dy;
        const midZ = piece.z + dz;
        const endY = piece.y + dy * 2;
        const endZ = piece.z + dz * 2;
        if (
          inBounds(piece.x, midY, midZ) &&
          !occ.has(keyOf(piece.x, midY, midZ)) &&
          inBounds(piece.x, endY, endZ) &&
          !occ.has(keyOf(piece.x, endY, endZ))
        ) {
          add(piece.x, endY, endZ);
        }
      }
    }
    return moves;
  }

  if (piece.type === "knight") {
    for (const [dx, dy, dz] of KNIGHT_DELTAS) add(piece.x + dx, piece.y + dy, piece.z + dz);
    return moves;
  }

  const dirs = piece.type === "king" ? KING_DIRS : piece.type === "rook" ? ROOK_DIRS : piece.type === "bishop" ? BISHOP_DIRS : QUEEN_DIRS;
  const maxStep = piece.type === "king" ? 1 : SIZE - 1;
  for (const [dx, dy, dz] of dirs) {
    for (let s = 1; s <= maxStep; s++) {
      const x = piece.x + dx * s;
      const y = piece.y + dy * s;
      const z = piece.z + dz * s;
      if (!inBounds(x, y, z)) break;
      const hit = occ.get(keyOf(x, y, z));
      if (!hit) {
        add(x, y, z);
      } else {
        if (hit.color !== piece.color) add(x, y, z);
        break;
      }
    }
  }
  return moves;
}

function castleMoves(king: Piece, pieces: Piece[]): Move[] {
  if (king.hasMoved || king.x !== 4) return [];
  if (isInCheck(pieces, king.color)) return [];
  const enemy = opposite(king.color);
  const moves: Move[] = [];
  const { y, z } = king;
  const occ = buildOcc(pieces);

  const trySide = (side: "king" | "queen") => {
    const rookX = side === "king" ? 7 : 0;
    const rook = pieces.find(
      (p) =>
        p.type === "rook" &&
        p.color === king.color &&
        !p.hasMoved &&
        p.x === rookX &&
        p.y === y &&
        p.z === z,
    );
    if (!rook) return;
    const between = side === "king" ? [5, 6] : [1, 2, 3];
    for (const x of between) {
      if (occ.has(keyOf(x, y, z))) return;
    }
    const kingPath = side === "king" ? [5, 6] : [3, 2];
    for (const x of kingPath) {
      if (isSquareAttacked(pieces, x, y, z, enemy)) return;
    }
    moves.push({
      pieceId: king.id,
      from: { x: king.x, y, z },
      to: { x: side === "king" ? 6 : 2, y, z },
      castle: side,
    });
  };

  trySide("king");
  trySide("queen");
  return moves;
}

export function applyMovePieces(pieces: Piece[], move: Move): { pieces: Piece[]; captured: Piece | null } {
  const moving = pieces.find((p) => p.id === move.pieceId);
  if (!moving) return { pieces, captured: null };

  let captured: Piece | null = null;
  const capturedId =
    move.capturedId ??
    pieces.find((p) => p.id !== move.pieceId && p.x === move.to.x && p.y === move.to.y && p.z === move.to.z)?.id;

  const next: Piece[] = [];
  for (const p of pieces) {
    if (capturedId && p.id === capturedId) {
      captured = p;
      continue;
    }
    if (p.id === move.pieceId) {
      next.push({
        ...p,
        x: move.to.x,
        y: move.to.y,
        z: move.to.z,
        hasMoved: true,
        type: move.promoteTo ?? p.type,
      });
      continue;
    }
    if (
      move.castle &&
      p.type === "rook" &&
      p.color === moving.color &&
      p.y === move.from.y &&
      p.z === move.from.z &&
      p.x === (move.castle === "king" ? 7 : 0)
    ) {
      next.push({ ...p, x: move.castle === "king" ? 5 : 3, hasMoved: true });
      continue;
    }
    next.push(p);
  }
  return { pieces: next, captured };
}

export function generateLegalMoves(piece: Piece, pieces: Piece[]): Move[] {
  const legal: Move[] = [];
  for (const m of generatePseudo(piece, pieces)) {
    const { pieces: next } = applyMovePieces(pieces, m);
    if (!isInCheck(next, piece.color)) legal.push(m);
  }
  if (piece.type === "king") legal.push(...castleMoves(piece, pieces));
  return legal;
}

export function getAllLegalMoves(pieces: Piece[], color: Faction): Move[] {
  const out: Move[] = [];
  for (const p of pieces) {
    if (p.color === color) out.push(...generateLegalMoves(p, pieces));
  }
  return out;
}

function hasAnyLegalMove(pieces: Piece[], color: Faction): boolean {
  for (const p of pieces) {
    if (p.color !== color) continue;
    if (generateLegalMoves(p, pieces).length > 0) return true;
  }
  return false;
}

function computeStatus(pieces: Piece[], turn: Faction): { status: GameStatus; winner: Faction | null } {
  const inCheck = isInCheck(pieces, turn);
  const anyMove = hasAnyLegalMove(pieces, turn);
  if (!anyMove) {
    if (inCheck) return { status: "checkmate", winner: opposite(turn) };
    return { status: "stalemate", winner: null };
  }
  if (inCheck) return { status: "check", winner: null };
  return { status: "playing", winner: null };
}

export function playMove(state: GameSnapshot, move: Move): GameSnapshot {
  const moving = state.pieces.find((p) => p.id === move.pieceId);
  if (!moving) return state;
  let resolved = move;
  if (isPromotionDest(moving, move.to) && !move.promoteTo) {
    resolved = { ...move, promoteTo: "queen" };
  }
  const { pieces, captured } = applyMovePieces(state.pieces, resolved);
  const nextTurn = opposite(state.turn);
  const { status, winner } = computeStatus(pieces, nextTurn);
  const notation = formatMove(resolved, state.pieces);
  return {
    pieces,
    turn: nextTurn,
    status,
    winner,
    captured: captured ? [...state.captured, captured] : state.captured,
    lastMove: resolved,
    ply: state.ply + 1,
    log: [...state.log, notation],
  };
}

export function materialCount(pieces: Piece[], color: Faction): number {
  return pieces.filter((p) => p.color === color).length;
}
