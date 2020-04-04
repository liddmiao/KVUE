// 声明一个KVueL类
class Kvue {
  constructor(options) {
    this.$options = options
    this.$data = options.data
    // 响应式处理
    observe(this.$data)

    // 数据代理
    Proxy(this, '$data')

    // 编译模板
    new Compile(this, options.el)
  }
}

// 数据代理函数,将$data中的数据代理到vm上，这样我们就能使用vm.xx来获取数据
function Proxy (vm, prop) {
  // 遍历vm[prop]中的数据，使用object.defineProperty()将每一个数据绑定到vm上
  // 使用vm.xx时，如果是获取值，则会触发get，设置值触发set
  Object.keys(vm[prop]).forEach(key => {
    Object.defineProperty(vm, key, {
      get () {
        return vm[prop][key]
      },
      set (value) {
        vm[prop][key] = value
      }
    })
  })
}