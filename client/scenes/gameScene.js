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

  setMap() {
    this.map = this.make.tilemap({ key: 'map1' })
    this.tileset = this.map.addTilesetImage('tilesheet', 'tiles')  // embedded Tiled tilesheet

    this.background = this.map.createLayer('Background', this.tileset)
    this.scenery = this.map.createLayer('Scenery', this.tileset).setDepth(100)
  
    this.ball = this.physics.add.staticImage(64, 64, 'ball').setScale(2).setCircle(16).refreshBody()
  }

  setWallsDebug(debug) {
    if (debug) {
      this.walls = this.map.createFromObjects('Walls', { classType: Phaser.Physics.Arcade.Sprite })
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
		this.load.tilemapTiledJSON('map1', 'assets/maps/map1.json')

    this.load.spritesheet('player', 'assets/img/player/elfy.png', {frameWidth: 32, frameHeight: 32})
    this.load.image('ball', 'assets/img/objects/ball.png')
  }

  async create() {
    new Cursors(this, this.channel)

    this.setMap()
    this.setWallsDebug(false)
    this.setGroups()
    

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
