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

// 遍历每个key
function observe (obj) {
  // 判断值是否object，不是就结束递归
  if (!obj || typeof obj !== 'object') {
    return
  }
  // 判断obj是否是数组
  if (Array.isArray(obj)) {
    // 替换掉arr原型上原有的七个方法,这样写能避免改变arrayProto的值
    obj.__proto__ = Object.assign({}, arrayProto, newProto)
    // 对每一个值进行遍历，如果这个值是object，则需要做响应式处理
    for (let i = 0; i < obj.length; i++) {
      observe(obj[i])
    }
  } else {
    Object.keys(obj).forEach(key => {
      defineReactive(obj, key, obj[key])
    })
  }
}

// 给每个key都设置getter和setter
function defineReactive (obj, key, val) {
  // 如果val也是个object，那就需要递归遍历它，判断条件已经卸载observe()里面了，所以不需要加判断
  observe(val)
  Object.defineProperty(obj, key, {
    get () {
      console.log('get', key, val)
      return val
    },
    set (newVal) {
      if (newVal !== val) {
        observe(newVal)
        console.log('set', key, newVal)
        val = newVal
      }
    }
  })
}

// let obj = { foo: 'foo', bar: 'bar', baz: { a: 1 }, arr: [1, 2, 3] }
// observe(obj)
let arr = [1, 2, 3]
observe(arr)
arr.push({ c: 4 })
console.log(arr[3])
arr[3].c = 5