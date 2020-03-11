!function(W, D, undefined) {
  var JZBAppWebViewJSBridge = W.JZBAppWebViewJSBridge = {
    registerHandler: registerHandler,
    callHandler: callHandler,
    disableJavscriptAlertBoxSafetyTimeout: function() {},
    _fetchQueue: _fetchQueue,
    _handleMessageFromObjC: _handleMessageFromObjC
  };

  var readyBridge = D.createEvent('Events');
  readyBridge.initEvent('JZBAppWebViewJSBridgeReady');
  readyBridge.bridge = JZBAppWebViewJSBridge;
  D.dispatchEvent(readyBridge);

  var CUSTOM_PROTOCOL_SCHEME = 'https';
  var QUEUE_HAS_MESSAGE = '__wvjb_queue_message__';
  var messageHandlers = {};
  // 回调集
  var responseCallbacks = {};
  // 发送消息队列
  var sendMessageQueue = [];
  // 消息id
  var uniqueId = 1;

  // 注册线程 往数组里面添加值
  function registerHandler(handlerName, handler) {
    messageHandlers[handlerName] = handler;
  }

  function callHandler(handlerName, data, responseCallback) {
    if (arguments.length === 2 && typeof data === 'function') {
      responseCallback = data;
      data = undefined;
    }

    _doSend({
      handlerName: handlerName,
      data: data
    }, responseCallback);
  }

  function _doSend(message, responseCallback) {
    if (responseCallback) {
        var callbackId = 'cb_' + (uniqueId++) + '_' + new Date().getTime();
        responseCallbacks[callbackId] = responseCallback;
        message.callbackId = callbackId;
    }

    sendMessageQueue.push(message);
    messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE;
  }

  // Native通过以下方法统一处理存储在sendMessageQueue中的数据
  function _fetchQueue() {
		var messageQueueString = JSON.stringify(sendMessageQueue);
		sendMessageQueue = [];
		return messageQueueString;
  }

  //提供给native使用,
  function _handleMessageFromObjC(messageJSON) {
    setTimeout(function() {
      var message = JSON.parse(messageJSON);
      var responseCallback;
      // 前端主动调用的Callback
      if (message.responseId) {
        responseCallback = responseCallbacks[message.responseId];
        if (!responseCallback) {
          return;
        }
        responseCallback(message.responseData);
        delete responseCallbacks[message.responseId];
      } else {
        // Native主动调用
        //直接发送
        if (message.callbackId) {
          var callbackResponseId = message.callbackId;
          responseCallback = function(responseData) {
            _doSend({
              responseId: callbackResponseId,
              responseData: responseData
            });
          };
        }

        var handler = messageHandlers[message.handlerName];
        //查找指定handler
        try {
          handler(message.data, responseCallback);
        } catch (exception) {
          if (typeof console != 'undefined') {
            console.error("JZBAppWebViewJSBridge: WARNING: javascript handler threw.", message, exception);
          }
        }
      }
    }, 0);
  }

  var messagingIframe = document.createElement('iframe');
	messagingIframe.style.display = 'none';
  // messagingIframe.src = CUSTOM_PROTOCOL_SCHEME + '://' + QUEUE_HAS_MESSAGE;
  messagingIframe.src = ''
  document.documentElement.appendChild(messagingIframe);
}(window, document)
