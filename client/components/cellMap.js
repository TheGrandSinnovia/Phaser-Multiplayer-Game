import { Map, RNG } from 'rot-js'

/**
 * Cellular map creation with handy parameters for Phaser
 * @class CellMap
 * @extends {Map.Cellular}
 */
export default class CellMap extends Map.Cellular {
  /**
   * Creates an instance of CellMap.
   * @param {Object} parameters - Parameters to construct the map
   * @param {Object} parameters.scene - Phaser Scene or object that contains the width and height of the map
   * @param {number} parameters.tileSize - Size of individual tile to be rendered (same width and height)
   * @param {number} parameters.seed - Number used for RNG
   * @param {string} parameters.preset - Name of prestablished data to be used
   * @param {number} parameters.probability - If background is 0, values closer to 1 make map fuller. If background is 1, the opposite
   * @param {number} parameters.iterations - Number of times to loop map creation
   * @param {number} parameters.background - Choose what number will be considered empty space (invert empty space)
   * @param {Object} parameters.options - Options for cell generation and empty space connection
   * @memberof CellMap
   */
  constructor({scene, tileSize = 1, seed = 0, preset, probability = 0.5, iterations = 1, background = 0, options} = {}) {
    let presets = {
      cave: {
        probability: 0.6,
        iterations: 10,
        background: 1,
        options: {
          born: [6, 7, 8],
          survive: [4, 5, 6, 7, 8],
          connected: true
        }
      }
    }
    let { width, height } = Object.getPrototypeOf(scene.constructor).name.includes('Scene') ? scene.sys.game.canvas || {} : scene || {}
    if (preset) var { probability, iterations, background, options } = presets[preset]

    super(width / tileSize, height / tileSize, options)

    this._scene = scene
    this._tileSize = tileSize

    this._seed = seed
    this._probability = probability
    this._iterations = iterations
    this._background = background

    this._bitMap = []

    RNG.setSeed(this._seed)

    this.randomize(this._probability)
    for (let i = 0; i < this._iterations; i++) this.create()
    if (this._options) if (Object.keys(this._options).includes('connected')) if (this._options['connected']) this.connect()
    this.setBitMap()
    this.trimMap()
  }

  connect(callback = () => {}, value = 0, connectionCallback) {
    try {
      value = this._background ? !value : value
      super.connect(callback, value, connectionCallback)
    }
    catch(e) {
      console.log('No space to connect')
    }
  }

  getNeighborValues(x, y, map) {
    let neighbors = [];

    // North
    (x - 1 >= 0) ? neighbors.push(map[x - 1][y]) : neighbors.push(1);
    // NorthEast
    (x - 1 >= 0 && y + 1 < map[0].length) ? neighbors.push(map[x - 1][y + 1]) : neighbors.push(1);
    // East
    (y + 1 < map[0].length) ? neighbors.push(map[x][y + 1]) : neighbors.push(1);
    // SouthEast
    (x + 1 < map.length && y + 1 < map[0].length) ? neighbors.push(map[x + 1][y + 1]) : neighbors.push(1);
    // South
    (x + 1 < map.length) ? neighbors.push(map[x + 1][y]) : neighbors.push(1);
    // SouthWest
    (x + 1 < map.length && y - 1 >= 0) ? neighbors.push(map[x + 1][y - 1]) : neighbors.push(1);
    // West
    (y - 1 >= 0) ? neighbors.push(map[x][y - 1]) : neighbors.push(1);
    // NorthWest
    (x - 1 >= 0 && y - 1 >= 0) ? neighbors.push(map[x - 1][y - 1]) : neighbors.push(1);

    return neighbors;
  }

  /**
   * Transposes map, converts it to binay and inverts 1s and 0s if needed
   * @memberof CellMap
   */
  setBitMap() {
    let map = []
    for (let j = 0; j < this._height; j++) {
      let row = []
      for (let i = 0; i < this._width; i++) {
        let bit = this._map[i][j] ? 1 : 0
        if (this._background) bit = 1 - bit
        row.push(bit)
      }
      map.push(row)      
    }
    this._bitMap = map
  }

  /**
   * Remove extra bits
   * @memberof CellMap
   */
  trimMap() {
    let positions = {north: 0, northEast: 1, east: 2,  southEast: 3, south: 4, southWest: 5, west: 6, northWest: 7}
    for (let i = 0; i < this._bitMap.length; i++) {
      for (let j = 0; j < this._bitMap[0].length; j++) {
        let neighborValues = this.getNeighborValues(i, j, this._bitMap)
        let bitwiseSum = 0
        let bit = this._bitMap[i][j]
        if (bit) {
          if (neighborValues[positions.north]) bitwiseSum += 1
          if (neighborValues[positions.east]) bitwiseSum += 2
          if (neighborValues[positions.south]) bitwiseSum += 4
          if (neighborValues[positions.west]) bitwiseSum += 8

          if ([0, 1, 2, 4, 5, 8, 10].includes(bitwiseSum)) this._bitMap[i][j] = 0
        }
      }
    }
  }

  /**
   * Render map in array of arrays
   * @return {Array} Map with cell info
   * @memberof CellMap
   */
  drawArray() {
    return this._bitMap
  }

  /**
   * Render map in console
   * @param {string|Array} charType - Symbols to be used to render map [empty, full]
   * @memberof CellMap
   */
  drawConsole(charType = 'unicode') {
    let blockChars={unicode: [' ', '\u2588'], ascii: ['·', '#'], user: []}
    if (charType != 'unicode' && charType != 'ascii') {
      blockChars['user'] = blockChars['user'].concat(charType)
      charType = 'user'
    }
    let cellMap = ''
    for (let i = 0; i < this._bitMap.length; i++) {
      for (let j = 0; j < this._bitMap[0].length; j++) {
        let bit = this._bitMap[i][j]
        if (bit) cellMap += blockChars[charType][1]
        else cellMap += blockChars[charType][0]
      }
      cellMap += '\n'
    }
    console.log(cellMap)
  }

  /**
   * Render map in Phaser Scene
   * @param {string|Array} charType - Image keys to be used to render map [empty, full]
   * @memberof CellMap
   */
  drawPhaserImages(images = []) {
    for (let i = 0; i < this._bitMap.length; i++) {
      for (let j = 0; j < this._bitMap[0].length; j++) {
        let bit = this._bitMap[i][j]
        let x = i * this._tileSize + this._tileSize / 2
        let y = j * this._tileSize + this._tileSize / 2
        if (bit) this._scene.physics.add.staticImage(x, y, images[1])
        else this._scene.physics.add.staticImage(x, y, images[0]).setTint(0x5564eb)
      }
    }
  }

  drawPhaserTilemap({mapN, layerN, tileset, tilesetN = [0, 8, 13, 9, 12, 4, 1, 5, 15, 11, 14, 10, 3, 7, 2, 6], collision = false} = {}) {

    const getNumbersMap = (tilesetN) => {
      let numbersMap = []
      let positions = {north: 0, northEast: 1, east: 2,  southEast: 3, south: 4, southWest: 5, west: 6, northWest: 7}
      for (let i = 0; i < this._bitMap.length; i++) {
        let row = []
        for (let j = 0; j < this._bitMap[0].length; j++) {
          let neighborValues = this.getNeighborValues(i, j, this._bitMap)
          let bitwiseSum4 = 0
          let bitwiseSum8 = 0
          let bit = this._bitMap[i][j]
          if (bit) {
            if (neighborValues[positions.north]) bitwiseSum4 += 1
            if (neighborValues[positions.east]) bitwiseSum4 += 2
            if (neighborValues[positions.south]) bitwiseSum4 += 4
            if (neighborValues[positions.west]) bitwiseSum4 += 8

            if (neighborValues[positions.north]) bitwiseSum8 += 1
            if (neighborValues[positions.northEast]) bitwiseSum8 += 2
            if (neighborValues[positions.east]) bitwiseSum8 += 4
            if (neighborValues[positions.southEast]) bitwiseSum8 += 8
            if (neighborValues[positions.south]) bitwiseSum8 += 16
            if (neighborValues[positions.southWest]) bitwiseSum8 += 32
            if (neighborValues[positions.west]) bitwiseSum8 += 64
            if (neighborValues[positions.northWest]) bitwiseSum8 += 128
            
            if (bitwiseSum4 === 15) {
              switch (bitwiseSum8) {
                // Stright
                case 127:
                  bitwiseSum4 = 5 // Tile 4
                  break;
                case 253:
                  bitwiseSum4 = 1 // Tile 8
                  break;
                // Corners
                case 119:
                  bitwiseSum4 = 2 // Tile 13
                  break;      
                case 221:
                  bitwiseSum4 = 4 // Tile 12
                  break;      
                case 223:
                  bitwiseSum4 = 10 // Tile 14
                  break;               
                case 247:
                  bitwiseSum4 = 8 // Tile 15
                  break;
              }
            }
            row.push(tilesetN[bitwiseSum4])
          } 
          else {
            row.push(null)
          }
        }
        numbersMap.push(row)
      }
      return numbersMap   
    }

    // Floor
    let floorMap = []
    for (let i = 0; i < this._bitMap.length; i++) {
      let row = []
      for (let j = 0; j < this._bitMap[0].length; j++) {
        row.push(0)
      }
      floorMap.push(row)      
    }

    let floorTilemap = this._scene.make.tilemap({ data: floorMap, tileWidth: this._tileSize, tileHeight: this._tileSize })
    let floorTilesetImage = floorTilemap.addTilesetImage(tileset)
    floorTilemap.createLayer(0, floorTilesetImage)

    // Walls
    let numbersMap = getNumbersMap(tilesetN)
    let wallsTilemap = this._scene.make.tilemap({ data: numbersMap, tileWidth: this._tileSize, tileHeight: this._tileSize })
    let wallsTilesetImage = wallsTilemap.addTilesetImage(tileset)
    let wallsLayer = wallsTilemap.createLayer(layerN, wallsTilesetImage)
    if (collision) {
      this._scene.physics.add.collider(this._scene.mapPlayers[mapN], wallsLayer)
      wallsLayer.setCollision(tilesetN.slice(1, -1))
    }
  }
}