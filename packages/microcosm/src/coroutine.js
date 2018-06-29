/**
 * @flow
 */

import { type Subject } from './subject'
import { SubjectMap } from './subject-map'
import { toStringTag } from './symbols'
import { isPromise } from './type-checks'

/**
 * Coroutine is used by an action to determine how it should resolve
 * the body of their associated command.
 */
export function coroutine(
  action: Subject,
  command: any,
  params: any[],
  origin: *
) {
  if (typeof command !== 'function') {
    action.complete(params[0])
    return
  }

  if (isGeneratorFn(command)) {
    asGenerator(action, command(origin, ...params))
    return
  }

  let body = command.apply(null, params)

  if (typeof body === 'function' && params.indexOf(body) < 0) {
    body(action, origin)
    return
  }

  if (isPromise(body)) {
    body.then(action.complete, action.error)

    return
  }

  action.complete(body)
}

function isGeneratorFn(value: any): boolean {
  return value && value[toStringTag] === 'GeneratorFunction'
}

function asGenerator(action: Subject, iterator: Iterator<*>) {
  function step() {
    let next = iterator.next(action.payload)
    let value = next.value

    if (next.done) {
      action.complete()
    } else {
      let subject = new SubjectMap(value)

      subject.subscribe(
        // next
        action.next,
        // error
        action.error,
        //complete
        step,
        // cancel
        action.cancel
      )

      action.subscribe({ cancel: subject.cancel })
    }
  }

  step()
}
