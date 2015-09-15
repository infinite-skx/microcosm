/**
 * Check whether an object is a generator.
 * Taken from https://github.com/blakeembrey/is-generator
 *
 * @param  {Object}  obj
 * @return {Boolean}
 */

module.exports = function isGenerator (obj) {
  return obj && typeof obj.next === 'function'
             && typeof obj.throw === 'function'
}
