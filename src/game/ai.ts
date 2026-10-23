import {
  type GameSnapshot,
  type Move,
  type Piece,
  type PieceType,
  getAllLegalMoves,
  isPromotionDest,
  playMove,
} from "./chess";

const VALUE: Record<PieceType, number> = {
  // Drones can steer between decks and capture across multiple planes.
  pawn: 180,
  knight: 320,
  bishop: 335,
  rook: 500,
  queen: 980,
  king: 0,
};

function evalWhite(pieces: Piece[]): number {
  let score = 0;
  for (const p of pieces) {
    let v = VALUE[p.type];
    v += (3.5 - Math.abs(p.x - 3.5)) * 3;
    v += (3.5 - Math.abs(p.y - 3.5)) * 3;
    v += (3.5 - Math.abs(p.z - 3.5)) * 3;
    if (p.type === "pawn") {
      v += p.color === "white" ? (p.y + p.z) * 8 : (14 - p.y - p.z) * 8;
    }
    if (p.type === "king") {
      const edge = Math.abs(p.x - 3.5) + Math.abs(p.y - 3.5) + Math.abs(p.z - 3.5);
      v -= edge * 2;
    }
    score += p.color === "white" ? v : -v;
  }
  return score;
}

function normalize(state: GameSnapshot, move: Move): Move {
  const piece = state.pieces.find((p) => p.id === move.pieceId);
  if (piece && isPromotionDest(piece, move.to) && !move.promoteTo) {
    return { ...move, promoteTo: "queen" };
  }
  return move;
}

function order(move: Move, pieces: Piece[]): number {
  let s = 0;
  if (move.capturedId) {
    const vic = pieces.find((p) => p.id === move.capturedId);
    const att = pieces.find((p) => p.id === move.pieceId);
    if (vic) s += 10 * VALUE[vic.type];
    if (att) s -= VALUE[att.type];
  }
  if (move.promoteTo) s += 900;
  return s;
}

function negamax(state: GameSnapshot, depth: number, alpha: number, beta: number): number {
  if (state.status === "checkmate") return -100000 + (8 - depth);
  if (state.status === "stalemate") return 0;
  if (depth <= 0) {
    const e = evalWhite(state.pieces);
    return state.turn === "white" ? e : -e;
  }
  const moves = getAllLegalMoves(state.pieces, state.turn);
  if (moves.length === 0) {
    if (state.status === "check") return -100000 + (8 - depth);
    return 0;
  }
  moves.sort((a, b) => order(b, state.pieces) - order(a, state.pieces));
  let best = -Infinity;
  for (const raw of moves) {
    const next = playMove(state, normalize(state, raw));
    const score = -negamax(next, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseAiMove(state: GameSnapshot, depth = 2): Move | null {
  const moves = getAllLegalMoves(state.pieces, state.turn);
  if (moves.length === 0) return null;
  moves.sort((a, b) => order(b, state.pieces) - order(a, state.pieces));
  let bestMove = normalize(state, moves[0]);
  let bestScore = -Infinity;
  for (const raw of moves) {
    const m = normalize(state, raw);
    const next = playMove(state, m);
    const score = -negamax(next, depth - 1, -Infinity, Infinity) + Math.random() * 0.4;
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}
