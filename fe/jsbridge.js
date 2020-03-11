import jsbridgePlugin from './jsBridgeplugin'
export class EventsClass {
  constructor() {
    this._uid = 0
    this._topics = {
      snapshot: []
    }
  }
  subscribe(topic, fn) {
    if (!this._topics[topic] && fn) this._topics[topic] = []
    else if (typeof topic === 'function') {
      fn = topic
      topic = 'snapshot'
    }
    const obj = {
      uid: this._uid++,
      fn
    }
    this._topics[topic].push(obj)
    return this._uid
  }
  publish(...args) {
    const topic = args.shift()
    if (!topic || !this._topics[topic]) return false
    this._topics[topic].forEach(item => {
      item.fn.apply(this, args)
    })
    return true
  }
  unsubscribe(id) {
    for (const key in this._topics) {
      this._topics[key].forEach((item, index) => {
        if (item.uid === id) {
          return this._topics[key].splice(index, 1)
        }
      })
    }
  }
}
/**
 * 创建和获取 jsbridge 基础类
 * @class ConnectClass
 * @extends EventsClass
 */
class ConnectClass extends EventsClass {
  constructor() {
    super()
    this.sId = 0
  }
  connect(run) {
    if (!this.isJzb) return
    let timer = null
    this._messge('jsbridge 开始创建连接...')
    this.status = 0
    return new Promise((resolve, reject) => {
      if (window.OLEIAppWebViewJSBridge) {
        resolve(true)
        _succses.call(this)
      } else {
        document.addEventListener('OLEIAppWebViewJSBridgeReady', () => {
          resolve(true)
          _succses.call(this)
        }, false)
        setTimeout(() => {
          if (!this.status) reject('链接可能存在问题, 暂未能连接端')
        }, 5000)
        timer = setInterval(() => {
          if (!this.status) this._messge('jsbridge 努力连接中...')
          else clearInterval(timer)
        }, 5000)
      }
    }).catch(e => {
      this._messge(`OLEIAppWebViewJSBridge: WARNING: ${e}`, 'warn')
    })

    function _succses() {
      this.status = 1
      this._messge('jsbridge 链接成功')
      if (this.isIos && this.isJzb) this.createWVJBIframe()
      run()
    }
  }
  createWVJBIframe() {
    const WVJBIframe = document.createElement('iframe')
    WVJBIframe.style.display = 'none'
    WVJBIframe.src = 'https://__bridge_loaded__'
    document.appendChild(WVJBIframe)
  }
  /**
   * jsbridge 主函数
   * @param handlerName 函数名
   * @param option 所需参数
   * @param callback native回调函数
  */
  callHandler(handlerName, options, callback) {
    // if (process.env.NODE_ENV === 'development') return
    const opt = []
    if (process.env.NODE_ENV === 'development') opt.push(this.sId++)
    opt.push(handlerName)
    options && opt.push(JSON.stringify(options))
    opt.push(callback)
    setTimeout(() => {
      window.OLEIAppWebViewJSBridge.callHandler(...opt)
    }, 10)
  }
  /**
   * @param messge
   * @param log type
   * TODO
  */
  _messge(e, type = '') {
    console[type || 'log'](e)
  }
  // jsbridge执行队列
  get handlerQueue() {
    return this._handlerQueue
  }
  // only-read获取app版本号
  get appVersion() {
    var matchs = navigator.userAgent.match(/patriarch\/(\d[0-9.]+)/i)
    if (matchs && matchs.length === 2) {
      return parseFloat(matchs[1].replace(/(\d\.)(\d)\.(\d)$/, '$1$2$3'))
    }
    return 0
  }
  get UA() {
    return navigator.userAgent.toLowerCase()
  }
  get isJzb() {
    return this.UA.match(/patriarch/i) || window.__olei_js_bridge__
  }
  get isMiniProgran() {
    return this.UA.match(/miniProgram/)
  }
  get isIos() {
    return this.UA.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/) && !this.isMiniProgran
  }
  get isAndroid() {
    return this.UA.match(/(Android);?[\s\/]+([\d.]+)?/i) && !this.isMiniProgran
  }
}

/**
 * jsbridge sdk
 * @class JzbBridgeClass
 * @extends ConnectClass
 */
class JzbBridgeClass extends ConnectClass {
  // 初始化
  init() {
    // 用户信息
    this.user_info = null
    // 执行队列
    this._handlerQueue = []
    this.connect(this.run.bind(this))
    this._lock = null
  }
  run() {
    this.mountApi()
    if (process.env.NODE_ENV === 'development') {
      jsbridgePlugin(this)
    }
    this._handlerQueue.length && this._dispatch()
  }
  // 安装api
  mountApi() {
    for (const key in this.apis) {
      this.subscribe(key, this.apis[key].handler)
    }
  }
  // 发布
  dispatch(...args) {
    if (!this.isJzb) {
      this._messge('jsbrdige调用失败, 目前项目未在家长帮app内', 'warn')
      return
    }
    this._lock && clearTimeout(this._lock)
    if (!args || !args.length) throw new Error('OLEIAppWebViewJSBridge dispatch 缺少必要参数')
    const handlerName = args.shift()
    if (typeof handlerName !== 'string') throw new TypeError('OLEIAppWebViewJSBridge dispatch 参数错误')
    this._handlerQueue.push([handlerName].concat([...args]))
    this._lock = setTimeout(this._dispatch.bind(this), 200)
  }
  _dispatch() {
    if (!this.status) return
    const headlerQueue = this._handlerQueue
    this._handlerQueue = []
    headlerQueue.forEach(item => {
      const handlerName = item.shift()
      const status = this.publish(handlerName, ...item)
      // 快照打印
      // this.publish('snapshot', handlerName, ...item)
      if (!status) this._messge(`OLEIAppWebViewJSBridge ${handlerName}: 方法不存在`, 'error')
    })
  }
  // 方法禁止传入对象
  get apis() {
    return {
      // 获取用户信息
      getUserInfoHandler: {
        handler: callback => {
          // if (this.appVersion <= 3) return
          this.callHandler('getUserInfoHandler', {}, callback)
        },
        scheme: {
          callback: true
        },
        desc: `获取用户信息`
      },
      // 关闭当前webview
      closeWebview: {
        handler: () => {
          this.callHandler('closeWebview', {})
        },
        scheme: {},
        desc: `关闭当前webview`
      },
      // web弹框  0代表一元购课分享框
      webToast: {
        handler: () => {
          this.callHandler('webToast', {})
        },
        scheme: {},
        desc: `web弹框  0代表一元购课分享框`
      },
      // webview 开始加载
      startRendering: {
        handler: () => {
          this.callHandler('startRendering', {})
        },
        scheme: {},
        desc: `webview 开始加载`
      },
      // 分销插码
      setUTMSource: {
        handler: (utm_source, url, cb) => {
          this.callHandler('setUTMSource', {
            utm_source: utm_source,
            url: url
          }, cb)
        },
        scheme: {
          utm_source: 'string',
          url: 'string',
          callback: true
        },
        desc: '分销插码'
      },
      shareBtn: {
        handler: (title, desc, img, url, display, btns, awardInfo, bigImage, ga, miniAppPath, miniAppId) => {
          var o = {
            'title': encodeURIComponent(title || ''),
            'desc': encodeURIComponent(desc || ''),
            'img': img || '',
            'url': url || '',
            'display': display || false,
            'btns': btns || '1,1,1,1,1,24',
            'awardInfo': awardInfo || {},
            'bigImage': bigImage || '',
            'ga': ga || '',
            'miniAppPath': miniAppPath || '', // 分享小程序的路径
            'miniAppId': miniAppId || '' // 分享小程序的appid
          }
          this.callHandler('shareBtn', o)
        },
        scheme: {
          title: 'string | undefined',
          desc: 'string | undefined',
          img: 'string | undefined',
          url: 'string | undefined',
          display: 'boolean | undefined',
          btns: 'string | undefined',
          awardInfo: 'object | undefined',
          bigImage: 'string | undefined',
          ga: 'string | undefined',
          miniAppPath: 'string | undefined',
          miniAppId: 'string | undefined'
        },
        desc: '分享按钮开关及文案'
      }
    }
  }
  install(Vue) {
    Vue.prototype.$jsbridge = this
  }
}

const bridge = new JzbBridgeClass()
bridge.init()

export default bridge
