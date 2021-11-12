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
    let neighbors = []
  
    if (x - 1 >= 0) neighbors.push(map[x - 1][y]) 
    else neighbors.push(1)
    if (y + 1 < map[0].length) neighbors.push(map[x][y + 1])
    else neighbors.push(1)
    if ( x + 1 < map.length) neighbors.push(map[x + 1][y])
    else neighbors.push(1)
    if (y - 1 >= 0) neighbors.push(map[x][y - 1])
    else neighbors.push(1)
  
    return neighbors
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
    let positions = {up: 0, right: 1, down: 2, left: 3}
    for (let i = 0; i < this._bitMap.length; i++) {
      for (let j = 0; j < this._bitMap[0].length; j++) {
        let neighborValues = this.getNeighborValues(i, j, this._bitMap)
        let bitwiseSum = 0
        let bit = this._bitMap[i][j]
        if (bit) {
          if (neighborValues[positions.up]) bitwiseSum += 1
          if (neighborValues[positions.right]) bitwiseSum += 2
          if (neighborValues[positions.down]) bitwiseSum += 4
          if (neighborValues[positions.left]) bitwiseSum += 8

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

  drawPhaserTilemap(layerN, tileset, tilesetN=[12, 8, 13, 9, 0, 4, 1, 5, 15, 11, 14, 10, 3, 7, 2, 6]) {

    const getNumbersMap = (tilesetN) => {
      let numbersMap = []
      let positions = {up: 0, right: 1, down: 2, left: 3}
      for (let i = 0; i < this._bitMap.length; i++) {
        let row = []
        for (let j = 0; j < this._bitMap[0].length; j++) {
          let neighborValues = this.getNeighborValues(i, j, this._bitMap)
          let bitwiseSum = 0
          let bit = this._bitMap[i][j]
          if (bit) {
            if (neighborValues[positions.up]) bitwiseSum += 1
            if (neighborValues[positions.right]) bitwiseSum += 2
            if (neighborValues[positions.down]) bitwiseSum += 4
            if (neighborValues[positions.left]) bitwiseSum += 8

            // console.log(i, j, neighborValues, bitwiseSum, tilesetN[bitwiseSum])
            row.push(tilesetN[bitwiseSum])
          } 
          else {
            row.push(null)
          }
        }
        numbersMap.push(row)
      }
      return numbersMap   
    }
    let numbersMap = getNumbersMap(tilesetN)
    let tilemap = this._scene.make.tilemap({ data: numbersMap, tileWidth: this._tileSize, tileHeight: this._tileSize })
    let tilesetImage = tilemap.addTilesetImage(tileset)
    tilemap.createLayer(layerN, tilesetImage)
  }
}