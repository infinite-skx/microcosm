/**
 * EventEmitter
 *
 * This is a private event emitter based upon the component/emitter
 * implementation. It enforces a few constraints to ensure users of
 * Microcosm have a good time:
 *
 * - `emit` is private
 * - subscriptions can be prioritized (to improve rendering efficiency)
 *
 * component/emitter:
 * https://github.com/component/emitter
 *
 * @private
 */
export default class Emitter {

  /**
   * Listen on the given `event` with `fn`.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   */
  on (event, fn, scope) {
    this._callbacks = this._callbacks || {}

    const callback = this._callbacks['$' + event] = this._callbacks['$' + event] || []

    /**
     * Reversing priority helps addons like 'Connect' and 'Presenter'
     * work more efficiently. It allows changes to occur "top down"
     * instead of "bottom up". This is because event subscription occurs
     * within React lifecycle methods, which prioritize children before
     * parents.
     */
    callback[callback.length] = [fn, scope || this]

    return this
  }

  /**
   * Adds an `event` listener that will be invoked a single time then
   * automatically removed.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   */
  once (event, fn, scope) {
    function on () {
      this.off(event, on)
      fn.apply(scope || this, arguments)
    }

    on.fn = fn

    this.on(event, on)

    return this
  }

  /**
   * Remove the given callback for `event` or all
   * registered callbacks.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   */
  off (event, fn) {
    // Remove all listeners
    if (0 == arguments.length) {
      delete this._callbacks
    }

    if (!this._callbacks || this._callbacks.hasOwnProperty('$' + event) === false) {
      return this
    }

    // specific event
    let callbacks = this._callbacks['$' + event]

    // remove all handlers
    if (1 == arguments.length) {
      delete this._callbacks['$' + event]
      return this
    }

    // Remove the specific handler, splice so that listeners removed
    // during another event broadcast are not invoked
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb[0] === fn || cb[0].fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }

    /**
     * Remove event specific arrays for event types that no
     + one is subscribed for to avoid memory leak.
     */
    if (callbacks.length === 0) {
      delete this._callbacks['$' + event]
    }

    return this
  }

  /**
   * Emit `event` with the given args.
   *
   *
   * @param {String} event
   * @param {Mixed} ...
   * @return {Emitter}
   * @private
   */
  _emit (event, ...params) {
    this._callbacks = this._callbacks || {}

    var callbacks = this._callbacks['$' + event]

    if (callbacks) {
      callbacks.forEach(function (callback) {
        callback[0].apply(callback[1], params)
      })
    }

    return this;
  }
}
