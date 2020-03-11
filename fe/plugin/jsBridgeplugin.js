
const bridgeToolHook = window.__jzb_js_bridge__

export default function jsbridgePlugin(bridge) {
  if (!bridgeToolHook) return

  bridgeToolHook.emit('jsbridge:init', bridge)

  // bridge.subscribe((...args) => {
  //   bridgeToolHook.emit('jsbridge:snapshot', ...args)
  // })
}
