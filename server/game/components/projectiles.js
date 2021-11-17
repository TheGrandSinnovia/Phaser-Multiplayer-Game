import Phaser from 'phaser'

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '')
    this.player
    this.projectileID

    this.moving = false
    this.fireX
    this.fireY

    this.speed = 320
    this.range = 320
  }

  collide() {
    this.setActive(false)
    this.body.setEnable(false)

    this.moving = false

    this.player.projectileCollided = this.projectileID
    // this.player.projectileCollided = `${this.projectileID}|${Math.round(this.x).toString(36)}|${Math.round(this.y).toString(36)}`
  }

  fire(direction) {
    this.fireX = this.player.x
    this.fireY = this.player.y

    if (this.moving) return

    let offset = 32
    switch (direction) {
      case 11:
        this.body.reset(this.player.x, this.player.y - offset)
        this.setVelocity(0, -this.speed)
        break;
      case 12:
        this.body.reset(this.player.x, this.player.y + offset)  
        this.setVelocity(0, this.speed)
        break;
      case 13:
        this.body.reset(this.player.x - offset, this.player.y)
        this.setVelocity(-this.speed, 0)
        break;
      case 14:
        this.body.reset(this.player.x + offset, this.player.y)
        this.setVelocity(this.speed, 0)
        break;
    }
  
    this.setActive(true)
    this.body.setEnable(true)
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta)
    let distanceX = this.x - this.fireX
    let distanceY = this.y - this.fireY

    if (distanceY <= -this.range || distanceY >= this.range || distanceX <= -this.range || distanceX >= this.range) {
      this.setActive(false)
      this.body.setEnable(false)

      this.moving = false

      this.fireX = null
      this.fireY = null
    }
  }
}

export default class Projectiles extends Phaser.Physics.Arcade.Group {
  constructor(scene, player) {
    super(scene.physics.world, scene)
    this.player = player

    this.projectileID = 0
    this.projectileTick  // ms

    this.fireRate = 250  // ms
    this.ammunition = 10

    this.createMultiple({
      frameQuantity: this.ammunition,
      key: 'DUMMY',
      active: false,
      visible: false,
      classType: Projectile,
      createCallback: (projectile) => {
        projectile.player = this.player,
        projectile.projectileID = this.setProjectileID()
      }
    })
  }

  getTime() {
    return new Date().getTime()
  }

  setProjectileID() {
    return this.projectileID++
  }

  fireProjectile(direction) {
    if (this.getTime() - this.projectileTick < this.fireRate) return

    this.projectileTick = this.getTime()
    let projectile = this.getFirstDead(false)

    if (projectile) {
      projectile.fire(direction)

      return projectile.projectileID
    }
  }
}