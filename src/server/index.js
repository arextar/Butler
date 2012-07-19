var SERVER_PORT = process.argv[2]
var SERVER_HOST = process.argv[3]

var colors = require('colors')

function type (obj) {
  return {}.toString.call(obj).slice(8, -1).toLowerCase()
}

colors.setTheme({
  nil: 'grey',
  number: 'cyan',
  string: 'green',
  regexp: 'yellow',
  bool: 'blue',
  key: 'magenta',
  tag: 'underline',
  func: 'black'
});

colors.setTheme({
  log: 'grey',
  time: 'grey',
  count: 'grey',
  
  error: 'red',
  warn: 'yellow',
  info: 'cyan'
});

function prettify_special (obj) {
  if (typeof obj === 'string') return obj
  switch (obj.t) {
    case "Elem":
      var tag = obj.n.toLowerCase(), ret = '<' + tag.tag, attr = obj.a, c = obj.c

      for (x in attr) {
	ret += ' ' + x.key
	if (attr[x]) ret += '=' + attr[x].string
      }

      ret += '>'

      // Don't want to print a monster.
      if (c[0]) ret += prettify_special(c[0])
      if (c[1]) ret += prettify_special(c[1])
      if(c.length > 2)
      {
	ret += "...".nil
      }

      ret += '</' + tag.tag + '>'

      return ret
    break;
    case "Text":
      return obj.v
    break;
    case "Function":
      return obj.v.func
    break;
    case "RegExp":
      return obj.v.regexp
    break;
    // User-defined object
    default:
      var x, ret = [], i = 0, v = obj.v, p = obj.p && obj.p.v
      for (x in v) {
	ret[i++] = x.key + ": " + prettify(v[x])
      }

      if (p) for (x in p) {
	ret[i++] = x.nil + ": " + prettify(p[x])
      }

      return '<' + obj.t + ' ' + ret.join(', ') + '>'
    break;
  }
}

// Create a color coded string for given object
function prettify (obj) {
  if (obj === undefined) return 'undefined'.nil
  if (obj === null) return 'null'.nil
  if (typeof obj === 'number') return ('' + obj).number
  if (typeof obj === 'boolean') return ('' + obj).bool
  if (typeof obj === 'string') return ("'" + obj.replace(/'/g, "\\'") + "'").string
  if (Buffer.isBuffer(obj)) return (obj.inspect()).string
  if (type(obj) === 'regexp') return ('' + obj).regexp
  if (type(obj) === 'array') return '[' + obj.map(prettify).join(', ') + ']'

  if (obj._insp) {
    if (obj.t === 'Obect'){
      obj = obj.v
    }
    else
    {
      return prettify_special(obj)
    }
  }

  if (type(obj) === 'object') {
    var x, ret = [], i = 0
    for (x in obj) {
      ret[i++] = x.key + ": " + prettify(obj[x])
    }

    return '{' + ret.join(', ') + '}'
  }
}

var indent = 0

function show (log) {
  if (log._r) {}
  else if (log.type === 'group') {
    console.log((new Array(indent + 1)).join('  ') + log.msg.underline + ':')
    indent++
  }
  else if (log.type === 'groupEnd') {
    indent--
  }
  else
  {
    var msg = log.msg, obj = log.obj, i = obj && obj.length
    if (obj) for(; o = obj[--i];){
      msg = msg.slice(0, o.i) + prettify(o.v) + msg.slice(o.i)
    }
    console.log((new Array(indent + 1)).join('  ') + log.type[log.type] + ' - '.bold + msg)
  }
}

var http = require('http')

var map = {}, uid = function(){
  return Math.round(Math.random() * 1e7) + ''
}

http.createServer(function(req, res){
  res.writeHead(200, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Butler-Id'})
  res.end()
  
  if (req.method === 'POST') {		
    var data = ''
    
    req.on('data', function(d){
      data += d
    })

    req.on('end', function(){
      if (data) {
	JSON.parse(data).forEach(function(b){
	  if (b._identify) map[b.id] = b._identify
	  else show(b)
	})
      }
    })
  }
})
.listen(SERVER_PORT, SERVER_HOST)