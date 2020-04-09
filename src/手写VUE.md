# 手写VUE

#### 创建KVue类，保存options和data，需要实现响应式、数据代理、编译模板的功能

```JavaScript
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
```

- 数据代理

```JavaScript
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
```

- 数据响应式处理，和响应式基础的代码是一样的，只是这里我们创建了一个Observer类来进行数据劫持和响应化

```JavaScript
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
  Object.defineProperties(obj, key, {
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
```

- 编译模板

编译模板中主要完成两个功能：解析指令和插值表达式、每个指令对应的方法

```javascript
class Compile {
  constructor(vm, el) {
    this.$vm = vm
    this.$el = document.querySelector(el)
    this.compile(this.$el)
  }
  compile(el) {
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
  compileElement(node) {
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
      if (attrName.indexOf('@') === 0) {
        // @绑定的事件
        let dir = attrName.substring(1)
        this.eventHandler(node, dir, attrValue)
      }
    })
  }
  // 编译文本，判断是否插值表达式,并触发更新函数
  compileText(node) {
    // /\{\{(.*)\}\}/.test(node.textContent)匹配{{}}并把大括号里面的文本赋值给RegExp.$1
    if (/\{\{(.*)\}\}/.test(node.textContent)) {
      node.textContent = this.$vm[RegExp.$1]
      this.update(node, RegExp.$1, 'text')
    }
  }
  // 更新方法，接收节点、值、指令名称三个参数
  update(node, exp, dir) {
    const fn = this[dir + 'Updater']
    fn && fn(node, this.$vm[exp])
    // 触发Watcher去更新视图
  }
  // k-html对应的方法
  html(node, exp) {
    node.textContent = this.$vm[exp]
    this.update(node, exp, 'html')
  }
  htmlUpdater(node, val) {
    node.innerHTML = val
  }
  // k-text对应的方法
  text(node, exp) {
    node.textContent = this.$vm[exp]
    this.update(node, exp, 'text')
  }
  textUpdater(node, val) {
    node.textContent = val
  }
  // k-model对应的方法
  model(node, exp) {
    // update负责更新视图，添加事件监控来更新vm中的值，实现双向绑定
    this.update(node, exp, 'model')
    node.addEventListener('input', (e) => {
      this.$vm[exp] = e.target.value
    })
  }
  modelUpdater(node, val) {
    // 表单元素，大部分是设置value值
    node.value = val
  }
  // @绑定的事件处理函数，接受node、事件名称、处理函数名称
  eventHandler(node, dir, handler) {
    // 给node绑定对应的事件
    // 在处理回调函数的时候需要注意一点: fn中可能会通过this.xx使用vm中的某个选项，所以，这里要把this的指向改为this.$vm
    const fn = this.$vm.$options.methods && this.$vm.$options.methods[handler]
    node.addEventListener(dir, fn.bind(this.$vm))
  }
}
```

- 依赖收集

所谓依赖，就是视图中所使用的data中的某个key。依赖收集就就是给每一个依赖创建一个Watcher来维护他，相同key的Watcher使用一个Dep来管理，当数据变化时，通过这个个Dep统一通知更新。

```javascript
// 监听数据的变化，然后更新视图。接收key和它对应的更新函数
class Watcher {
  constructor(vm, key, fn) {
    this.$vm = vm
    this.$key = key
    this.$updateFn = fn

    // 这里将dep的target设置为当前的这个watcher，然后通过触发这个key的getter，将自己push到key对应的dep中去，实现一个key对应一个dep，一个dep对应多个Watcher
    Dep.target = this
    this.$vm[this.$key]
    Dep.target = null
  }
  // 触发key的对应更新函数
  update() {
    this.$updateFn.call(this.$vm, this.$vm[this.$key])
  }
}

// 依赖，管理Watcher
class Dep {
  constructor() {
    this.watchers = []
  }
  addDep(watcher) {
    this.watchers.push(watcher)
  }
  // 当key变化的时候，通知这个key对应的所有Watcher更新视图
  notify() {
    this.watchers.forEach(watcher => {
      watcher.update()
    })
  }
```

然后我们需要修改一下defineReactive方法，每响应化一个变量，都创建一个dep，这个变量的getter和setter都能访问到它。

```JavaScript
function  (obj, key, val) {
  // 递归处理val
  observe(val)

  const dep = new Dep()
  Object.defineProperty(obj, key, {
    get() {
      Dep.target && dep.addDep(Dep.target)
      return val
    },
    set(newVal) {
      if (newVal !== val) {
        observe(newVal)
        val = newVal
        // 通知watcher更新视图
        dep.notify()
      }
    }
  })
}
```

compile中的update方法也需要创建Watcher，去更新视图。

```javascript
 // 更新方法，接收节点、值、指令名称三个参数
  update(node, exp, dir) {
    const fn = this[dir + 'Updater']
    fn && fn(node, this.$vm[exp])
    // 触发Watcher去更新视图
    new Watcher(this.$vm, exp, function(val) {
      fn && fn(node, val)
    })
  }
```