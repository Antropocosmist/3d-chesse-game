import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialState,
  generateLegalMoves,
  getAllLegalMoves,
  isSquareAttacked,
  playMove,
  type Coord,
  type Faction,
  type Piece,
  type PieceType,
} from "../src/game/chess";

function makePiece(
  id: string,
  type: PieceType,
  color: Faction,
  x: number,
  y: number,
  z: number,
  hasMoved = true,
): Piece {
  return { id, type, color, x, y, z, hasMoved };
}

const kings = [
  makePiece("wk", "king", "white", 0, 0, 0),
  makePiece("bk", "king", "black", 7, 7, 7),
];

function hasTarget(piece: Piece, pieces: Piece[], x: number, y: number, z: number) {
  return generateLegalMoves(piece, pieces).some(
    ({ to }) => to.x === x && to.y === y && to.z === z,
  );
}

function toKey({ x, y, z }: Coord): string {
  return `${x},${y},${z}`;
}

test("white pawn advances forward, forward-down, forward-up or up, not sideways or backward", () => {
  const pawn = makePiece("wp", "pawn", "white", 3, 3, 3);
  const moves = generateLegalMoves(pawn, [...kings, pawn]);
  assert.deepEqual(
    moves.map(({ to }) => toKey(to)).sort(),
    ["3,3,4", "3,4,2", "3,4,3", "3,4,4"],
  );
  assert.equal(isSquareAttacked([...kings, pawn], 3, 4, 3, "white"), false);
  assert.equal(isSquareAttacked([...kings, pawn], 3, 3, 4, "white"), false);
  assert.equal(isSquareAttacked([...kings, pawn], 4, 3, 3, "white"), false);
});

test("black pawn mirrors the forward directions, including forward-up", () => {
  const pawn = makePiece("bp", "pawn", "black", 4, 4, 4);
  const moves = generateLegalMoves(pawn, [...kings, pawn]);
  assert.deepEqual(
    moves.map(({ to }) => toKey(to)).sort(),
    ["4,3,3", "4,3,4", "4,3,5", "4,4,3"],
  );
});

test("pawns capture diagonally across horizontal, vertical and 3D planes", () => {
  const pawn = makePiece("wp", "pawn", "white", 3, 3, 3);
  const enemies = [
    makePiece("xy", "rook", "black", 4, 4, 3),
    makePiece("xz", "rook", "black", 2, 3, 4),
    makePiece("yz-down", "rook", "black", 3, 4, 2),
    makePiece("xyz-down", "rook", "black", 4, 4, 2),
    makePiece("straight-y", "rook", "black", 3, 4, 3),
    makePiece("straight-z", "rook", "black", 3, 3, 4),
    makePiece("sideways", "rook", "black", 4, 3, 3),
  ];
  const pieces = [...kings, pawn, ...enemies];
  const captures = generateLegalMoves(pawn, pieces).filter((move) => move.capturedId);
  assert.deepEqual(
    captures.map(({ capturedId }) => capturedId).sort(),
    ["xy", "xz", "yz-down", "xyz-down"].sort(),
  );
  assert.equal(isSquareAttacked(pieces, 3, 4, 2, "white"), true);
  assert.equal(isSquareAttacked(pieces, 4, 4, 2, "white"), true);
  assert.equal(isSquareAttacked(pieces, 3, 4, 3, "white"), false);
  assert.equal(isSquareAttacked(pieces, 4, 3, 3, "white"), false);
});

test("pawn cannot capture a friendly ship on a forward-down diagonal", () => {
  const pawn = makePiece("wp", "pawn", "white", 3, 3, 3);
  const ally = makePiece("ally", "rook", "white", 3, 4, 2);
  assert.equal(hasTarget(pawn, [...kings, pawn, ally], 3, 4, 2), false);
});

test("black pawn captures on mirrored diagonals, never sideways or backward", () => {
  const pawn = makePiece("bp", "pawn", "black", 4, 4, 4);
  const enemies = [
    makePiece("xyz", "rook", "white", 3, 3, 5),
    makePiece("yz", "rook", "white", 4, 3, 5),
    makePiece("sideways", "rook", "white", 3, 4, 4),
    makePiece("backward", "rook", "white", 4, 5, 4),
  ];
  const pieces = [...kings, pawn, ...enemies];
  const captures = generateLegalMoves(pawn, pieces).filter((move) => move.capturedId);
  assert.deepEqual(captures.map(({ capturedId }) => capturedId).sort(), ["xyz", "yz"]);
  assert.equal(isSquareAttacked(pieces, 4, 3, 5, "black"), true);
  assert.equal(isSquareAttacked(pieces, 3, 4, 4, "black"), false);
});

test("initial two-cell pawn advances require a clear route and do not bend", () => {
  const pawn = makePiece("wp", "pawn", "white", 3, 1, 1, false);
  const pieces = [...kings, pawn];
  assert.equal(hasTarget(pawn, pieces, 3, 3, 1), true);
  assert.equal(hasTarget(pawn, pieces, 3, 1, 3), true);
  assert.equal(hasTarget(pawn, pieces, 3, 3, 0), false);

  const blockers = [
    makePiece("rank-blocker", "rook", "white", 3, 2, 1),
    makePiece("deck-blocker", "rook", "white", 3, 1, 2),
  ];
  assert.equal(hasTarget(pawn, [...pieces, ...blockers], 3, 3, 1), false);
  assert.equal(hasTarget(pawn, [...pieces, ...blockers], 3, 1, 3), false);
});

test("other ships keep chess movement in multiple planes", () => {
  const positions: Array<[PieceType, Coord]> = [
    ["rook", { x: 3, y: 3, z: 5 }],
    ["bishop", { x: 3, y: 4, z: 2 }],
    ["knight", { x: 3, y: 5, z: 4 }],
    ["queen", { x: 4, y: 4, z: 4 }],
    ["king", { x: 4, y: 4, z: 4 }],
  ];
  for (const [type, target] of positions) {
    const ship = makePiece(`ship-${type}`, type, "white", 3, 3, 3);
    const pieces = type === "king" ? [kings[1], ship] : [...kings, ship];
    assert.equal(
      hasTarget(ship, pieces, target.x, target.y, target.z),
      true,
      `${type} must move across decks`,
    );
  }
});

test("initial deployment has no immediate captures and allows forward-down", () => {
  const state = createInitialState();
  const moves = getAllLegalMoves(state.pieces, "white");
  assert.equal(state.pieces.length, 32);
  assert.equal(moves.some((move) => move.capturedId), false);
  const pawn = state.pieces.find((piece) => piece.id === "w-pawn-3");
  assert.ok(pawn);
  const move = generateLegalMoves(pawn, state.pieces).find(
    ({ to }) => to.x === 3 && to.y === 2 && to.z === 0,
  );
  assert.ok(move);
  const next = playMove(state, move);
  assert.equal(next.pieces.find((piece) => piece.id === pawn.id)?.z, 0);
  assert.equal(next.turn, "black");
});