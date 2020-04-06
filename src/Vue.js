// 1、拿出数组的原型
// 2、克隆数组的原型，不然所有数组都变了
// 3、修改七个方法
// 4、覆盖需要响应式处理的数组的原型

const arrayProto = Array.prototype
const newProto = Object.create(arrayProto)
const methods = ['push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'splice']
methods.forEach(method => {
  newProto[method] = function () {
    // 执行这个方法原有的功能
    arrayProto[method].apply(this, arguments)
    // 这里添加一个更新通知,并重新对arr做响应式处理
    observe(this)
    console.log(method + '执行了！')
  }
})


// 声明一个KVueL类
class KVue {
  constructor(options) {
    this.$options = options
    this.$data = options.data
    // 响应式处理
    observe(this.$data)

    // 数据代理
    proxy(this, '$data')

    // 编译模板
    new Compile(this, options.el)
  }
}
// 数据劫持构造函数，对所有属性做响应式处理
class Observer {
  constructor(value) {
    this.value = value
    this.walk(value)
  }
  walk (val) {
    // 判断是否数组
    if (Array.isArray(val)) {
      val.__proto__ = newProto
      for (let i = 0; i < val.length; i++) {
        defineReactive(val[i])
      }
    } else {
      Object.keys(val).forEach(key => {
        defineReactive(val, key, val[key])
      })
    }
  }
}

//编译模板构造函数，它需要解析插值表达式和指令，并更新视图
class Compile {
  constructor(vm, el) {
    this.$vm = vm
    this.$el = document.querySelector(el)
    this.compile(this.$el)
  }
  compile (el) {
    // 遍历当前所有的子节点，判断它是元素节点还是文本节点，nodeType等于1是html元素，等于3是文本
    const childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      if (node.nodeType === 1) {
        // 元素节点，获取他的attr，并判断是否是指令
        this.compileElement(node)
      } else if (node.nodeType === 3) {
        // 文本节点，判断是否插值表达式{{aaa}}并解析
        this.compileText(node)
      }
      // 子节点还有子节点，则要递归处理
      if (node.childNodes) {
        this.compile(node)
      }
    })
  }
  // 编译html元素，或取其中的指令
  compileElement (node) {
    // 获取node的所有attr进行遍历，得到我们需要的指令并进行对应操作
    const nodeAttr = node.attributes
    Array.from(nodeAttr).forEach(attr => {
      // 获取属性的名称和值，根据名称判断是否是指令，这里支持‘k-’开头的指令
      let attrName = attr.name
      let attrValue = attr.value
      if (attrName.indexOf('k-') === 0) {
        // 如果是指令，执行对应的方法
        const dir = attrName.substring(2)
        this[dir] && this[dir](node, attrValue)
      }
    })
  }
  // 编译文本，判断是否插值表达式,并触发更新函数
  compileText (node) {
    // /\{\{(.*)\}\}/.test(node.textContent)匹配{{}}并把大括号里面的文本赋值给RegExp.$1
    if (/\{\{(.*)\}\}/.test(node.textContent)) {
      node.textContent = this.$vm[RegExp.$1]
      this.update(node, RegExp.$1, 'text')
    }
  }
  // 更新方法，接收节点、值、指令名称三个参数
  update (node, exp, dir) {
    const fn = this[dir + 'Updater']
    fn && fn(node, this.$vm[exp])
  }
  // k-html对应的方法
  html (node, exp) {
    node.textContent = this.$vm[exp]
    this.update(node, exp, 'html')
  }
  htmlUpdater (node, val) {
    node.innerHTML = val
  }
  // k-text对应的方法
  text (node, exp) {
    node.textContent = this.$vm[exp]
    this.update(node, exp, 'text')
  }
  textUpdater (node, val) {
    node.textContent = val
  }
}

// 数据代理函数,将$data中的数据代理到vm上，这样我们就能使用vm.xx来获取数据
function proxy (vm, prop) {
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

// 监控数据，如果是对象或数组需要做响应式处理
function observe (obj) {
  if (!obj || typeof obj !== 'object') {
    return
  }
  obj.__ob__ = new Observer(obj)
}

// 响应式处理数据
function defineReactive (obj, key, val) {
  // 递归处理val
  observe(val)
  Object.defineProperty(obj, key, {
    get () {
      return val
    },
    set (newVal) {
      if (newVal !== val) {
        observe(newVal)
        val = newVal
      }
    }
  })
}