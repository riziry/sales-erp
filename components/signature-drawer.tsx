"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Eraser, Undo2 } from "lucide-react";
import Modal from "./modal";
import { Notice } from "./fields";

type Point = { x: number; y: number };
type Stroke = Point[];
const WIDTH = 800;
const HEIGHT = 320;

export default function SignatureDrawer({
  onClose,
  onUse,
}: {
  onClose: () => void;
  onUse: (file: File) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const active = useRef<number | null>(null);
  const [count, setCount] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function paint() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#172033";
    ctx.fillStyle = "#172033";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes.current) {
      const first = stroke[0];
      if (!first) continue;
      ctx.beginPath();
      if (stroke.length === 1) {
        ctx.arc(first.x, first.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(first.x, first.y);
        for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    }
  }
  // Fixed logical dimensions preserve all strokes across rotation/resizing.
  useEffect(() => {
    paint();
  }, []);
  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(WIDTH, ((event.clientX - rect.left) * WIDTH) / rect.width),
      ),
      y: Math.max(
        0,
        Math.min(HEIGHT, ((event.clientY - rect.top) * HEIGHT) / rect.height),
      ),
    };
  }
  function finish(event: PointerEvent<HTMLCanvasElement>, cancel = false) {
    if (event.pointerId !== active.current) return;
    if (cancel) strokes.current.pop();
    active.current = null;
    setDrawing(false);
    setCount(strokes.current.length);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    paint();
  }
  function useSignature() {
    if (!count || drawing || busy) return;
    setBusy(true);
    canvas.current?.toBlob((blob) => {
      if (!blob) {
        setError("Unable to create the image. Please try again.");
        setBusy(false);
        return;
      }
      onUse(new File([blob], "drawn-signature.png", { type: "image/png" }));
      onClose();
    }, "image/png");
  }
  return (
    <Modal
      title="Draw your signature"
      onClose={onClose}
      busy={busy}
      className="signature-drawer"
    >
      <p id="signature-instructions" className="section-description">
        Sign in the white area using your mouse, finger, or pen. You can also
        cancel and upload an image instead.
      </p>
      <div className="signature-canvas-wrap">
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          aria-label="Signature drawing area"
          aria-describedby="signature-instructions"
          onPointerDown={(event) => {
            if (
              busy ||
              active.current !== null ||
              !event.isPrimary ||
              event.button !== 0
            )
              return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            active.current = event.pointerId;
            strokes.current.push([point(event)]);
            setDrawing(true);
            setError("");
            paint();
          }}
          onPointerMove={(event) => {
            if (event.pointerId !== active.current) return;
            strokes.current.at(-1)!.push(point(event));
            paint();
          }}
          onPointerUp={(event) => finish(event)}
          onPointerCancel={(event) => finish(event, true)}
          onLostPointerCapture={(event) => finish(event)}
        >
          Use Upload signature if you cannot use the drawing area.
        </canvas>
        {!count && !drawing && <span aria-hidden="true">Sign here</span>}
      </div>
      <div className="signature-actions">
        <button
          type="button"
          className="button"
          disabled={!count || busy || drawing}
          onClick={() => {
            strokes.current.pop();
            setCount(strokes.current.length);
            paint();
          }}
        >
          <Undo2 size={16} /> Undo
        </button>
        <button
          type="button"
          className="button"
          disabled={!count || busy || drawing}
          onClick={() => {
            strokes.current = [];
            setCount(0);
            paint();
          }}
        >
          <Eraser size={16} /> Clear
        </button>
        <span className="muted small-text" role="status">
          {count ? "Signature ready" : "Draw to get started"}
        </span>
      </div>
      <Notice text={error} />
      <p className="muted small-text">
        Choose Use signature, then Save account to save your changes.
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button primary"
          disabled={!count || busy || drawing}
          onClick={useSignature}
        >
          <Check size={16} /> {busy ? "Preparing…" : "Use signature"}
        </button>
      </div>
    </Modal>
  );
}
