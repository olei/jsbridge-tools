// 注入依赖
function injectCustomJs() {
	var jsPath = 'scripts/inject.js'
	var temp = document.createElement('script')
	temp.setAttribute('type', 'text/javascript')
	temp.src = chrome.extension.getURL(jsPath)
	temp.onload = function() {
		this.parentNode.removeChild(this)
	}
	document.head.appendChild(temp)
}
var timer = setInterval(() => {
  if (document.head) {
    clearInterval(timer)
    injectCustomJs()
  }
}, 5)

window.addEventListener('beforeunload', function(e) {
	try {
		chrome && chrome.runtime.sendMessage({
			reload: true
		})
	} catch(e) {}
})

window.addEventListener('message', function(e) {
  if (e && e.data && e.data.__jzb_source__ === 'jzb_jsbridge') {
    chrome.runtime.sendMessage(e.data)
	}
}, false)

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if(request.type === 'snapshot') {
		window.postMessage({__jzb_source__: 'jzb_sId', sId: request.snapshot, succses: request.succses}, '*')
	} else if(request.type === 'setup') {
		window.postMessage({__jzb_source__: 'jzb_setup', name: request.name, value: request.value}, '*')
	} else if(request.type === 'reload') {
		window.postMessage({__jzb_source__: 'jzb_reload'}, '*')
	}
	sendResponse('收到消息！')
})
