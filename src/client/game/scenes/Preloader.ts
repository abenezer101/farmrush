import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;
    
    // Background - solid color during loading
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d5016);
    
    // Loading text with farm theme
    this.add.text(width / 2, height / 2 - 50, '🚜 Loading FarmRush... 🌽', {
      fontFamily: '"Luckiest Guy", "Baloo Bhai 2", cursive',
      fontSize: '36px',
      color: '#FFD85B',
      stroke: '#8C4A00',
      strokeThickness: 5,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#5B2E00',
        blur: 2,
        fill: true,
      },
    }).setOrigin(0.5);

    // Progress bar outline with rounded corners
    const outline = this.add.graphics();
    outline.lineStyle(3, 0xFFD700, 1);
    outline.strokeRoundedRect(width / 2 - 160, height / 2 + 10, 320, 32, 8);

    // Progress bar background
    const barBg = this.add.graphics();
    barBg.fillStyle(0x654321, 1);
    barBg.fillRoundedRect(width / 2 - 158, height / 2 + 12, 316, 28, 6);

    // Progress bar fill
    const bar = this.add.rectangle(width / 2 - 158, height / 2 + 26, 4, 24, 0x8BC34A);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 308 * progress;
    });
  }

  preload() {
    // Load game assets
    this.load.image('tractor', 'assets/tractor.png');
    this.load.image('background', 'assets/bg.png');
  }

  create() {
    this.scene.start('SplashScreen');
  }
}
