function observe(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return
  }
  // 每遍历赐个对象的属性，创建一个observer实例Ob
  obj.__Ob__ = new Observer(obj)
}

function definedReactive(obj, key, val) {
  // 递归遍历，如果val本身是个对象，继续执行observe
  observe(val)

  // 创建dep和key一一对应
  const dep = new Dep()

  Object.defineProperty(obj, key, {
    get() {
      // console.log('get', key, val)
      // 判断Dep.target是否有
      Dep.target && dep.addDep(Dep.target)
      return val
    },
    set(newVal) {
      if (newVal !== val) {
        //如果newVal本身是对象，则val本身需要做响应式处理
        observe(newVal)
        // console.log('set', key, newVal)
        // val这里可以是一个局部变量，将来在外部使用的时候，会形成闭包，就不会被内存释放掉
        val = newVal

        //更新界面
        // watchers.forEach(w => w.update())
        dep.notify()
      }
    }
  })
}

function set(obj, key, val) {
  definedReactive(obj, key, val)
}

function Proxy(vm, prop) {
  Object.keys(vm[prop]).forEach(key => {
    Object.defineProperty(vm, key, {
      get() {
        return vm[prop][key]
      },
      set(newVal) {
        vm[prop][key] = newVal
      }
    })
  })
}

// 创建一个observer类，用来分辨需要响应化的数据是对象还是数组
class Observer {
  constructor(value) {
    this.value = value
    this.walk(value)
  }
  walk(obj) {
    Object.keys(obj).forEach(key => {
      definedReactive(obj, key, obj[key])
    })
  }
}

// 编译器：解析模板中的插值表达式和指令
class Compile {
  // vm是kvue的实例，用于初始化和更新页面
  // el获取模板的dom
  constructor(vm, el) {
    this.$vm = vm
    // 获取模板
    this.$el = document.querySelector(el)
    this.compile(this.$el)
  }
  compile(el) {
    const childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      // 元素类型
      if (this.isElement(node)) {
        // console.log('编译元素', node.nodeName)
        this.compileElement(node)
      } else if (this.isInter(node)) {
        // console.log('编译插值', node.textContent)
        this.compileText(node)
      }

      // 如果node还有子节点，则需要递归
      if (node.childNodes && node.childNodes.length > 0) {
        this.compile(node)
      }
    })
  }
  // 更新方法,接收一个节点，一个表达式，一个指令
  update(node, exp, dir) {
    const fn = this[dir + 'Updater']
    // 初始化
    fn && fn(node, this.$vm[exp])
    // 更新
    new Watcher(this.$vm, exp, function(val) {
      fn && fn(node, val)
    })
  }
  // text具体的操作
  textUpdater(node, val) {
    node.textContent = val
  }
  htmlUpdater(node, val) {
    node.innerHTML = val
  }
  // 判断是否是元素
  isElement(node) {
    return node.nodeType === 1
  }
  // 判断是否是插值表达式
  isInter(node) {
    return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
  }
  // 判断属性是否是指令
  isDir(attr) {
    return attr.indexOf('k-') === 0
  }
  // 编译插值文本,初始化
  compileText(node) {
    node.textContent = this.$vm[RegExp.$1]
    this.update(node, RegExp.$1, 'text')
  }
  // 编译元素节点，判断它的属性是否是k-xx,@xx
  compileElement(node) {
    let nodeAttr = node.attributes
    Array.from(nodeAttr).forEach(attr => {
      let attrName = attr.name
      let exp = attr.value
      // 如果这个attr是指令，则获取对应的函数并执行
      if (this.isDir(attrName)) {
        let dir = attrName.substring(2)
        this[dir] && this[dir](node, exp)
      }
    })
  }
  text(node, exp) {
    node.textContent = this.$vm[exp]
    this.update(node, exp, 'text')
  }
  html(node, exp) {
    this.update(node, exp, 'html')
  }
}

// Watcher和模板中的依赖一对一，如果某个key变化，则执行更新函数
class Watcher {
  constructor(vm, key, updater) {
    this.vm = vm
    this.key = key
    this.updater = updater

    // 和dep建立关系
    Dep.target = this
    // 触发get，做依赖收集
    this.vm[this.key]
    Dep.target = null
  }
  // 这个方法是由dep来调用的
  update() {
    this.updater.call(this.vm, this.vm[this.key])
  }
}

// 管理所有的watcher
class Dep {
  constructor() {
    this.watchers = []
  }
  addDep(watcher) {
    this.watchers.push(watcher)
  }
  notify() {
    this.watchers.forEach(w => w.update())
  }
}

class KVue {
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
