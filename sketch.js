let state = "menu";

let storeImg;
let milkAisleImg;
let milkCarton1;

// dialogue
let showDialogue = true;
let dialogueIndex = 0;

let dialogueText = [
  "Hi, I'm Alex.",
  "Sometimes grocery stores feel overwhelming.",
  "There are lots of choices and it can be hard to decide.",
  "Let's go step by step together.",
];

// fridge click zone
let zones = [];

// current puzzle
let currentPuzzle = null;

function preload() {
  storeImg = loadImage("assets/store.png");
  milkAisleImg = loadImage("assets/milk_aisle.png");
  milkCarton1 = loadImage("assets/milkcarton1.png");
}

function setup() {
  createCanvas(800, 600);

  // fridge area (top middle)
  zones = [{ name: "milk", x: 250, y: 40, w: 300, h: 120 }];
}

function draw() {
  if (state === "menu") drawMenu();
  else if (state === "store") drawStore();
  else if (state === "puzzle") drawPuzzle();
}

/* ================= MENU ================= */

function drawMenu() {
  background(30, 40, 60);

  textAlign(CENTER);
  fill(255);
  textSize(40);
  text("Grocery Helper", width / 2, 200);

  fill(100, 200, 255);
  rect(width / 2 - 100, 300, 200, 60, 10);

  fill(0);
  textSize(20);
  text("Start Game", width / 2, 335);
}

/* ================= STORE ================= */

function drawStore() {
  background(0);

  drawImageProper(storeImg);

  if (showDialogue) {
    drawDialogue();
  } else {
    fill(255);
    textSize(16);
    textAlign(LEFT);
    text("Click the fridge to explore", 20, 30);
  }
}

/* ================= DIALOGUE ================= */

function drawDialogue() {
  fill(0, 180);
  rect(50, 400, 700, 150, 10);

  fill(255);
  textSize(18);
  textAlign(LEFT);

  text(dialogueText[dialogueIndex], 70, 450);

  textSize(14);
  text("Click to continue...", 550, 520);
}

/* ================= MILK SCREEN ================= */

function drawPuzzle() {
  background(0);

  if (currentPuzzle === "milk") {
    drawImageProper(milkAisleImg);
    drawMilkCarton();
  }

  fill(255);
  textAlign(CENTER);
  textSize(16);
  text("Click anywhere to go back", width / 2, 550);
}

/* ================= DRAW MILK ================= */

function drawMilkCarton() {
  let cartonWidth = 80;
  let cartonHeight = 120;

  // position on first shelf (adjust if needed)
  let x = width / 2 - 40;
  let y = 180;

  image(milkCarton1, x, y, cartonWidth, cartonHeight);
}

/* ================= IMAGE SCALING ================= */

function drawImageProper(img) {
  let imgRatio = img.width / img.height;
  let canvasRatio = width / height;

  let drawWidth, drawHeight;

  if (imgRatio > canvasRatio) {
    drawWidth = width;
    drawHeight = width / imgRatio;
  } else {
    drawHeight = height;
    drawWidth = height * imgRatio;
  }

  let x = (width - drawWidth) / 2;
  let y = (height - drawHeight) / 2;

  image(img, x, y, drawWidth, drawHeight);
}

/* ================= INTERACTIONS ================= */

function mousePressed() {
  // MENU → STORE
  if (state === "menu") {
    if (
      mouseX > width / 2 - 100 &&
      mouseX < width / 2 + 100 &&
      mouseY > 300 &&
      mouseY < 360
    ) {
      state = "store";
      return;
    }
  }

  // DIALOGUE CLICK
  if (state === "store" && showDialogue) {
    dialogueIndex++;

    if (dialogueIndex >= dialogueText.length) {
      showDialogue = false;
    }

    return;
  }

  // STORE → MILK (FRIDGE CLICK)
  if (state === "store" && !showDialogue) {
    for (let z of zones) {
      if (
        mouseX > z.x &&
        mouseX < z.x + z.w &&
        mouseY > z.y &&
        mouseY < z.y + z.h
      ) {
        currentPuzzle = z.name;
        state = "puzzle";
        return;
      }
    }
  }

  // PUZZLE → STORE
  if (state === "puzzle") {
    state = "store";
  }
}
