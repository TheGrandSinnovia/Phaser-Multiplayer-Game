import { Scene } from 'phaser'
import axios from 'axios'
import Player from '../components/player'
import Cursors from '../components/cursors'

export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.objects = {}
    this.playerID
  }

  init({ channel }) {
    this.channel = channel
  }

  setLevel(levelN) {
    levelN = levelN.toString()
    this.level = this.make.tilemap({ key: 'level' + levelN })
    this.tileset = this.level.addTilesetImage('tilesheet', 'tiles')  // embedded Tiled tilesheet

    this.background = this.level.createLayer('Background', this.tileset)
    this.floor = this.level.createLayer('Floor', this.tileset)
    this.scenery = this.level.createLayer('Scenery', this.tileset).setDepth(100)
    this.doors = this.level.createLayer('Doors', this.tileset).setDepth(101)
  
    // this.ball = this.physics.add.staticImage(64, 320, 'ball').setScale(2).setCircle(16).refreshBody()
  }

  setWallsDebug(debug) {
    if (debug) {
      this.walls = this.level.createFromObjects('Walls', { classType: Phaser.Physics.Arcade.Sprite })
      this.wallsGroup = this.add.group()
  
      this.walls.forEach(wall => {
        wall.y = wall.y + wall.displayHeight
        wall.setDepth(1000)
        // wall.setAlpha(0)

        this.wallsGroup.add(wall)
      })
    }
  }

  setGroups() {
    this.playersGroup = this.add.group()
  }

  preload() {
    this.load.image('tiles', 'assets/img/tilesets/tilesheet.png')
		this.load.tilemapTiledJSON('level1', 'assets/levels/level1.json')
    this.load.tilemapTiledJSON('level2', 'assets/levels/level2.json')

    this.load.spritesheet('player', 'assets/img/player/elfy.png', {frameWidth: 32, frameHeight: 32})
  }

  async create() {
    new Cursors(this, this.channel)

    this.setGroups()
    this.setLevel(1)
    this.setWallsDebug(false)

    const parseUpdates = updates => {
      if (typeof updates === undefined || updates === '') return []

      // parse
      let u = updates.split(',')
      u.pop() // delete last empty string

      let u2 = []

      u.forEach((el, i) => {
        if (i % 4 === 0) {
          u2.push({
            playerID: u[i + 0],
            x: parseInt(u[i + 1], 36),
            y: parseInt(u[i + 2], 36),
            dead: parseInt(u[i + 3]) === 1 ? true : false
          })
        }
      })
      return u2
    }

    const updatesHandler = updates => {
      updates.forEach(gameObject => {
        const { playerID, x, y, dead } = gameObject
        const alpha = dead ? 0 : 1

        if (Object.keys(this.objects).includes(playerID)) {
          // if the gameObject does already exist,
          // update the gameObject
          let sprite = this.objects[playerID].sprite
          sprite.setAlpha(alpha)
          sprite.animate(x, y)
          sprite.setPosition(x, y)
        } else {
          // if the gameObject does NOT exist,
          // create a new gameObject
          let newGameObject = {
            sprite: new Player(this, playerID, x || 200, y || 200, 'player'),
            playerID: playerID
          }
          newGameObject.sprite.setAlpha(alpha)
          this.objects = { ...this.objects, [playerID]: newGameObject }
        }
      })
    }

    try {
      let res = await axios.get(`${location.protocol}//${location.hostname}:1444/getState`)

      let parsedUpdates = parseUpdates(res.data.state)
      updatesHandler(parsedUpdates)

      /**
       * Client [request]: new ID for connected player
       */
      this.channel.emit('getPlayerID')

      /**
       * Server [request]: set new ID for connected player
       * 
       * Client [response]: add new player
       */
      this.channel.on('setPlayerID', playerID36 => {
        this.playerID = parseInt(playerID36, 36)
        this.channel.emit('playerAdd')
      })
    } catch (error) {
      console.error(error.message)
    }

    /**
     * Server [request]: update players
     * 
     * Client: updates players
     */
    this.channel.on('updatePlayers', updates => {
      let parsedUpdates = parseUpdates(updates[0])
      updatesHandler(parsedUpdates)
    })

    /**
     * Server [request]: delete player
     * 
     * Client: deletes player
     */
    this.channel.on('playerRemove', playerID => {
      try {
        this.objects[playerID].sprite.destroy()
        delete this.objects[playerID]
      } catch (error) {
        console.error(error.message)
      }
    })
  }
}
