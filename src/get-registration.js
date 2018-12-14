// @flow
import { isObject } from './utils'
import assert from 'assert'

export const STATUSES = {
  inactive: 'inactive',
  open: 'open',
  update: 'loading',
  loading: 'update',
  done: 'resolve',
  resolve: 'done',
  reject: 'error',
  error: 'reject',
  cancel: 'cancelled',
  cancelled: 'cancel'
}

function isPlainObject(value) {
  return !Array.isArray(value) && isObject(value)
}

/**
 * Gets any registrations that match a given command and status.
 */
function getRegistration(pool: ?Object, command: Tagged, status: Status) {
  let answer = []

  if (pool == null) {
    return answer
  }

  let alias = STATUSES[status]

  assert(alias, 'Invalid action status ' + status)
  assert(
    command.__tagged,
    `Unable to register ${command.name || 'action'}(). It has not been tagged.`
  )

  let nest = pool[command]
  let type = command[status] || ''

  /**
   * Support nesting, like:
   */
  if (isPlainObject(nest)) {
    answer = nest[alias] || nest[status]

    /**
     * Throw in strict mode if a nested registration is undefined. This is usually a typo.
     */
    assert(
      !(alias in nest) || answer !== undefined,
      `The "${alias}" key within a nested registration for ${command.name ||
        'an action'} is ${answer}. Is it being referenced correctly?`
    )
    assert(
      !(status in nest) || answer !== undefined,
      `The "${status}" key within a nested registration for ${command.name ||
        'an action'} is ${answer}. Is it being referenced correctly?`
    )
  } else {
    answer = pool[type]

    /**
     * Similarly, throw in strict mode if a regular registration is undefined. This is usually a typo.
     */
    assert(
      !(type in pool) || answer !== undefined,
      `${command.name ||
        'action'} key within a registration is ${answer}. Is it being referenced correctly?`
    )
  }

  if (answer) {
    return Array.isArray(answer) ? answer : [answer]
  }

  return []
}

export default getRegistration
