import Phaser from 'phaser'

class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture)
    this.player
    this.projectileID

    this.moving = false
    this.fireX
    this.fireY
    this.collisionX
    this.collisionY

    this.speed = 320
    this.range = 320
  }

  collide() {
    this.collisionX = this.x
    this.collisionY = this.y
  }

  // collide(collisionX, collisionY) {
  //   this.collisionX = collisionX
  //   this.collisionY = collisionY
  // }

  fire(direction) {
    // while(this.moving) {
    //   console.log(this.moving, 'loop')
    // }

    if (this.moving) return

    this.fireX = this.player.x
    this.fireY = this.player.y

    let offset = 32

    switch (direction) {
      case 'up':
        this.body.reset(this.player.x, this.player.y - offset)
        this.setVelocity(0, -this.speed)
        this.moving = true
        break;
      case 'down':
        this.body.reset(this.player.x, this.player.y + offset)
        this.setVelocity(0, this.speed)
        this.moving = true
        break;
      case 'left':
        this.body.reset(this.player.x - offset, this.player.y)
        this.setVelocity(-this.speed, 0)
        this.moving = true
        break;
      case 'right':
        this.body.reset(this.player.x + offset, this.player.y)
        this.setVelocity(this.speed, 0)
        this.moving = true
        break;
    }
  
    this.setActive(true)
    this.setVisible(true)
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta)
    
    let distanceX = this.x - this.fireX
    let distanceY = this.y - this.fireY

    // console.log('ID', this.projectileID, 'Projectile moving', distanceX, distanceY, '(range)', this.range)

    if (this.collisionX || this.collisionY) {
      let offset = 32
      let rangeToCollision = Math.abs(this.collisionX - this.fireX) + Math.abs(this.collisionY - this.fireY) + offset

      // console.log('ID', this.projectileID, 'Projectile moving till collision', distanceX, distanceY, '(range)', rangeToCollision, '(collision)', this.collisionX, this.collisionY)

      if (distanceY <= -rangeToCollision || distanceY >= rangeToCollision || distanceX <= -rangeToCollision || distanceX >= rangeToCollision) {
        this.setActive(false)
        this.setVisible(false)

        this.moving = false

        this.fireX = null
        this.fireY = null

        this.collisionX = null
        this.collisionY = null
      }
    }
    else {
      if (distanceY <= -this.range || distanceY >= this.range || distanceX <= -this.range || distanceX >= this.range) {
        this.setActive(false)
        this.setVisible(false)

        this.moving = false

        this.fireX = null
        this.fireY = null        
      }
    }
  }
}

export default class Projectiles extends Phaser.Physics.Arcade.Group {
  constructor(scene, player) {
    super(scene.physics.world, scene)
    this.player = player

    this.projectileID = 0

    this.ammunition = 10

    this.createMultiple({
      frameQuantity: this.ammunition,
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

  // collideProjectile(projectileData) {
  //   this.children.iterate(projectile => {
  //     if (projectileData[0] === projectile.projectileID) projectile.collide(projectileData[1], projectileData[2])
  //   })
  // }
}