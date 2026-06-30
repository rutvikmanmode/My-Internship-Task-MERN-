const scoreElements = document.querySelectorAll(".score-num");
const healthElement = document.querySelector(".health-num");
const waveElement = document.querySelector(".wave-num");
const comboElement = document.querySelector(".combo-num");
const boostElement = document.querySelector(".boost-num");
const bestScoreElement = document.querySelector(".best-score");
const statusTextElement = document.querySelector(".status-text");
const dashStatusElement = document.querySelector(".dash-status");
const resultSummaryElement = document.querySelector(".result-summary");
const resultModeElement = document.querySelector(".result-mode");
const startGameButton = document.querySelector(".start-game-btn");
const resultOverlay = document.querySelector(".result");
const soundIcon = document.querySelector(".sound-btn");
const mutedIcon = document.querySelector(".muted-btn");
const audioToggle = document.querySelector(".audio-toggle");
const authLockElement = document.querySelector(".auth-lock");
const canvas = document.querySelector(".canvas");
const context = canvas.getContext("2d");

const storageKeys = {
  bestScore: "zombieRushBestScore",
};

const comboWindowMs = 2500;
const dashCooldownMs = 6000;
const dashDurationMs = 220;
const furyDurationMs = 6500;

function getGameApiBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get("apiBaseUrl");
  const storedValue = window.localStorage.getItem("gameApiBaseUrl");
  const fallbackValue = `${window.location.protocol}//${window.location.hostname}:5000`;

  if (queryValue) {
    window.localStorage.setItem("gameApiBaseUrl", queryValue);
    return queryValue;
  }

  if (storedValue) {
    return storedValue;
  }

  return fallbackValue;
}

function getAuthHeaders(extra) {
  var token = "";
  try { token = localStorage.getItem("gameAuthToken") || ""; } catch (e) { token = ""; }
  var headers = Object.assign({}, extra || {});
  if (token) { headers["Authorization"] = "Bearer " + token; }
  return headers;
}

async function submitZombieRushScore(score) {
  const normalizedScore = Math.max(0, Math.floor(Number(score) || 0));

  if (!normalizedScore) {
    return null;
  }

  const response = await fetch(`${getGameApiBaseUrl()}/api/game/tasks/submit-game-score`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      game: "zombie-rush",
      score: normalizedScore,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Failed to sync Zombie Rush score");
  }

  return data;
}

async function requireGameSignIn() {
  try {
    const response = await fetch(`${getGameApiBaseUrl()}/api/game/auth/me`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    return Boolean(response.ok && data?.success);
  } catch {
    return false;
  }
}

const keysPressed = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  arrowup: false,
  arrowleft: false,
  arrowdown: false,
  arrowright: false,
};

const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
};

const sounds = {
  background: createAudio("audio/backgroundSound.mp3", true),
  shoot: createAudio("audio/shot-and-reload.mp3"),
  kill: createAudio("audio/killed_zombie.mp3"),
  bite: createAudio("audio/zombieEat.mp3"),
};

const world = {
  animationId: null,
  enemySpawnTimer: null,
  running: false,
  muted: false,
  frameTick: 0,
  score: 0,
  bestScore: Number(window.localStorage.getItem(storageKeys.bestScore) || 0),
  wave: 1,
  kills: 0,
  health: 100,
  combo: 1,
  maxCombo: 1,
  comboExpiresAt: 0,
  dashReadyAt: 0,
  dashActiveUntil: 0,
  fireCooldownUntil: 0,
  boostType: null,
  boostExpiresAt: 0,
  lastDamageAt: 0,
  scoreSubmitted: false,
  player: null,
  enemies: [],
  projectiles: [],
  particles: [],
  pickups: [],
};

resizeCanvas();
updateBestScore();
setStatus("Arena offline");

class Player {
  constructor() {
    this.width = 96;
    this.height = 96;
    this.baseSpeed = 3.2;
    this.position = {
      x: canvas.width / 2 - this.width / 2,
      y: canvas.height / 2 - this.height / 2,
    };
    this.frame = 0;
    this.currentSpriteKey = "stand";
    this.rotation = 0;
    this.sprite = {
      stand: {
        image: createImage("img/playerSpriteIdle.png"),
        cropWidth: 313,
        cropHeight: 207,
        frameCount: 20,
      },
      move: {
        image: createImage("img/playerSpriteMove.png"),
        cropWidth: 313,
        cropHeight: 206,
        frameCount: 20,
      },
      reload: {
        image: createImage("img/playerSpriteReload.png"),
        cropWidth: 322,
        cropHeight: 217,
        frameCount: 20,
      },
      shoot: {
        image: createImage("img/playerSpriteShoot.png"),
        cropWidth: 312,
        cropHeight: 206,
        frameCount: 3,
      },
    };
  }

  get center() {
    return {
      x: this.position.x + this.width / 2,
      y: this.position.y + this.height / 2,
    };
  }

  get gunPoint() {
    const center = this.center;
    return {
      x: center.x + Math.cos(this.rotation) * 34,
      y: center.y + Math.sin(this.rotation) * 34,
    };
  }

  move() {
    const horizontal = Number(keysPressed.d || keysPressed.arrowright) - Number(keysPressed.a || keysPressed.arrowleft);
    const vertical = Number(keysPressed.s || keysPressed.arrowdown) - Number(keysPressed.w || keysPressed.arrowup);

    if (!horizontal && !vertical) {
      if (this.currentSpriteKey === "move") {
        this.currentSpriteKey = "stand";
        this.frame = 0;
      }
      return;
    }

    const magnitude = Math.hypot(horizontal, vertical) || 1;
    const speedMultiplier = isDashActive() ? 2.4 : 1;
    const velocityX = (horizontal / magnitude) * this.baseSpeed * speedMultiplier;
    const velocityY = (vertical / magnitude) * this.baseSpeed * speedMultiplier;

    this.position.x = clamp(this.position.x + velocityX, 12, canvas.width - this.width - 12);
    this.position.y = clamp(this.position.y + velocityY, 96, canvas.height - this.height - 20);

    if (isDashActive() && world.frameTick % 2 === 0) {
      world.particles.push(
        new Particle(
          this.center,
          {
            x: (Math.random() - 0.5) * 2.4,
            y: (Math.random() - 0.5) * 2.4,
          },
          2 + Math.random() * 2,
          "rgba(255, 223, 99, 0.8)",
          0.05,
        ),
      );
    }

    if (this.currentSpriteKey !== "shoot" && this.currentSpriteKey !== "reload") {
      this.currentSpriteKey = "move";
    }
  }

  updateAim() {
    const center = this.center;
    this.rotation = Math.atan2(mouse.y - center.y, mouse.x - center.x);
  }

  shoot() {
    if (!world.running) {
      return;
    }

    const now = performance.now();
    if (now < world.fireCooldownUntil) {
      return;
    }

    const origin = this.gunPoint;
    const furyActive = isBoostActive("fury");
    const projectileSpeed = furyActive ? 10.5 : 8.8;
    const spread = furyActive ? 0.1 : 0;
    const projectileCount = furyActive ? 2 : 1;

    for (let index = 0; index < projectileCount; index += 1) {
      const angleOffset = projectileCount === 1 ? 0 : spread * (index === 0 ? -1 : 1);
      const rotation = this.rotation + angleOffset;
      const velocity = {
        x: Math.cos(rotation) * projectileSpeed,
        y: Math.sin(rotation) * projectileSpeed,
      };

      world.projectiles.push(new Projectile(origin, velocity, rotation, furyActive ? 2 : 1));
    }

    world.fireCooldownUntil = now + (furyActive ? 120 : 240);
    this.currentSpriteKey = "shoot";
    this.frame = 0;
    createMuzzleFlash(origin);

    if (!world.muted) {
      sounds.shoot.currentTime = 0;
      sounds.shoot.volume = 0.45;
      sounds.shoot.playbackRate = furyActive ? 1.95 : 1.7;
      sounds.shoot.play().catch(() => {});
    }
  }

  draw() {
    const sprite = this.sprite[this.currentSpriteKey];
    const center = this.center;

    if (isDashActive()) {
      context.save();
      context.fillStyle = "rgba(255, 223, 99, 0.14)";
      context.beginPath();
      context.arc(center.x, center.y, 38, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.save();
    context.translate(center.x, center.y);
    context.rotate(this.rotation);
    context.drawImage(
      sprite.image,
      sprite.cropWidth * this.frame,
      0,
      sprite.cropWidth,
      sprite.cropHeight,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    context.restore();
  }

  animateSprite() {
    const sprite = this.sprite[this.currentSpriteKey];

    if (world.frameTick % 4 !== 0) {
      return;
    }

    this.frame += 1;

    if (this.currentSpriteKey === "shoot" && this.frame >= sprite.frameCount) {
      this.currentSpriteKey = "reload";
      this.frame = 0;
      return;
    }

    if (this.currentSpriteKey === "reload" && this.frame >= this.sprite.reload.frameCount) {
      const moving = isMovementKeyActive();
      this.currentSpriteKey = moving ? "move" : "stand";
      this.frame = 0;
      return;
    }

    if (this.frame >= sprite.frameCount) {
      this.frame = 0;
    }
  }

  update() {
    this.move();
    this.updateAim();
    this.animateSprite();
    this.draw();
  }
}

class Projectile {
  constructor(position, velocity, rotation, damage) {
    this.width = 14;
    this.height = 4;
    this.position = { ...position };
    this.velocity = velocity;
    this.rotation = rotation;
    this.damage = damage;
    this.image = createImage("img/projectile.png");
  }

  update() {
    context.save();
    context.translate(this.position.x, this.position.y);
    context.rotate(this.rotation);
    context.drawImage(this.image, 0, 0, 30, 8, -2, -2, this.width, this.height);
    context.restore();

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }

  get isOutOfBounds() {
    return (
      this.position.x < -30 ||
      this.position.x > canvas.width + 30 ||
      this.position.y < -30 ||
      this.position.y > canvas.height + 30
    );
  }
}

class Enemy {
  constructor(type, position, speedScale) {
    const blueprint = getEnemyBlueprint(type);

    this.type = type;
    this.width = blueprint.width;
    this.height = blueprint.height;
    this.position = position;
    this.baseSpeed = blueprint.speed * speedScale;
    this.rotation = 0;
    this.frame = 0;
    this.image = createImage(blueprint.image);
    this.frameWidth = blueprint.frameWidth;
    this.sourceX = blueprint.sourceX;
    this.sourceY = blueprint.sourceY;
    this.sourceWidth = blueprint.sourceWidth;
    this.sourceHeight = blueprint.sourceHeight;
    this.frameCount = blueprint.frameCount;
    this.radius = blueprint.radius;
    this.health = blueprint.health;
    this.damage = blueprint.damage;
    this.scoreValue = blueprint.scoreValue;
    this.aura = blueprint.aura;
    this.glow = blueprint.glow;
  }

  get center() {
    return {
      x: this.position.x + this.width / 2,
      y: this.position.y + this.height / 2,
    };
  }

  update() {
    const target = world.player.center;
    const center = this.center;
    const angle = Math.atan2(target.y - center.y, target.x - center.x);
    this.rotation = angle;

    const dashSlowdown = isDashActive() && Math.hypot(target.x - center.x, target.y - center.y) < 120 ? 0.75 : 1;
    this.position.x += Math.cos(angle) * this.baseSpeed * dashSlowdown;
    this.position.y += Math.sin(angle) * this.baseSpeed * dashSlowdown;

    if (world.frameTick % 5 === 0) {
      this.frame = (this.frame + 1) % this.frameCount;
    }

    if (this.aura) {
      context.save();
      context.fillStyle = this.aura;
      context.beginPath();
      context.arc(center.x, center.y, this.radius + 14, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.save();
    context.translate(center.x, center.y);
    context.rotate(this.rotation);
    context.drawImage(
      this.image,
      this.frame * this.frameWidth + this.sourceX,
      this.sourceY,
      this.sourceWidth,
      this.sourceHeight,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
    );
    context.restore();

    if (this.glow && this.health > 1) {
      context.save();
      context.strokeStyle = this.glow;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(center.x, center.y, this.radius + 8, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }
}

class Particle {
  constructor(position, velocity, radius, color, fadeStep = 0.02) {
    this.position = { ...position };
    this.velocity = velocity;
    this.radius = radius;
    this.color = color;
    this.alpha = 1;
    this.fadeStep = fadeStep;
  }

  update() {
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;
    this.alpha -= this.fadeStep;
  }
}

class Pickup {
  constructor(type, position) {
    this.type = type;
    this.position = position;
    this.radius = 20;
    this.spawnedAt = performance.now();
    this.lifetimeMs = 9000;
  }

  get isExpired() {
    return performance.now() - this.spawnedAt > this.lifetimeMs;
  }

  update() {
    const age = performance.now() - this.spawnedAt;
    const pulse = 1 + Math.sin(age / 180) * 0.14;
    const color = this.type === "fury" ? "#ff9b3d" : "#7dff88";
    const core = this.type === "fury" ? "#ffdf63" : "#d8ffe0";

    context.save();
    context.globalAlpha = this.isExpired ? 0.2 : 0.9;
    context.fillStyle = color;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius * pulse, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = core;
    context.beginPath();
    context.arc(this.position.x, this.position.y, (this.radius - 7) * pulse, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(25, 7, 15, 0.78)";
    context.font = "700 13px Rajdhani";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(this.type === "fury" ? "F" : "+", this.position.x, this.position.y + 1);
    context.restore();
  }
}

function getEnemyBlueprint(type) {
  if (type === "runner") {
    return {
      image: "img/zombieSpriterun.png",
      width: 86,
      height: 50,
      speed: 2.15,
      radius: 18,
      health: 1,
      damage: 10,
      scoreValue: 135,
      frameWidth: 256,
      sourceX: 95,
      sourceY: 100,
      sourceWidth: 85,
      sourceHeight: 50,
      frameCount: 32,
      aura: "rgba(255, 155, 61, 0.08)",
      glow: null,
    };
  }

  if (type === "brute") {
    return {
      image: "img/zombieSpritewalk.png",
      width: 118,
      height: 72,
      speed: 1.18,
      radius: 26,
      health: 3,
      damage: 22,
      scoreValue: 260,
      frameWidth: 256,
      sourceX: 95,
      sourceY: 100,
      sourceWidth: 85,
      sourceHeight: 50,
      frameCount: 32,
      aura: "rgba(174, 0, 33, 0.12)",
      glow: "rgba(255, 223, 99, 0.55)",
    };
  }

  return {
    image: "img/zombieSpritewalk.png",
    width: 90,
    height: 54,
    speed: 1.45,
    radius: 18,
    health: 1,
    damage: 15,
    scoreValue: 100,
    frameWidth: 256,
    sourceX: 95,
    sourceY: 100,
    sourceWidth: 85,
    sourceHeight: 50,
    frameCount: 32,
    aura: null,
    glow: null,
  };
}

function createImage(path) {
  const image = new Image();
  image.src = path;
  return image;
}

function createAudio(path, loop = false) {
  const audio = new Audio(path);
  audio.loop = loop;
  audio.preload = "auto";
  return audio;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isMovementKeyActive() {
  return Object.values(keysPressed).some(Boolean);
}

function isDashActive() {
  return performance.now() < world.dashActiveUntil;
}

function isBoostActive(type) {
  return world.boostType === type && performance.now() < world.boostExpiresAt;
}

function updateBestScore() {
  bestScoreElement.textContent = `Best ${world.bestScore}`;
}

function setStatus(message) {
  statusTextElement.textContent = message;
}

function updateDashStatus() {
  const remaining = Math.max(0, world.dashReadyAt - performance.now());
  dashStatusElement.textContent = remaining ? `Dash ${Math.ceil(remaining / 1000)}s` : "Dash Ready";
}

function updateHud() {
  scoreElements.forEach((element) => {
    element.textContent = String(world.score);
  });
  healthElement.textContent = String(Math.max(0, Math.ceil(world.health)));
  waveElement.textContent = String(world.wave);
  comboElement.textContent = `${world.combo}x`;
  boostElement.textContent = isBoostActive("fury") ? "Fury" : "None";
  updateDashStatus();
  updateBestScore();
}

function resetWorld() {
  cancelAnimationFrame(world.animationId);
  clearInterval(world.enemySpawnTimer);

  world.running = false;
  world.frameTick = 0;
  world.score = 0;
  world.wave = 1;
  world.kills = 0;
  world.health = 100;
  world.combo = 1;
  world.maxCombo = 1;
  world.comboExpiresAt = 0;
  world.dashReadyAt = 0;
  world.dashActiveUntil = 0;
  world.fireCooldownUntil = 0;
  world.boostType = null;
  world.boostExpiresAt = 0;
  world.lastDamageAt = 0;
  world.scoreSubmitted = false;
  world.enemies = [];
  world.projectiles = [];
  world.particles = [];
  world.pickups = [];
  world.player = new Player();
  mouse.x = canvas.width / 2;
  mouse.y = canvas.height / 2;
  updateHud();
}

function updateWave() {
  const previousWave = world.wave;
  world.wave = Math.floor(world.kills / 8) + 1;

  if (world.wave !== previousWave) {
    beginEnemySpawner();
    spawnWaveBurst(world.wave);
    setStatus(`Wave ${world.wave} engaged`);

    if (world.wave % 3 === 0) {
      spawnPickup("medkit");
    }
  }
}

function chooseEnemyType() {
  const roll = Math.random();

  if (world.wave >= 5 && roll < 0.18) {
    return "brute";
  }

  if (world.wave >= 3 && roll < 0.46) {
    return "runner";
  }

  return "walker";
}

function spawnEnemy(type = chooseEnemyType()) {
  const side = Math.floor(Math.random() * 4);
  const padding = 120;
  const position = { x: 0, y: 0 };

  if (side === 0) {
    position.x = -padding;
    position.y = Math.random() * canvas.height;
  } else if (side === 1) {
    position.x = canvas.width + padding;
    position.y = Math.random() * canvas.height;
  } else if (side === 2) {
    position.x = Math.random() * canvas.width;
    position.y = -padding;
  } else {
    position.x = Math.random() * canvas.width;
    position.y = canvas.height + padding;
  }

  const speedScale = Math.min(1 + world.wave * 0.05 + Math.random() * 0.16, 1.95);
  world.enemies.push(new Enemy(type, position, speedScale));
}

function beginEnemySpawner() {
  clearInterval(world.enemySpawnTimer);
  world.enemySpawnTimer = window.setInterval(() => {
    if (!world.running) {
      return;
    }

    const spawnCount = world.wave >= 6 && Math.random() < 0.22 ? 2 : 1;
    for (let index = 0; index < spawnCount; index += 1) {
      spawnEnemy();
    }
  }, Math.max(280, 980 - (world.wave - 1) * 58));
}

function createExplosion(position, palette = ["#ffdf63", "#ae0021"]) {
  for (let index = 0; index < 16; index += 1) {
    world.particles.push(
      new Particle(
        position,
        {
          x: (Math.random() - 0.5) * 4.4,
          y: (Math.random() - 0.5) * 4.4,
        },
        1 + Math.random() * 3,
        palette[index % palette.length],
      ),
    );
  }
}

function createMuzzleFlash(position) {
  for (let index = 0; index < 6; index += 1) {
    world.particles.push(
      new Particle(
        position,
        {
          x: (Math.random() - 0.5) * 2.8,
          y: (Math.random() - 0.5) * 2.8,
        },
        1.8 + Math.random() * 1.2,
        index % 2 === 0 ? "#ffdf63" : "#ffffff",
        0.06,
      ),
    );
  }
}

function spawnWaveBurst(wave) {
  const extra = Math.min(2 + Math.floor(wave / 2), 5);
  for (let index = 0; index < extra; index += 1) {
    const type = wave >= 5 && index === extra - 1 ? "brute" : chooseEnemyType();
    spawnEnemy(type);
  }
}

function spawnPickup(type) {
  const safePaddingX = 140;
  const safePaddingY = 160;
  const position = {
    x: safePaddingX + Math.random() * Math.max(160, canvas.width - safePaddingX * 2),
    y: safePaddingY + Math.random() * Math.max(120, canvas.height - safePaddingY * 2),
  };

  world.pickups.push(new Pickup(type, position));
}

function maybeSpawnReward(enemy) {
  if (enemy.type === "brute") {
    spawnPickup(Math.random() < 0.55 ? "fury" : "medkit");
    return;
  }

  if (world.kills > 0 && world.kills % 12 === 0) {
    spawnPickup(Math.random() < 0.58 ? "fury" : "medkit");
  }
}

function addScore(baseValue) {
  const scoredPoints = baseValue * world.combo;
  world.score += scoredPoints;
}

function registerKill(enemy) {
  const previousWave = world.wave;
  const now = performance.now();

  world.kills += 1;
  world.combo = Math.min(world.combo + 1, 5);
  world.maxCombo = Math.max(world.maxCombo, world.combo);
  world.comboExpiresAt = now + comboWindowMs;
  addScore(enemy.scoreValue);
  updateWave();
  maybeSpawnReward(enemy);
  createExplosion(enemy.center, enemy.type === "brute" ? ["#ffdf63", "#ff9b3d", "#ae0021"] : ["#ffdf63", "#ae0021"]);
  updateHud();

  if (!world.muted) {
    sounds.kill.currentTime = 0;
    sounds.kill.volume = 0.45;
    sounds.kill.play().catch(() => {});
  }

  if (world.wave !== previousWave) {
    updateHud();
  }
}

function applyDamage(amount) {
  const now = performance.now();
  if (isDashActive() || now - world.lastDamageAt < 420) {
    return;
  }

  world.lastDamageAt = now;
  world.health = Math.max(0, world.health - amount);
  world.combo = 1;
  world.comboExpiresAt = 0;
  updateHud();

  if (!world.muted) {
    sounds.bite.currentTime = 0;
    sounds.bite.volume = 0.25;
    sounds.bite.play().catch(() => {});
  }

  if (world.health <= 0) {
    endGame();
  } else {
    setStatus("Zombie contact detected");
  }
}

function tryDash() {
  if (!world.running) {
    return false;
  }

  const now = performance.now();
  if (now < world.dashReadyAt) {
    return false;
  }

  world.dashReadyAt = now + dashCooldownMs;
  world.dashActiveUntil = now + dashDurationMs;
  createExplosion(world.player.center, ["#ffdf63", "#ffffff"]);
  setStatus("Dash burn engaged");
  updateHud();
  return true;
}

function drawArena() {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#4f1631");
  gradient.addColorStop(0.42, "#381124");
  gradient.addColorStop(1, "#19070f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = "rgba(255, 223, 99, 0.07)";
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 54) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 54) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.restore();

  context.fillStyle = "rgba(255, 223, 99, 0.03)";
  for (let index = 0; index < 6; index += 1) {
    const radius = 80 + index * 55;
    context.beginPath();
    context.arc(canvas.width * 0.72, canvas.height * 0.22, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(174, 0, 33, 0.06)";
  context.fillRect(0, canvas.height * 0.18, canvas.width, 2);
  context.fillStyle = "rgba(255, 244, 220, 0.025)";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function handleProjectileHits() {
  world.projectiles = world.projectiles.filter((projectile) => {
    if (projectile.isOutOfBounds) {
      return false;
    }

    let collided = false;

    world.enemies = world.enemies.filter((enemy) => {
      const distance = Math.hypot(projectile.position.x - enemy.center.x, projectile.position.y - enemy.center.y);

      if (distance <= enemy.radius + 8) {
        collided = true;
        enemy.health -= projectile.damage;

        if (enemy.health <= 0) {
          registerKill(enemy);
          return false;
        }

        createExplosion(enemy.center, ["#ff9b3d", "#ffdf63"]);
      }

      return true;
    });

    return !collided;
  });
}

function handleEnemyCollisions() {
  world.enemies.forEach((enemy) => {
    const distance = Math.hypot(world.player.center.x - enemy.center.x, world.player.center.y - enemy.center.y);
    if (distance <= enemy.radius + 22) {
      applyDamage(enemy.damage);
    }
  });
}

function handleParticles() {
  world.particles = world.particles.filter((particle) => {
    particle.update();
    return particle.alpha > 0;
  });
}

function handlePickups() {
  world.pickups = world.pickups.filter((pickup) => {
    pickup.update();

    if (pickup.isExpired) {
      return false;
    }

    const distance = Math.hypot(world.player.center.x - pickup.position.x, world.player.center.y - pickup.position.y);
    if (distance > pickup.radius + 28) {
      return true;
    }

    if (pickup.type === "medkit") {
      world.health = Math.min(100, world.health + 30);
      setStatus("Medkit secured");
    } else if (pickup.type === "fury") {
      world.boostType = "fury";
      world.boostExpiresAt = performance.now() + furyDurationMs;
      setStatus("Fury core online");
    }

    createExplosion(pickup.position, pickup.type === "fury" ? ["#ffdf63", "#ff9b3d"] : ["#7dff88", "#d8ffe0"]);
    updateHud();
    return false;
  });
}

function handleComboDecay() {
  if (world.combo > 1 && performance.now() > world.comboExpiresAt) {
    world.combo = 1;
    updateHud();
  }
}

function handleBoostTimeout() {
  if (world.boostType && performance.now() > world.boostExpiresAt) {
    world.boostType = null;
    world.boostExpiresAt = 0;
    setStatus(`Wave ${world.wave} | ${world.enemies.length} undead closing in`);
    updateHud();
  }
}

function animate() {
  world.animationId = requestAnimationFrame(animate);
  world.frameTick += 1;

  drawArena();
  world.player.update();

  world.projectiles.forEach((projectile) => {
    projectile.update();
  });

  world.enemies.forEach((enemy) => {
    enemy.update();
  });

  handleProjectileHits();
  handleEnemyCollisions();
  handlePickups();
  handleParticles();
  handleComboDecay();
  handleBoostTimeout();

  if (world.frameTick % 90 === 0) {
    const mode = isBoostActive("fury") ? "Fury live" : `${world.enemies.length} undead closing in`;
    setStatus(`Wave ${world.wave} | ${mode}`);
    updateDashStatus();
  }

  sounds.background.volume = world.muted ? 0 : 0.08;
}

function startGame() {
  if (authLockElement && !authLockElement.hidden) {
    return;
  }

  resetWorld();
  world.running = true;
  resultOverlay.style.display = "none";
  resultModeElement.textContent = "Undead Protocol";
  resultSummaryElement.textContent = "Build your combo, burn dash to escape, and chase Fury drops from elite kills.";
  setStatus("Arena online");
  updateHud();
  beginEnemySpawner();
  spawnEnemy("walker");
  spawnEnemy("walker");
  spawnEnemy(world.wave >= 2 ? "runner" : "walker");

  if (!world.muted) {
    sounds.background.currentTime = 0;
    sounds.background.play().catch(() => {});
  }

  animate();
}

function endGame() {
  world.running = false;
  cancelAnimationFrame(world.animationId);
  clearInterval(world.enemySpawnTimer);
  sounds.background.pause();

  const baseSummary = `You reached wave ${world.wave} with a ${world.maxCombo}x peak chain.`;

  if (world.score > world.bestScore) {
    world.bestScore = world.score;
    window.localStorage.setItem(storageKeys.bestScore, String(world.bestScore));
    updateBestScore();
    resultModeElement.textContent = "New High Score";
    resultSummaryElement.textContent = `${baseSummary} You carved out a new record in the arena.`;
  } else {
    resultModeElement.textContent = "Run Complete";
    resultSummaryElement.textContent = `${baseSummary} Tighten your route, protect the combo, and grab drops sooner.`;
  }

  setStatus("Arena offline");
  updateHud();
  resultOverlay.style.display = "grid";

  if (!world.scoreSubmitted && world.score > 0) {
    world.scoreSubmitted = true;
    submitZombieRushScore(world.score)
      .then((data) => {
        if (data?.awardedCoins) {
          resultSummaryElement.textContent = `${resultSummaryElement.textContent} Wallet +${data.awardedCoins} coins.`;
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }
}

canvas.addEventListener("mousemove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

canvas.addEventListener("click", () => {
  if (world.running) {
    world.player.shoot();
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key in keysPressed) {
    keysPressed[key] = true;
  }

  if (key === "m") {
    toggleMute();
  }

  if (key === "shift") {
    tryDash();
  }

  if (key === " " && !world.running) {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key in keysPressed) {
    keysPressed[key] = false;
  }
});

window.addEventListener("resize", () => {
  const previousWidth = canvas.width;
  const previousHeight = canvas.height;
  resizeCanvas();

  if (world.player) {
    const xRatio = previousWidth ? world.player.position.x / previousWidth : 0.5;
    const yRatio = previousHeight ? world.player.position.y / previousHeight : 0.5;
    world.player.position.x = clamp(xRatio * canvas.width, 12, canvas.width - world.player.width - 12);
    world.player.position.y = clamp(yRatio * canvas.height, 96, canvas.height - world.player.height - 20);
  }
});

window.addEventListener("load", async () => {
  resultOverlay.style.display = "grid";

  try {
    const isAuthenticated = await requireGameSignIn();

    if (authLockElement) {
      authLockElement.hidden = isAuthenticated;
    }
  } catch (error) {
    if (authLockElement) {
      authLockElement.hidden = false;
    }
    console.error(error);
  }
});

function toggleMute() {
  world.muted = !world.muted;
  soundIcon.style.display = world.muted ? "none" : "block";
  mutedIcon.style.display = world.muted ? "block" : "none";

  if (world.muted) {
    sounds.background.pause();
  } else if (world.running) {
    sounds.background.play().catch(() => {});
  }
}

audioToggle.addEventListener("click", toggleMute);
startGameButton.addEventListener("click", startGame);

drawArena();
