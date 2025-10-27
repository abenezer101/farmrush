import { Scene } from 'phaser';
import type { LeaderboardEntry } from '../../../shared/types/api';

export class GameOver extends Scene {
  private finalScore: number = 0;
  private leaderboard: LeaderboardEntry[] = [];
  private playerName: string = '';
  private waitTimeRemaining: number = 10;
  private buttonEnabled: boolean = false;
  private waitTimer: Phaser.Time.TimerEvent | null = null;
  private waitText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('GameOver');
  }

  init(data: { score?: number; leaderboard?: LeaderboardEntry[]; playerName?: string }) {
    console.log('GameOver init with data:', data);
    this.finalScore = data.score || 0;
    this.leaderboard = data.leaderboard || [];
    this.playerName = data.playerName || '';
    this.waitTimeRemaining = 10;
    this.buttonEnabled = false;
    console.log('Leaderboard entries:', this.leaderboard.length);
    console.log('Player name:', this.playerName);
  }

  create() {
    this.createUI();
    this.startWaitTimer();

    // Handle resize
    this.scale.on('resize', () => {
      if (this.waitTimer) {
        this.waitTimer.destroy();
      }
      this.scene.restart();
    });
  }

  private startWaitTimer(): void {
    this.waitTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.waitTimeRemaining--;
        if (this.waitTimeRemaining <= 0) {
          this.buttonEnabled = true;
          this.updateWaitDisplay();
          if (this.waitTimer) {
            this.waitTimer.destroy();
          }
        } else {
          this.updateWaitDisplay();
        }
      },
      loop: true,
    });
  }

  private updateWaitDisplay(): void {
    if (this.waitText) {
      if (this.buttonEnabled) {
        this.waitText.setText('🌽 Ready to Harvest! 🌽');
        this.waitText.setColor('#8BC34A');
      } else {
        this.waitText.setText(`⏳ Next round in ${this.waitTimeRemaining}s...`);
        this.waitText.setColor('#FFD85B');
      }
    }
  }

  private createUI(): void {
    const { width, height } = this.scale;
    
    this.cameras.main.setBackgroundColor(0x2d5016);
    this.cameras.resize(width, height);

    // Background image
    if (this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-1);
    }

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, width, height);

    // Responsive font sizes
    const titleSize = Math.min(width / 15, 42);
    const scoreSize = Math.min(width / 25, 24);
    const scoreLabelSize = Math.min(width / 35, 16);
    const leaderboardTitleSize = Math.min(width / 22, 28);
    const leaderboardEntrySize = Math.min(width / 32, 18);
    const buttonSize = Math.min(width / 25, 28);

    // Main container dimensions
    const boardWidth = Math.min(width * 0.85, 550);
    const boardX = width / 2;
    let currentY = height * 0.08;

    // === TITLE BANNER ===
    const titleHeight = 65;
    const titleBanner = this.add.graphics();
    titleBanner.fillStyle(0xFFD700, 1);
    titleBanner.fillRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, titleHeight, 12);
    titleBanner.lineStyle(4, 0xFF8C00, 1);
    titleBanner.strokeRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, titleHeight, 12);

    this.add.text(boardX, currentY + titleHeight / 2, '🌾 REAPED! 🌾', {
      fontFamily: '"Luckiest Guy", "Bangers", cursive',
      fontSize: `${titleSize}px`,
      color: '#8B4513',
      align: 'center',
      stroke: '#FFD700',
      strokeThickness: 2,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#654321',
        blur: 3,
        fill: true,
      },
    }).setOrigin(0.5);

    currentY += titleHeight + 15;

    // === YOUR HARVEST CARD (Smaller) ===
    const scoreCardHeight = 60;
    const scoreCard = this.add.graphics();
    scoreCard.fillStyle(0xF4A460, 0.95);
    scoreCard.fillRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, scoreCardHeight, 10);
    scoreCard.lineStyle(3, 0xFF8C00, 1);
    scoreCard.strokeRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, scoreCardHeight, 10);

    // Score content - properly centered in card
    const scoreCardCenterY = currentY + scoreCardHeight / 2;
    
    this.add.text(boardX - 80, scoreCardCenterY, 'YOUR HARVEST:', {
      fontFamily: '"Chewy", "Baloo Bhai 2", cursive',
      fontSize: `${scoreLabelSize}px`,
      color: '#654321',
      stroke: '#FFE4B5',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);

    this.add.text(boardX + 20, scoreCardCenterY, `🌽 ${this.finalScore}`, {
      fontFamily: '"Luckiest Guy", "Bangers", cursive',
      fontSize: `${scoreSize}px`,
      color: '#FFD700',
      stroke: '#8B4513',
      strokeThickness: 3,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#654321',
        blur: 1,
        fill: true,
      },
    }).setOrigin(0, 0.5);

    currentY += scoreCardHeight + 15;

    // === LEADERBOARD HEADER (Same style as score card) ===
    const leaderboardHeaderHeight = 55;
    const leaderboardHeader = this.add.graphics();
    leaderboardHeader.fillStyle(0xFF6B35, 1);
    leaderboardHeader.fillRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, leaderboardHeaderHeight, 10);
    leaderboardHeader.lineStyle(3, 0xC1440E, 1);
    leaderboardHeader.strokeRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, leaderboardHeaderHeight, 10);

    this.add.text(boardX, currentY + leaderboardHeaderHeight / 2, '🏆 TOP FARMERS 🏆', {
      fontFamily: '"Luckiest Guy", "Bangers", cursive',
      fontSize: `${leaderboardTitleSize}px`,
      color: '#FFFFFF',
      stroke: '#8B4513',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#654321',
        blur: 2,
        fill: true,
      },
    }).setOrigin(0.5);

    currentY += leaderboardHeaderHeight + 8;

    // === LEADERBOARD LIST (Same style container) ===
    // Calculate available space for leaderboard
    const buttonAreaHeight = 90;
    const availableHeight = height - currentY - buttonAreaHeight;
    const entryHeight = 32;
    const maxVisibleEntries = Math.floor((availableHeight - 20) / entryHeight);
    const leaderboardListHeight = Math.min(maxVisibleEntries * entryHeight + 20, availableHeight);

    const listCard = this.add.graphics();
    listCard.fillStyle(0x8B4513, 0.95);
    listCard.fillRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, leaderboardListHeight, 10);
    listCard.lineStyle(3, 0x654321, 1);
    listCard.strokeRoundedRect(boardX - boardWidth / 2, currentY, boardWidth, leaderboardListHeight, 10);

    // Inner background for entries
    const innerPadding = 8;
    const entryBg = this.add.graphics();
    entryBg.fillStyle(0xFFE4B5, 0.15);
    entryBg.fillRoundedRect(
      boardX - boardWidth / 2 + innerPadding,
      currentY + innerPadding,
      boardWidth - innerPadding * 2,
      leaderboardListHeight - innerPadding * 2,
      6
    );

    const listStartY = currentY + innerPadding + 10;
    const listStartX = boardX - boardWidth / 2 + innerPadding + 12;
    const entryWidth = boardWidth - innerPadding * 2 - 24;

    if (this.leaderboard.length === 0) {
      // Show "No farmers yet" message
      this.add.text(boardX, listStartY + leaderboardListHeight / 2 - 20, 'Be the first farmer! 🚜', {
        fontFamily: '"Chewy", "Baloo Bhai 2", cursive',
        fontSize: `${leaderboardEntrySize}px`,
        color: '#FFD85B',
        stroke: '#654321',
        strokeThickness: 3,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 1,
          fill: true,
        },
      }).setOrigin(0.5);
    } else {
      // Display leaderboard entries
      const displayCount = Math.min(this.leaderboard.length, maxVisibleEntries);
      
      this.leaderboard.slice(0, displayCount).forEach((entry, index) => {
        const entryY = listStartY + index * entryHeight;
        const isCurrentPlayer = entry.username === this.playerName;
        
        // Entry background for current player
        if (isCurrentPlayer) {
          const highlight = this.add.graphics();
          highlight.fillStyle(0x8BC34A, 0.4);
          highlight.fillRoundedRect(listStartX - 4, entryY - 2, entryWidth + 8, entryHeight - 4, 5);
          highlight.lineStyle(2, 0x4CAF50, 1);
          highlight.strokeRoundedRect(listStartX - 4, entryY - 2, entryWidth + 8, entryHeight - 4, 5);
        }
        
        // Rank with medal for top 3
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${entry.rank}.`;
        const prefix = isCurrentPlayer ? '🚜 ' : '';
        const color = isCurrentPlayer ? '#C8E6C9' : index < 3 ? '#FFD700' : '#FFE4B5';
        const strokeColor = isCurrentPlayer ? '#2E7D32' : '#654321';
        
        // Truncate username if too long
        let displayName = entry.username;
        const maxNameLength = 15; // Adjust based on your needs
        if (displayName.length > maxNameLength) {
          displayName = displayName.substring(0, maxNameLength - 3) + '...';
        }
        
        // Left-aligned text with rank and name
        this.add.text(
          listStartX,
          entryY + entryHeight / 2,
          `${prefix}${rankEmoji} ${displayName}`,
          {
            fontFamily: '"Baloo Bhai 2", "Chewy", cursive',
            fontSize: `${leaderboardEntrySize}px`,
            color: color,
            fontStyle: isCurrentPlayer ? '800' : index < 3 ? '700' : '600',
            stroke: strokeColor,
            strokeThickness: isCurrentPlayer ? 3 : 2,
            shadow: {
              offsetX: 1,
              offsetY: 1,
              color: '#000000',
              blur: 1,
              fill: true,
            },
          }
        ).setOrigin(0, 0.5);
        
        // Right-aligned score
        this.add.text(
          listStartX + entryWidth,
          entryY + entryHeight / 2,
          `🌽 ${entry.score}`,
          {
            fontFamily: '"Baloo Bhai 2", "Chewy", cursive',
            fontSize: `${leaderboardEntrySize}px`,
            color: color,
            fontStyle: isCurrentPlayer ? '800' : index < 3 ? '700' : '600',
            stroke: strokeColor,
            strokeThickness: isCurrentPlayer ? 3 : 2,
            shadow: {
              offsetX: 1,
              offsetY: 1,
              color: '#000000',
              blur: 1,
              fill: true,
            },
          }
        ).setOrigin(1, 0.5);
      });
      
      // Show scroll indicator if there are more entries
      if (this.leaderboard.length > maxVisibleEntries) {
        this.add.text(
          boardX,
          currentY + leaderboardListHeight - 12,
          `+${this.leaderboard.length - maxVisibleEntries} more...`,
          {
            fontFamily: '"Baloo Bhai 2", cursive',
            fontSize: '12px',
            color: '#FFD85B',
            stroke: '#654321',
            strokeThickness: 2,
          }
        ).setOrigin(0.5);
      }
    }

    currentY += leaderboardListHeight + 15;

    // === WAIT MESSAGE ===
    this.waitText = this.add.text(boardX, currentY + 10, `⏳ Next round in ${this.waitTimeRemaining}s...`, {
      fontFamily: '"Chewy", "Baloo Bhai 2", cursive',
      fontSize: `${Math.min(width / 30, 20)}px`,
      color: '#FFD85B',
      stroke: '#654321',
      strokeThickness: 3,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 1,
        fill: true,
      },
    }).setOrigin(0.5);

    currentY += 40;

    // === HARVEST AGAIN BUTTON ===
    const buttonWidth = Math.min(boardWidth * 0.8, 380);
    const buttonHeight = 60;
    const buttonY = currentY + 15;
    
    const buttonGraphics = this.add.graphics();
    
    // Button shadow
    buttonGraphics.fillStyle(0x2d5016, 0.7);
    buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
    
    // Button main body
    buttonGraphics.fillStyle(0x8BC34A, 1);
    buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
    
    // Button border
    buttonGraphics.lineStyle(5, 0x558B2F, 1);
    buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
    
    // Inner shine
    buttonGraphics.lineStyle(2, 0xC5E1A5, 0.8);
    buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);

    // Button text
    const buttonText = this.add.text(boardX, buttonY, '🌽 HARVEST AGAIN! 🚜', {
      fontFamily: '"Luckiest Guy", "Bangers", cursive',
      fontSize: `${buttonSize}px`,
      color: '#FFFFFF',
      align: 'center',
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
      .setOrigin(0.5);

    // Button interactive zone
    const buttonZone = this.add.rectangle(
      boardX,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x000000,
      0
    ).setInteractive({ useHandCursor: true });

    buttonZone.setData('graphics', buttonGraphics);
    buttonZone.setData('text', buttonText);

    // Button hover effect
    buttonZone.on('pointerover', () => {
      buttonText.setScale(1.05);
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x2d5016, 0.7);
      buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
      buttonGraphics.fillStyle(0x9CCC65, 1);
      buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(5, 0x689F38, 1);
      buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(2, 0xDCEDC8, 0.9);
      buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);
    });

    buttonZone.on('pointerout', () => {
      buttonText.setScale(1);
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x2d5016, 0.7);
      buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
      buttonGraphics.fillStyle(0x8BC34A, 1);
      buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(5, 0x558B2F, 1);
      buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(2, 0xC5E1A5, 0.8);
      buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);
    });

    buttonZone.on('pointerdown', () => {
      if (!this.buttonEnabled) {
        // Button is disabled, show feedback
        console.log('Button disabled, please wait...');
        return;
      }
      
      console.log('Harvest Again button clicked!');
      buttonText.setScale(0.95);
      buttonGraphics.clear();
      buttonGraphics.fillStyle(0x2d5016, 0.7);
      buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2 + 2, buttonY - buttonHeight / 2 + 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.fillStyle(0x7CB342, 1);
      buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
      buttonGraphics.lineStyle(5, 0x558B2F, 1);
      buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
    });

    buttonZone.on('pointerup', () => {
      if (!this.buttonEnabled) {
        // Button is disabled
        console.log('Button still disabled');
        return;
      }
      
      console.log('Restarting game via LoadingScene...');
      buttonText.setScale(1);
      this.scene.stop('GameOver');
      this.scene.start('LoadingScene');
    });

    // Update button appearance based on enabled state
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.buttonEnabled) {
          // Disabled style - gray and dim
          buttonGraphics.clear();
          buttonGraphics.fillStyle(0x2d5016, 0.7);
          buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
          buttonGraphics.fillStyle(0x666666, 0.6);
          buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
          buttonGraphics.lineStyle(5, 0x444444, 1);
          buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
          buttonText.setAlpha(0.5);
        } else {
          // Enabled style - restore
          buttonGraphics.clear();
          buttonGraphics.fillStyle(0x2d5016, 0.7);
          buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2 + 4, buttonY - buttonHeight / 2 + 4, buttonWidth, buttonHeight, 15);
          buttonGraphics.fillStyle(0x8BC34A, 1);
          buttonGraphics.fillRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
          buttonGraphics.lineStyle(5, 0x558B2F, 1);
          buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 15);
          buttonGraphics.lineStyle(2, 0xC5E1A5, 0.8);
          buttonGraphics.strokeRoundedRect(boardX - buttonWidth / 2 + 5, buttonY - buttonHeight / 2 + 5, buttonWidth - 10, buttonHeight - 10, 12);
          buttonText.setAlpha(1);
        }
      },
      loop: true,
    });
  }
}
