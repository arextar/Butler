;(function(){
  
  // Logger class
  function Logger () {
    this.hooks = []
    this.hookl = 0
    this.groups = []
    this.groupl = 0
    this.counts = {}
    this.timers = {}
    this.options = {}
    this.id = Math.round(Math.random() * 1e7) + ''
  }
  
  Logger.prototype = {
    // Expose the Logger class to allow use of butler.Logger
    Logger: Logger,
    
    
    // Console functions
    log: function () {
      log(this, 'log', arguments)
    },
    
    err: function () {
      log(this, 'error', arguments)
    },
    
    warn: function () {
      log(this, 'warn', arguments)
    },
    
    info: function () {
      log(this, 'info', arguments)
    },
    
    
    // Special logs
    time: function (id) {
      this.timers[id] = +new Date()
    },
    
    timeEnd : function (id) {
      if (this.timers[id]) {
        var elapsed = +new Date() - this.timers[id]
        log(this, 'time', [id + ':', elapsed, 'ms'])
        delete this.timers[id]
      }
    },
    
    count: function (id) {
      id in this.counts || (this.counts[id] = 0)
      log(this, 'count', [id + ":", ++this.counts[id]])
    },
    
    assert: function (expression) {
      if (!expression) {
        var args = castArray(arguments, 1)
        log(this, 'error', args)
        throw new Error(args.join(' '))
      }
    },
    
    
    //Grouping
    group: function (id) {
      this.groups[this.groupl++] = id
      log(this, 'group', [id])
    },
    
    groupEnd: function (id) {
      if (~indexOf.call(this.groups, id)) {
        var s
        while (s = this.groups[--this.groupl]) {
          log(this, 'groupEnd', [s])
          if (s === id) break
        }
        
      }
    },
    
    // Library functions
    set: function (option, value) {
      this.options[option] = value
    },
    
    hook: function (fn, query) {
      if (query) {
        query = RegExp(query)
        this.hooks[this.hookl++] = function (log) {
          if (query.test(log.msg)) fn(log)
        }
      }
      else
      {
        this.hooks[this.hookl++] = fn
      }
    },
    
    
    // Utility functions
    throttle: function (fn, ms) {
      var waiting = false
      return function () {
        if (!waiting) {
          fn.apply(this, arguments)
          waiting = true
          setTimeout(function () {
            waiting = false
          }, ms)
        }
      }
    }
  }
  
  var slice = [].slice,
  indexOf = [].indexOf || function(){}
  
  
  function log (logger, type, args) {
    // Initiate the main array if the first argument is a string
    var main = typeof args[0] === 'string' ? [args[0]] : [],
    
    // Initialize counters
    c = main.length, i = c, v, l,
    
    // Initialize object counter and array
    objv = [], objl = 0,
    
    // Cache the value for the array of hook functions
    hooks = logger.hooks
    
    // If a string was given, replace things in the format of %s, %d, %i, etc.
    if(main[0]) main[0] = main[0].replace(/%([sdifo])/g, function(_, type, offset){
      var v = args[i++]
      if (typeof v === 'object') {
        objv[objl++] = inspect(args[i++], offset)
        return ""
      }
      
      return v
    });
    
    // Start the length counter to remember positions for embedded objects
    l = main[0] ? main[0].length : 0
    
    // Go through the remaining arguments, appending them if they are strings or inspecting them otherwise
    while(i in args){
      v = args[i++]
      if (typeof v !== 'string') {
        objv[objl++] = inspect(v, l ? l + 1 : 0)
        l += 1
        main[c++] = ""
      }
      else
      {
        l += 1 + v.length
        main[c++] = v
      }
    }
    
    // Create a log object and trigger hooks
    v = {id: logger.id, type: type, msg: main.join(" "), oargs: castArray(args), ts: +new Date}
    
    if(objl) v.obj = objv
    
    for(i = 0; c = hooks[i++];) c.call(logger, v)
  }
  
  // A utility to create a JSON-friendly object describing an HTML node
  function inspect_node (obj, index, hide_inspected) {
    switch (obj.nodeType) {
      case 1:
        var attrs = {}, children = [], i = 0, childnodes = obj.childNodes, child, ret
        
        
        for(; child = childnodes[i];) {
          children[i++] = inspect_node(child, null, true)
        }
        
        childnodes = obj.attributes
        i = 0
        for(; child = childnodes[i++];) {
          attrs[child.name] = child.value
        }
        
        ret = {t: "Elem", n: obj.nodeName, a: attrs, c: children}
      break;
      case 2:
        ret = {t: "Attr", n: obj.name, v: obj.value}
      break;
      case 3:
        ret = hide_inspected ? obj.nodeValue : {t: "Text", v: obj.nodeValue}
      break;
      case 9:
        ret = {t: "Document", c: inspect_node(obj.documentElement, null, true)}
      break;
    }
    
    if (!hide_inspected) ret._insp = true
    if (index != null) ret = {i: index, v: ret}
    return ret
  }
  
  
  // Get the name of an object's constructor (little bit hacky)
  function getName (obj) {
    // Rule out anything with a non-Object hidden class (String, RegExp, Array, etc.)
    var name = Object.prototype.toString.call(obj).slice(8, -1)
    if (name !== 'Object') return name
    
    // If the constructor has a name and is actually referring to the constructor (*cough* prototypes), return that
    if (obj.constructor.name && obj instanceof obj.constructor) return obj.constructor.name
    
    var results = /function ([^\(]+)\(/.exec((obj).constructor.toString())
    return (results && results.length > 1) ? results[1] : 'Unknown'
  }
  
  
  // A utility to create a JSON-friendly object describing the passed object (keeps info like class name and prototype)
  function inspect (obj, index) {
    
    if (typeof obj === 'function') {
      obj = {t: "Function", v: obj.toString && obj.toString().length <= 30 ? obj.toString() : 'function ' + (obj.name || '') + '(){...}', _insp: true}
      return index != null ? {v: obj, i: index} : obj
    }
    
    if (typeof obj !== 'object') return index != null ? {v: obj, i: index} : obj
    if (!obj) return null
    
    // Detect an event
    if ('type' in obj && ('target' in obj || 'srcElement' in obj)){
      // Set type as null so it shows up first in the list
      var values = {type: null}, x
      for (x in obj) {
        // Remove 'view' because it's the window object, the window object is huge and should only be logged purposefully
        if (obj.hasOwnProperty(x) && x !== 'view') {
          values[x] = inspect(obj[x])
        }
      }
      x = {t: 'Event', v: values, p: null,  _insp: true}
      return index != null ? {v: x, i: index} : x
    }
    
    if (typeof obj.nodeType === 'number') {
      return inspect_node(obj, index)
    }
    
    var type = getName(obj)
    if (type === 'RegExp') {
      obj = {t: 'RegExp', v: obj + '', _insp: true}
      return index != null ? {v: obj, i: index} : obj
    }
    
    if (type === "Array") {
      var values = [], i = 0, l = obj.length
      
      for(; i < l; i++){
        values[i] = inspect(obj[i])
      }
      
      return index != null ? {v: values, i: index} : values
    }
    
    if (type === "Object"){
      var values = {}, x
      for (x in obj) {
        if (obj.hasOwnProperty(x)) {
          values[x] = inspect(obj[x])
        }
      }
      return index != null ? {v: values, i: index} : values
    }
    
    var values = {}, x
    for (x in obj) {
      if (obj.hasOwnProperty(x)) {
        values[x] = inspect(obj[x])
      }
    }
    
    x = {t: type, v: values, p: obj.constructor.prototype !== obj ? inspect(obj.constructor.prototype) : null,  _insp: true}
    
    return index != null ? {v: x, i: index} : x
  }
  
  // A utility to make an arguments object an array (TODO: make sure it's cross-browser)
  function castArray (arr, ind) {
    return slice.call(arr, ind)
  }
  
  // Expose a global 'butler' function
  var butler = new Logger()
  
  if (typeof window != 'undefined') window.butler = butler
  if (typeof module != 'undefined') module.exports = butler
  if (typeof self != 'undefined') self.butler = butler
})()