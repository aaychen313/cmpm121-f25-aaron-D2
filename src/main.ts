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
ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "black";

type Cursor = { active: boolean; x: number; y: number };
const cursor: Cursor = { active: false, x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!cursor.active) return;
  ctx.beginPath();
  ctx.moveTo(cursor.x, cursor.y);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
});

const controls = document.createElement("div");
controls.className = "controls";
root.append(controls);

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
controls.append(clearBtn);

clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
