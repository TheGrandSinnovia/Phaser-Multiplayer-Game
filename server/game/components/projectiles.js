import Phaser from 'phaser'

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '')
    this.player
    this.projectileID

    this.speed = 320
    this.range = 320
  }

  collide() {
    this.setActive(false)
    this.body.setEnable(false)
    this.player.projectileCollided = this.projectileID
  }

  fire(direction) {
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
    let distanceX = this.x - this.player.x
    let distanceY = this.y - this.player.y

    if (distanceY <= -this.range || distanceY >= this.range || distanceX <= -this.range || distanceX >= this.range) {
      this.setActive(false)
      this.body.setEnable(false)
    }
  }
}

export default class Projectiles extends Phaser.Physics.Arcade.Group {
  constructor(scene, player) {
    super(scene.physics.world, scene)
    this.player = player

    this.projectileID = 0

    this.createMultiple({
      frameQuantity: 20,
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

  setProjectileID() {
    return this.projectileID++
  }

  fireProjectile(direction) {
    let projectile = this.getFirstDead(false)

    if (projectile) {
      projectile.fire(direction)

      return projectile.projectileID
    }
  }
}