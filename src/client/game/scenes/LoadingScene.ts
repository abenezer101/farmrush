import { Scene } from 'phaser';

export class LoadingScene extends Scene {
  private progressBar: Phaser.GameObjects.Rectangle | null = null;
  private progressText: Phaser.GameObjects.Text | null = null;
  private tipText: Phaser.GameObjects.Text | null = null;
  private currentProgress: number = 0;
  private currentTipIndex: number = 0;

  constructor() {
    super('LoadingScene');
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
      // Fallback to solid color if image not loaded
      this.add.rectangle(width / 2, height / 2, width, height, 0x2d5016);
    }
    
    // Semi-transparent overlay for better text readability
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    // Title with animation
    const title = this.add
      .text(width / 2, height * 0.3, ' FARM RUSH ', {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: '52px',
        color: '#FFC33A',
        stroke: '#8C4A00',
        strokeThickness: 8,
        shadow: {
          offsetX: 4,
          offsetY: 4,
          color: '#5B2E00',
          blur: 2,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Fade in title
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });

    // Loading bar background
    const barWidth = 400;
    const barHeight = 35;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    // Bar outline
    this.add.rectangle(barX - 3, barY - 3, barWidth + 6, barHeight + 6, 0xffd700).setOrigin(0, 0);
    this.add.rectangle(barX, barY, barWidth, barHeight, 0x1a3a0f).setOrigin(0, 0);

    // Loading bar fill
    this.progressBar = this.add.rectangle(barX + 2, barY + 2, 0, barHeight - 4, 0x8bc34a).setOrigin(0, 0);

    // Progress percentage text
    this.progressText = this.add
      .text(width / 2, barY + barHeight / 2, '0%', {
        fontFamily: 'Arial Black',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Loading tips that rotate
    const tips: string[] = [
      '🌽 Eat more corns to be on top!',
      '🚜 Your tractor grows as you collect corn!',
      '⏱️ You have 30 seconds to harvest!',
      '🏆 Beat other farmers to the top!',
      '💨 Keep moving to collect more corn!',
      '📈 Bigger tractor = more corn collected!',
      '⚡ Collect corn fast before you shrink!',
      '🎯 Aim for the highest score!',
    ];

    this.tipText = this.add
      .text(width / 2, height * 0.7, tips[0]!, {
        fontFamily: '"Baloo Bhai 2", "Luckiest Guy", "Comic Sans MS", cursive',
        fontSize: '22px',
        color: '#FFD85B',
        stroke: '#A85C1A',
        strokeThickness: 4,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#5B2E00',
          blur: 1,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Fade in first tip
    this.tweens.add({
      targets: this.tipText,
      alpha: 1,
      duration: 500,
      delay: 300,
    });

    // Rotate tips every 1.5 seconds
    this.time.addEvent({
      delay: 1500,
      callback: () => {
        this.currentTipIndex = (this.currentTipIndex + 1) % tips.length;
        if (this.tipText) {
          // Fade out
          this.tweens.add({
            targets: this.tipText,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              if (this.tipText) {
                this.tipText.setText(tips[this.currentTipIndex]!);
                // Fade in
                this.tweens.add({
                  targets: this.tipText,
                  alpha: 1,
                  duration: 300,
                });
              }
            },
          });
        }
      },
      loop: true,
    });

    // Simulate loading progress
    this.time.addEvent({
      delay: 50,
      callback: () => {
        this.currentProgress += 2;
        if (this.currentProgress > 100) this.currentProgress = 100;

        if (this.progressBar) {
          this.progressBar.width = ((barWidth - 4) * this.currentProgress) / 100;
        }

        if (this.progressText) {
          this.progressText.setText(`${this.currentProgress}%`);
        }

        if (this.currentProgress >= 100) {
          // Loading complete
          this.time.delayedCall(500, () => {
            this.scene.start('FarmGame');
          });
        }
      },
      repeat: 50,
    });

    // Handle resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.resize(gameSize.width, gameSize.height);
    });
  }
}
