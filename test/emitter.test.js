import test from 'ava'
import Emitter from '../src/emitter'

test('adds listeners', t => {
  const emitter = new Emitter
  const calls = []

  emitter.on('foo', function (val) {
    calls.push('one', val)
  })

  emitter.on('foo', function (val) {
    calls.push('two', val)
  })

  emitter._emit('foo', 1)
  emitter._emit('bar', 1)
  emitter._emit('foo', 2)

  t.deepEqual(calls, [ 'one', 1, 'two', 1, 'one', 2, 'two', 2 ])
})

test('should add listeners for events which are same names with methods of Object.prototype', t => {
  const emitter = new Emitter
  const calls = []

  emitter.on('constructor', function (val) {
    calls.push('one', val)
  })

  emitter.on('__proto__', function (val) {
    calls.push('two', val)
  })

  emitter._emit('constructor', 1)
  emitter._emit('__proto__', 2)

  t.deepEqual(calls, [ 'one', 1, 'two', 2 ])
})

test('adds a single-shot listener', t => {
  const emitter = new Emitter
  const calls = []

  emitter.once('foo', function (val) {
    calls.push('one', val)
  })

  emitter._emit('foo', 1)
  emitter._emit('foo', 2)
  emitter._emit('foo', 3)
  emitter._emit('bar', 1)

  t.deepEqual(calls, [ 'one', 1 ])
})

test('should remove a listener', t => {
    var emitter = new Emitter
    var calls = []

    function one () { calls.push('one') }
    function two () { calls.push('two') }

    emitter.on('foo', one)
    emitter.on('foo', two)
    emitter.off('foo', two)

    emitter._emit('foo')

  t.deepEqual(calls, [ 'one' ])
})

test('should work with .once()', t => {
  const emitter = new Emitter
  const calls = []

  function one () { calls.push('one') }

  emitter.once('foo', one)
  emitter.once('fee', one)
  emitter.off('foo', one)

  emitter._emit('foo')

  t.deepEqual(calls, [])
})

test('should remove all listeners for an event', t => {
  const emitter = new Emitter
  const calls = []

  function one () { calls.push('one') }
  function two () { calls.push('two') }

  emitter.on('foo', one)
  emitter.on('foo', two)
  emitter.off('foo')

  emitter._emit('foo')
  emitter._emit('foo')

  t.deepEqual(calls, [])
})

test('does not call listeners removed when another is emitted', t => {
  t.plan(1)

  const emitter = new Emitter

  function two () {
    throw new Error("should not have been called")
  }

  emitter.on('foo', function() {
    t.pass()
    emitter.off('foo', two)
  })

  emitter.on('foo', two)

  emitter._emit('foo')
})

test('should remove all listeners', t => {
  const emitter = new Emitter
  const calls = []

  function one () { calls.push('one') }
  function two () { calls.push('two') }

  emitter.on('foo', one)
  emitter.on('bar', two)

  emitter._emit('foo')
  emitter._emit('bar')

  emitter.off()

  emitter._emit('foo')
  emitter._emit('bar')

  t.deepEqual(calls, ['one', 'two'])
})
