chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.handlerName) {
    tools.apis && tools.handleSnapshot(request)
  }
  if (request.apis && request.apis.length) {
    var metheds = ''
    for(var i = 0; i < request.apis.length; i++) {
      metheds += (request.apis[i].handlerName + request.apis[i].desc + JSON.stringify(request.apis[i].scheme))
    }
    tools.init(request.apis)
  }
  if (request.isCallbackStatus) {
    tools.changeCallbackStatu(request.sId)
  }
  if (request.reload) {
    // window.location.reload(true)
    tools.clearList()
    tools.clearSetup()
  }
	// sendResponse('后台已收到消息：' + JSON.stringify(request))
})

var tools = {
  init: function(apis) {
    document.getElementById('reloadBtn').style.display = 'none'
    document.getElementById('info').style.display = ''
    this.apis = apis
    // tab标签绑定事件
    this.sdkBox = document.getElementById('sdk')
    this.main = document.getElementById('main')
    this.clear = document.getElementById('clear')
    this.bindTabsCtrl()
    this.setupList()
  },
  bindTabsCtrl: function() {
    this.tabs = document.querySelector('.tabs')
    this.tabs.addEventListener('click', a.bind(this), false)
    this.clear.addEventListener('click', this.clearList.bind(this), false)
    function a(e) {
      var tagName = e.target.tagName.toLowerCase()
      if (tagName === 'img') var subject = e.target.parentNode
      else var subject = e.target
      this.clearHi(this.tabs)
      this.hi(subject)
    }
  },
  changeCallbackStatu: function(sid) {
    var ele = document.getElementById('ele-' + sid)
    if (ele) {
      var sub = ele.querySelectorAll('.cbStatus')[0]
      sub.innerHTML = '<span style="color: #7fb80e">完成</span>'
    }
  },
  clearList: function() {
    this.main && (this.main.querySelector('.record').innerHTML = '')
  },
  hi: function(subject) {
    subject.className += ' cur'
    if (/list/ig.test(subject.className)) {
      this.sdkBox.style.display = ''
      this.main.style.display = 'none'
    } else {
      this.sdkBox.style.display = 'none'
      this.main.style.display = ''
    }
  },
  clearHi: function(tabs) {
    var tabList = tabs.querySelectorAll('.tab')
    tabList.forEach(item => {
      item.className = item.className.replace(/cur/ig, '').trim()
    })
  },
  handleSnapshot: function(snapshot) {
    var ele = document.createElement('li')
    ele.id = `ele-${snapshot.sId}`
    // TODO 调方法验证
    var desc = this.getDesc(snapshot.handlerName)
    var check = this.checkMethod(snapshot)
    if (!check) {
      var afterHtm = `<div class="status">
        <img src="./icons/forbidden.svg" alt="">
      </div>`
    } else if (!check.length) {
      var afterHtm = `<div class="status">
        <img src="./icons/check.svg" alt="">
      </div>`
    } else {
      var afterHtm = `<div class="status">
        <img src="./icons/close.svg" alt="">
      </div>`
      var err = this.htm(check)
    }
    var htm = afterHtm + `</div>
    <div class="info"><div class="title">调用方法名：${snapshot.handlerName}</div>`
    htm += snapshot.isCallback ? `<div class="cbStatusBox">执行回调：<span class="cbStatus">未执行</span></div>` : ''
    htm += JSON.stringify(snapshot.params) !== '{}' ? `<div>传入参数：${JSON.stringify(snapshot.params)}</div>` : ''
    htm += `<div style="font-size: 12px">方法描述：${desc}</div>`
    htm += err || ''
    htm += `</div>`
    ele.innerHTML = htm
    this.main.querySelector('.record').appendChild(ele)
    if(!check.length) {
      var succses = true
    }
    this.sendMessageToContentScript({type: 'snapshot', snapshot: snapshot.sId, succses: !!succses})
  },
  sendMessageToContentScript: function(message, callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
        if(callback) callback(response)
      })
    })
  },
  htm: function(arr) {
    var str = ''
    arr.forEach(item => {
      str += `<div class="desc"><div><img src="./icons/caution_filled.svg" alt=""></div><div class="err">${item}</div></div>`
    })
    return str
  },
  getObj(handlerName) {
    var o = this.apis.filter(item => item.handlerName === handlerName)
    if (o.length) return JSON.parse(JSON.stringify(o[0]))
    return false
  },
  getDesc(handlerName) {
    return this.getObj(handlerName) ? this.getObj(handlerName).desc : ''
  },
  checkMethod(snapshot) {
    var handlerName = snapshot.handlerName
    var o = this.getObj(handlerName)

    if (!o) return ['没有这个方法']
    // 没有scheme协商
    if (!o.scheme) return false
    var status = []
    if (!o.scheme.callback && snapshot.isCallback) status.push('不接受callback')
    delete o.scheme.callback
    // var params = Object.entries(o.scheme)
    for(var key in o.scheme) {
      if (!snapshot.params[key]) status.push(`${key}: 没有传这个参数`)
      else if (typeof snapshot.params[key] !== o.scheme[key]) status.push(`${key}: 参数类型应为${o.scheme[key]}。`)
    }

    // if (params.length) {
    //   params.forEach(item => {
    //     snapshot.params.forEach(i => {
    //       i[0] === item[0]
    //     })

    //     if (!snapshot.params[index]) {
    //       status.push(`${item[0]}: 没有传这个参数`)
    //     } else {
    //       item[1] !== typeof snapshot.params[index] && status.push(`${item[0]}: 参数类型应为${item[1]}。`)
    //     }
    //   })
    // }
    if (snapshot.errtype) status.push('参数超出，或最后参数非回调函数')

    return status
  },
  clearSetup: function() {
    document.getElementById('sdk').innerHTML = ''
  },
  setupList: function() {
    var _that = this
    this.apis.forEach(function(item) {
      if (!item.scheme || !item.scheme.callback) return
      var storage = window.localStorage
      var val = storage.getItem(item.handlerName) || ''
      var ele = document.createElement('div')
      ele.id = item.handlerName
      ele.className = 'ctrlList'
      ele.innerHTML = `<div class="name">${item.handlerName}：</div>
      <div><input type="text" value="${val}"></div>`
      document.getElementById('sdk').appendChild(ele)
      ele.querySelector('input').addEventListener('input', function(e) {
        storage.setItem(item.handlerName, e.target.value)
        _that.setup(item.handlerName, e.target.value)
      },false)
      _that.setup(item.handlerName, val)
    })
  },
  setup: function(handlerName, value) {
    this.sendMessageToContentScript({type: 'setup', name: handlerName, value: value})
  }
}

document.getElementById('reloadBtn').addEventListener('click', function() {
  tools.sendMessageToContentScript({type: 'reload'})
}, false)
