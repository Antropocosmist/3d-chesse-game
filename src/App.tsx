import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BoardCanvas } from "./components/BoardScene";
import {
  Controls,
  EndBanner,
  HelpModal,
  HoverReadout,
  MenuOverlay,
  MoveLog,
  PromotionModal,
  SideRoster,
  TopBar,
} from "./components/HUD";
import { chooseAiMove } from "./game/ai";
import { sfx, unlockAudio } from "./game/audio";
import {
  type Coord,
  type Faction,
  type GameSnapshot,
  type Move,
  type PieceType,
  coordsEqual,
  createInitialState,
  generateLegalMoves,
  isPromotionDest,
  playMove,
} from "./game/chess";

type Phase = "menu" | "playing";
type Mode = "local" | "ai-white" | "ai-black";

export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("local");
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialState());
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [pending, setPending] = useState<Move | null>(null);
  const [layerFocus, setLayerFocus] = useState<number | "all">("all");
  const [spacing, setSpacing] = useState(1.15);
  const [hover, setHover] = useState<string | null>(null);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [timed, setTimed] = useState(false);
  const [clocks, setClocks] = useState<{ white: number | null; black: number | null }>({
    white: null,
    black: null,
  });
  const [rematchKey, setRematchKey] = useState(0);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const thinkingRef = useRef(false);

  const humanColor: Faction | null = useMemo(() => {
    if (mode === "local") return null;
    return mode === "ai-black" ? "white" : "black";
  }, [mode]);

  const ended = snapshot.status === "checkmate" || snapshot.status === "stalemate";
  const interactive = phase === "playing" && !ended && !thinking && !pending;
  const previewPiece =
    phase === "playing" && !ended && !pending && !selectedId
      ? snapshot.pieces.find((piece) => piece.id === hoveredPieceId)
      : undefined;
  const previewMoves = useMemo(
    () => (previewPiece ? generateLegalMoves(previewPiece, snapshot.pieces) : []),
    [previewPiece, snapshot.pieces],
  );

  const deselect = useCallback(() => {
    setSelectedId(null);
    setLegal([]);
  }, []);

  const commit = useCallback((state: GameSnapshot, move: Move) => {
    const next = playMove(state, move);
    setHistory((h) => [...h, state]);
    setSnapshot(next);
    setSelectedId(null);
    setLegal([]);
    setHoveredPieceId(null);
    setPending(null);
    if (next.status === "checkmate") sfx.mate();
    else if (move.capturedId) sfx.capture();
    else if (move.promoteTo) sfx.promo();
    else sfx.move();
    if (next.status === "check") window.setTimeout(() => sfx.check(), 120);
    return next;
  }, []);

  const onSelectPiece = useCallback(
    (id: string) => {
      if (!interactive) return;
      const state = snapRef.current;
      const piece = state.pieces.find((p) => p.id === id);
      if (!piece) return;

      // If a friendly piece is already selected and this click lands on a legal
      // capture target (own ship's hit-sphere can occlude the beacon underneath
      // an enemy ship), resolve it as a capture regardless of game mode.
      if (selectedId && selectedId !== id) {
        const cap = legal.find((m) => coordsEqual(m.to, piece));
        if (cap) {
          const mover = state.pieces.find((p) => p.id === cap.pieceId);
          if (mover && isPromotionDest(mover, cap.to)) {
            setPending(cap);
            return;
          }
          commit(state, cap);
          return;
        }
      }

      if (humanColor && piece.color !== humanColor) {
        sfx.deny();
        return;
      }
      if (piece.color !== state.turn) {
        sfx.deny();
        return;
      }
      if (selectedId === id) {
        deselect();
        return;
      }
      const moves = generateLegalMoves(piece, state.pieces);
      setSelectedId(id);
      setLegal(moves);
      sfx.select();
    },
    [commit, deselect, humanColor, interactive, legal, selectedId],
  );

  const onMoveTo = useCallback(
    (coord: Coord) => {
      if (!interactive) return;
      const state = snapRef.current;
      const move = legal.find((m) => coordsEqual(m.to, coord));
      if (!move) return;
      const piece = state.pieces.find((p) => p.id === move.pieceId);
      if (piece && isPromotionDest(piece, move.to)) {
        setPending(move);
        return;
      }
      commit(state, move);
    },
    [commit, interactive, legal],
  );

  const onPromote = useCallback(
    (type: PieceType) => {
      if (!pending) return;
      commit(snapRef.current, { ...pending, promoteTo: type });
    },
    [commit, pending],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      let drop = 1;
      if (mode !== "local" && h.length >= 2) drop = 2;
      const nextHist = h.slice(0, h.length - drop);
      const restore = h[h.length - drop];
      setSnapshot(restore);
      setSelectedId(null);
      setLegal([]);
      setHoveredPieceId(null);
      setPending(null);
      return nextHist;
    });
  }, [mode]);

  const resetBoard = useCallback(() => {
    setSnapshot(createInitialState());
    setHistory([]);
    setSelectedId(null);
    setLegal([]);
    setHoveredPieceId(null);
    setPending(null);
    setThinking(false);
    setClocks(timed ? { white: 600, black: 600 } : { white: null, black: null });
  }, [timed]);

  const start = useCallback((m: Mode, useClock: boolean) => {
    unlockAudio();
    setMode(m);
    setTimed(useClock);
    setSnapshot(createInitialState());
    setHistory([]);
    setSelectedId(null);
    setLegal([]);
    setHoveredPieceId(null);
    setPending(null);
    setLayerFocus("all");
    setHelp(false);
    setClocks(useClock ? { white: 600, black: 600 } : { white: null, black: null });
    setPhase("playing");
    setRematchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (phase !== "playing" || ended || pending) return;
    if (mode === "local") return;
    const cpu: Faction = mode === "ai-black" ? "black" : "white";
    if (snapshot.turn !== cpu) return;
    thinkingRef.current = true;
    setThinking(true);
    const handle = window.setTimeout(() => {
      const move = chooseAiMove(snapRef.current, 2);
      if (move) commit(snapRef.current, move);
      thinkingRef.current = false;
      setThinking(false);
    }, 380);
    return () => window.clearTimeout(handle);
  }, [commit, ended, mode, pending, phase, snapshot.ply, snapshot.turn]);

  useEffect(() => {
    if (phase !== "playing" || ended || !timed) return;
    const id = window.setInterval(() => {
      setClocks((c) => {
        if (c.white === null || c.black === null) return c;
        const turn = snapRef.current.turn;
        const next = {
          white: turn === "white" ? c.white - 0.1 : c.white,
          black: turn === "black" ? c.black - 0.1 : c.black,
        };
        if (next.white <= 0 || next.black <= 0) {
          setSnapshot((s) => ({
            ...s,
            status: "checkmate",
            winner: next.white <= 0 ? "black" : "white",
          }));
          sfx.mate();
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [ended, phase, timed, rematchKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        deselect();
        setHelp(false);
      }
      if (e.key === "u" || e.key === "U") undo();
      if (e.key === "0") setLayerFocus("all");
      const n = Number(e.key);
      if (n >= 1 && n <= 8) setLayerFocus(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deselect, undo]);

  const resetCam = () => {
    controlsRef.current?.reset();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05010d] font-body text-cyan-50">
      <div className="absolute inset-0">
        <BoardCanvas
          snapshot={snapshot}
          selectedId={selectedId}
          legal={legal}
          previewPiece={previewPiece ?? null}
          previewMoves={previewMoves}
          layerFocus={layerFocus}
          spacing={spacing}
          interactive={interactive}
          autoRotate={phase === "menu"}
          onSelectPiece={onSelectPiece}
          onMoveTo={onMoveTo}
          onHover={setHover}
          onHoverPiece={setHoveredPieceId}
          onDeselect={deselect}
          controlsRef={controlsRef}
        />
      </div>

      <div className="scanlines pointer-events-none absolute inset-0 z-[1] opacity-40" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-5">
        <TopBar snapshot={snapshot} clocks={clocks} thinking={thinking} />

        <div className="flex items-end justify-between gap-4">
          <div className="pointer-events-auto hidden md:block">
            <SideRoster snapshot={snapshot} side="white" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <HoverReadout label={hover} />
            <div className="flex w-full max-w-3xl gap-3">
              <MoveLog log={snapshot.log} />
            </div>
          </div>
          <div className="pointer-events-auto flex max-h-[72vh] flex-col gap-3 overflow-y-auto">
            {phase === "playing" && (
              <Controls
                layerFocus={layerFocus}
                spacing={spacing}
                canUndo={history.length > 0 && !thinking}
                onLayer={setLayerFocus}
                onSpacing={setSpacing}
                onUndo={undo}
                onReset={() => {
                  setPhase("menu");
                  resetBoard();
                }}
                onCamera={resetCam}
                onHelp={() => setHelp(true)}
              />
            )}
            <div className="hidden lg:block">
              <SideRoster snapshot={snapshot} side="black" />
            </div>
          </div>
        </div>
      </div>

      {phase === "menu" && <MenuOverlay onStart={start} />}
      {help && <HelpModal onClose={() => setHelp(false)} />}
      {pending && (
        <PromotionModal
          color={snapshot.pieces.find((p) => p.id === pending.pieceId)?.color ?? "white"}
          onPick={onPromote}
        />
      )}
      {phase === "playing" && ended && (
        <EndBanner
          snapshot={snapshot}
          onMenu={() => {
            setPhase("menu");
            resetBoard();
          }}
          onRematch={() => start(mode, timed)}
        />
      )}
    </div>
  );
}
