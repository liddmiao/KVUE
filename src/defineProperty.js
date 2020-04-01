function observe (obj) {
  if (typeof obj !== 'object' || obj === null) {
    return
  }
  Object.keys(obj).forEach(key => {
    definedReactive(obj, key, obj[key])
  })
}

function definedReactive (obj, key, val) {
  // 递归遍历，如果val本身是个对象，继续执行observe
  observe(val)
  Object.defineProperty(obj, key, {
    get () {
      console.log('get', key, val)
      return val
    },
    set (newVal) {
      if (newVal !== val) {
        //如果newVal本身是对象，则val本身需要做响应式处理
        observe(newVal)
        console.log('set', key, newVal)
        // val这里可以是一个局部变量，将来在外部使用的时候，会形成闭包，就不会被内存释放掉
        val = newVal
      }
    }
  })
}

function set (obj, key, val) {
  definedReactive(obj, key, val)
}

const obj = { foo: 'foo', bar: 'bar', baz: { a: 1 } }
observe(obj)
// definedReactive(obj, 'foo', 'foo')
// obj.foo
// obj.foo = 'fooooooooo'
// obj.bar
// obj.bar = 'barrrrrrrr'
// obj.baz.a = 10
// obj.baz = { a: 10 }
// obj.baz.a = 100
set(obj, 'dong', 'dong')
obj.dong