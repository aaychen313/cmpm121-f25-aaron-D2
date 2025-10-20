// Types
interface Displayable {
  display(ctx: CanvasRenderingContext2D): void;
}
interface DraggableCommand extends Displayable {
  drag(x: number, y: number): void;
}
type Command = DraggableCommand;

interface Model {
  commands: Command[];
  redo: Command[];
  current?: Command | undefined;
  preview?: Displayable | null | undefined; // reserved for Step 7+
}

type Tool = { kind: "marker"; thickness: number };

// Event bus
const bus = new EventTarget();
const notify = (name: string) => bus.dispatchEvent(new Event(name));

// Commands
function makeMarkerCommand(opts: { thickness: number }): Command {
  const points: { x: number; y: number }[] = [];
  const thickness = opts.thickness;

  return {
    drag(x, y) {
      points.push({ x, y });
    },
    display(ctx) {
      if (points.length < 2) return;
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

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
controls.append(clearBtn);

const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
controls.append(undoBtn);

const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";
controls.append(redoBtn);

// tool buttons
const thinBtn = document.createElement("button");
thinBtn.textContent = "Thin";
controls.append(thinBtn);

const thickBtn = document.createElement("button");
thickBtn.textContent = "Thick";
controls.append(thickBtn);

//Tool State
let tool: Tool = { kind: "marker", thickness: 4 };

function setTool(t: Tool) {
  tool = t;
  // visual selection
  thinBtn.classList.toggle(
    "selectedTool",
    t.kind === "marker" && t.thickness === 2,
  );
  thickBtn.classList.toggle(
    "selectedTool",
    t.kind === "marker" && t.thickness === 8,
  );
}

// initial selection
setTool({ kind: "marker", thickness: 4 }); // neutral start
thinBtn.addEventListener(
  "click",
  () => setTool({ kind: "marker", thickness: 2 }),
);
thickBtn.addEventListener(
  "click",
  () => setTool({ kind: "marker", thickness: 8 }),
);

// Model
const model: Model = {
  commands: [],
  redo: [],
  current: undefined,
  preview: null,
};

// Render
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of model.commands) cmd.display(ctx);
  if (model.current) model.current.display(ctx);
  undoBtn.disabled = model.commands.length === 0;
  redoBtn.disabled = model.redo.length === 0;
}
bus.addEventListener("drawing-changed", redraw);

// Input handling
let isDown = false;
canvas.addEventListener("mousedown", (e) => {
  isDown = true;
  const cmd = makeMarkerCommand({ thickness: tool.thickness });
  cmd.drag(e.offsetX, e.offsetY);
  model.current = cmd;
  model.commands.push(cmd);
  model.redo.length = 0;
  notify("drawing-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDown || !model.current) return;
  model.current.drag(e.offsetX, e.offsetY);
  notify("drawing-changed");
});

canvas.addEventListener("mouseup", () => {
  isDown = false;
  model.current = undefined;
  notify("drawing-changed");
});

// Controls
clearBtn.addEventListener("click", () => {
  model.commands.length = 0;
  model.redo.length = 0;
  model.current = undefined;
  notify("drawing-changed");
});

undoBtn.addEventListener("click", () => {
  if (model.commands.length === 0) return;
  model.redo.push(model.commands.pop()!);
  notify("drawing-changed");
});

redoBtn.addEventListener("click", () => {
  if (model.redo.length === 0) return;
  model.commands.push(model.redo.pop()!);
  notify("drawing-changed");
});

redraw();
