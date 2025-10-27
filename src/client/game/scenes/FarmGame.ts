import { Scene } from 'phaser';
import type { GameInitResponse, LeaderboardEntry } from '../../../shared/types/api';

interface TileData {
  sprite: Phaser.GameObjects.Rectangle;
  cornEmoji: Phaser.GameObjects.Text;
  state: 'grown' | 'harvested';
  lastHarvested: number;
}

export class FarmGame extends Scene {
  private playerName: string = 'Loading...';
  private tractor: Phaser.GameObjects.Rectangle | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private cornCount: number = 0;
  private cornText: Phaser.GameObjects.Text | null = null;
  private playerNameText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  
  // Tractor scaling
  private tractorBaseScale: number = 0.06;
  private tractorCurrentScale: number = 0.06;
  private readonly TRACTOR_MAX_SCALE = 0.12;
  private readonly TRACTOR_SCALE_PER_CORN = 0.003;
  private readonly TRACTOR_SHRINK_RATE = 0.0002; // Per frame
  
  // Global game timer
  private gameTimeRemaining: number = 60; // 60 seconds
  private gameActive: boolean = false; // Wait for timer to be ACTIVE
  private gameState: 'WAITING' | 'ACTIVE' | 'ENDED' = 'WAITING';
  private waitTimeRemaining: number = 10;

  // Mobile controls
  private mobileControls: {
    up: Phaser.GameObjects.Rectangle | null;
    down: Phaser.GameObjects.Rectangle | null;
    left: Phaser.GameObjects.Rectangle | null;
    right: Phaser.GameObjects.Rectangle | null;
  } = { up: null, down: null, left: null, right: null };
  private activeDirections: Set<string> = new Set();

  private readonly TILE_SIZE = 24; // Smaller tiles
  private readonly GRID_WIDTH = 120; // More tiles
  private readonly GRID_HEIGHT = 120;
  private readonly TRACTOR_SPEED = 250;
  private readonly REGROW_TIME = 60000; // 60 seconds

  private tiles: TileData[][] = [];
  private camera: Phaser.Cameras.Scene2D.Camera | null = null;
  private leaderboard: LeaderboardEntry[] = [];

  // Multiplayer
  private otherPlayers: Map<string, {
    tractor: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
    nameText: Phaser.GameObjects.Text;
    cornText: Phaser.GameObjects.Text;
  }> = new Map();
  private lastPositionUpdate: number = 0;
  private lastPlayersFetch: number = 0;
  private lastTimerFetch: number = 0;
  private readonly POSITION_UPDATE_INTERVAL = 150; // Reduced from 200ms for lower latency
  private readonly PLAYERS_FETCH_INTERVAL = 400; // Reduced from 500ms for lower latency
  private readonly TIMER_FETCH_INTERVAL = 1000; // Fetch timer every 1 second
  private harvestedCorns: Set<string> = new Set(); // Track harvested corn: "x,y"
  private lastHarvestedCornsUpdate: number = 0;
  private readonly HARVESTED_CORNS_FETCH_INTERVAL = 300; // Fetch every 300ms

  constructor() {
    super('FarmGame');
  }

  init() {
    this.cornCount = 0;
    this.leaderboard = [];
    this.activeDirections.clear();
    this.gameTimeRemaining = 60;
    this.gameActive = false;
    this.gameState = 'WAITING';
    this.waitTimeRemaining = 10;
    this.tractorCurrentScale = 0.06;
    this.otherPlayers.clear();
    this.lastPositionUpdate = 0;
    this.lastPlayersFetch = 0;
    this.lastTimerFetch = 0;
    this.harvestedCorns.clear();
    this.lastHarvestedCornsUpdate = 0;
  }

  async create() {
    this.camera = this.cameras.main;
    
    // Background image
    if (this.textures.exists('background')) {
      const bg = this.add.image(0, 0, 'background');
      const worldWidth = this.GRID_WIDTH * this.TILE_SIZE;
      const worldHeight = this.GRID_HEIGHT * this.TILE_SIZE;
      // Tile the background to cover the entire farm world
      bg.setOrigin(0, 0);
      bg.setDisplaySize(worldWidth, worldHeight);
      bg.setDepth(-10);
    }
    
    this.camera.setBackgroundColor(0x2d5016);

    // Initialize game from server - WAIT for username
    try {
      await this.initializeGame();
      console.log('Game initialized with username:', this.playerName);
    } catch (err) {
      console.error('Failed to initialize game:', err);
      this.playerName = 'Player_' + Date.now().toString().slice(-6);
    }

    // Create the farm grid
    this.createFarmGrid();

    // Create the tractor (player)
    this.createTractor();

    // Set world bounds for physics
    const worldWidth = this.GRID_WIDTH * this.TILE_SIZE;
    const worldHeight = this.GRID_HEIGHT * this.TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Setup camera to follow tractor smoothly
    if (this.tractor && this.camera) {
      this.camera.startFollow(this.tractor, true, 0.08, 0.08);
      this.camera.setBounds(0, 0, worldWidth, worldHeight);
      this.camera.setZoom(1); // Default zoom level
    }

    // Create HUD
    this.createHUD();

    // Create mobile controls
    this.createMobileControls();

    // Setup controls
    this.cursors = this.input.keyboard?.createCursorKeys() || null;
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Handle resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.resize(gameSize.width, gameSize.height);
      this.updateHUDPosition();
      this.updateMobileControlsPosition();
    });
  }

  private async initializeGame(): Promise<void> {
    try {
      const response = await fetch('/api/game-init');
      if (!response.ok) throw new Error('Failed to initialize game');

      const data = (await response.json()) as GameInitResponse;
      this.playerName = data.username;
      // Don't load saved score - always start fresh
      this.cornCount = 0;
      this.leaderboard = data.leaderboard;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.playerName = 'Anonymous';
    }
  }

  override update(time: number, delta: number) {
    // Always update multiplayer and timer
    this.updateMultiplayer(time);
    
    // Only allow gameplay when ACTIVE
    if (this.gameState === 'ACTIVE' && this.gameActive) {
      this.handleMovement();
      this.checkHarvest();
      this.updateTileRegrowth();
      this.updateTractorLabels();
      this.updateTractorScale(delta);
    }
  }

  private updateTractorLabels(): void {
    if (!this.tractor) return;

    // Position player name above tractor
    if (this.playerNameText) {
      this.playerNameText.setPosition(this.tractor.x, this.tractor.y - 35);
    }

    // Position corn count below player name
    if (this.cornText) {
      this.cornText.setPosition(this.tractor.x, this.tractor.y - 20);
    }
  }

  private createFarmGrid(): void {
    // Create single grass background (much more efficient)
    const grassBg = this.add.rectangle(
      (this.GRID_WIDTH * this.TILE_SIZE) / 2,
      (this.GRID_HEIGHT * this.TILE_SIZE) / 2,
      this.GRID_WIDTH * this.TILE_SIZE,
      this.GRID_HEIGHT * this.TILE_SIZE,
      0x228b22 // Forest green for grass background
    );
    grassBg.setDepth(-1);

    // Create corn tiles with emojis
    for (let y = 0; y < this.GRID_HEIGHT; y++) {
      this.tiles[y] = [];
      const row = this.tiles[y];
      if (!row) continue;

      for (let x = 0; x < this.GRID_WIDTH; x++) {
        const posX = x * this.TILE_SIZE + this.TILE_SIZE / 2;
        const posY = y * this.TILE_SIZE + this.TILE_SIZE / 2;

        // Create tile background (will show green when harvested)
        const tile = this.add.rectangle(posX, posY, this.TILE_SIZE - 1, this.TILE_SIZE - 1, 0x32cd32);
        tile.setStrokeStyle(0.5, 0x228b22);
        tile.setDepth(0);

        // Add corn emoji on top
        const cornEmoji = this.add.text(posX, posY, '🌽', {
          fontSize: `${this.TILE_SIZE - 4}px`,
          align: 'center',
        });
        cornEmoji.setOrigin(0.5);
        cornEmoji.setDepth(1);

        row[x] = {
          sprite: tile,
          cornEmoji: cornEmoji,
          state: 'grown',
          lastHarvested: 0,
        };
      }
    }
  }

  private createTractor(): void {
    const startX = (this.GRID_WIDTH / 2) * this.TILE_SIZE;
    const startY = (this.GRID_HEIGHT / 2) * this.TILE_SIZE;

    // Try to use the tractor image if loaded, otherwise create a simple sprite
    let tractorSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

    if (this.textures.exists('tractor')) {
      console.log('Tractor texture found, creating sprite');
      tractorSprite = this.add.sprite(startX, startY, 'tractor');
      // Scale to fit approximately 32px tile size
      tractorSprite.setDisplaySize(32, 32);
      tractorSprite.setRotation(0); // Start facing up
      console.log('Tractor sprite created at', startX, startY, 'with size', tractorSprite.displayWidth, tractorSprite.displayHeight);
    } else {
      console.log('Tractor texture NOT found, using fallback rectangle');
      // Fallback: simple red rectangle
      tractorSprite = this.add.rectangle(startX, startY, 28, 28, 0xff4444) as any;
      (tractorSprite as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0x000000);
    }

    // Set depth to be above corn emojis (corn is at depth 1)
    tractorSprite.setDepth(10);

    // Store reference
    this.tractor = tractorSprite as any;

    // Enable physics
    this.physics.add.existing(tractorSprite);
    const body = tractorSprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(28, 28);
  }

  private createHUD(): void {
    const { width } = this.scale;

    // Create player name text that follows tractor - no background
    this.playerNameText = this.add
      .text(0, -35, this.playerName, {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: '14px',
        color: '#FFD85B',
        stroke: '#8C4A00',
        strokeThickness: 4,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#5B2E00',
          blur: 1,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(11);

    // Create corn count text that follows tractor - no background
    this.cornText = this.add
      .text(0, -20, `🌽 ${this.cornCount}`, {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: '16px',
        color: '#FFC33A',
        stroke: '#8C4A00',
        strokeThickness: 4,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#5B2E00',
          blur: 1,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(11);

    // Timer background
    const timerBg = this.add.graphics();
    timerBg.fillStyle(0x2d5016, 0.9);
    timerBg.fillRoundedRect(width - 120, 10, 110, 50, 10);
    timerBg.lineStyle(3, 0xffd700, 1);
    timerBg.strokeRoundedRect(width - 120, 10, 110, 50, 10);
    timerBg.setScrollFactor(0);
    timerBg.setDepth(100);

    // Timer text with farm theme
    this.timerText = this.add
      .text(width - 65, 35, '⏱️ 30', {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: '28px',
        color: '#FFC33A',
        align: 'center',
        stroke: '#8C4A00',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#5B2E00',
          blur: 1,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
  }

  private updateHUDPosition(): void {
    const { width } = this.scale;

    // Update timer position on resize
    if (this.timerText) {
      this.timerText.setPosition(width - 20, 20);
    }
  }

  private handleMovement(): void {
    if (!this.tractor) return;

    const body = this.tractor.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    let moving = false;
    let targetRotation = this.tractor.rotation; // Keep current rotation if not moving

    // Check keyboard and mobile controls
    const leftPressed = this.cursors?.left.isDown || this.wasd?.A.isDown || this.activeDirections.has('left');
    const rightPressed =
      this.cursors?.right.isDown || this.wasd?.D.isDown || this.activeDirections.has('right');
    const upPressed = this.cursors?.up.isDown || this.wasd?.W.isDown || this.activeDirections.has('up');
    const downPressed =
      this.cursors?.down.isDown || this.wasd?.S.isDown || this.activeDirections.has('down');

    // Handle movement and rotation for all 8 directions
    if (leftPressed && upPressed) {
      // Moving up-left (diagonal)
      body.setVelocityX(-this.TRACTOR_SPEED);
      body.setVelocityY(-this.TRACTOR_SPEED);
      targetRotation = -Math.PI * 0.75; // -135 degrees
      moving = true;
    } else if (rightPressed && upPressed) {
      // Moving up-right (diagonal)
      body.setVelocityX(this.TRACTOR_SPEED);
      body.setVelocityY(-this.TRACTOR_SPEED);
      targetRotation = Math.PI * 0.25; // 45 degrees
      moving = true;
    } else if (leftPressed && downPressed) {
      // Moving down-left (diagonal)
      body.setVelocityX(-this.TRACTOR_SPEED);
      body.setVelocityY(this.TRACTOR_SPEED);
      targetRotation = -Math.PI * 0.25; // -45 degrees (or 225 degrees)
      moving = true;
    } else if (rightPressed && downPressed) {
      // Moving down-right (diagonal)
      body.setVelocityX(this.TRACTOR_SPEED);
      body.setVelocityY(this.TRACTOR_SPEED);
      targetRotation = Math.PI * 0.75; // 135 degrees
      moving = true;
    } else if (leftPressed) {
      // Moving left
      body.setVelocityX(-this.TRACTOR_SPEED);
      targetRotation = -Math.PI * 0.5; // -90 degrees
      moving = true;
    } else if (rightPressed) {
      // Moving right
      body.setVelocityX(this.TRACTOR_SPEED);
      targetRotation = Math.PI * 0.5; // 90 degrees
      moving = true;
    } else if (upPressed) {
      // Moving up
      body.setVelocityY(-this.TRACTOR_SPEED);
      targetRotation = 0; // 0 degrees (original upright position)
      moving = true;
    } else if (downPressed) {
      // Moving down
      body.setVelocityY(this.TRACTOR_SPEED);
      targetRotation = Math.PI; // 180 degrees
      moving = true;
    }

    // Normalize diagonal movement
    if (moving && body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(this.TRACTOR_SPEED);
    }

    // Apply rotation to tractor
    if (moving) {
      this.tractor.setRotation(targetRotation);
    }
  }

  private checkHarvest(): void {
    if (!this.tractor) return;

    const tractorX = this.tractor.x;
    const tractorY = this.tractor.y;

    // Get tile coordinates
    const tileX = Math.floor(tractorX / this.TILE_SIZE);
    const tileY = Math.floor(tractorY / this.TILE_SIZE);

    // Check if valid tile
    if (tileX >= 0 && tileX < this.GRID_WIDTH && tileY >= 0 && tileY < this.GRID_HEIGHT) {
      const tileRow = this.tiles[tileY];
      if (!tileRow) return;

      const tile = tileRow[tileX];
      if (!tile) return;

      // Check if already harvested globally
      const cornKey = `${tileX},${tileY}`;
      if (this.harvestedCorns.has(cornKey)) {
        // Already harvested by someone
        tile.state = 'harvested';
        tile.cornEmoji.setVisible(false);
        return;
      }

      if (tile.state === 'grown') {
        // Harvest the tile
        tile.state = 'harvested';
        tile.lastHarvested = Date.now();

        // Hide corn emoji (harvested)
        tile.cornEmoji.setVisible(false);

        // Mark as harvested globally
        this.harvestedCorns.add(cornKey);
        this.notifyServerHarvest(tileX, tileY);

        // Increment corn count
        this.cornCount++;
        this.updateCornDisplay();
        
        // Grow tractor
        this.growTractor();

        // Visual feedback - pulse the tile
        this.tweens.add({
          targets: [tile.sprite, tile.cornEmoji],
          scaleX: 0.85,
          scaleY: 0.85,
          duration: 100,
          yoyo: true,
        });
      }
    }
  }

  private updateTileRegrowth(): void {
    const currentTime = Date.now();

    for (let y = 0; y < this.GRID_HEIGHT; y++) {
      const tileRow = this.tiles[y];
      if (!tileRow) continue;

      for (let x = 0; x < this.GRID_WIDTH; x++) {
        const tile = tileRow[x];
        if (!tile) continue;

        if (tile.state === 'harvested' && currentTime - tile.lastHarvested >= this.REGROW_TIME) {
          // Regrow the tile
          tile.state = 'grown';

          // Show corn emoji again
          tile.cornEmoji.setVisible(true);

          // Visual feedback - grow animation
          tile.cornEmoji.setScale(0);
          this.tweens.add({
            targets: tile.cornEmoji,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
          });
        }
      }
    }
  }

  private updateCornDisplay(): void {
    if (this.cornText) {
      this.cornText.setText(`🌽 ${this.cornCount}`);
    }
  }

  private createMobileControls(): void {
    // Only show controls on touch devices
    if (!this.sys.game.device.input.touch) {
      return;
    }

    const { width, height } = this.scale;
    const buttonSize = 70;
    const buttonGap = 15;
    const bottomMargin = 20;
    const rightMargin = 20;

    // D-pad center position (bottom-right, lower than before)
    const centerX = width - rightMargin - buttonSize * 1.5;
    const centerY = height - bottomMargin - buttonSize * 1.5;

    // Create arrow buttons with smooth design
    const createArrowButton = (x: number, y: number, direction: string, symbol: string) => {
      // Create rounded button background using graphics
      const graphics = this.add.graphics();
      graphics.fillStyle(0x4a7c2e, 0.85); // Dark grass green with transparency
      graphics.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
      graphics.lineStyle(3, 0xf4d03f, 1); // Golden border to match wheat
      graphics.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
      graphics.setPosition(x, y);
      graphics.setScrollFactor(0);
      graphics.setDepth(200);

      // Create interactive zone
      const button = this.add
        .rectangle(x, y, buttonSize, buttonSize, 0x000000, 0)
        .setScrollFactor(0)
        .setDepth(201)
        .setInteractive();

      // Add arrow symbol
      const text = this.add
        .text(x, y, symbol, {
          fontFamily: 'Arial Black',
          fontSize: '36px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(202);

      // Store graphics reference for color changes
      button.setData('graphics', graphics);
      button.setData('text', text);

      button.on('pointerdown', () => {
        this.activeDirections.add(direction);
        graphics.clear();
        graphics.fillStyle(0xf4d03f, 0.95); // Golden wheat color when pressed
        graphics.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
        graphics.lineStyle(3, 0xffd700, 1); // Bright gold border when pressed
        graphics.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
        text.setScale(1.1); // Slightly larger when pressed
      });

      button.on('pointerup', () => {
        this.activeDirections.delete(direction);
        graphics.clear();
        graphics.fillStyle(0x4a7c2e, 0.85);
        graphics.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
        graphics.lineStyle(3, 0xf4d03f, 1);
        graphics.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
        text.setScale(1);
      });

      button.on('pointerout', () => {
        this.activeDirections.delete(direction);
        graphics.clear();
        graphics.fillStyle(0x4a7c2e, 0.85);
        graphics.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
        graphics.lineStyle(3, 0xf4d03f, 1);
        graphics.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 15);
        text.setScale(1);
      });

      return button;
    };

    // Create D-pad
    this.mobileControls.up = createArrowButton(centerX, centerY - buttonSize - buttonGap, 'up', '▲');
    this.mobileControls.down = createArrowButton(centerX, centerY + buttonSize + buttonGap, 'down', '▼');
    this.mobileControls.left = createArrowButton(
      centerX - buttonSize - buttonGap,
      centerY,
      'left',
      '◀'
    );
    this.mobileControls.right = createArrowButton(
      centerX + buttonSize + buttonGap,
      centerY,
      'right',
      '▶'
    );
  }

  private updateMobileControlsPosition(): void {
    // Only update if controls exist (touch device)
    if (!this.mobileControls.up) return;

    const { width, height } = this.scale;
    const buttonSize = 70;
    const buttonGap = 15;
    const bottomMargin = 20;
    const rightMargin = 20;

    const centerX = width - rightMargin - buttonSize * 1.5;
    const centerY = height - bottomMargin - buttonSize * 1.5;

    // Update button positions
    if (this.mobileControls.up) {
      this.mobileControls.up.setPosition(centerX, centerY - buttonSize - buttonGap);
      const graphics = this.mobileControls.up.getData('graphics');
      const text = this.mobileControls.up.getData('text');
      if (graphics) graphics.setPosition(centerX, centerY - buttonSize - buttonGap);
      if (text) text.setPosition(centerX, centerY - buttonSize - buttonGap);
    }

    if (this.mobileControls.down) {
      this.mobileControls.down.setPosition(centerX, centerY + buttonSize + buttonGap);
      const graphics = this.mobileControls.down.getData('graphics');
      const text = this.mobileControls.down.getData('text');
      if (graphics) graphics.setPosition(centerX, centerY + buttonSize + buttonGap);
      if (text) text.setPosition(centerX, centerY + buttonSize + buttonGap);
    }

    if (this.mobileControls.left) {
      this.mobileControls.left.setPosition(centerX - buttonSize - buttonGap, centerY);
      const graphics = this.mobileControls.left.getData('graphics');
      const text = this.mobileControls.left.getData('text');
      if (graphics) graphics.setPosition(centerX - buttonSize - buttonGap, centerY);
      if (text) text.setPosition(centerX - buttonSize - buttonGap, centerY);
    }

    if (this.mobileControls.right) {
      this.mobileControls.right.setPosition(centerX + buttonSize + buttonGap, centerY);
      const graphics = this.mobileControls.right.getData('graphics');
      const text = this.mobileControls.right.getData('text');
      if (graphics) graphics.setPosition(centerX + buttonSize + buttonGap, centerY);
      if (text) text.setPosition(centerX + buttonSize + buttonGap, centerY);
    }
  }

  private updateTimerDisplay(): void {
    if (!this.timerText) return;
    
    if (this.gameState === 'WAITING') {
      this.timerText.setText(`⏳ Starting in ${this.waitTimeRemaining}s`);
      this.timerText.setColor('#FFC33A');
    } else if (this.gameState === 'ACTIVE') {
      const timeLeft = Math.max(0, Math.ceil(this.gameTimeRemaining));
      this.timerText.setText(`⏱️ ${timeLeft}s`);
      
      // Change color when time is running out
      if (timeLeft <= 10) {
        this.timerText.setColor('#ff4444');
      } else if (timeLeft <= 20) {
        this.timerText.setColor('#ff9944');
      } else {
        this.timerText.setColor('#FFC33A');
      }
    } else if (this.gameState === 'ENDED') {
      this.timerText.setText(`🏆 TIME'S UP!`);
      this.timerText.setColor('#FFD700');
    }
  }

  private updateTractorScale(delta: number): void {
    if (!this.tractor) return;
    
    // Shrink tractor slowly over time
    if (this.tractorCurrentScale > this.tractorBaseScale) {
      this.tractorCurrentScale -= this.TRACTOR_SHRINK_RATE * (delta / 16.67); // Normalize to 60fps
      this.tractorCurrentScale = Math.max(this.tractorBaseScale, this.tractorCurrentScale);
      this.tractor.setScale(this.tractorCurrentScale);
    }
  }

  private growTractor(): void {
    if (!this.tractor) return;
    
    // Increase tractor scale
    this.tractorCurrentScale += this.TRACTOR_SCALE_PER_CORN;
    this.tractorCurrentScale = Math.min(this.TRACTOR_MAX_SCALE, this.tractorCurrentScale);
    this.tractor.setScale(this.tractorCurrentScale);
    
    // Visual feedback - quick pulse
    this.tweens.add({
      targets: this.tractor,
      scaleX: this.tractorCurrentScale * 1.1,
      scaleY: this.tractorCurrentScale * 1.1,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        if (this.tractor) {
          this.tractor.setScale(this.tractorCurrentScale);
        }
      },
    });
  }

  private async endGame(): Promise<void> {
    this.gameActive = false;
    
    // Save final score to server
    try {
      console.log('Saving score:', this.cornCount);
      const saveResponse = await fetch('/api/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: this.cornCount }),
      });
      
      if (!saveResponse.ok) {
        console.error('Failed to save score:', await saveResponse.text());
      }
      
      // Wait a bit for the leaderboard to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch updated leaderboard
      console.log('Fetching leaderboard...');
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        this.leaderboard = await response.json();
        console.log('Leaderboard:', this.leaderboard);
      } else {
        console.error('Failed to fetch leaderboard:', await response.text());
      }
    } catch (error) {
      console.error('Failed to save score or fetch leaderboard:', error);
    }
    
    // Go to game over scene with score and leaderboard
    console.log('Starting GameOver scene with:', {
      score: this.cornCount,
      leaderboard: this.leaderboard,
      playerName: this.playerName,
    });
    
    this.scene.start('GameOver', {
      score: this.cornCount,
      leaderboard: this.leaderboard,
      playerName: this.playerName,
    });
  }

  // === MULTIPLAYER METHODS ===
  
  private updateMultiplayer(time: number): void {
    // Fetch global timer state
    if (time - this.lastTimerFetch > this.TIMER_FETCH_INTERVAL) {
      this.fetchGameTimer();
      this.lastTimerFetch = time;
    }

    // Send position during WAITING and ACTIVE states (so players can see each other)
    if (this.gameState === 'WAITING' || this.gameState === 'ACTIVE') {
      if (time - this.lastPositionUpdate > this.POSITION_UPDATE_INTERVAL) {
        this.sendPosition();
        this.lastPositionUpdate = time;
      }
    }

    // Fetch other players' positions
    if (time - this.lastPlayersFetch > this.PLAYERS_FETCH_INTERVAL) {
      this.fetchActivePlayers();
      this.lastPlayersFetch = time;
    }
    
    // Fetch harvested corns state
    if (time - this.lastHarvestedCornsUpdate > this.HARVESTED_CORNS_FETCH_INTERVAL) {
      this.fetchHarvestedCorns();
      this.lastHarvestedCornsUpdate = time;
    }
  }

  private async sendPosition(): Promise<void> {
    if (!this.tractor) return;

    try {
      const response = await fetch('/api/player-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: this.tractor.x,
          y: this.tractor.y,
          rotation: this.tractor.rotation,
          cornCount: this.cornCount,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to send position, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to send position:', error);
    }
  }

  private async fetchActivePlayers(): Promise<void> {
    try {
      const response = await fetch('/api/active-players');
      if (!response.ok) {
        console.error('Failed to fetch players, status:', response.status);
        return;
      }

      const data = await response.json() as { players: Array<{
        userId: string;
        username: string;
        x: number;
        y: number;
        rotation: number;
        cornCount: number;
      }> };

      console.log(`Fetched ${data.players.length} active players:`, data.players.map(p => p.username).join(', '));

      // Update or create player sprites
      const currentPlayerIds = new Set(data.players.map(p => p.userId));

      // Remove players who are no longer active
      for (const [playerId, playerObjs] of this.otherPlayers.entries()) {
        if (!currentPlayerIds.has(playerId)) {
          console.log('Removing player:', playerId);
          playerObjs.tractor.destroy();
          playerObjs.nameText.destroy();
          playerObjs.cornText.destroy();
          this.otherPlayers.delete(playerId);
        }
      }

      // Update or create players
      for (const player of data.players) {
        if (this.otherPlayers.has(player.userId)) {
          // Update existing player
          const playerObjs = this.otherPlayers.get(player.userId)!;
          playerObjs.tractor.setPosition(player.x, player.y);
          playerObjs.tractor.setRotation(player.rotation);
          playerObjs.nameText.setPosition(player.x, player.y - 35);
          playerObjs.nameText.setText(player.username);
          playerObjs.cornText.setPosition(player.x, player.y - 20);
          playerObjs.cornText.setText(`🌽 ${player.cornCount}`);
        } else {
          // Create new player
          console.log('Creating new player:', player.username, 'at', player.x, player.y);
          this.createOtherPlayer(player);
        }
      }
    } catch (error) {
      console.error('Failed to fetch active players:', error);
    }
  }

  private createOtherPlayer(player: {
    userId: string;
    username: string;
    x: number;
    y: number;
    rotation: number;
    cornCount: number;
  }): void {
    // Create tractor sprite
    let tractorSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

    if (this.textures.exists('tractor')) {
      tractorSprite = this.add.sprite(player.x, player.y, 'tractor');
      tractorSprite.setDisplaySize(32, 32);
      tractorSprite.setRotation(player.rotation);
    } else {
      tractorSprite = this.add.rectangle(player.x, player.y, 28, 28, 0x4444ff) as any;
      (tractorSprite as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0x000000);
    }

    tractorSprite.setDepth(9); // Just below own player
    tractorSprite.setAlpha(0.8); // Slightly transparent
    tractorSprite.setScrollFactor(1); // Scroll with world

    // Create name text
    const nameText = this.add.text(player.x, player.y - 35, player.username, {
      fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
      fontSize: '12px',
      color: '#88CCFF',
      stroke: '#004488',
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(11)
      .setScrollFactor(1); // Scroll with world

    // Create corn count text
    const cornText = this.add.text(player.x, player.y - 20, `🌽 ${player.cornCount}`, {
      fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
      fontSize: '14px',
      color: '#88DDFF',
      stroke: '#004488',
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(11)
      .setScrollFactor(1); // Scroll with world

    this.otherPlayers.set(player.userId, {
      tractor: tractorSprite,
      nameText,
      cornText,
    });
  }

  private async fetchGameTimer(): Promise<void> {
    try {
      const response = await fetch('/api/game-timer');
      if (!response.ok) return;

      const data = await response.json() as {
        state: 'WAITING' | 'ACTIVE' | 'ENDED';
        timeRemaining: number;
        waitTimeRemaining: number;
      };

      const previousState = this.gameState;
      this.gameState = data.state;
      this.gameTimeRemaining = data.timeRemaining;
      this.waitTimeRemaining = data.waitTimeRemaining;

      // State transitions
      if (previousState !== this.gameState) {
        console.log(`Game state changed: ${previousState} -> ${this.gameState}`);

        if (this.gameState === 'ACTIVE' && previousState === 'WAITING') {
          // Game just started!
          this.gameActive = true;
          console.log('Game is now ACTIVE! Start harvesting!');
        } else if (this.gameState === 'ENDED' && previousState === 'ACTIVE') {
          // Game just ended!
          this.gameActive = false;
          console.log('Game ENDED! Going to leaderboard...');
          this.endGame();
        }
      }

      // Update timer display
      this.updateTimerDisplay();
    } catch (error) {
      console.error('Failed to fetch game timer:', error);
    }
  }

  private async fetchHarvestedCornPositions(): Promise<void> {
    try {
      const response = await fetch('/api/harvested-corn');
      if (!response.ok) {
        console.error('Failed to fetch harvested corn, status:', response.status);
        return;
      }

      const data = await response.json() as { harvestedCorn: Array<{ x: number; y: number }> };
      this.harvestedCorns.clear();
      for (const pos of data.harvestedCorn) {
        this.harvestedCorns.add(`${pos.x},${pos.y}`);
      }
      console.log('Fetched harvested corn positions:', this.harvestedCorns);
    } catch (error) {
      console.error('Failed to fetch harvested corn positions:', error);
    }
  }

  private async notifyServerHarvest(tileX: number, tileY: number): Promise<void> {
    try {
      const response = await fetch('/api/harvest-corn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: tileX, y: tileY }),
      });

      if (!response.ok) {
        console.error('Failed to notify server of harvest, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to notify server of harvest:', error);
    }
  }

  private async fetchHarvestedCorns(): Promise<void> {
    return this.fetchHarvestedCornPositions();
  }
}
