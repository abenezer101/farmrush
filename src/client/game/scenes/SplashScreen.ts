import { Scene } from 'phaser';

export class SplashScreen extends Scene {
  constructor() {
    super('SplashScreen');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    // Background image
    if (this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-1);
    } else {
      // Fallback color
      this.add.rectangle(width / 2, height / 2, width, height, 0x2d5016);
    }

    // Title
    this.add
      .text(width / 2, height * 0.3, ' FARM RUSH ', {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: Math.min(width / 10, 72) + 'px',
        color: '#FFC33A',
        stroke: '#8C4A00',
        strokeThickness: 10,
        shadow: {
          offsetX: 4,
          offsetY: 4,
          color: '#5B2E00',
          blur: 3,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, height * 0.45, 'Harvest the Farm!', {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: Math.min(width / 20, 32) + 'px',
        color: '#FFD85B',
        stroke: '#A85C1A',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#5B2E00',
          blur: 1,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Start button - enhanced farm-style design
    const buttonY = height * 0.6;
    const buttonWidth = Math.min(width * 0.6, 350);
    const buttonHeight = 70;
    
    // Button shadow
    const buttonGraphics = this.add.graphics();
    buttonGraphics.fillStyle(0x2d5016, 0.7);
    buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
    
    // Button main body
    buttonGraphics.fillStyle(0x8BC34A, 1);
    buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
    
    // Button border
    buttonGraphics.lineStyle(5, 0x558B2F, 1);
    buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
    
    // Inner shine
    buttonGraphics.lineStyle(2, 0xC5E1A5, 0.8);
    buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);

    const buttonText = this.add
      .text(width / 2, buttonY, '🚜 START FARMING 🌽', {
        fontFamily: '"Luckiest Guy", "Bangers", "Comic Sans MS", cursive',
        fontSize: Math.min(width / 20, 32) + 'px',
        color: '#ffffff',
        stroke: '#2E7D32',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#1B5E20',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const buttonZone = this.add.rectangle(width / 2, buttonY, buttonWidth, buttonHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    buttonZone.on('pointerover', () => {
      buttonText.setScale(1.05);
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x2d5016, 0.7);
      buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
      buttonGraphics.fillStyle(0x9CCC65, 1);
      buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(5, 0x689F38, 1);
      buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(2, 0xDCEDC8, 0.9);
      buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);
    });

    buttonZone.on('pointerout', () => {
      buttonText.setScale(1);
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x2d5016, 0.7);
      buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
      buttonGraphics.fillStyle(0x8BC34A, 1);
      buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(5, 0x558B2F, 1);
      buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(2, 0xC5E1A5, 0.8);
      buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);
    });

    buttonZone.on('pointerdown', () => {
      buttonText.setScale(0.95);
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x2d5016, 0.7);
      buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2 + 2, buttonY - buttonHeight / 2 + 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.fillStyle(0x7CB342, 1);
      buttonGraphics.fillRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(5, 0x558B2F, 1);
      buttonGraphics.strokeRoundedRect(width / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
    });

    buttonZone.on('pointerup', () => {
      buttonText.setScale(1);
      this.scene.start('LoadingScene');
    });

    buttonText.on('pointerup', () => {
        this.scene.start('LoadingScene');
      });

    // Controls hint with better styling
    this.add
      .text(width / 2, height * 0.8, 'Desktop: Arrow Keys or WASD\nMobile: On-screen controls', {
        fontFamily: '"Baloo Bhai 2", cursive',
        fontSize: Math.min(width / 35, 16) + 'px',
        color: '#FFE4B5',
        align: 'center',
        stroke: '#654321',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Handle resize
    this.scale.on('resize', () => {
      this.cameras.resize(this.scale.width, this.scale.height);
    });
  }
}
