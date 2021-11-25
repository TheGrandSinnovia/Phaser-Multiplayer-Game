import Phaser from 'phaser'
import Projectiles from './projectiles.js'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, playerID, mapN, x, y, texture) {
    super(scene, x, y, texture)
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.body.setSize(22, 32)
    this.setPushable(false)
    this.setCollideWorldBounds(true)

    this.scene = scene
    this.texture = texture

    this.playerID = playerID
    this.mapN = mapN

    this.move = {
      up: false,
      down: false,
      left: false,
      right: false,
    }

    this.damaged = false
    this.damagedTick

    this.facing = 'up'
    this.fireDir = 'up'

    this.projectiles = new Projectiles(this.scene, this)
    this.projectiles.setDepth(200)

    this.setAnims()
  }

  setAnims() {
    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
      skipMissedFrames: false
    });
    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
      skipMissedFrames: false
    });
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
      skipMissedFrames: false
    });
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1,
      skipMissedFrames: false
    });
    this.idleFrame = {
      up: 0,
      down: 4,
      left: 8,
      right: 12
    }
  }

  setFacing() {
    if (this.anims.currentAnim) {
      this.facing = this.anims.currentAnim.key
      this.setFrame(this.idleFrame[this.facing])
    }
  }

  setFireDir() {
    if (this.anims.currentAnim) {
      this.fireDir = this.anims.currentAnim.key
    }
    return this.fireDir
  }

  animate() {
    let anim
    if (this.move.up) {
      anim = 'up'
    }
    else if (this.move.down) {
      anim = 'down'
    }
    else if (this.move.left) {
      anim = 'left'
    }
    else if (this.move.right) {
      anim = 'right'
    }
    else {
      this.anims.stop()
      this.setFacing()
    }

    if (anim) {
      this.anims.play(anim, true)
    }
  }

  clientMove() {
    /* CLIENT PREDICTION */
    let speed = 160

    // If there is a move state, move player
    if (this.move.up) {
      this.setVelocity(0, -speed)
    }
    else if (this.move.down) {
      this.setVelocity(0, speed)
    }
    else if (this.move.left) {
      this.setVelocity(-speed, 0)
    }
    else if (this.move.right) {
      this.setVelocity(speed, 0)
    }
    else {
      this.setVelocity(0, 0)
    }

    this.animate()

    this.scene.playerVault.add(
      this.scene.SI.snapshot.create([{ id: this.playerID, x: this.x, y: this.y }])
    )

    /* SERVER RECONCILIATION */

    // get the latest snapshot from the server
    const serverSnapshot = this.scene.SI.vault.get()
    // get the closest player snapshot that matches the server snapshot time
    const playerSnapshot = this.scene.playerVault.get(serverSnapshot.time, true)

    if (serverSnapshot && playerSnapshot) {
      // get the current player position on the server
      const serverPos = serverSnapshot.state.filter(snapshot => snapshot.id.toString() === this.playerID)[0]

      // calculate the offset between server and client
      const offsetX = playerSnapshot.state[0].x - serverPos.x
      const offsetY = playerSnapshot.state[0].y - serverPos.y

      // check if the player is currently on the move
      const isMoving = this.move.up || this.move.down || this.move.left || this.move.right

      // we correct the position faster if the player moves
      const correction = isMoving ? 60 : 180

      // apply a step by step correction of the player's position
      this.x -= offsetX / correction
      this.y -= offsetY / correction
    }
  }

  serverMove(x, y) {
    const distanceX = x - this.x
    const distanceY = y - this.y

    // Reset move
    this.move = {
      up: false,
      down: false,
      left: false,
      right: false,
    }

    let dir = new Phaser.Math.Vector2(distanceX, distanceY).normalize()

    // Sometimes values are 0.999...
    dir.x = Math.round(dir.x)
    dir.y = Math.round(dir.y)

    let up = new Phaser.Math.Vector2(0, -1)
    let down = new Phaser.Math.Vector2(0, 1)
    let left = new Phaser.Math.Vector2(-1, 0)
    let right = new Phaser.Math.Vector2(1, 0)

    let speed = 160

    if (dir.equals(up)) {
      this.move.up = true
      this.setVelocity(0, -speed)
    }
    else if (dir.equals(down)) {
      this.move.down = true
      this.setVelocity(0, speed)
    }
    else if (dir.equals(left)) {
      this.move.left = true
      this.setVelocity(-speed, 0)
    }
    else if (dir.equals(right)) {
      this.move.right = true
      this.setVelocity(speed, 0)
    }
    else {
      this.setVelocity(0, 0)
    }

    this.animate()
  }

  getDamage() {
    const getTime = () => {
      return new Date().getTime()
    }

    let start = getTime()
    this.setTint(0x5564eb)

    while (getTime() - start < 1000) {
    }

    this.clearTint()
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta)

    if (this.damaged) {
      this.setTint(0xFF0000)
      this.damagedTick = time
      this.damaged = false
    }

    if (this.damagedTick) {
      if (time - this.damagedTick > 100) {
        this.clearTint()
        this.damagedTick = null
      }
    }
  }
}