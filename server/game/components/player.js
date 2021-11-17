import Projectiles from './projectiles.js'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, playerID, x = 200, y = 200) {
    super(scene, x, y, '')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.scene = scene
    this.playerID = playerID

    this.dead = false
    this.prevDead = false
    
    this.mapN = 'N1'
    this.prevMapN = 'N1'

    this.damaged = false

    this.projectiles = new Projectiles(this.scene, this)
    this.projectileFired = -1
    this.projectileCollided = -1
    // this.projectileCollided = '-1'

    this.move = {}

    this.idle = true
    this.prevNoMovement = true

    this.prevX = -1
    this.prevY = -1

    this.body.setSize(22, 32)
    this.setCollideWorldBounds(true)

    scene.events.on('update', this.update, this)
  }

  setMove(data) {
    let move = {
      up: data === 'up',
      down: data === 'down',
      left: data === 'left',
      right: data === 'right',
      none: data === 'none'
    }
    this.move = move
  }

  setFire() {
    this.projectileFired = this.projectiles.fireProjectile(this.body.facing)
  }

  kill() {
    this.dead = true
    this.setActive(false)
    this.body.setEnable(false)
  }

  revive(playerID) {
    this.playerID = playerID
    this.dead = false
    this.setActive(true)
    this.body.setEnable(true)
    this.setVelocity(0)
  }

  update() {
    let speed = 160

    // If there is a move state, move player
    if (this.move.up) this.setVelocity(0, -speed)
    else if (this.move.down) this.setVelocity(0, speed)
    else if (this.move.left) this.setVelocity(-speed, 0)
    else if (this.move.right) this.setVelocity(speed, 0)
    else this.setVelocity(0, 0)
  }

  postUpdate() {
    this.prevDead = this.dead
    this.prevX = this.x
    this.prevY = this.y
  }
}