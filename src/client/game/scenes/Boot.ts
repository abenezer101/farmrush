import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load minimal assets for the preloader
  }

  create() {
    this.scene.start('Preloader');
  }
}
