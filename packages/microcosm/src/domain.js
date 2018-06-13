/**
 * @flow
 */

import assert from 'assert'
import { Subject } from './subject'
import { Registry } from './registry'
import { EMPTY_OBJECT, EMPTY_ARRAY } from './empty'
import { RESET, PATCH } from './lifecycle'
import { Ledger } from './ledger'
import { Agent } from './agent'

type DomainHandler<State> = (state: State, payload?: *, meta?: *) => State

type DomainRegistry<State> = {
  [string]: DomainHandler<State>
}

const RESET_KEY = RESET.toString()
const PATCH_KEY = PATCH.toString()

export class Domain<State: any = Object> extends Agent {
  _registry: Registry
  _ledger: Ledger<State>

  constructor(repo: *, options?: Object) {
    super(repo, options)
    this.next(this._ledger.valueOf())
  }

  _preHistory() {
    this._registry = new Registry(this)

    this._ledger = new Ledger(
      this.getInitialState(),
      this.repo.history,
      this.options.debug
    )
  }

  /**
   * Generate the starting value for the domain.
   */
  getInitialState(): State {
    return EMPTY_OBJECT
  }

  /**
   * Allows a domain to transform state into a JavaScript primitive
   * suitable for serialization into JSON. Usually during server-side
   * rendering.
   *
   * To prevent accidental data transfer, this method is "opt-in",
   * returning `undefined` by default.
   */
  serialize(state: State): * {}

  /**
   * Allows data to be transformed into a valid shape before it enters a
   * Microcosm. This is the reverse operation to `serialize`.
   */
  deserialize(data: *): State {
    return data
  }

  /**
   * Returns an object mapping actions to methods on the domain. This is the
   * communication point between a domain and the rest of the system.
   */
  register(): DomainRegistry<State> {
    return EMPTY_OBJECT
  }

  receive(action: Subject): void {
    // Avoid a situation where history dispatches before a domain
    // is fully set up. Domains move into the "next" state when
    // construction is finished (getInitialState())
    if (this.status === 'start') {
      return
    }

    let next = this._rollforward(action)

    if (next !== this.payload) {
      this.next(next)
    }

    // TODO: This could probably be a generic storage solution
    // that cleaned up keys as actions completed.
    this._ledger.clean(action)
  }

  // Private -------------------------------------------------- //

  toJSON() {
    return this.serialize(this.valueOf())
  }

  _resolve(action: Subject): DomainHandler<State>[] {
    switch (action.meta.key) {
      case RESET_KEY:
      case PATCH_KEY:
        // If a domain's state is patched, the state of all prior actions
        // will always be overridden. There is no reason to process them.
        // Unfortunately we can't do anything about this until Domains manage
        // their own history (assuming this is a good idea)
        // TODO: Should domains manage their own history?
        // https://github.com/vigetlabs/microcosm/issues/507
        return action.status === 'complete' ? [this._patch] : EMPTY_ARRAY
      default:
        return this._registry.resolve(action)
    }
  }

  _dispatch(state: State, action: Subject): State {
    let handlers = this._resolve(action)

    for (var i = 0, len = handlers.length; i < len; i++) {
      state = handlers[i].call(this, state, action.payload, action.meta)
    }

    return state
  }

  _rollforward(action: Subject): State {
    let state = this._ledger.rebase(action)
    let focus = action

    while (focus) {
      if (!focus.disabled && focus.status !== 'start') {
        state = this._dispatch(state, focus)
        this._ledger.set(focus, state)
      }

      focus = this.repo.history.after(focus)
    }

    return state
  }

  _patch(state: State, payload: *, meta: *): State {
    if (this.repo !== meta.origin) {
      return state
    }

    let { deserialize, data } = payload
    let { key } = this.options

    assert(
      meta.status === 'complete',
      'Unable to reset or patch from incomplete action. This is an internal Microcosm error.'
    )

    assert(
      data,
      'Unable to reset or patch, no data provided. This is an internal Microcosm error.'
    )

    let value = data[key]

    if (value != null) {
      return deserialize ? this.deserialize(value) : value
    }

    return this.getInitialState()
  }
}
