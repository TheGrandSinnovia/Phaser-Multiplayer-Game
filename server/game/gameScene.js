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
    return `${player.playerID},${player.dead === true ? 1 : 0},${player.levelN},${Math.round(player.x).toString(36)},${Math.round(player.y).toString(36)},`
  }

  /**
   * Makes string cotaining all players' info
   * 
   * @return {string} All players info concatenated
   */
  getState() {
    let state = ''
    this.playersGroup.children.iterate(player => {
      state += this.encodePlayerData(player)
    })
    return state
  }

  setGroups() {
    this.playersGroup = this.add.group()
    this.wallsGroup = this.add.group()

    this.levelPlayers = {}
    this.levelWalls = {}
    this.levelWarps = {}
  }

  setLevel(levelN) {
    // this.level = this.make.tilemap({ key: 'level' + levelN })
    // this.tileset = this.level.addTilesetImage('tilesheet', 'tiles')  // embedded Tiled tilesheet

    // this.setWalls(levelN)
    // this.setWarps(levelN)
    // this.setCollisions(levelN)

    let map = new CellMap({
      scene: this,
      tileSize: 32,
      seed: 123456,
      preset: 'cave'
    })

    map.drawConsole()
    map.drawPhaserTilemap({layerN: 0, tileset: 'tilesCave', collision: true})
  }

  setWalls(levelN) {
    this.levelWalls[levelN] = this.level.createFromObjects('Walls', { classType: Phaser.Physics.Arcade.Sprite })
    this.levelWalls[levelN].forEach(wall => {
      this.add.existing(wall)
      this.physics.add.existing(wall)

      wall.y = wall.y + wall.displayHeight
      wall.body.setEnable()
      wall.body.setImmovable()
    })
  }

  setWarps(levelN) {
    this.levelWarps[levelN] = this.level.createFromObjects('Warp', { classType: Phaser.Physics.Arcade.Sprite })
    this.levelWarps[levelN].forEach(warp => {
      this.add.existing(warp)
      this.physics.add.existing(warp)

      warp.y = warp.y + warp.displayHeight
      warp.body.setEnable()
      warp.body.setImmovable()
    })
  }

  setCollisions(levelN) {
    function collisionHandler (obj1, obj2) {
      // console.log('Collision', Phaser.Math.RND.integerInRange(0, 100))
    }

    function warpHandler(player, warp) {
      let newLevelN = warp.name
      player.levelN = newLevelN
      console.log('Warp collision to level:', newLevelN, Phaser.Math.RND.integerInRange(0, 100))
    }

    this.physics.add.collider(this.levelPlayers[levelN])
    this.physics.add.collider(this.levelPlayers[levelN], this.levelWalls[levelN], collisionHandler)
    this.physics.add.collider(this.levelPlayers[levelN], this.levelWarps[levelN], warpHandler)
  }

  preload() {
    this.load.image('tilesCave',  path.join(__dirname, '../../dist/assets/img/tilesets/wang_cave.png'))

    this.load.image('tiles', path.join(__dirname, '../../dist/assets/img/tilesets/tilesheet.png'))
		this.load.tilemapTiledJSON('level1', path.join(__dirname, '../../dist/assets/levels/level1.json'))
		this.load.tilemapTiledJSON('level2', path.join(__dirname, '../../dist/assets/levels/level2.json'))

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
        Object.entries(this.levelPlayers).forEach(([levelN, players]) => {
          players.children.iterate(player => {
            if (player.playerID === channel.playerID) {
              player.kill()
            }
          })
        })
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

        let levelN = '1'
        if (!Object.keys(this.levelPlayers).includes(levelN)) {
          this.levelPlayers[levelN] = this.add.group()
        }
        let dead
        Object.values(this.levelPlayers).forEach(players => {
          dead = players.getFirstDead()
        })

        if (dead) {
          dead.revive(channel.playerID, false)
        }
        else {
          let playerNew = new Player(this, channel.playerID, Phaser.Math.RND.integerInRange(100, 700))
          playerNew.levelN = '1'
          this.levelPlayers[levelN].add(playerNew)
        }
        this.playerSpawned = true
        this.setLevel(levelN)
      })

      /**
       * Client [request]: update player's move state
       * 
       * Server: sets new move
       */
      channel.on('playerMove', data => {
        Object.entries(this.levelPlayers).forEach(([levelN, players])=> {
          players.children.iterate(player => {
            if (player.playerID === channel.playerID) {
              player.setMove(data)
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
    Object.entries(this.levelPlayers).forEach(([levelN, players]) => {
      players.children.iterate(player => {
        let playerUpdate
        // Check if there has been any change in selected player attributes
        let dead = player.dead != player.prevDead
        let warped = player.levelN != player.prevLevelN
        let x = Math.abs(player.x - player.prevX) > 0.5
        let y = Math.abs(player.y - player.prevY) > 0.5
        // Save all players that need an update
        if (this.playerSpawned || dead || warped || x || y) {
          if (dead || !player.dead) {
            player.idle = false
            playerUpdate = this.encodePlayerData(player)
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
        let prevLevelN = player.prevLevelN
        let levelN = player.levelN
        if (!Object.keys(this.levelPlayers).includes(levelN)) {
          this.levelPlayers[levelN] = this.add.group()
        }
        player.prevLevelN = player.levelN
        this.levelPlayers[prevLevelN].remove(player)
        this.levelPlayers[levelN].add(player)
        this.setLevel(levelN)
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
