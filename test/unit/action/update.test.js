import Microcosm from 'microcosm'

const identity = n => n

describe('Action update state', function() {
  it('exposes a loading type when in progress', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)

    action.update()

    expect(action).toHaveStatus('update')
  })

  it('listens to progress updates', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)
    const fn = jest.fn()

    action.onUpdate(fn)
    action.update(true)

    expect(fn).toHaveBeenCalledWith(true)
  })

  it('does not trigger onUpdate if in progress', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)
    const fn = jest.fn()

    action.update(true)
    action.onUpdate(fn)

    expect(fn).not.toHaveBeenCalled()
  })

  it('actions are no longer open when in progress', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)

    action.open(true)
    action.update(true)

    expect(action).not.toHaveStatus('open')
    expect(action).toHaveStatus('loading')
  })

  it('triggers an update event when it updates', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)
    const callback = jest.fn()

    action.once('update', callback)
    action.update(3)

    expect(callback).toHaveBeenCalledWith(3)
  })

  it('does not trigger an update event if it is complete', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)
    const spy = jest.fn()

    action.on('update', spy)
    action.resolve()
    action.update()

    expect(spy).not.toHaveBeenCalled()
  })

  it('aliases the loading type with update', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)

    action.update()

    expect(action).toHaveStatus('update')
  })

  it('updates repo state with the latest progress', function() {
    const repo = new Microcosm()
    const test = n => n
    const handler = jest.fn(n => n)

    repo.addDomain('progress', {
      getInitalState() {
        return 0
      },
      register() {
        return {
          [test]: {
            update: (a, b) => handler(b)
          }
        }
      }
    })

    const action = repo.append(test)

    action.update(1)
    expect(handler).toHaveBeenCalledWith(1)
    expect(repo).toHaveState('progress', 1)

    action.update(2)
    expect(handler).toHaveBeenCalledWith(2)
    expect(repo).toHaveState('progress', 2)

    action.update(3)
    expect(handler).toHaveBeenCalledWith(3)
    expect(repo).toHaveState('progress', 3)
  })
})
