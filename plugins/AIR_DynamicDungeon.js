//=============================================================================
// DynamicDungeon.js
//=============================================================================

/*:
 * @plugindesc Dynamically generate random dungeon map
 * @author Tychio
 * 
 * @help This plugin provide some methods for Game_Map to generate the random dungeon. This plugin depands on lodash.js library, pls download it https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js and move into js/libs folder. 
 *
 */

/*:zh
 * @plugindesc 动态生成地下城
 * @author Tychio
 * 
 * @help 本插件提供一些Game_Map上的方法用于生成随机地下城，依赖lodash包，需要下载lodash.js文件https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js，放入js/libs文件夹下。
 * 
 */
(function () {
  const parameters = PluginManager.parameters('DynamicDungeon');
  const freeZone = 1;
  
  const _DataManager_loadMapData = DataManager.loadMapData;

  Game_Map.prototype._dungeons = {};

  Game_Map.prototype.generateDungeon = function () {
    this._d_keepMap();
    const width = 10;
    const height = 10;
    const currentMapId = $gameMap.mapId();
    const cache = this._dungeons[currentMapId];
    if (cache && cache.expire > (new Date()).getTime()) {
      this._d_locate(cache.locale);
      return ;
    }
    const maze = this._d_maze(width, height);
    this._d_redraw(maze);
    const locale = this.pickupTile(freeZone);
    this._d_locate(locale);
    this._dungeons[currentMapId] = {
      expire: (new Date()).getTime() + 3600000,
      map: $dataMap,
      locale
    };
    this.setup(currentMapId);
    this.setDisplayPos(locale.x - $dataMap.width / 2, locale.y - $dataMap.height / 2);
  };
  
  Game_Map.prototype.updateDungeonCache = function(mapId) {
    this._dungeons[mapId] = null;
  };

  Game_Map.prototype.pickupTile = function(zoneNum) {
    const tiles = this.findZone(zoneNum);
    const beginTileIndex = _.sample(tiles);
    const x = beginTileIndex % $dataMap.width;
    const y = _.chain(beginTileIndex).divide($dataMap.width).floor().value();

    return { x, y };
  };

  Game_Map.prototype.findZone = function(zoneNum) {
    const tiles = [];
    _.chain($dataMap.data).slice(0 - ($dataMap.data.length / 6))
    .each((tile, index) => {
      if (tile === zoneNum) {
        tiles.push(index);
      }
    }).value();
    return tiles;
  };

  Game_Map.prototype._d_locate = function(locale) {
    const { x, y } = locale;
    const tileEvent = _.find($dataMap.events, env => {
      return env && env.pages && _.find(env.pages, page => {
        return _.find(page.list, snippet => {
          return snippet.code === 201
        });
      });
    });
    if (tileEvent) {
      tileEvent.x = x;
      tileEvent.y = y;
    }
    $gamePlayer.setPosition(x, y);
    $gamePlayer._newX = x;
    $gamePlayer._newY = y;
  };

  Game_Map.prototype._d_redraw = function(maze) {
    const roof = $dataMap.data[0];
    const wall = $dataMap.data[1];
    const ground = $dataMap.data[2];
    $dataMap.width = _.chain(maze).size().multiply(2).add(2).value();
    $dataMap.height = _.chain(maze).first().size().multiply(2).add(2).value();
    $dataMap.data = _.range(0, $dataMap.width * $dataMap.height * 6, 0);
    _.each(maze, (row, x) => {
      _.each(row, (cell, y) => {
        this._d_tile(x * 2, y * 2, 0, (cell.top || cell.left) ? wall : ground);
        this._d_tile(x * 2 + 1, y * 2, 0, cell.top ? wall : ground);
        this._d_tile(x * 2, y * 2 + 1, 0, cell.left ? wall : ground);
        this._d_tile(x * 2 + 1, y * 2 + 1, 0, ground);

        this._d_tile(x * 2, y * 2, 5, (cell.top || cell.left) ? 0 : freeZone);
        this._d_tile(x * 2 + 1, y * 2, 5, cell.top ? 0 : freeZone);
        this._d_tile(x * 2, y * 2 + 1, 5, cell.left ? 0 : freeZone);
        this._d_tile(x * 2 + 1, y * 2 + 1, 5, freeZone);
      });
      this._d_tile(x * 2, maze[x].length * 2, 0, wall);
      this._d_tile(x * 2 + 1, maze[x].length * 2, 0, wall);
    });
  };

  Game_Map.prototype._d_maze = function(width, height) {
    const seed = _.range(width).map(() => {
      return _.range(height).map(() => {
        return { top: true, left: true, enter: true, back: true };
      })
    });

    const begin = { 
      x: _.random(0, width - 1),
      y: _.random(0, height - 1)
    };

    return this._d_recursive(seed, begin);
  };

  Game_Map.prototype._d_tile = function(x, y, z, val) {
    const map = $dataMap.data;
    const pX = x;
    const pY = y * $dataMap.width;
    const pZ = z *( $dataMap.height * $dataMap.width);
    if (val){
      map[(pY + pX + pZ)] = val;
    } else {
      return map[(pY + pX + pZ)];
    }
  };

  Game_Map.prototype._d_recursive = function(maze, pointer, prev) {
    prev = prev || pointer
    const current = maze[pointer.x] && maze[pointer.x][pointer.y];
    if (!current || !current.enter) {
      return;
    }
    current.enter = false;

    if (pointer.x > prev.x) {
      current.left = false;
    }
    if (pointer.x < prev.x) {
      maze[prev.x][prev.y].left = false;
    }
    if (pointer.y > prev.y) {
      current.top = false;
    }
    if (pointer.y < prev.y) {
      maze[prev.x][prev.y].top = false;
    }

    _.chain([
      { ...pointer, x: pointer.x + 1 },
      { ...pointer, x: pointer.x - 1 },
      { ...pointer, y: pointer.y + 1 },
      { ...pointer, y: pointer.y - 1 }
    ]).sortBy(() => _.random(0, 9))
    .filter(pnt => (pnt.x !== prev.x) || (pnt.y !== prev.y))
    .each(nextPointer => {
      this._d_recursive(maze, nextPointer, pointer);
    }).value();

    return maze;
  };

  Game_Map.prototype._d_keepMap = function () {
    const caches = this._dungeons;
    DataManager.loadMapData = function (mapId) {
      const cache = caches[mapId];
      if (cache && cache.expire > (new Date()).getTime()) {
        window.$dataMap = cache.map;
        DataManager.onLoad(window.$dataMap);
      } else {
        _DataManager_loadMapData.call(this, mapId);
      }
    };

    this._d_keepMap = _.noop;
  };
})();
