import path from 'path'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import geckos from '@geckos.io/server'
import { iceServers } from '@geckos.io/server'

import pkg from 'phaser'
const { Scene } = pkg

import Player from './components/player.js'
import CellMap from './components/cellMap.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerID = 0  // ID for the latest connected player
    this.playerSpawned = false
  }

  init() {
    this.io = geckos({
      iceServers: process.env.NODE_ENV === 'production' ? iceServers : []
    })
    this.io.addServer(this.game.server)
  }

  /**
   * Sets the current ID for the latest connected player
   *
   * @return {integer} 
   */
  setPlayerID() {
    return this.playerID++
  }

  /** 
   * Makes string with player's info that will be sent through geckos
   * 
   * @return {string}
   */
  encodePlayerData(player) {
    return `${player.playerID},${player.dead === true ? 1 : 0},${player.mapN},${player.projectileFired},${player.projectileCollided},${Math.round(player.x).toString(36)},${Math.round(player.y).toString(36)},`
  }

  /**
   * Makes string cotaining all players' info
   * 
   * @return {string} All players info concatenated
   */
  getState() {
    let state = ''
    Object.values(this.mapPlayers).forEach(players => {
      players.children.iterate(player => {
        if (player.active) state += this.encodePlayerData(player)        
      })
    })
    return state
  }

  setGroups() {
    this.mapPlayers = {}
    this.mapWalls = {}
    this.mapWarps = {}

    this.mapProjectileCollidersPlayers = {}
    this.mapProjectileCollidersWalls = {}
  }

  setMap(mapN) {
    const setWalls = mapN => {
      this.mapWalls[mapN] = this.map.createFromObjects('Walls', { classType: Phaser.Physics.Arcade.Sprite })
      this.mapWalls[mapN].forEach(wall => {
        this.add.existing(wall)
        this.physics.add.existing(wall)
  
        wall.y = wall.y + wall.displayHeight
        wall.body.setEnable()
        wall.body.setImmovable()
      })
    }
  
    const setWarps = mapN => {
      this.mapWarps[mapN] = this.map.createFromObjects('Warp', { classType: Phaser.Physics.Arcade.Sprite })
      this.mapWarps[mapN].forEach(warp => {
        this.add.existing(warp)
        this.physics.add.existing(warp)
  
        warp.y = warp.y + warp.displayHeight
        warp.body.setEnable()
        warp.body.setImmovable()
      })
    }

    const setCollisions = mapN => {
      function collisionHandler(obj1, obj2) {
        // console.log('Collision', Phaser.Math.RND.integerInRange(0, 100))
      }

      function projectileHandler(obj, projectile) {
        projectile.collide()
        console.log('Projectile collision, ID:', projectile.projectileID, projectile.active, Phaser.Math.RND.integerInRange(0, 100))
      }
  
      function warpHandler(player, warp) {
        let newMapN = warp.name
        player.mapN = newMapN
        console.log('Warp collision to map:', newMapN, Phaser.Math.RND.integerInRange(0, 100))
      }
  
      this.physics.add.collider(this.mapPlayers[mapN])
      this.physics.add.collider(this.mapPlayers[mapN], this.mapWalls[mapN], collisionHandler)
      this.physics.add.collider(this.mapPlayers[mapN], this.mapWarps[mapN], warpHandler)

      this.mapPlayers[mapN].children.iterate(player => {
        this.mapProjectileCollidersPlayers[player.playerID] = this.physics.add.collider(this.mapPlayers[mapN], player.projectiles, projectileHandler)
        this.mapProjectileCollidersWalls[player.playerID] = this.physics.add.collider(this.mapWalls[mapN], player.projectiles, projectileHandler)
      })
    }

    this.map = this.make.tilemap({ key: 'map' + mapN })
    this.tileset = this.map.addTilesetImage('tilesheet', 'tiles')  // embedded Tiled tilesheet

    setWalls(mapN)
    setWarps(mapN)
    setCollisions(mapN)
  }

  setRandomMap(mapN) {
    let map = new CellMap({
      scene: this,
      tileSize: 32,
      seed: 12345678,
      preset: 'cave'
    })

    map.drawConsole()
    map.drawPhaserTilemap({mapN: mapN, layerN: 0, tileset: 'tilesCave', wallsGroup: 'mapWalls', collision: true})

    this.physics.add.collider(this.mapPlayers[mapN])
  }

  preload() {
    this.load.image('tilesCave',  path.join(__dirname, '../../dist/assets/img/tilesets/wang_cave.png'))

    this.load.image('tiles', path.join(__dirname, '../../dist/assets/img/tilesets/tilesheet.png'))
		this.load.tilemapTiledJSON('mapN1', path.join(__dirname, '../../dist/assets/maps/map1.json'))
		this.load.tilemapTiledJSON('mapN2', path.join(__dirname, '../../dist/assets/maps/map2.json'))

    this.load.image('ball', path.join(__dirname, '../../dist/assets/img/objects/ball.png'))
  }

  create() {
    this.setGroups()

    this.io.onConnection(channel => {
      /**
       * Client: user disconnects
       * 
       * Server [response]: kills player
       */
      channel.onDisconnect(() => {
        console.log('Disconnect user ' + channel.id)
        Object.entries(this.mapPlayers).forEach(([mapN, players]) => {
          players.children.iterate(player => {
            if (player.playerID === channel.playerID) {
              player.kill()
            }
          })
        })

        this.mapProjectileCollidersPlayers[channel.playerID].destroy()
        delete this.mapProjectileCollidersPlayers[channel.playerID]

        this.mapProjectileCollidersWalls[channel.playerID].destroy()
        delete this.mapProjectileCollidersWalls[channel.playerID]

        channel.room.emit('playerRemove', channel.playerID)
      })

      /**
       * Client [request]: new ID for connected player
       * 
       * Server [response]: set new ID for connected player
       */
      channel.on('getPlayerID', () => {
        channel.playerID = this.setPlayerID()
        channel.emit('setPlayerID', channel.playerID.toString(36))
      })

      /**
       * Client [request]: add new player
       * 
       * Server: creates new player instance and adds it to group
       */
      channel.on('playerAdd', data => {

        let mapN = 'N1'
        if (!Object.keys(this.mapPlayers).includes(mapN)) {
          this.mapPlayers[mapN] = this.add.group()
        }
        let dead
        Object.values(this.mapPlayers).forEach(players => {
          dead = players.getFirstDead()
        })

        if (dead) {
          dead.revive(channel.playerID, false)
        }
        else {
          let playerNew = new Player(this, channel.playerID, 0, 0)
          playerNew.mapN = 'N1'
          this.mapPlayers[mapN].add(playerNew)
        }
        this.playerSpawned = true
        if (mapN.startsWith('N')) this.setMap(mapN)
        else if (mapN.startsWith('R')) this.setRandomMap(mapN)
      })

      /**
       * Client [request]: update player's move state
       * 
       * Server: sets new move
       */
      channel.on('playerMove', data => {
        Object.entries(this.mapPlayers).forEach(([mapN, players])=> {
          players.children.iterate(player => {
            if (player.playerID === channel.playerID) {
              player.setMove(data)
            }
          })
        })
      })

      /**
       * Client [request]: update player's fire state
       * 
       * Server: sets new projectiles
       */
       channel.on('playerFire', () => {
        Object.entries(this.mapPlayers).forEach(([mapN, players])=> {
          players.children.iterate(player => {
            if (player.playerID === channel.playerID) {
              player.setFire()
            }
          })
        })
      })

      channel.emit('ready')
    })
  }

  update() {
    let playersUpdates = ''
    let playersWarped = []
    Object.entries(this.mapPlayers).forEach(([mapN, players]) => {
      players.children.iterate(player => {
        let playerUpdate
        // Check if there has been any change in selected player attributes
        let dead = player.dead != player.prevDead
        let warped = player.mapN != player.prevMapN
        let projectileFired = player.projectileFired > -1
        let projectileCollided = player.projectileCollided > -1
        let x = Math.abs(player.x - player.prevX) > 0.5
        let y = Math.abs(player.y - player.prevY) > 0.5
        // Save all players that need an update
        if (this.playerSpawned || dead || warped || projectileFired || projectileCollided || x || y) {
          if (dead || !player.dead) {
            player.idle = false
            playerUpdate = this.encodePlayerData(player)
            if (projectileFired) player.projectileFired = -1
            if (projectileCollided) player.projectileCollided = -1            
          }
        }
        else if (!player.idle) {
          player.idle = true
          playerUpdate = this.encodePlayerData(player)
        }
        if (playerUpdate) {
          playersUpdates += playerUpdate
        }
        // Save previous attribute data (before update)
        player.postUpdate()

        if (warped) {
          playersWarped.push(player)
        }
      })
    })

    if (playersWarped.length > 0) {
      playersWarped.forEach(player => {
        let prevMapN = player.prevMapN
        let mapN = player.mapN
        if (!Object.keys(this.mapPlayers).includes(mapN)) {
          this.mapPlayers[mapN] = this.add.group()
        }
        player.prevMapN = player.mapN
        this.mapPlayers[prevMapN].remove(player)
        this.mapPlayers[mapN].add(player)

        this.mapProjectileCollidersPlayers[player.playerID].destroy()
        delete this.mapProjectileCollidersPlayers[player.playerID]

        this.mapProjectileCollidersWalls[player.playerID].destroy()
        delete this.mapProjectileCollidersWalls[player.playerID]

        if (mapN.startsWith('N')) {
          this.setMap(mapN)
          this.mapWarps[mapN].forEach(warp => {
            if (warp.name === prevMapN) {
              let x
              let y
              switch (player.body.facing) {
                // Up
                case 11:
                  x = warp.x
                  y = warp.y - 32
                  break;
                // Down
                case 12:
                  x = warp.x
                  y = warp.y + 32
                  break;
                // Left
                case 13:
                  x = warp.x
                  y = warp.y - 50
                  break;
                // Right
                case 14:
                  x = warp.x
                  y = warp.y - 50
                  break;              
              }
              player.setPosition(x, y)
            }
          })
        }
        else if (mapN.startsWith('R')) this.setRandomMap(mapN)
      })
    }

    if (playersUpdates.length > 0) {
      this.playerSpawned = false
      /**
       * Server [request]: update players
       */
      this.io.room().emit('playersUpdate', [playersUpdates])
    }
  }
}
