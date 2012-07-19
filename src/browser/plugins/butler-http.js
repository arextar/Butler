// Sends logs to server over http as JSON strings, depends on JSON object
;(function(butler){
  var ls = typeof localStorage == 'undefined' ? false : localStorage, uid
  
  if (ls) uid = "butler-id" in ls ? ls['butler-id'] : ls['butler-id'] = '' + Math.round(Math.random() * 1e10)
  else {
    if (~(uid = document.cookie.indexOf('butler-id'))) uid = document.cookie.slice(uid + 10, uid + 20)
    else document.cookie = 'butler-id=' + (uid = Math.round(Math.random() * 1e10)) + '; expires=' + new Date(+new Date() + 3e10).toGMTString() + '; path=/'
  }
  
  function ident () {
    var name
    var ua = navigator.userAgent
    var os = ({iPhone: 'iOS ' + ios, iPad: 'iOS ' + ios, Win: "Windows", Mac: "Mac", Linux: "Linux", X11: "Unix"})[/iPhone|iPad|Win|Mac|Linux|X11/.test(ua)]
    var ios =  /OS ([_\d]+)/.exec(ua)
    
    // iOS
    if (/iPhone|iPad/.test(ua)) {
      name = (/iPad/.test(ua) ? 'iPad' : /iPod/.test(ua) ? 'iPod' : 'iPhone') + ' iOS ' + /OS ([_\d]+)/.exec(ua)[1].replace(/_/g, '.')
    }
    // Chrome
    else if(/Chrome/.test(ua)) {
      name = /Chrome\/[\w\.]+/.exec(ua)[0].replace(/\//, ' ')
    }
    // Firefox
    else if(/Firefox/.test(ua)) {
      name = /Firefox\/[\w\.]+/.exec(ua)[0].replace(/\//, ' ')
    }
    // Safari
    else if(/Safari/.test(ua)) {
      name = "Safari " + /Version\/([\w\.]+)/.exec(ua)[1]
    }
    // Opera
    else if(/Opera/.test(ua)) {
      name = /Version/.test(ua) ? "Opera " + /Version\/([\w\.]+)/.exec(ua)[1] : /Opera\/[\w\.]+/.exec(ua)[0].replace(/\//, ' ')
    }
    
    if (ios) ios = ios[1].replace(/_/g, '.')
    
    return {name: name, os: os}
  }
  
  butler.http = function (options) {
    
    options || (options = {})
    
    var push = options.override || ident(), server_timeout, url = options.url, flush_limit = options.flush_limit || 30
    
    return function (log) {
      var logs = this.logs || (this.logs = [])
      
      if (push) {
        logs.unshift({_r: push, session: butler.id, uid: uid})
        push = null
      }
      
      delete log.oargs
      logs.push(log)
      
      if(logs.length > flush_limit){
        return send(logs, url)
      }
      
      clearTimeout(server_timeout)
      server_timeout = setTimeout(function () {
        send(logs, url)
      }, 75)
    }
  }

  function send(logs, url){
    var xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    
    
    xhr.send('[' + logs.map(JSON.stringify).join(',') + ']')
    
    logs.length = 0
  }
}(butler));