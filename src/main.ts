// Types
interface Point {
  x: number;
  y: number;
}
type Stroke = Point[];
interface Model {
  strokes: Stroke[];
  redo: Stroke[];
  current?: Stroke | undefined;
}

// DOM
const root = document.createElement("div");
root.className = "wrapper";
document.body.append(root);

const h1 = document.createElement("h1");
h1.textContent = "Sticker Sketchpad";
h1.style.margin = "0";
h1.style.fontSize = "1.25rem";
root.append(h1);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
root.append(canvas);

const ctx = canvas.getContext("2d")!;

// Model
const model: Model = { strokes: [], redo: [] };

// Event bus
const bus = new EventTarget();
const notify = (name: string) => bus.dispatchEvent(new Event(name));

// Drawing helpers
function drawStroke(s: Stroke) {
  if (s.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length; i++) {
    const p = s[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "black";
  for (const s of model.strokes) drawStroke(s);
  if (model.current) drawStroke(model.current);

  // enable/disable buttons based on stacks
  undoBtn.disabled = model.strokes.length === 0;
  redoBtn.disabled = model.redo.length === 0;
}

// Observe changes
bus.addEventListener("drawing-changed", redraw);

// Input handling
canvas.addEventListener("mousedown", (e) => {
  model.current = [{ x: e.offsetX, y: e.offsetY }];
  model.strokes.push(model.current);
  model.redo.length = 0; // invalidate redo chain on new draw
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (!model.current) return;
  model.current.push({ x: e.offsetX, y: e.offsetY });
  notify("drawing-changed");
});

canvas.addEventListener("mouseup", () => {
  model.current = undefined;
  notify("drawing-changed");
});

// Controls
const controls = document.createElement("div");
controls.className = "controls";
root.append(controls);

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
controls.append(clearBtn);

clearBtn.addEventListener("click", () => {
  model.strokes.length = 0;
  model.redo.length = 0;
  model.current = undefined;
  notify("drawing-changed");
});

const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
controls.append(undoBtn);

undoBtn.addEventListener("click", () => {
  if (model.strokes.length === 0) return;
  const popped = model.strokes.pop()!;
  model.redo.push(popped);
  notify("drawing-changed");
});

const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";
controls.append(redoBtn);

redoBtn.addEventListener("click", () => {
  if (model.redo.length === 0) return;
  const popped = model.redo.pop()!;
  model.strokes.push(popped);
  notify("drawing-changed");
});

redraw();
