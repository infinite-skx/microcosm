import assert from 'assert'
import { merge } from 'microcosm'

function useDefault(key, property) {
  if ('default' in property) {
    return property.default
  }

  switch (property.type) {
    case 'array':
      return []
    case 'boolean':
      return false
    case 'null':
      return null
    case 'number':
      return 0
    case 'object':
      return Object.keys(property.properties).reduce((memo, next) => {
        memo[next] = useDefault(next, property.properties[next])
        return memo
      }, {})
    case 'string':
      return ''
  }

  assert(
    false,
    `Unrecognized type "${property.type}" for property "${key}".` +
      `Please use a recognized type or provide a default value.`
  )

  return null
}

export function Entity(options) {
  assert(options, 'Please provide a valid schema')

  let schema = merge({ type: 'object', required: [] }, options)

  class EntityDefinition {
    static schema = schema

    constructor(params = {}, age = Date.now()) {
      this._params = params
      this._age = age
    }

    get _identifier() {
      return this._params.id
    }

    get _type() {
      return schema.title
    }

    update(params) {
      return new this.constructor(merge(this._params, params))
    }

    toJSON() {
      return this._params
    }
  }

  Object.keys(schema.properties).forEach(key => {
    var prop = schema.properties[key]
    var defaultValue = useDefault(key, prop)

    Object.defineProperty(EntityDefinition.prototype, key, {
      get() {
        let value = this._params[key] == null ? defaultValue : this._params[key]

        switch (prop.type) {
          case 'string':
            return '' + value
          case 'boolean':
            return !!value
          default:
            return value
        }
      }
    })
  })

  return EntityDefinition
}
