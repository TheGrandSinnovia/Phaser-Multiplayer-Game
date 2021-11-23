import 'core-js/stable'

import Phaser, { Game } from 'phaser'
import BootScene from './scenes/bootScene'
import GameScene from './scenes/gameScene'

const config = {
  type: Phaser.AUTO,
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 32 * 40,
    height: 32 * 30
  },
  scene: [BootScene, GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: true,
    }
  }
}

const game = new Game(config)