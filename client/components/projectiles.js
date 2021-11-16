import Phaser from 'phaser'

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture)
    this.player
    this.projectileID

    this.speed = 320
    this.range = 320
  }

  collide() {
    this.setActive(false)
    this.setVisible(false)
  }

  fire(direction) {
    let offset = 20
    switch (direction) {
      case 'up':
        this.body.reset(this.player.x, this.player.y - offset)
        this.setVelocity(0, -this.speed)
        break;
      case 'down':
        this.body.reset(this.player.x, this.player.y + offset)
        this.setVelocity(0, this.speed)
        break;
      case 'left':
        this.body.reset(this.player.x - offset, this.player.y)
        this.setVelocity(-this.speed, 0)
        break;
      case 'right':
        this.body.reset(this.player.x + offset, this.player.y)
        this.setVelocity(this.speed, 0)
        break;
    }
  
    this.setActive(true)
    this.setVisible(true)
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta)
    let distanceX = this.x - this.player.x
    let distanceY = this.y - this.player.y

    if (distanceY <= -this.range || distanceY >= this.range || distanceX <= -this.range || distanceX >= this.range) {
      this.setActive(false)
      this.setVisible(false)
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
      key: 'projectile',
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

  fireProjectile(projectileID, direction) {
    this.children.iterate(projectile => {
      if (projectileID === projectile.projectileID) projectile.fire(direction)
    })
  }

  collideProjectile(projectileID) {
    this.children.iterate(projectile => {
      if (projectileID === projectile.projectileID) projectile.collide()
    })
  }
}