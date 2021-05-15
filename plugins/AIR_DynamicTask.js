//=============================================================================
// DynamicTask.js
//=============================================================================

/*:
 * @plugindesc Dynamically generate random tasks
 * @author Tychio
 * 
 * @param Levels
 * @type text[]
 * @desc The levels for a task. To sort from lower task's level, it's related to appear rate and depands on party members levels.
 * @default ["G", "F", "E", "D", "C", "B", "A", "S"]
 *
 * @param Credits
 * @type text[]
 * @desc The credits of task level. To sort from lower to higher, and the size should match level.
 * @default ["100", "500", "3000", "20000", "150000", "1200000", "10000000", "99999999"]
 * 
 * @param Types
 * @type text[]
 * @desc The types are texts which have to match finding an item, killing an enemy and talking a NPC.
 * @default ["find", "beat", "contact" ]
 *
 * @param NameTemplates
 * @type text[]
 * @desc a template of task name. it includes level, type and first step map name and target name. default would be like '[B] 前往冒险洞窟讨伐大蝙蝠'
 * @default ["[${level}]go to ${map} ${type} ${target}", "[${level}]explore ${map}", "[${level}]${type} the ${target}"]
 *
 * @param MapMark
 * @type text
 * @desc a mark of available map for task in the map name.
 * @default $
 *
 * @param NamesFile
 * @type text
 * @desc specify a name of path of json file as library of names. it's able to be called '$dataNames' The NPC and enemy would pick up a name randomly.
 * @default Names
 * 
 * @param UpRateMax
 * @type number
 * @desc specify a number as max limit to randomly generate the rate to promote the bonus rate when one of task steps is done.
 * @default 1.3
 * 
 * @help This plugin provide a class $gameTask for generating the random task. This plugin depands on lodash.js library, pls download it https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js and move into js/libs folder. 
 *
 */

/*:zh
 * @plugindesc 动态生成任务
 * @author Tychio
 * 
 * @param Levels
 * @type text[]
 * @desc 任务等级划分，需要从低到高级排序，与等级及出现率相关。
 * @default ["G", "F", "E", "D", "C", "B", "A", "S"]
 * 
 * @param Credits
 * @type text[]
 * @desc 任务积分等级，从低到高，与任务等级长度一直。
 * @default ["100", "500", "3000", "20000", "150000", "1200000", "10000000", "99999999"]
 * 
 * @param Types
 * @type text[]
 * @desc 类型文本，分别对应 找一个物品，杀一个怪，与NPC对话
 * @default [ "寻找", "讨伐", "联系" ]
 *
 * @param NameTemplates
 * @type text[]
 * @desc 任务名称的模板。包括等级，类型，和第一步的地图及目标名。默认模板可能的值是 '[B] 前往冒险洞窟讨伐大蝙蝠'
 * @default ["[${level}]前往${map}${type}${target}", "[${level}]探索${map}", "[${level}]委托${type}${target}"]
 *
 * @param MapMark
 * @type text
 * @desc 在地图名称中标记是否任务可用地图的符号
 * @default $
 * 
 * @param NamesFile
 * @type text
 * @desc 指定一个JSON文件的名称，并将它放入/data路径下，可以用$dataNames调用，它应该是一个数组，包含各种名称，NPC和怪物的名字会随机从中选取
 * @default Names
 * 
 * @param UpRateMax
 * @type number
 * @desc 指定一个数字作为倍率，在完成任务的一环之后提升奖励倍率。
 * @default 1.3
 * 
 * @help 本插件提供一个实例$gameTask用于生成随机任务，依赖lodash包，需要下载lodash.js文件https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js，放入js/libs文件夹下。
 * 
 */
Game_Task = (function () {
  const parseList = function (params, defaultParams) {
    params = params || defaultParams;
    if (!_.isArray(params)) {
      params = JSON.parse(params);
    }
    return params;
  };
  const toString = function (params, defaultParams) {
    params = params || defaultParams;
    if (!_.isString(params)) {
      params = String(params);
    }
    return params;
  };
  const toNumber = function (params, defaultParams) {
    return  Number(params) || defaultParams;
  };
  
  const parameters = PluginManager.parameters('DynamicTask');
  const levels = parseList(parameters['Levels'], ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S']);
  const creditLadders = parseList(parameters['Credits'], ['100', '500', '3000', '20000', '160000', '1500000', '24000000']);
  const typeMapping = parseList(parameters['Types'], ['寻找', '讨伐', '联系']);
  const nameTemplates = parseList(parameters['NameTemplates'], ['[${level}]前往${map}${type}<${target}>']);
  const mapMark = toString(parameters['MapMark'], '$');
  const namesFile = toString(parameters['NamesFile'], 'Names');
  const upRateMax = toNumber(parameters['UpRateMax'], 1.3);

  const createGameObjects = DataManager.createGameObjects
  DataManager.createGameObjects = function () {
    if (!window.$gameTask) {
      $gameTask          = new Game_Task();
      createGameObjects.apply(this, arguments);
    }
  };

  const makeSaveContents = DataManager.makeSaveContents
  DataManager.makeSaveContents = function () {
    const contents = makeSaveContents.apply(this, arguments);
    if (!contents.task) {
      contents.task = $gameTask;
    }
    return contents;
  };

  const extractSaveContents = DataManager.extractSaveContents
  DataManager.extractSaveContents = function (contents) {
    $gameTask = contents.task;
    extractSaveContents.apply(this, arguments);
  };

  DataManager.loadDataFile('$dataNames', namesFile + '.json');
  
  const _Game_Map_setup = Game_Map.prototype.setup
  Game_Map.prototype.setup = function (mapId) {
    _Game_Map_setup.call(this, mapId);
    $gameTask.enterMap(mapId, $dataMap);
  };

  function Game_Task () {
    this.initialize.apply(this, arguments);
  }

  Game_Task.prototype.constructor = Game_Task;

  Game_Task.prototype.TARGET = {
    ITEM: '1_item',
    ENEMY: '2_enemy',
    NPC: '3_npc',
  };

  Game_Task.prototype.STATUS = {
    DOING: '1_doing',
    DONE: '2_done'
  };

  Game_Task.prototype.CODE = {
    ENCOUNTER: 301,
    BATTLE_WIN: 601,
    BATTLE_ESC: 602,
    BATTLE_LOSE: 603,
    BATTLE_END: 604,
    SCRIPT: 355,
  };

  Game_Task.prototype.initialize = function () {
    this._levels = _.map(levels, (level, index) => ({ index, level, rate: 1 }));
    this._types = [ this.TARGET.ITEM, this.TARGET.ENEMY, this.TARGET.NPC ];
    this._ladders = creditLadders;
    this._mapMark = mapMark;
    this._typeMapping = {};
    _.each(this._types, (type, index) => {
      this._typeMapping[type] = typeMapping[index];
    });
    this._templates = nameTemplates;
    this._task = null;
    this._evaluate = {
      credits: 0,
      level: 0
    };
    this._cache = {};
    this._enter = _.noop;
    this._setupMap = false;
  };

  Game_Task.prototype.accept = function (task) {
    const capable = task.level.index <= this._evaluate.level;
    if (capable) {
      this._task = task;
      this._task.status = this.STATUS.DOING;
    }
    return capable;
  };

  Game_Task.prototype.abandon = function () {
    if (this._task) {
      this._evaluate.credits -= _.min([this._evaluate.credits, this._task.bonus.deduct]);
      this._transvaluation()
      this._task = null;
    }
    return this._evaluate;
  };

  Game_Task.prototype.finish = function (force) {
    const done = this._task && this._task.status === this.STATUS.DONE;
    if (done || force) {
      this._evaluate.credits += this._task.bonus.increase;
      this._transvaluation()
      const bonus = _.chain(this._task.level.index).add(1).multiply(10).value();
      const gold = _.chain(this._task.level.rate).multiply(Math.pow(bonus, 2)).round().value();
      $gameParty.gainGold(gold);
      this._task = null;
      return gold;
    } else {
      return false;
    }
  };

  Game_Task.prototype.current = function () {
    return this._task;
  };

  Game_Task.prototype.grade = function () {
    const { credits, level } = this._evaluate;
    return {
      credits,
      levelStr: this._levels[level].level,
      level
    };
  };

  Game_Task.prototype.onEnter = function (callback) {
    if (_.isFunction(callback)) {
      this._enter = callback;
    }
  };

  Game_Task.prototype.enterMap = function (mapId, map) {
    if (
      this._task 
      && this._task.status === this.STATUS.DOING
      && this._task.map && this._task.map.id === mapId 
      && this._enter
    ) {
      this._enter(map);
    }
  };

  Game_Task.prototype.clearCache = function () {
    this._cache = {};
  };

  Game_Task.prototype.generate = function (count) {
    const tasks = _.chain(count).range().map(() => {
      const level = this._pickup(this._levels, 8, 0.83);
      const type = this._pickup(this._types, 0, 1.8);
      const bonus = this._bonus(level.index);
      const steps = this._steps(level.index);
      const map = this._where();
      const name = this._build(level, type, map);
      if (this._cache[name]) {
        return _.first(this.generate(1));
      } else {
        this._cache[name] = 1;
        return { name, level, type, steps, map, bonus };
      }
    }).sortBy(task => 0 - task.level.index)
    .value();
    return tasks;
  };

  Game_Task.prototype.nextStep = function () {
    this._promote();
    this._task.steps--;
    if (this._task.steps) {
      this._task.map = this._where();
    } else {
      this._task.status = this.STATUS.DONE;
    }
  };

  Game_Task.prototype.generateEnemy = function (id, x, y, taskEvents) {
    const name = this._task.map.target;
    if (!_.find($dataMap.events, evt => evt && (evt.name === name))) {
      const enenmyEvt = {
        id,
        name,
        note: '',
        meta: {},
        pages: [ this._enemy(this._snippets([
          [this.CODE.ENCOUNTER, [0, 10, true, true]],
          this.CODE.BATTLE_WIN,
          [this.CODE.SCRIPT, taskEvents.win, 1],
          this.CODE.BATTLE_ESC,
          [this.CODE.SCRIPT, taskEvents.esc, 1],
          this.CODE.BATTLE_LOSE,
          [this.CODE.SCRIPT, taskEvents.lose, 1],
          this.CODE.BATTLE_END,
        ])) ],
        x,
        y,
      };
      $dataMap.events[id] = enenmyEvt;
      $gameMap.setupEvents();
    }
  };
  
  Game_Task.prototype._snippets = function (codes) {
    return _.map(codes, code => {
      code = _.isArray(code) ? code : [code];
      code[1] = code[1] || [];
      code[1] = _.isArray(code[1]) ? code[1] : [code[1]]
      return {
        code: code[0],
        parameters: code[1],
        indent: code[2] || 0
      };
    })
  };

  Game_Task.prototype._enemy = function (snippets) {
    const enemy = {
      "conditions": {
        "actorId": 1,
        "actorValid": false,
        "itemId": 1,
        "itemValid": false,
        "selfSwitchCh": "A",
        "selfSwitchValid": false,
        "switch1Id": 1,
        "switch1Valid": false,
        "switch2Id": 1,
        "switch2Valid": false,
        "variableId": 1,
        "variableValid": false,
        "variableValue": 0
      },
      "directionFix": false,
      "image": {
        "tileId": 0,
        "characterName": "Monster",
        "direction": 2,
        "pattern": 0,
        "characterIndex": 1
      },
      "list": snippets,
      "moveFrequency": 3,
      "moveRoute": {
        "list": [
          {
            "code": 0,
            "parameters": []
          }
        ],
        "repeat": true,
        "skippable": false,
        "wait": false
      },
      "moveSpeed": 2,
      "moveType": 1,
      "priorityType": 1,
      "stepAnime": false,
      "through": false,
      "trigger": 2,
      "walkAnime": true
    };
    return enemy;
  };

  Game_Task.prototype._pickup = function (list, damp, scope) {
    const digit = _.size(list);
    const grade = this._grade(digit, damp);
    return this._sample(list, scope, grade);
  };

  Game_Task.prototype._promote = function () {
    if (this._task) {
      const upRate = _.random(1, upRateMax, true);
      this._task.level.rate *= upRate;
      if (this._task.level.rate > Math.pow(upRateMax, 4)) {
        this._task.level.index = _.min([this._task.level.index + 1, this._levels.length - 1]);
        const oldLevel = this._task.level.level;
        this._task.level.level = this._levels[this._task.level.index];
        this._task.name = this._task.name.replace(oldLevel, this._task.level.level);
      }
    }
  };

  Game_Task.prototype._bonus = function (level) {
    const curLevel = this._ladders[level];
    const prevLevel = level > 0 ? this._ladders[level - 1] : 0;
    const section = curLevel - prevLevel;
    const increase = _.chain(section).divide(Math.pow(level + 2, 3))
      .multiply(_.random(0.8, 1.2)).round().value();
    const deduct = _.chain(section).divide(Math.pow(level + 2, 2))
      .multiply(_.random(0.5, 0.9)).round().value();
    return { increase, deduct };
  };

  Game_Task.prototype._steps = function (level) {
    const minLength = _.chain(level).add(1).multiply(0.4).round().value();
    const maxLength = _.chain(level).add(1).multiply(1.6).round().divide(2).round().value();
    return _.random(minLength, maxLength) + 1;
  };

  Game_Task.prototype._where = function () {
    const map = _.chain($dataMapInfos).filter(map => {
      return map && map.name && map.name.indexOf(this._mapMark) >= 0;
    }).sample().clone().value();
    map.target = this._name();
    return map;
  };

  Game_Task.prototype._build = function (levelObj, typeStr, mapObj) {
    const { name, target } = mapObj;
    const { level } = levelObj;
    const type = this._typeMapping[typeStr];
    const template = _.sample(this._templates);
    return ((level, map, type, target) => {
      let text;
      eval('text=\`' + template + '\`');
      return text;
    })(level, name.replace(this._mapMark, ''), type, target)
  };

  Game_Task.prototype._grade = function (digit, damp) {
    damp = damp || 0;
    const maxPartyLevel = 100;
    const meanActorLevel = _.meanBy($gameParty.battleMembers(), member => parseInt(member.level));
    const levelStep = maxPartyLevel / digit;
    const dampRate = _.max([(levelStep - damp), 0]) / levelStep;
    return _.round((meanActorLevel * dampRate) / levelStep);
  };

  Game_Task.prototype._sample = function (list, scope, focus) {
    scope = scope > 1 ? _.random(scope - 1, 1, true) : _.random(0, scope, true);
    const downRange = _.chain(1).subtract(scope).multiply(focus).floor().value();
    const upRange = _.chain(list).size().subtract(1).subtract(focus)
      .multiply(scope).add(focus).add(1).ceil().value();
    const sample = _.chain(list).slice(downRange, upRange).sample().value();
    return _.find(list, item => item === sample);
  };

  Game_Task.prototype._name = function () {
    return _.sample($dataNames);
  };

  Game_Task.prototype._transvaluation = function () {
    const level = _.findIndex(this._ladders, ladder => {
      return ladder > this._evaluate.credits
    });
    this._evaluate.level = level >= 0 ? level : this._ladders.length;
  };

  return Game_Task;
})();
