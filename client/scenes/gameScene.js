import { Scene } from 'phaser'
import axios from 'axios'
import Player from '../components/player'
import Cursors from '../components/cursors'

export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.players = {}
    this.playerID
    this.levelN = '1'
  }

  init({ channel }) {
    this.channel = channel
  }

  playerRemove(playerID) {
    try {
      this.players[playerID].destroy()
      delete this.players[playerID]
    } 
    catch (error) {
      console.error(error.message)
    }
  }

  setLevel(levelN) {
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
    this.setLevel('1')
    this.setWallsDebug(false)

    const parseUpdates = updates => {
      if (typeof updates === undefined || updates === '') return []

      // parse
      let u = updates.split(',')
      u.pop() // delete last empty string

      let u2 = []

      u.forEach((el, i) => {
        if (i % 5 === 0) {
          u2.push({
            playerID: u[i + 0],
            dead: parseInt(u[i + 1]) === 1 ? true : false,
            levelN: u[i + 2],
            x: parseInt(u[i + 3], 36),
            y: parseInt(u[i + 4], 36)
          })
        }
      })
      return u2
    }

    const updatesHandler = playersUpdates => {

      playersUpdates.forEach(playerUpdate => {
        if (this.playerID.toString() === playerUpdate.playerID) {
          if (playerUpdate.levelN != this.levelN) {
            this.levelN = playerUpdate.levelN

            this.background.destroy()
            this.floor.destroy()
            this.scenery.destroy()
            this.doors.destroy()

            this.setLevel(this.levelN)
            this.setWallsDebug(false)
            
            // Only show players from this level
            Object.entries(this.players).forEach(([playerID, playerTarget]) => {
              if (playerTarget.levelN != this.levelN) {
                console.log('Remove player', playerID, 'from this level:', this.levelN)
                playerTarget.setAlpha(0)
                // this.playerRemove(player.playerID)
              }
              else {
                console.log('Show player', playerID, 'from this level:', this.levelN)
                playerTarget.setAlpha(1)                
              }
            })
          }
        }
      })

      playersUpdates.forEach(playerUpdate => {
        const { playerID, dead, levelN, x, y } = playerUpdate
        const alpha = dead ? 0 : 1

        console.log('Player update!', playerID)

        if (Object.keys(this.players).includes(playerID)) {
          let player = this.players[playerID]
          if (levelN === this.levelN) {
            player.setAlpha(alpha)
          }
          else {
            player.setAlpha(0)            
          }
          player.levelN = levelN
          player.animate(x, y)
          player.setPosition(x, y)
        }
        else {
          console.log('New player!',  playerID)

          let newPlayer = new Player(this, playerID, levelN, x || 200, y || 200, 'player')
          if (levelN === this.levelN) {
            newPlayer.setAlpha(alpha)
          }
          else {
            newPlayer.setAlpha(0)            
          }          
          newPlayer.setDepth(99) // !Revise
          this.players = { ...this.players, [playerID]: newPlayer }
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
     this.channel.on('playersUpdate', playerUpdates => {
      let parsedUpdates = parseUpdates(playerUpdates[0])
      updatesHandler(parsedUpdates)
    })

    /**
     * Server [request]: delete player
     * 
     * Client: deletes player
     */
     this.channel.on('playerRemove', playerID => {
      this.playerRemove(playerID)
    })
  }
}
