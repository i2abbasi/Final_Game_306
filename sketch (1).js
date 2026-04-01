// ============================================================
//  GROCERY HELPER — A Game About Empathy
//  Built with p5.js | Single-file architecture
//
//  GAME STATES:
//    "intro"     → Title screen + story setup
//    "tutorial"  → How to play instructions
//    "store"     → Main scrolling store (player walks)
//    "minigame"  → Active mini-game overlay
//    "debrief"   → Post-minigame reflection card
//    "win"       → Completion screen
//
//  MINI-GAMES:
//    1. memory      — Remember a list, then recall it
//    2. overload    — Too many flashing options, pick the right one
//    3. navigation  — Confusing signs, find the correct aisle
//    4. decision    — Too many milk options, pick the right one
// ============================================================

// ─── ASSETS ────────────────────────────────────────────────
let storeImg, milkAisleImg, milkCarton1;

// ─── GLOBAL STATE ──────────────────────────────────────────
let gameState = "intro";
let prevState = "";
let fadeAlpha = 0; // 0=transparent, 255=opaque (used for fade in/out)
let fadingOut = false;
let fadeTarget = ""; // next state after fade
let fadeSpeed = 6;

// ─── PLAYER ────────────────────────────────────────────────
let player = {
  x: 300,
  y: 420,
  w: 36,
  h: 52,
  speed: 3,
  facing: 1, // 1=right, -1=left
  walkFrame: 0,
  walkTimer: 0,
};

// ─── CAMERA ────────────────────────────────────────────────
let camX = 0; // horizontal scroll offset
let storeWidth = 2400; // total scrollable store width

// ─── STORE ZONES (aisles that trigger minigames) ────────────
let zones = [
  {
    id: "memory",
    x: 380,
    label: "🥦 Produce",
    color: [120, 200, 100],
    done: false,
    triggered: false,
  },
  {
    id: "overload",
    x: 780,
    label: "🥫 Snacks",
    color: [240, 160, 60],
    done: false,
    triggered: false,
  },
  {
    id: "navigation",
    x: 1200,
    label: "❓ Dairy",
    color: [100, 180, 240],
    done: false,
    triggered: false,
  },
  {
    id: "decision",
    x: 1650,
    label: "🥛 Milk",
    color: [200, 120, 200],
    done: false,
    triggered: false,
  },
];

// ─── DIALOGUE / INTRO SEQUENCE ─────────────────────────────
let dialogue = {
  lines: [
    "Hi, I'm Alex. 👋",
    "Today I need to do the grocery shopping.",
    "Sounds simple, right?",
    "For me... it can feel really overwhelming.",
    "Every aisle has a challenge.",
    "I hope you'll understand by the end.",
    "Let's go.",
  ],
  index: 0,
  visible: true,
};

// ─── HINT SYSTEM ───────────────────────────────────────────
let hint = {
  text: "",
  timer: 0,
  maxTime: 220,
  visible: false,
};

// ─── PROGRESS ──────────────────────────────────────────────
let completedCount = 0;
let currentMiniGame = null;
let debriefText = "";

// ─── MINI-GAME: MEMORY ─────────────────────────────────────
let memory = {
  phase: "show", // show | input | result
  items: ["Apples", "Bread", "Eggs", "Milk", "Bananas"],
  shown: [], // subset shown to player
  selected: [], // player's picks
  showTimer: 0,
  showDuration: 180, // frames to show list
  result: null,
  hintUsed: false,
};

// ─── MINI-GAME: OVERLOAD ───────────────────────────────────
let overload = {
  phase: "play", // play | result
  target: "",
  options: [],
  flashTimer: 0,
  timeLeft: 600, // ~10 seconds
  result: null,
  noiseOffset: 0,
  selected: null,
};

// ─── MINI-GAME: NAVIGATION ─────────────────────────────────
let navigation = {
  phase: "play",
  signs: [], // array of sign objects with text & correct flag
  selected: null,
  result: null,
  flashTimer: 0,
};

// ─── MINI-GAME: DECISION ───────────────────────────────────
let decision = {
  phase: "play",
  milks: [],
  target: "",
  selected: null,
  result: null,
  panicked: false,
  panicTimer: 0,
};

// ─── FONTS & COLORS ────────────────────────────────────────
const C = {
  bg: [245, 245, 250],
  dark: [30, 36, 56],
  accent: [80, 150, 255],
  green: [80, 200, 130],
  red: [240, 90, 90],
  yellow: [255, 210, 60],
  white: [255, 255, 255],
  muted: [140, 145, 160],
  panel: [255, 255, 255, 230],
};

// ─── STORE FLOOR TILES & SHELF DATA ────────────────────────
let shelves = [];
let floorTiles = [];

// ============================================================
//  PRELOAD
// ============================================================
function preload() {
  storeImg = loadImage("assets/store.png");
  milkAisleImg = loadImage("assets/milk_aisle.png");
  milkCarton1 = loadImage("assets/milkcarton1.png");
}

// ============================================================
//  SETUP
// ============================================================
function setup() {
  createCanvas(880, 580);
  textFont("Georgia");
  generateStoreDecor();
  initOverload();
  initNavigation();
  initDecision();
}

// Generate decorative store elements procedurally
function generateStoreDecor() {
  // Shelf positions along store width
  let shelfColors = [
    [180, 220, 180],
    [220, 200, 160],
    [160, 200, 230],
    [230, 180, 180],
    [200, 180, 230],
    [220, 220, 160],
  ];
  for (let i = 0; i < 12; i++) {
    shelves.push({
      x: 120 + i * 190,
      y: 200,
      w: 160,
      h: 220,
      color: shelfColors[i % shelfColors.length],
    });
  }
}

// ============================================================
//  DRAW — main router
// ============================================================
function draw() {
  switch (gameState) {
    case "intro":
      drawIntro();
      break;
    case "tutorial":
      drawTutorial();
      break;
    case "store":
      drawStore();
      break;
    case "minigame":
      drawMiniGame();
      break;
    case "debrief":
      drawDebrief();
      break;
    case "win":
      drawWin();
      break;
  }

  drawFade();
  drawHint();
}

// ============================================================
//  FADE SYSTEM
// ============================================================
function drawFade() {
  if (fadingOut) {
    fadeAlpha = min(fadeAlpha + fadeSpeed, 255);
    fill(30, 36, 56, fadeAlpha);
    noStroke();
    rect(0, 0, width, height);
    if (fadeAlpha >= 255) {
      fadingOut = false;
      gameState = fadeTarget;
      fadeAlpha = 255;
      onEnterState(gameState);
    }
  } else if (fadeAlpha > 0) {
    fadeAlpha = max(fadeAlpha - fadeSpeed, 0);
    fill(30, 36, 56, fadeAlpha);
    noStroke();
    rect(0, 0, width, height);
  }
}

function transitionTo(nextState) {
  fadingOut = true;
  fadeTarget = nextState;
}

function onEnterState(s) {
  if (s === "minigame") {
    if (currentMiniGame === "memory") initMemory();
    if (currentMiniGame === "overload") initOverload();
    if (currentMiniGame === "navigation") initNavigation();
    if (currentMiniGame === "decision") initDecision();
  }
}

// ============================================================
//  HINT SYSTEM
// ============================================================
function showHint(msg) {
  hint.text = msg;
  hint.timer = hint.maxTime;
  hint.visible = true;
}

function drawHint() {
  if (!hint.visible) return;
  hint.timer--;
  if (hint.timer <= 0) hint.visible = false;

  let alpha = hint.timer < 40 ? map(hint.timer, 40, 0, 255, 0) : 255;
  noStroke();
  fill(30, 36, 56, alpha * 0.92);
  let bw = 420,
    bh = 52;
  let bx = width / 2 - bw / 2,
    by = height - 90;
  rect(bx, by, bw, bh, 12);
  fill(255, 210, 60, alpha);
  textAlign(CENTER, CENTER);
  textSize(15);
  text("💡 " + hint.text, width / 2, by + bh / 2);
}

// ============================================================
//  INTRO SCREEN
// ============================================================
function drawIntro() {
  // Soft gradient background
  for (let y = 0; y < height; y++) {
    let t = y / height;
    let r = lerp(30, 60, t);
    let g = lerp(36, 80, t);
    let b = lerp(56, 120, t);
    stroke(r, g, b);
    line(0, y, width, y);
  }

  // Subtle stars
  randomSeed(42);
  for (let i = 0; i < 60; i++) {
    let sx = random(width),
      sy = random(height * 0.7);
    let ss = random(1, 3);
    let sa = random(60, 180) + sin(frameCount * 0.02 + i) * 40;
    fill(255, 255, 255, sa);
    noStroke();
    ellipse(sx, sy, ss);
  }

  // Title
  noStroke();
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textSize(46);
  textStyle(BOLD);
  text("Grocery Helper", width / 2, 130);
  textStyle(NORMAL);
  textSize(18);
  fill(180, 210, 255);
  text("A Game About Empathy", width / 2, 178);

  // Dialogue box
  if (dialogue.visible && dialogue.index < dialogue.lines.length) {
    drawDialogueBox(dialogue.lines[dialogue.index], width / 2, 310);
    fill(180, 210, 255, 160 + sin(frameCount * 0.08) * 60);
    textSize(13);
    text("click to continue", width / 2, 410);
  } else {
    // Show start button
    drawButton("Start →", width / 2, 360, 200, 52, C.accent);
    textSize(13);
    fill(180, 210, 255, 140);
    text("press anywhere or click Start", width / 2, 415);
  }

  // Footer credit
  fill(100, 120, 160);
  textSize(12);
  text("Understanding begins with experience.", width / 2, height - 24);
}

// ============================================================
//  TUTORIAL SCREEN
// ============================================================
function drawTutorial() {
  background(245, 245, 250);

  // Header
  noStroke();
  fill(...C.dark);
  textAlign(CENTER, TOP);
  textSize(30);
  textStyle(BOLD);
  text("How to Play", width / 2, 50);
  textStyle(NORMAL);

  let steps = [
    ["🚶", "Walk with ← → arrow keys or A / D"],
    ["🏪", "Enter glowing aisles to start a challenge"],
    ["🎯", "Each challenge simulates a real difficulty"],
    ["💡", "Press H any time for a hint"],
    ["🤝", "There's no 'losing' — just understanding"],
  ];

  for (let i = 0; i < steps.length; i++) {
    let yy = 140 + i * 72;
    fill(255, 255, 255);
    stroke(220, 225, 235);
    strokeWeight(1);
    rect(80, yy, width - 160, 56, 10);

    noStroke();
    textAlign(LEFT, CENTER);
    textSize(26);
    text(steps[i][0], 115, yy + 28);

    fill(...C.dark);
    textSize(16);
    text(steps[i][1], 160, yy + 28);
  }

  drawButton("Let's Go! →", width / 2, height - 70, 200, 50, C.accent);
}

// ============================================================
//  STORE — MAIN SCROLLING WORLD
// ============================================================
function drawStore() {
  // Background sky / ceiling
  background(230, 235, 245);

  push();
  translate(-camX, 0);

  // Floor
  drawFloor();

  // Back wall
  fill(210, 218, 232);
  noStroke();
  rect(0, 80, storeWidth, 240);

  // Shelves
  drawShelves();

  // Zone glow beacons
  drawZones();

  // Player
  drawPlayer();

  pop();

  // Fixed HUD
  drawStoreHUD();

  // Update
  updatePlayer();
  updateCamera();

  // Check zone entry
  checkZones();
}

function drawFloor() {
  let tileW = 80,
    tileH = 60;
  for (let x = 0; x < storeWidth; x += tileW) {
    for (let y = 340; y < height; y += tileH) {
      let shade = (x / tileW + y / tileH) % 2 === 0 ? 248 : 238;
      fill(shade);
      noStroke();
      rect(x, y, tileW, tileH);
    }
  }
}

function drawShelves() {
  for (let s of shelves) {
    // Shadow
    fill(0, 0, 0, 18);
    noStroke();
    rect(s.x + 6, s.y + 6, s.w, s.h, 6);

    // Shelf body
    fill(...s.color, 200);
    stroke(255, 255, 255, 80);
    strokeWeight(1);
    rect(s.x, s.y, s.w, s.h, 6);

    // Shelf planks
    stroke(0, 0, 0, 30);
    strokeWeight(1);
    for (let shelf = 1; shelf < 4; shelf++) {
      let sy = s.y + (s.h / 4) * shelf;
      line(s.x, sy, s.x + s.w, sy);
    }

    // Products (little colored rectangles)
    noStroke();
    let cols = [
      [220, 80, 80],
      [80, 180, 220],
      [240, 180, 60],
      [120, 200, 120],
      [180, 120, 220],
      [240, 120, 80],
    ];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        let px = s.x + 12 + col * 35;
        let py = s.y + 24 + row * 56;
        let c = cols[(row * 4 + col) % cols.length];
        fill(...c, 200);
        rect(px, py, 28, 40, 3);
        fill(255, 255, 255, 60);
        rect(px + 4, py + 4, 10, 6, 2);
      }
    }
  }
}

function drawZones() {
  for (let z of zones) {
    if (z.done) continue;

    // Pulsing glow
    let pulse = sin(frameCount * 0.05) * 0.5 + 0.5;
    let glowR = 50 + pulse * 40;

    // Ground beacon ring
    noFill();
    for (let ring = 3; ring >= 0; ring--) {
      stroke(...z.color, 40 + ring * 20 - pulse * 20);
      strokeWeight(3 - ring * 0.5);
      ellipse(z.x, 490, glowR * 2 - ring * 12, 28 - ring * 4);
    }

    // Sign above
    fill(...z.color, 220);
    noStroke();
    rect(z.x - 60, 95, 120, 36, 8);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(13);
    textStyle(BOLD);
    text(z.label, z.x, 113);
    textStyle(NORMAL);

    // Entrance arch
    stroke(...z.color, 100 + pulse * 80);
    strokeWeight(2);
    noFill();
    arc(z.x, 340, 120, 220, PI, 0);
  }
}

function drawPlayer() {
  let px = player.x;
  let py = player.y;

  // Walk animation
  player.walkTimer++;
  if (player.walkTimer > 8) {
    player.walkFrame = (player.walkFrame + 1) % 4;
    player.walkTimer = 0;
  }
  let bobY = player.walkFrame % 2 === 0 ? 0 : -3;

  // Shadow
  fill(0, 0, 0, 40);
  noStroke();
  ellipse(px, py + player.h / 2 + 4, player.w + 8, 10);

  push();
  translate(px, py + bobY);
  scale(player.facing, 1);

  // Body (simple pixel-art style character)
  // Shoes
  fill(60, 50, 80);
  rect(-10, 20, 10, 8, 2);
  rect(2, 20, 10, 8, 2);

  // Legs
  fill(80, 110, 200);
  rect(-10, 4, 9, 18, 2);
  rect(2, 4, 9, 18, 2);

  // Torso (yellow shirt)
  fill(255, 200, 60);
  rect(-13, -20, 26, 26, 3);

  // Overalls strap
  fill(80, 110, 200);
  rect(-6, -20, 5, 26, 1);
  rect(2, -20, 5, 26, 1);

  // Arms
  fill(230, 180, 130);
  rect(-18, -18, 7, 20, 3);
  rect(12, -18, 7, 20, 3);

  // Head
  fill(230, 180, 130);
  ellipse(0, -30, 28, 28);

  // Hair
  fill(80, 50, 30);
  arc(0, -36, 28, 18, PI, 0);

  // Eyes
  fill(40);
  ellipse(-5, -30, 5, 5);
  ellipse(5, -30, 5, 5);

  // Smile
  noFill();
  stroke(80, 40, 20);
  strokeWeight(1.5);
  arc(0, -26, 10, 6, 0, PI);

  // Cap
  noStroke();
  fill(220, 60, 60);
  rect(-14, -44, 28, 14, 3, 3, 0, 0);
  rect(-18, -34, 36, 5, 2);

  pop();
}

function updatePlayer() {
  let moving = false;
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    player.x -= player.speed;
    player.facing = -1;
    moving = true;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    player.x += player.speed;
    player.facing = 1;
    moving = true;
  }
  if (!moving) player.walkFrame = 0;

  player.x = constrain(player.x, 40, storeWidth - 40);
}

function updateCamera() {
  let targetCam = player.x - width / 2;
  targetCam = constrain(targetCam, 0, storeWidth - width);
  camX = lerp(camX, targetCam, 0.08);
}

function checkZones() {
  for (let z of zones) {
    if (z.done || z.triggered) continue;
    let dist = abs(player.x - z.x);
    if (dist < 55) {
      z.triggered = true;
      currentMiniGame = z.id;
      // Show prompt
      showHint("Press SPACE or ENTER to enter the " + z.label + " aisle");
    } else if (dist >= 80) {
      z.triggered = false;
    }
  }
}

function drawStoreHUD() {
  // Progress bar
  fill(255, 255, 255, 200);
  noStroke();
  rect(20, 16, 200, 24, 8);
  fill(...C.accent, 200);
  rect(20, 16, map(completedCount, 0, zones.length, 0, 200), 24, 8);
  fill(...C.dark);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Progress: " + completedCount + " / " + zones.length, 28, 28);

  // H hint reminder
  fill(255, 255, 255, 160);
  noStroke();
  rect(width - 100, 16, 82, 26, 8);
  fill(...C.muted);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("H = hint", width - 59, 29);
}

// ============================================================
//  MINI-GAME ROUTER
// ============================================================
function drawMiniGame() {
  if (currentMiniGame === "memory") drawMemory();
  else if (currentMiniGame === "overload") drawOverload();
  else if (currentMiniGame === "navigation") drawNavigationGame();
  else if (currentMiniGame === "decision") drawDecision();
}

// ============================================================
//  MINI-GAME 1: MEMORY CHALLENGE
// ============================================================
function initMemory() {
  let pool = [
    "Apples",
    "Bread",
    "Eggs",
    "Milk",
    "Bananas",
    "Cheese",
    "Yogurt",
    "Butter",
    "Cereal",
    "Juice",
  ];
  memory.shown = shuffle(pool).slice(0, 5);
  memory.selected = [];
  memory.phase = "show";
  memory.showTimer = memory.showDuration;
  memory.result = null;
  memory.hintUsed = false;
}

function drawMemory() {
  background(245, 248, 255);

  // Title area
  drawMiniGameHeader(
    "🧠 Memory Challenge",
    "Remember what's on your list, then find the items.",
  );

  if (memory.phase === "show") {
    // Show the list with a countdown bar
    let progress = memory.showTimer / memory.showDuration;
    memory.showTimer--;

    // Progress bar (time remaining)
    fill(230, 235, 245);
    noStroke();
    rect(120, 100, width - 240, 10, 5);
    fill(...C.accent);
    rect(120, 100, (width - 240) * progress, 10, 5);

    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(15);
    text("Memorize these items — they'll disappear soon!", width / 2, 120);

    let cols = Math.ceil(memory.shown.length / 2);
    let startX = width / 2 - (cols * 110) / 2;

    for (let i = 0; i < memory.shown.length; i++) {
      let row = Math.floor(i / cols);
      let col = i % cols;
      let ix = startX + col * 130;
      let iy = 165 + row * 90;

      fill(255, 255, 255);
      stroke(200, 210, 230);
      strokeWeight(1);
      rect(ix - 50, iy - 30, 110, 60, 10);

      noStroke();
      fill(...C.dark);
      textAlign(CENTER, CENTER);
      textSize(14);
      textStyle(BOLD);
      text(memory.shown[i], ix, iy);
      textStyle(NORMAL);
    }

    if (memory.showTimer <= 0) {
      memory.phase = "input";
    }
  } else if (memory.phase === "input") {
    fill(...C.dark);
    textAlign(CENTER, TOP);
    textSize(15);
    text("Select all the items that were on your list.", width / 2, 105);
    textSize(13);
    fill(...C.muted);
    text(
      "(" +
        memory.selected.length +
        " selected — pick " +
        memory.shown.length +
        ")",
      width / 2,
      128,
    );

    // All possible items to pick from
    let allItems = shuffle([
      "Apples",
      "Bread",
      "Eggs",
      "Milk",
      "Bananas",
      "Cheese",
      "Yogurt",
      "Butter",
      "Cereal",
      "Juice",
    ]);
    let cols = 5;
    let startX = 60;

    for (let i = 0; i < allItems.length; i++) {
      let row = Math.floor(i / cols);
      let col = i % cols;
      let ix = startX + col * 158;
      let iy = 170 + row * 80;

      let isSelected = memory.selected.includes(allItems[i]);
      let isWasShown = memory.shown.includes(allItems[i]);

      if (memory.result !== null) {
        // Result: color code
        if (isSelected && isWasShown)
          fill(130, 220, 150); // correct
        else if (isSelected && !isWasShown)
          fill(240, 120, 120); // wrong pick
        else if (!isSelected && isWasShown)
          fill(255, 220, 100); // missed
        else fill(245, 245, 250);
      } else {
        fill(isSelected ? [...C.accent, 200] : [255, 255, 255]);
      }

      stroke(isSelected ? C.accent : [200, 210, 230]);
      strokeWeight(isSelected ? 2 : 1);
      rect(ix, iy - 24, 140, 48, 10);

      noStroke();
      fill(isSelected ? 255 : C.dark);
      textAlign(CENTER, CENTER);
      textSize(14);
      text(allItems[i], ix + 70, iy);
    }

    // Submit button
    if (memory.result === null && memory.selected.length > 0) {
      drawButton("✓ Done", width / 2, 490, 160, 46, C.green);
    }

    if (memory.result !== null) {
      drawResultBanner(memory.result);
      drawButton("Continue →", width / 2, 530, 200, 46, C.accent);
    }
  }

  drawBackButton();
}

function handleMemoryClick(mx, my) {
  if (memory.phase === "input" && memory.result === null) {
    // Check item clicks
    let allItems = shuffle([
      "Apples",
      "Bread",
      "Eggs",
      "Milk",
      "Bananas",
      "Cheese",
      "Yogurt",
      "Butter",
      "Cereal",
      "Juice",
    ]);
    let cols = 5;
    let startX = 60;

    for (let i = 0; i < allItems.length; i++) {
      let row = Math.floor(i / cols);
      let col = i % cols;
      let ix = startX + col * 158;
      let iy = 170 + row * 80;

      if (mx > ix && mx < ix + 140 && my > iy - 24 && my < iy + 24) {
        let item = allItems[i];
        if (memory.selected.includes(item)) {
          memory.selected = memory.selected.filter((s) => s !== item);
        } else {
          memory.selected.push(item);
        }
        return;
      }
    }

    // Submit button
    if (my > 467 && my < 513 && mx > width / 2 - 80 && mx < width / 2 + 80) {
      checkMemoryResult();
    }
  }

  if (memory.result !== null) {
    if (my > 507 && my < 553) finishMiniGame("memory");
  }
}

function checkMemoryResult() {
  let correct = 0;
  for (let item of memory.selected) {
    if (memory.shown.includes(item)) correct++;
  }
  let missed = memory.shown.length - correct;
  memory.result = { correct, missed, total: memory.shown.length };
}

// ============================================================
//  MINI-GAME 2: OVERSTIMULATION
// ============================================================
function initOverload() {
  let items = [
    "🍕 Pizza",
    "🥤 Soda",
    "🍫 Chocolate",
    "🥜 Peanut Butter",
    "🍪 Cookies",
    "🥣 Granola",
    "🍿 Popcorn",
    "🧃 Juice",
  ];
  overload.target = random(items);
  overload.options = shuffle(items.slice());
  overload.timeLeft = 420;
  overload.phase = "play";
  overload.result = null;
  overload.selected = null;
  overload.flashTimer = 0;
  overload.noiseOffset = random(1000);
}

function drawOverload() {
  // Chaotic flickering background — simulates sensory overload
  let flicker = sin(frameCount * 0.4) * 0.5 + 0.5;
  let bgR = 245 + noise(frameCount * 0.02) * 10;
  let bgG = 240 + noise(frameCount * 0.02 + 5) * 10;
  let bgB = 230 + noise(frameCount * 0.02 + 10) * 10;
  background(bgR, bgG, bgB);

  // Random flashing distractors if still playing
  if (overload.phase === "play" && overload.result === null) {
    overload.timeLeft--;
    let urgency = 1 - overload.timeLeft / 420;

    // Flashing dots / noise as urgency increases
    for (let i = 0; i < urgency * 30; i++) {
      let dx = random(width);
      let dy = random(height);
      fill(random(255), random(255), random(255), random(30, 100));
      noStroke();
      ellipse(dx, dy, random(5, 20));
    }

    // Wobble effect on grid positions
    overload.noiseOffset += 0.015;
  }

  drawMiniGameHeader(
    "😵 Sensory Overload",
    'Find "' + overload.target + '" as fast as you can.',
  );

  // Timer bar
  let timeProgress = overload.timeLeft / 420;
  fill(230, 235, 245);
  noStroke();
  rect(120, 96, width - 240, 10, 5);
  let barColor =
    timeProgress > 0.5 ? C.green : timeProgress > 0.25 ? C.yellow : C.red;
  fill(...barColor);
  rect(120, 96, (width - 240) * timeProgress, 10, 5);

  let cols = 4;
  let rows = 2;
  let cellW = 178,
    cellH = 90;
  let startX = (width - cols * cellW) / 2;
  let startY = 140;

  for (let i = 0; i < overload.options.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;

    // Wobble the position a little more over time
    let urgency = 1 - overload.timeLeft / 420;
    let wobX =
      overload.result === null
        ? noise(i * 30 + overload.noiseOffset) * urgency * 12 - urgency * 6
        : 0;
    let wobY =
      overload.result === null
        ? noise(i * 30 + overload.noiseOffset + 100) * urgency * 8 - urgency * 4
        : 0;

    let bx = startX + col * cellW + wobX;
    let by = startY + row * cellH + wobY;

    // Random color flicker on cells (distracting)
    let cellHue =
      overload.result === null
        ? color(
            200 + noise(frameCount * 0.1 + i) * 55,
            200 + noise(frameCount * 0.08 + i + 5) * 55,
            200 + noise(frameCount * 0.12 + i + 10) * 55,
          )
        : color(245, 245, 250);

    if (overload.result !== null) {
      let item = overload.options[i];
      if (item === overload.target) cellHue = color(...C.green, 180);
      else if (item === overload.selected) cellHue = color(...C.red, 180);
    }

    fill(cellHue);
    stroke(220, 225, 235);
    strokeWeight(1);
    rect(bx, by, cellW - 12, cellH - 12, 10);

    noStroke();
    fill(
      overload.result !== null
        ? C.dark
        : [30 + noise(i + frameCount * 0.05) * 40, 30, 60],
    );
    textAlign(CENTER, CENTER);
    textSize(overload.result === null ? 14 + urgency * 2 : 14);
    text(overload.options[i], bx + (cellW - 12) / 2, by + (cellH - 12) / 2);
  }

  if (overload.timeLeft <= 0 && overload.result === null) {
    overload.result = { success: false, timeout: true };
  }

  if (overload.result !== null) {
    drawResultBanner(
      overload.result.success ? { correct: 1, total: 1 } : { timeout: true },
    );
    drawButton("Continue →", width / 2, 530, 200, 46, C.accent);
  }

  drawBackButton();
}

function handleOverloadClick(mx, my) {
  if (overload.result !== null) {
    if (my > 507 && my < 553) finishMiniGame("overload");
    return;
  }

  let cols = 4;
  let cellW = 178,
    cellH = 90;
  let startX = (width - cols * cellW) / 2;
  let startY = 140;

  for (let i = 0; i < overload.options.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let bx = startX + col * cellW;
    let by = startY + row * cellH;

    if (mx > bx && mx < bx + cellW - 12 && my > by && my < by + cellH - 12) {
      overload.selected = overload.options[i];
      overload.result = { success: overload.options[i] === overload.target };
      return;
    }
  }
}

// ============================================================
//  MINI-GAME 3: NAVIGATION CONFUSION
// ============================================================
function initNavigation() {
  // Confusing signs with wrong/similar labels
  let correct = "Dairy";
  let confusing = [
    "Dary",
    "Daily",
    "Daisy",
    "Aisle 7",
    "Aisle 4",
    "Laundry",
    "Bakery",
    "Frozen",
    "Produce",
    "Deli",
  ];
  let pool = shuffle(confusing).slice(0, 7);
  pool.push(correct);
  pool = shuffle(pool);

  navigation.signs = pool.map((label) => ({
    label,
    correct: label === correct,
  }));
  navigation.selected = null;
  navigation.result = null;
  navigation.phase = "play";
}

function drawNavigationGame() {
  background(240, 235, 225);

  // Draw a confusing aisle scene
  // Floor stripes
  for (let x = 0; x < width; x += 40) {
    fill(x % 80 === 0 ? 230 : 222, 225, 215);
    noStroke();
    rect(x, 320, 40, height - 320);
  }

  // Walls
  fill(200, 195, 185);
  rect(0, 80, width, 240);

  // Signs hanging from ceiling — some are blurry/overlapping to simulate confusion
  drawMiniGameHeader(
    "😕 Where do I go?",
    'Find the "Dairy" aisle. Some signs are misleading...',
  );

  let signW = 90,
    signH = 50;
  let cols = 4;
  let startX = 50;

  for (let i = 0; i < navigation.signs.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let sx = startX + col * (signW + 30);
    let sy = 115 + row * 90;

    let s = navigation.signs[i];

    // Signs sway subtly (distracting)
    let sway = s.correct ? 0 : sin(frameCount * 0.04 + i * 1.2) * 3;

    if (navigation.result !== null) {
      if (s.correct) fill(130, 220, 150);
      else if (i === navigation.selected) fill(240, 120, 120);
      else fill(220, 215, 205);
    } else {
      // Slightly different tints to confuse
      fill(220 + ((i * 3) % 20), 215 + ((i * 2) % 15), 200 + ((i * 5) % 25));
    }

    stroke(160, 155, 140);
    strokeWeight(1.5);
    rect(sx + sway, sy, signW, signH, 5);

    // Sign string
    stroke(100, 90, 80);
    strokeWeight(1);
    line(sx + signW / 2 + sway, sy, sx + signW / 2 + sway, sy - 20);

    noStroke();
    fill(navigation.result !== null ? C.dark : [40 + (i % 3) * 30, 40, 60]);
    textAlign(CENTER, CENTER);

    // Some signs have garbled font sizes to simulate reading difficulty
    textSize(s.correct || navigation.result !== null ? 14 : 11 + (i % 3) * 2);
    textStyle(s.correct && navigation.result === null ? BOLD : NORMAL);
    text(s.label, sx + signW / 2 + sway, sy + signH / 2);
    textStyle(NORMAL);
  }

  if (navigation.result !== null) {
    drawResultBanner(
      navigation.result.success
        ? { correct: 1, total: 1 }
        : { correct: 0, total: 1 },
    );
    drawButton("Continue →", width / 2, 530, 200, 46, C.accent);
  }

  drawBackButton();
}

function handleNavigationClick(mx, my) {
  if (navigation.result !== null) {
    if (my > 507 && my < 553) finishMiniGame("navigation");
    return;
  }

  let signW = 90,
    signH = 50;
  let cols = 4;
  let startX = 50;

  for (let i = 0; i < navigation.signs.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let sx = startX + col * (signW + 30);
    let sy = 115 + row * 90;

    if (mx > sx && mx < sx + signW && my > sy && my < sy + signH) {
      navigation.selected = i;
      navigation.result = { success: navigation.signs[i].correct };
      return;
    }
  }
}

// ============================================================
//  MINI-GAME 4: DECISION FATIGUE
// ============================================================
function initDecision() {
  decision.milks = [
    { label: "Whole Milk\n3.25% fat\n2L", price: "$3.99", correct: false },
    { label: "Skim Milk\n0% fat\n2L", price: "$3.49", correct: false },
    { label: "2% Milk\n2% fat\n2L", price: "$3.79", correct: true },
    { label: "Lactose Free\nWhole\n2L", price: "$5.29", correct: false },
    { label: "Oat Milk\nOrganic\n1.75L", price: "$6.49", correct: false },
    { label: "Almond Milk\nUnsweetened", price: "$4.99", correct: false },
    { label: "2% Milk\n2% fat\n4L", price: "$5.49", correct: false },
    { label: "Chocolate\nMilk 2%\n1L", price: "$3.29", correct: false },
  ];
  decision.target = "2% Milk, 2L";
  decision.selected = null;
  decision.result = null;
  decision.panicked = false;
  decision.panicTimer = 0;
}

function drawDecision() {
  // Cooler aisle background
  drawImageProper(milkAisleImg);

  // Semi-transparent overlay
  fill(245, 248, 255, 210);
  noStroke();
  rect(0, 0, width, height);

  drawMiniGameHeader(
    "😰 Decision Fatigue",
    'Alex needs "' + decision.target + '". There are SO many options...',
  );

  // Panic timer increases as time goes on — shows increasing anxiety
  if (decision.result === null) {
    decision.panicTimer++;
    if (decision.panicTimer > 200) decision.panicked = true;
  }

  // Panic overlay (simulates anxiety building up)
  if (decision.panicked && decision.result === null) {
    let panicAlpha = map(decision.panicTimer, 200, 500, 0, 40);
    fill(220, 60, 60, panicAlpha);
    noStroke();
    rect(0, 0, width, height);

    // Vignette
    let grad = drawingContext.createRadialGradient(
      width / 2,
      height / 2,
      100,
      width / 2,
      height / 2,
      500,
    );
    grad.addColorStop(0, "rgba(220,60,60,0)");
    grad.addColorStop(1, "rgba(220,60,60," + panicAlpha / 255 + ")");
    drawingContext.fillStyle = grad;
    drawingContext.fillRect(0, 0, width, height);
    drawingContext.fillStyle = "#000";
  }

  let cols = 4;
  let cellW = 190,
    cellH = 100;
  let startX = (width - cols * cellW) / 2;
  let startY = 140;

  for (let i = 0; i < decision.milks.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let mx2 = startX + col * cellW;
    let my2 = startY + row * cellH;

    let m = decision.milks[i];

    if (decision.result !== null) {
      if (m.correct) fill(130, 220, 150, 220);
      else if (i === decision.selected) fill(240, 120, 120, 220);
      else fill(255, 255, 255, 160);
    } else {
      fill(255, 255, 255, 200);
    }

    stroke(180, 200, 220);
    strokeWeight(1.5);
    rect(mx2 + 4, my2 + 4, cellW - 16, cellH - 16, 8);

    // Small carton icon (using our asset scaled down)
    image(milkCarton1, mx2 + 8, my2 + 12, 28, 44);

    noStroke();
    fill(...C.dark);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(m.label, mx2 + 42, my2 + 28);
    fill(...C.muted);
    textSize(12);
    text(m.price, mx2 + 42, my2 + 68);
  }

  // Anxiety message
  if (decision.panicked && decision.result === null) {
    fill(220, 60, 60, 200);
    noStroke();
    rect(0, height - 80, width, 80);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(
      "💭 So many options... which one is right? I can't think...",
      width / 2,
      height - 42,
    );
  }

  if (decision.result !== null) {
    drawResultBanner(
      decision.result.success
        ? { correct: 1, total: 1 }
        : { correct: 0, total: 1 },
    );
    drawButton("Continue →", width / 2, 530, 200, 46, C.accent);
  }

  drawBackButton();
}

function handleDecisionClick(mx, my) {
  if (decision.result !== null) {
    if (my > 507 && my < 553) finishMiniGame("decision");
    return;
  }

  let cols = 4;
  let cellW = 190,
    cellH = 100;
  let startX = (width - cols * cellW) / 2;
  let startY = 140;

  for (let i = 0; i < decision.milks.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let bx = startX + col * cellW + 4;
    let by = startY + row * cellH + 4;

    if (mx > bx && mx < bx + cellW - 16 && my > by && my < by + cellH - 16) {
      decision.selected = i;
      decision.result = { success: decision.milks[i].correct };
      return;
    }
  }
}

// ============================================================
//  DEBRIEF SCREEN (shown after each mini-game)
// ============================================================
let debriefData = {
  memory: {
    emoji: "🧠",
    title: "What Alex experiences",
    body: "For many people with intellectual disabilities, short-term memory works differently. Keeping a list in your head — while navigating a busy store — can be genuinely exhausting and stressful.",
    reflection: "Try doing this every time you shop.",
  },
  overload: {
    emoji: "😵",
    title: "Sensory overload is real",
    body: "Bright lights, sounds, and too much visual information can make it very hard to focus. What feels like a simple task can become overwhelming when your brain processes sensory input differently.",
    reflection: "The chaos you felt for 10 seconds... imagine that every day.",
  },
  navigation: {
    emoji: "😕",
    title: "Reading & wayfinding",
    body: "Similar-looking words and inconsistent signage can make navigation confusing for people with reading difficulties. A simple trip to buy milk can require a lot of guesswork.",
    reflection: "Good signage design can change someone's whole day.",
  },
  decision: {
    emoji: "😰",
    title: "Too many choices",
    body: "Decision fatigue is felt by everyone, but it hits harder when decision-making is already a cognitive challenge. More options don't mean better outcomes — for Alex, they can mean paralysis.",
    reflection:
      "A familiar routine and fewer choices can make independence possible.",
  },
};

function drawDebrief() {
  background(245, 248, 255);

  let d = debriefData[currentMiniGame] || {};

  // Emoji
  textAlign(CENTER, TOP);
  textSize(56);
  text(d.emoji || "✨", width / 2, 60);

  // Title
  fill(...C.dark);
  textSize(24);
  textStyle(BOLD);
  text(d.title || "Reflection", width / 2, 130);
  textStyle(NORMAL);

  // Body
  fill(80, 88, 110);
  textSize(16);
  textLeading(26);
  text(d.body || "", width / 2, 210, width - 160);

  // Reflection callout box
  fill(80, 150, 255, 20);
  stroke(80, 150, 255, 60);
  strokeWeight(1.5);
  rect(80, 360, width - 160, 70, 10);
  noStroke();
  fill(...C.accent);
  textSize(14);
  textStyle(ITALIC);
  text('"' + (d.reflection || "") + '"', width / 2, 395, width - 200);
  textStyle(NORMAL);

  let buttonLabel =
    completedCount >= zones.length
      ? "See how Alex feels →"
      : "Back to the store →";
  drawButton(buttonLabel, width / 2, 490, 260, 50, C.accent);
}

function handleDebriefClick(mx, my) {
  if (my > 465 && my < 515) {
    if (completedCount >= zones.length) {
      transitionTo("win");
    } else {
      transitionTo("store");
    }
  }
}

// ============================================================
//  WIN SCREEN
// ============================================================
function drawWin() {
  // Warm gradient
  for (let y = 0; y < height; y++) {
    let t = y / height;
    stroke(lerp(60, 120, t), lerp(80, 180, t), lerp(56, 80, t));
    line(0, y, width, y);
  }

  // Floating particles
  noStroke();
  for (let i = 0; i < 30; i++) {
    let px = (frameCount * (i * 0.3 + 0.5)) % width;
    let py = height - ((frameCount * (0.4 + i * 0.1) + i * 60) % height);
    fill(255, 255, 255, 60 + sin(frameCount * 0.05 + i) * 40);
    ellipse(px, py, 8);
  }

  textAlign(CENTER, CENTER);
  fill(255);
  textSize(48);
  textStyle(BOLD);
  text("You did it! 🎉", width / 2, 120);
  textStyle(NORMAL);

  fill(200, 240, 200);
  textSize(18);
  text("Alex made it through the store.", width / 2, 185);

  // Message cards
  let messages = [
    "Every day brings these small battles.",
    "For Alex, this is the grocery store.",
    "For others, it might be a classroom, an office,",
    "or just navigating a busy street.",
    "Empathy means imagining that experience —",
    "and then doing something about it.",
  ];

  fill(255, 255, 255, 180);
  noStroke();
  rect(80, 220, width - 160, 220, 12);

  fill(40, 56, 40);
  textSize(16);
  textLeading(28);
  text(messages.join("\n"), width / 2, 330);

  // Play again
  drawButton("Play Again", width / 2, 505, 180, 48, [255, 255, 255]);
}

function handleWinClick(mx, my) {
  if (my > 481 && my < 529) {
    // Reset everything
    completedCount = 0;
    player.x = 300;
    camX = 0;
    for (let z of zones) {
      z.done = false;
      z.triggered = false;
    }
    dialogue.index = 0;
    dialogue.visible = true;
    transitionTo("intro");
  }
}

// ============================================================
//  HELPER: finish a mini-game & go to debrief
// ============================================================
function finishMiniGame(id) {
  let z = zones.find((z) => z.id === id);
  if (z && !z.done) {
    z.done = true;
    completedCount++;
  }
  transitionTo("debrief");
}

// ============================================================
//  SHARED UI HELPERS
// ============================================================
function drawMiniGameHeader(title, subtitle) {
  fill(255, 255, 255, 240);
  noStroke();
  rect(0, 0, width, 88);
  stroke(220, 225, 235);
  strokeWeight(1);
  line(0, 88, width, 88);

  noStroke();
  fill(...C.dark);
  textAlign(LEFT, CENTER);
  textSize(20);
  textStyle(BOLD);
  text(title, 20, 30);
  textStyle(NORMAL);
  fill(...C.muted);
  textSize(13);
  text(subtitle, 20, 64);
}

function drawButton(label, bx, by, bw, bh, col) {
  let hovered =
    mouseX > bx - bw / 2 &&
    mouseX < bx + bw / 2 &&
    mouseY > by - bh / 2 &&
    mouseY < by + bh / 2;

  fill(...col, hovered ? 240 : 200);
  noStroke();
  rect(bx - bw / 2, by - bh / 2, bw, bh, 10);

  fill(255);
  if (col[0] > 220) fill(30, 36, 56); // dark text on light button
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  text(label, bx, by);
  textStyle(NORMAL);
  cursor(hovered ? HAND : ARROW);
}

function drawDialogueBox(txt, bx, by) {
  fill(30, 36, 56, 220);
  noStroke();
  rect(bx - 320, by - 55, 640, 100, 14);

  // Avatar circle
  fill(80, 150, 255);
  ellipse(bx - 270, by - 5, 50, 50);
  fill(255);
  textSize(22);
  textAlign(CENTER, CENTER);
  text("😊", bx - 270, by - 5);

  fill(255);
  textSize(17);
  textAlign(LEFT, CENTER);
  text(txt, bx - 240, by - 5);
}

function drawResultBanner(result) {
  let isSuccess = result && result.correct > 0 && !result.timeout;
  fill(isSuccess ? [...C.green, 220] : [...C.red, 220]);
  noStroke();
  rect(0, 450, width, 60);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);

  if (result && result.timeout) {
    text("⏱ Time ran out — it happens. The challenge is real.", width / 2, 480);
  } else if (isSuccess) {
    text("✓ Well done!", width / 2, 480);
  } else {
    text(
      "Not quite — but that's okay. This is genuinely hard.",
      width / 2,
      480,
    );
  }

  textStyle(NORMAL);
}

function drawBackButton() {
  fill(245, 245, 250);
  noStroke();
  rect(width - 110, 8, 100, 36, 8);
  fill(...C.muted);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("← Back", width - 60, 26);
}

function drawImageProper(img) {
  if (!img) return;
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

// ============================================================
//  INPUT HANDLING
// ============================================================
function mousePressed() {
  let mx = mouseX,
    my = mouseY;

  // Back button (mini-games)
  if (gameState === "minigame") {
    if (mx > width - 110 && mx < width - 10 && my > 8 && my < 44) {
      transitionTo("store");
      return;
    }
  }

  switch (gameState) {
    case "intro":
      if (dialogue.visible && dialogue.index < dialogue.lines.length - 1) {
        dialogue.index++;
      } else if (dialogue.index >= dialogue.lines.length - 1) {
        dialogue.visible = false;
      } else {
        // Start button area
        if (
          mx > width / 2 - 100 &&
          mx < width / 2 + 100 &&
          my > 335 &&
          my < 385
        ) {
          transitionTo("tutorial");
        }
      }
      break;

    case "tutorial":
      // Let's Go button
      if (
        mx > width / 2 - 100 &&
        mx < width / 2 + 100 &&
        my > height - 95 &&
        my < height - 45
      ) {
        transitionTo("store");
      }
      break;

    case "store":
      // Enter zone on click / Space
      for (let z of zones) {
        if (z.triggered && !z.done) {
          currentMiniGame = z.id;
          transitionTo("minigame");
          return;
        }
      }
      break;

    case "minigame":
      if (currentMiniGame === "memory") handleMemoryClick(mx, my);
      if (currentMiniGame === "overload") handleOverloadClick(mx, my);
      if (currentMiniGame === "navigation") handleNavigationClick(mx, my);
      if (currentMiniGame === "decision") handleDecisionClick(mx, my);
      break;

    case "debrief":
      handleDebriefClick(mx, my);
      break;

    case "win":
      handleWinClick(mx, my);
      break;
  }
}

function keyPressed() {
  // H = hint
  if (key === "h" || key === "H") {
    let hints = {
      store:
        "Walk right to find the glowing aisles. Step into one to start a challenge!",
      minigame:
        currentMiniGame === "memory"
          ? "Try to connect each item to something familiar — chunking helps!"
          : currentMiniGame === "overload"
            ? "Try to focus on just the text. Block out the movement."
            : currentMiniGame === "navigation"
              ? "Look carefully — the correct sign is spelled correctly."
              : currentMiniGame === "decision"
                ? "Alex needs 2% Milk in a 2L jug. Look for both details."
                : "",
    };
    showHint(hints[gameState] || "Keep going — you're doing great!");
    return;
  }

  // SPACE or ENTER = enter zone
  if ((key === " " || keyCode === ENTER) && gameState === "store") {
    for (let z of zones) {
      if (z.triggered && !z.done) {
        currentMiniGame = z.id;
        transitionTo("minigame");
        return;
      }
    }
  }

  // ENTER on intro = advance dialogue
  if (keyCode === ENTER && gameState === "intro") {
    if (dialogue.index < dialogue.lines.length - 1) {
      dialogue.index++;
    } else {
      dialogue.visible = false;
    }
  }
}

// ============================================================
//  UTILS
// ============================================================
function shuffle(arr) {
  let a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
