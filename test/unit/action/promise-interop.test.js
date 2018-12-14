import Microcosm from 'microcosm'

const identity = n => n

describe('Action promise interop', function() {
  it('actions interop with promises', function() {
    const repo = new Microcosm()
    const action = repo.append(identity)

    action.resolve('Test')

    return action.then(result => expect(result).toBe('Test'))
  })

  it('actions interop with async/await', async function() {
    const repo = new Microcosm()
    const action = repo.append(identity)

    action.resolve('Test')

    const payload = await action

    expect(payload).toBe('Test')
  })

  it('actions interop with chains off of other promises', async function() {
    const repo = new Microcosm()

    const action = repo.push(function(n) {
      return Promise.resolve().then(() => n)
    }, 'Test')

    const payload = await action

    expect(payload).toBe('Test')
  })
})
