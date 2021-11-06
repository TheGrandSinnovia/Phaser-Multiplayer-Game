import Phaser from 'phaser'

export default class Player extends Phaser.GameObjects.Sprite {
  constructor(scene, channelId, x, y, texture) {
    super(scene, x, y, texture)
    scene.add.existing(this)

    this.channelId = channelId
    this.texture = texture

    this.setAnims()
  }

  setAnims() {
    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers(this.texture, { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1
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
      const facing = this.anims.currentAnim.key;
      this.setFrame(this.idleFrame[facing]);
    }
  }

  animate(x, y, idle) {
    let dir = new Phaser.Math.Vector2(x - this.x, y - this.y).normalize();
    let up = new Phaser.Math.Vector2(0, -1);
    let down = new Phaser.Math.Vector2(0, 1);
    let left = new Phaser.Math.Vector2(-1, 0);
    let right = new Phaser.Math.Vector2(1, 0);

    let anim;
    if (dir.equals(up)) {
      anim = 'up';
    }
    else if (dir.equals(down)) {
      anim = 'down';
    }
    else if (dir.equals(left)) {
      anim = 'left';
    }
    else if (dir.equals(right)) {
      anim = 'right';
    }
    else if (dir.equals({x: 0, y: 0})) {
      this.anims.stop();
      this.setFacing();      
    }

    if (anim) {
      this.anims.play(anim, true);            
    }
  }
}