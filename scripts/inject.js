window.__jzb_js_bridge__ = {
  name: 'jzb_jsbridge',
  topics: {},
  handlerQueue: {},
  params: {},
  on: function(topic, fn) {
    if (!this.topics[topic]) this.topics[topic] = []
    this.topics[topic].push(fn)
  },
  emit: function(...args) {
    var topic = args.shift()
    if (!this.topics[topic]) return
    for (var i = 0, l = this.topics[topic].length; i < l; i++) {
      var item = this.topics[topic][i]
      item.apply(this, args)
    }
  },
  init: function() {
    var _that = this
    var readyBridge = document.createEvent('Events')
    readyBridge.initEvent('JZBAppWebViewJSBridgeReady')
    window.JZBAppWebViewJSBridge = {
      callHandler: function(...args) {
        _that.snapshot(...args)
        const id = args.shift()
        _that.handlerQueue[id] = args
      }
    }
    document.dispatchEvent(readyBridge)
    window.addEventListener('message', function(e) {
      if (!e || !e.data) return
      if (e.data.__jzb_source__ === 'jzb_sId') {
        _that.runQueue(e.data.sId, e.data.succses)
      } else if (e.data.__jzb_source__ === 'jzb_setup') {
        _that.params[e.data.name] = e.data.value.split(';')
      } else if (e.data.__jzb_source__ === 'jzb_reload') {
        window.location.reload(true)
      }
    }, false)
    this.on('jsbridge:snapshot', this.snapshot.bind(this))
    this.on('jsbridge:init', this.sdklist.bind(this))
  },
  runQueue(sid, succses) {
    if (!succses) {
      delete window.__jzb_js_bridge__.handlerQueue[sid]
      return
    }

    var name = window.__jzb_js_bridge__.handlerQueue[sid][0]
    window.__jzb_js_bridge__.handlerQueue[sid].forEach(item => {
      if (typeof item === 'function') {
        if (this.params[name] && this.params[name].length) item(...this.params[name])
        else item()
        var opt = {
          '__jzb_source__': this.name,
          isCallbackStatus: true,
          sId: sid,
          params: []
        }
        window.postMessage(opt, '*')
      }
    })
  },
  snapshot: function(...args) {
    var sId = args.shift()
    var handlerName = args.shift()
    var fn = args.filter(item => typeof item === 'function')
    var params = args.filter(item => typeof item !== 'function')
    if (params && params.length && params[0] !== undefined) {
      var errtype = params[1]
      params = JSON.parse(params[0])
    }
    else params = {}
    var opt = {
      '__jzb_source__': this.name,
      sId: sId,
      handlerName: handlerName,
      isCallback: !!fn.length,
      params: params,
      errtype: errtype || false
    }
    window.postMessage(opt, '*')
  },
  sdklist: function(bridge) {
    if (!bridge.apis) return
    let apis = []
    for (var key in bridge.apis) {
      var obj = {}
      obj.handlerName = key
      obj.scheme = bridge.apis[key].scheme
      obj.desc = bridge.apis[key].desc
      apis.push(obj)
    }
    window.postMessage({
      '__jzb_source__': this.name,
      apis: apis
    }, '*')
  }
}

window.__jzb_js_bridge__.init()
