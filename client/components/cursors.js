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
    const sendMove = () => {
      let move = {
        up: false,
        down: false,
        left: false,
        right: false,
      }
  
      if (this.keys.up.isDown || this.keys.w.isDown) {
        move.up = true
      } 
      else if (this.keys.down.isDown || this.keys.s.isDown) {
        move.down = true
      }
      else if (this.keys.left.isDown || this.keys.a.isDown) {
        move.left = true
      } 
      else if (this.keys.right.isDown || this.keys.d.isDown) {
        move.right = true
      }

      const player = this.scene.players[this.scene.playerID]

      if (player) player.move = move
  
      let data = [move.up, move.down, move.left, move.right]
      /**
       * Client request: update player's move state
       */
        this.channel.emit('playerMove', data)
    }

    const sendFire = () => {
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

    sendMove()
    // sendFire()
  }
}
