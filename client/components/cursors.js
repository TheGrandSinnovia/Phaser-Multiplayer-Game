export default class Cursors {
  constructor(scene, channel) {
    this.scene = scene
    this.channel = channel

    const {LEFT, RIGHT, UP, DOWN, W, A, S, D} = Phaser.Input.Keyboard.KeyCodes
    this.keys = this.scene.input.keyboard.addKeys({
      left: LEFT,
      right: RIGHT,
      up: UP,
      down: DOWN,
      w: W,
      a: A,
      s: S,
      d: D
    })

    scene.events.on('update', this.update, this)
  }

  update() {
    const move = () => {
      let move = {
        up: false,
        down: false,
        left: false,
        right: false,
        none: true
      }
  
      if (this.keys.up.isDown || this.keys.w.isDown) {
        move.up = true
        move.none = false
      } 
      else if (this.keys.down.isDown || this.keys.s.isDown) {
        move.down = true
        move.none = false
      }
      else if (this.keys.left.isDown || this.keys.a.isDown) {
        move.left = true
        move.none = false
      } 
      else if (this.keys.right.isDown || this.keys.d.isDown) {
        move.right = true
        move.none = false
      }
  
      if (move.up || move.down || move.left || move.right || move.none !== this.prevNoMovement) {
        let data
        if (move.up) data = 'up'
        else if (move.down) data = 'down'
        else if (move.left) data = 'left'
        else if (move.right) data = 'right'
        else data = 'none'
  
        /**
         * Client request: update player's move state
         */
        this.channel.emit('playerMove', data)
      }
  
      this.prevNoMovement = move.none
    }

    const fire = () => {
      let pointer = this.scene.input.activePointer
      if (pointer.isDown) {
        // To send request only on first click
        // ? Send duration data to process on server
        if (pointer.getDuration() < 0) {
          /**
           * Client request: update player's fire state
           */
          this.channel.emit('playerFire')
        }
      }
    }

    move()
    fire()
  }
}
