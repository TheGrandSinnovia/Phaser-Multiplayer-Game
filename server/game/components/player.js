import Projectiles from './projectiles.js'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, playerID, x = 200, y = 200) {
    super(scene, x, y, '')
    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.body.setSize(22, 32)
    this.setPushable(false)
    this.setCollideWorldBounds(true)

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
    this.colliding = { none: true, up: false, down: false, left: false, right: false }

    this.vx
    this.vy

    this.idle = true
    this.prevNoMovement = true

    this.prevX = -1
    this.prevY = -1

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

    // this.vx = data[3] - data[2]
    // this.vy = data[1] - data[0]
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
  }

  update() {
    // this.setPushable(true)
    // if (!this.colliding.none) {
    //   if (this.colliding.up && this.body.touching.down) this.setPushable(false)
    //   else if (this.colliding.down && this.body.touching.up) this.setPushable(false)
    //   else if (this.colliding.left && this.body.touching.right) this.setPushable(false)
    //   else if (this.colliding.right && this.body.touching.left) this.setPushable(false)
    //   this.colliding = { none: true, up: false, down: false, left: false, right: false }
    // }

    let speed = 160

    // If there is a move state, move player
    if (this.move.up) this.setVelocity(0, -speed)
    else if (this.move.down) this.setVelocity(0, speed)
    else if (this.move.left) this.setVelocity(-speed, 0)
    else if (this.move.right) this.setVelocity(speed, 0)
    else this.setVelocity(0, 0)

    // if (this.vx) this.x += this.vx * speed
    // if (this.vy) this.y += this.vy * speed
  }

  postUpdate() {
    this.prevDead = this.dead
    this.prevX = this.x
    this.prevY = this.y
  }
}