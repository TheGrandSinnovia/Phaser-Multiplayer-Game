import path from 'path'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import geckos from '@geckos.io/server'
import { iceServers } from '@geckos.io/server'

import pkg from 'phaser'
const { Scene } = pkg

import { Player } from './components/player.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerID = 0  // ID for the latest connected player
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
    return `${player.playerID},${Math.round(player.x).toString(36)},${Math.round(player.y).toString(36)},${
      player.dead === true ? 1 : 0
    },`
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

  setMap() {
    this.map = this.make.tilemap({ key: 'map1' })
    this.tileset = this.map.addTilesetImage('tilesheet', 'tiles')  // embedded Tiled tilesheet

    this.walls = this.map.createFromObjects('Walls', { classType: Phaser.Physics.Arcade.Sprite })

    this.ball = this.physics.add.staticImage(64, 64, 'ball').setScale(2).setCircle(16).refreshBody()
  }

  setGroups() {
    this.playersGroup = this.add.group()
    this.wallsGroup = this.add.group()

    this.walls.forEach(wall => {
      this.physics.add.existing(wall)

      wall.y = wall.y + wall.displayHeight
      wall.body.setEnable()
      wall.body.setImmovable()

      this.wallsGroup.add(wall)
    })
  }

  setCollisions() {
    // this.scenery.setCollisionByExclusion([-1])  // All tiles
    function collisionHandler (obj1, obj2) {
      console.log('Collision', Phaser.Math.RND.integerInRange(0, 100))
    }

    this.physics.add.collider(this.playersGroup)
    this.physics.add.collider(this.playersGroup, this.ball)
    this.physics.add.collider(this.playersGroup, this.walls, collisionHandler)
  }

  preload() {
    this.load.image('tiles', path.join(__dirname, '../../dist/assets/img/tilesets/tilesheet.png'))
		this.load.tilemapTiledJSON('map1', path.join(__dirname, '../../dist/assets/maps/map1.json'))

    this.load.image('ball', path.join(__dirname, '../../dist/assets/img/objects/ball.png'))
  }

  create() {
    this.setMap()
    this.setGroups()
    this.setCollisions()

    this.io.onConnection(channel => {
      /**
       * Client: user disconnects
       * 
       * Server [response]: deletes player
       */
      channel.onDisconnect(() => {
        console.log('Disconnect user ' + channel.id)
        this.playersGroup.children.each(player => {
          if (player.playerID === channel.playerID) {
            player.kill()
          }
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
        let dead = this.playersGroup.getFirstDead()
        if (dead) {
          dead.revive(channel.playerID, false)
        } else {
          this.playersGroup.add(new Player(this, channel.playerID, Phaser.Math.RND.integerInRange(100, 700)))
        }
      })

      /**
       * Client [request]: update player's move state
       * 
       * Server: sets new move
       */
      channel.on('playerMove', data => {
        this.playersGroup.children.iterate(player => {
          if (player.playerID === channel.playerID) {
            player.setMove(data)
          }
        })
      })

      channel.emit('ready')
    })
  }

  update() {
    let updates = ''
    this.playersGroup.children.iterate(player => {
      let update
      // Check if there has been any change in selected player attributes
      let x = Math.abs(player.x - player.prevX) > 0.5
      let y = Math.abs(player.y - player.prevY) > 0.5
      let dead = player.dead != player.prevDead
      // Save all players that need an update
      if (x || y || dead) {
        if (dead || !player.dead) {
          player.idle = false
          update = this.encodePlayerData(player)
        }
      }
      else if (!player.idle) {
        player.idle = true
        update = this.encodePlayerData(player)
      }
      if (update) {
        updates += update
      }
      // Save previous attribute data (before update)
      player.postUpdate()
    })

    if (updates.length > 0) {
      /**
       * Server [request]: update players
       */
      this.io.room().emit('updatePlayers', [updates])
    }
  }
}