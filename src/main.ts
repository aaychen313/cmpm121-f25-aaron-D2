const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "./style.css";
document.head.append(link);

const wrapper = document.createElement("div");
wrapper.className = "wrapper";
document.body.append(wrapper);

const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
title.style.margin = "0";
title.style.fontSize = "1.25rem";
wrapper.append(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
wrapper.append(canvas);

