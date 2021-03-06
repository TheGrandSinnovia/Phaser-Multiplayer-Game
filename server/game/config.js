import '@geckos.io/phaser-on-nodejs'

import Phaser from 'phaser'
import { GameScene } from './gameScene.js'

const FPS = 60 // default
global.phaserOnNodeFPS = FPS

export const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-game',
  width: 32 * 40,
  height: 32 * 30,
  banner: false,
  audio: false,
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }
    }
  },
  fps: {
    target: FPS,
  }
}