/**
 * @flow
 */

import getRegistration from './get-registration'
import { clone, merge, result, createOrClone } from './utils'
import { RESET, PATCH } from './lifecycle'

import type Action from './action'
import type Microcosm from './microcosm'

type DomainList = Array<[string, Domain]>
type Registry = { [action: string]: Registrations }

/**
 * Reduce down a list of values.
 */
function reduce(steps: Handler[], payload: *, start: *, scope: any) {
  var next = start

  for (var i = 0, len = steps.length; i < len; i++) {
    next = steps[i].call(scope, next, payload)
  }

  return next
}

class DomainEngine {
  repo: Microcosm
  domains: DomainList
  lifecycle: Registry
  registry: Registry

  constructor(repo: Microcosm) {
    this.repo = repo
    this.domains = Object.create(null)
    this.lifecycle = Object.create(null)

    this.lifecycle[RESET] = []
    this.lifecycle[PATCH] = []

    this.registry = Object.create(this.lifecycle)
  }

  getHandlers(action: Action): Registrations {
    let { command, status } = action

    let handlers = []

    for (var key in this.domains) {
      var scope = this.domains[key]

      let steps = getRegistration(result(scope, 'register'), command, status)

      if (steps.length) {
        handlers.push({ key, scope, steps })
      }
    }

    return handlers
  }

  register(action: Action): Registrations {
    let type = action.type

    if (!this.registry[type]) {
      this.registry[type] = this.getHandlers(action)
    }

    return this.registry[type]
  }

  add(key: string, config: *, options?: Object) {
    console.assert(
      !options || options.constructor === Object,
      'addDomain expected a plain object as the third argument.'
    )

    console.assert(key && key.length > 0, 'Can not add domain to root level.')

    let deepOptions = merge(
      this.repo.options,
      config.defaults,
      { key },
      options
    )

    let domain: Domain = createOrClone(config, deepOptions, this.repo)

    this.domains[key] = domain

    this.lifecycle[RESET].push({
      key: key,
      scope: domain,
      steps: [
        (state, { repo, payload }) => {
          if (repo.domains !== this) {
            return state
          }

          return payload[key] !== undefined
            ? payload[key]
            : result(domain, 'getInitialState', null)
        }
      ]
    })

    this.lifecycle[PATCH].push({
      key: key,
      scope: domain,
      steps: [
        (state, { repo, payload }) => {
          if (repo.domains !== this) {
            return state
          }

          return payload[key] !== undefined ? payload[key] : state
        }
      ]
    })

    this.registry = Object.create(this.lifecycle)

    if (domain.setup) {
      domain.setup(this.repo, deepOptions)
    }

    if (domain.teardown) {
      this.repo.on('teardown', domain.teardown, domain)
    }

    return domain
  }

  dispatch(action: Action, state: Object, snapshot: Snapshot) {
    let handlers = this.register(action)
    let answer = state

    for (var i = 0; i < handlers.length; i++) {
      var { key, scope, steps } = handlers[i]

      var last = answer[key]
      var head = snapshot.last[key]
      var next = snapshot.next[key]

      if (
        // If the reference to the prior state changed
        last !== head ||
        // Or the payload is different
        action.payload !== snapshot.payload ||
        // or the status is different
        action.status !== snapshot.status
      ) {
        // Recalculate state from the last answer
        next = reduce(steps, action.payload, last, scope)
      }

      if (answer === state && next !== answer[key]) {
        answer = clone(state)
      }

      answer[key] = next
    }

    return answer
  }

  deserialize(payload: Object): Object {
    let next = clone(payload)

    for (var key in this.domains) {
      var domain = this.domains[key]

      if (domain.deserialize) {
        next[key] = domain.deserialize(payload[key])
      }
    }

    return next
  }

  serialize(state: Object, payload: Object): Object {
    let next = clone(payload)

    for (var key in this.domains) {
      var domain = this.domains[key]

      if (domain.serialize) {
        next[key] = domain.serialize(state[key])
      }
    }

    return next
  }

  getInitialState(): Object {
    let next = {}

    for (var key in this.domains) {
      next[key] = result(this.domains[key], 'getInitialState', null)
    }

    return next
  }
}

export default DomainEngine
