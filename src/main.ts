// tools
interface MarkerTool {
  kind: "marker";
  thickness: number;
}

interface StickerTool {
  kind: "sticker";
  emoji: string;
  size: number;
}

type Tool = MarkerTool | StickerTool;

const isMarker = (t: Tool): t is MarkerTool => t.kind === "marker";
const isSticker = (t: Tool): t is StickerTool => t.kind === "sticker";

// command patterns
interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
  drag(x: number, y: number): void;
}

function makeMarkerCommand(
  thickness: number,
  x: number,
  y: number,
): DisplayCommand {
  const points: { x: number; y: number }[] = [{ x, y }];
  return {
    display(ctx) {
      if (points.length < 2) return;
      ctx.save();
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    },
    drag(nx, ny) {
      points.push({ x: nx, y: ny });
    },
  };
}

function makeStickerCommand(
  emoji: string,
  size: number,
  x: number,
  y: number,
): DisplayCommand {
  let px = x, py = y;
  return {
    display(ctx) {
      ctx.save();
      ctx.font =
        `${size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, px, py);
      ctx.restore();
    },
    // Drag repositions the sticker
    drag(nx, ny) {
      px = nx;
      py = ny;
    },
  };
}

// preview
interface Preview {
  display(ctx: CanvasRenderingContext2D): void;
}

function makeMarkerPreview(thickness: number, x: number, y: number): Preview {
  return {
    display(ctx) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, thickness / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
}

function makeStickerPreview(
  emoji: string,
  size: number,
  x: number,
  y: number,
): Preview {
  return {
    display(ctx) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.font =
        `${size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, x, y);
      ctx.restore();
    },
  };
}

// DOM
const wrapper = document.createElement("div");
wrapper.className = "wrapper";
document.body.append(wrapper);

const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
title.style.margin = "0";
title.style.fontSize = "1.25rem";
wrapper.append(title);

const canvas = document.createElement("canvas");
canvas.className = "paint";
canvas.width = 256;
canvas.height = 256;
wrapper.append(canvas);

const ctx = canvas.getContext("2d")!;

const controls = document.createElement("div");
controls.className = "controls";
wrapper.append(controls);

// marker buttons
const THIN = 3, THICK = 9; // defaults for now (tune in Step 11)
const thinBtn = document.createElement("button");
thinBtn.textContent = "Thin";
const thickBtn = document.createElement("button");
thickBtn.textContent = "Thick";
controls.append(thinBtn, thickBtn);

// Sticker buttons
type StickerMeta = { emoji: string; size: number };
interface StickerButton extends HTMLButtonElement {
  _sticker: StickerMeta;
}
const STICKERS_KEY = "customStickers.v1";

const defaultStickers: StickerMeta[] = [
  { emoji: "⭐", size: 28 },
  { emoji: "🔥", size: 28 },
  { emoji: "👍", size: 44 },
];
function loadCustom(): StickerMeta[] {
  try {
    return JSON.parse(localStorage.getItem(STICKERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveCustom(arr: StickerMeta[]) {
  try {
    localStorage.setItem(STICKERS_KEY, JSON.stringify(arr));
  } catch {}
}
let customStickers = loadCustom();

const stickerBar = document.createElement("div");
stickerBar.style.display = "flex";
stickerBar.style.gap = "8px";
controls.append(stickerBar);
let stickerBtns: StickerButton[] = [];
function renderStickerButtons() {
  for (const b of stickerBtns) b.remove();
  stickerBtns = [];
  const all = [...defaultStickers, ...customStickers];
  for (const meta of all) {
    const b = document.createElement("button") as StickerButton;
    b._sticker = meta;
    b.textContent = `${meta.emoji} ${meta.size}`;
    b.addEventListener("click", () => setTool({ kind: "sticker", ...meta }));
    stickerBar.append(b);
    stickerBtns.push(b);
  }
}
renderStickerButtons();

const customBtn = document.createElement("button");
customBtn.textContent = "➕ Custom";
customBtn.addEventListener("click", () => {
  const text = prompt("Custom sticker text", "🧽");
  if (!text) return;
  const sizeStr = prompt("Size in px", "32");
  const size = Math.max(8, Math.min(128, Number(sizeStr ?? 32) || 32));
  customStickers.push({ emoji: text, size });
  saveCustom(customStickers);
  renderStickerButtons();
  setTool({ kind: "sticker", emoji: text, size });
});
controls.append(customBtn);

// Utility buttons
const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";
controls.append(clearBtn, undoBtn, redoBtn);

// Model
const bus = new EventTarget();
const notify = (name: string) => bus.dispatchEvent(new Event(name));

let tool: Tool = { kind: "marker", thickness: THIN }; // default
let current: DisplayCommand | undefined;
let preview: Preview | undefined;
const displayList: DisplayCommand[] = [];
const redoStack: DisplayCommand[] = [];
let mouseDown = false;
let mouseX = 0, mouseY = 0;

// Redraw
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw display list
  for (const cmd of displayList) cmd.display(ctx);
  if (current) current.display(ctx);
  // preview shows only when mouse is NOT down
  if (!mouseDown && preview) preview.display(ctx);
  // button states
  undoBtn.disabled = displayList.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("tool-moved", redraw);

// Tool selection
function setTool(t: Tool) {
  tool = t;
  // highlight marker buttons
  thinBtn.classList.toggle("selectedTool", isMarker(t) && t.thickness === THIN);
  thickBtn.classList.toggle(
    "selectedTool",
    isMarker(t) && t.thickness === THICK,
  );
  // highlight sticker buttons
  for (const b of stickerBtns) {
    const { emoji, size } = b._sticker;
    b.classList.toggle(
      "selectedTool",
      isSticker(t) && t.emoji === emoji && t.size === size,
    );
  }

  // update preview immediately at current mouse
  updatePreview(mouseX, mouseY);
  notify("tool-moved");
}

// Preview update
function updatePreview(x: number, y: number) {
  if (mouseDown) {
    preview = undefined;
    return;
  }
  preview = isMarker(tool)
    ? makeMarkerPreview(tool.thickness, x, y)
    : makeStickerPreview(tool.emoji, tool.size, x, y);
}

// Input handling
canvas.addEventListener("mousedown", (e) => {
  mouseDown = true;
  const x = e.offsetX, y = e.offsetY;
  current = isMarker(tool)
    ? makeMarkerCommand(tool.thickness, x, y)
    : makeStickerCommand(tool.emoji, tool.size, x, y);
  displayList.push(current);
  redoStack.length = 0;
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  mouseX = e.offsetX;
  mouseY = e.offsetY;

  if (current) {
    current.drag(mouseX, mouseY);
    notify("drawing-changed");
  } else {
    updatePreview(mouseX, mouseY);
    notify("tool-moved");
  }
});

canvas.addEventListener("mouseup", () => {
  mouseDown = false;
  current = undefined;
  updatePreview(mouseX, mouseY);
  notify("drawing-changed");
});

// Controls
thinBtn.addEventListener(
  "click",
  () => setTool({ kind: "marker", thickness: THIN }),
);
thickBtn.addEventListener(
  "click",
  () => setTool({ kind: "marker", thickness: THICK }),
);

clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  redoStack.length = 0;
  current = undefined;
  preview = undefined;
  notify("drawing-changed");
});

undoBtn.addEventListener("click", () => {
  if (displayList.length === 0) return;
  const popped = displayList.pop()!;
  redoStack.push(popped);
  notify("drawing-changed");
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const popped = redoStack.pop()!;
  displayList.push(popped);
  notify("drawing-changed");
});

setTool(tool);
redraw();
