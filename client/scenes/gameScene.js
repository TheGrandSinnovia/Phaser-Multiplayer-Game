import { Scene } from 'phaser'
import axios from 'axios'
import Player from '../components/player'
import Cursors from '../components/cursors'
import CellMap from '../components/cellMap'

export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.players = {}
    this.playerID
    this.mapN = 'N1'
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

  setMap(mapN) {
    this.map = this.make.tilemap({ key: 'map' + mapN })
    this.tileset = this.map.addTilesetImage('tilesheet', 'tiles')  // embedded Tiled tilesheet

    this.background = this.map.createLayer('Background', this.tileset)
    this.floor = this.map.createLayer('Floor', this.tileset)
    this.scenery = this.map.createLayer('Scenery', this.tileset).setDepth(100)
    this.doors = this.map.createLayer('Doors', this.tileset).setDepth(101)
  }

  setRandomMap(mapN) {
    let map = new CellMap({
      scene: this,
      tileSize: 32,
      seed: 12345678,
      preset: 'cave'
    })

    map.drawConsole()
    map.drawPhaserTilemap({mapN: mapN, layerN: 0, tileset: 'tilesCave', collision: false})
  }

  setWallsDebug(debug) {
    if (debug) {
      this.walls = this.map.createFromObjects('Walls', { classType: Phaser.Physics.Arcade.Sprite })
      this.wallsGroup = this.add.group()
  
      this.walls.forEach(wall => {
        wall.y = wall.y + wall.displayHeight
        wall.setDepth(200)
        // wall.setAlpha(0)

        this.wallsGroup.add(wall)
      })
    }
  }

  preload() {
    this.load.spritesheet('player', 'assets/img/player/elfy.png', {frameWidth: 32, frameHeight: 32})
    this.load.image('projectile', 'assets/img/objects/bullet7.png');

    this.load.image('ground', 'assets/img/objects/16x16_ground.png')
    this.load.image('tilesCave', 'assets/img/tilesets/wang_cave.png')

    this.load.image('tiles', 'assets/img/tilesets/tilesheet.png')
		this.load.tilemapTiledJSON('mapN1', 'assets/maps/map1.json')
    this.load.tilemapTiledJSON('mapN2', 'assets/maps/map2.json')
  }

  async create() {
    // LIMIT FPS
    this.physics.world.setFPS(60)

    new Cursors(this, this.channel)

    this.setMap('N1')
    this.setWallsDebug(false)

    const parseUpdates = updates => {
      if (typeof updates === undefined || updates === '') return []

      // const parseCollided = data => {
      //   data = data.split('|')
      //   data[0] = parseInt(data[0])
      //   if (data.length > 1) {
      //     data[1] = parseInt(data[1], 36)
      //     data[2] = parseInt(data[2], 36)          
      //   }
      //   return data
      // }

      // parse
      let u = updates.split(',')
      u.pop() // delete last empty string

      let u2 = []

      u.forEach((el, i) => {
        if (i % 8 === 0) {
          u2.push({
            playerID: u[i + 0],
            dead: parseInt(u[i + 1]) === 1 ? true : false,
            mapN: u[i + 2],
            damaged: parseInt(u[i + 3]) === 1 ? true : false,
            projectileFired: parseInt(u[i + 4]),
            projectileCollided: parseInt(u[i + 5]),
            // projectileCollided: parseCollided(u[i + 4]),
            x: parseInt(u[i + 6], 36),
            y: parseInt(u[i + 7], 36)
          })
        }
      })
      return u2
    }

    const updatesHandler = playersUpdates => {
      playersUpdates.forEach(playerUpdate => {
        if (this.playerID  !== undefined ) {
          if (this.playerID.toString() === playerUpdate.playerID) {
            if (playerUpdate.mapN != this.mapN) {
              this.mapN = playerUpdate.mapN
  
              this.background.destroy()
              this.floor.destroy()
              this.scenery.destroy()
              this.doors.destroy()
  
              if (this.mapN.startsWith('N')) {
                this.setMap(this.mapN),
                this.setWallsDebug(false)}
              else if (this.mapN.startsWith('R')) this.setRandomMap(this.mapN)
  
              // Only show players from this map
              Object.entries(this.players).forEach(([playerID, playerTarget]) => {
                if (playerTarget.mapN != this.mapN) {
                  console.log('Remove player', playerID, 'from this map:', this.mapN)
                  playerTarget.setAlpha(0)
                  // this.playerRemove(player.playerID)
                }
                else {
                  console.log('Show player', playerID, 'from this map:', this.mapN)
                  playerTarget.setAlpha(1)                
                }
              })
            }
          }
        }
      })

      playersUpdates.forEach(playerUpdate => {
        const { playerID, dead, mapN, damaged, projectileFired, projectileCollided, x, y } = playerUpdate
        const alpha = dead ? 0 : 1

        if (Object.keys(this.players).includes(playerID)) {
          let player = this.players[playerID]
          if (mapN === this.mapN) {
            player.setAlpha(alpha)
          }
          else {
            player.setAlpha(0)
          }
          player.mapN = mapN

          player.animate(x, y)
          player.setPosition(x, y)

          if (mapN === this.mapN && damaged) player.damaged = true
          if (mapN === this.mapN && projectileFired > -1) player.projectiles.fireProjectile(projectileFired, player.setFireDir())
          if (mapN === this.mapN && projectileCollided > -1) player.projectiles.collideProjectile(projectileCollided)
          // if (mapN === this.mapN && projectileCollided[0] > -1) player.projectiles.collideProjectile(projectileCollided)
        }
        else {
          console.log('New player! ID:', playerID, playerUpdate)

          let newPlayer = new Player(this, playerID, mapN, 0, 0, 'player')
          if (mapN === this.mapN) {
            newPlayer.setAlpha(alpha)
          }
          else {
            newPlayer.setAlpha(0)
          }          
          newPlayer.setDepth(99) // !Revise
          this.players = { ...this.players, [playerID]: newPlayer}
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
    } 
    catch(error) {
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
