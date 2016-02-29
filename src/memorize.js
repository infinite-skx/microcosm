import { formatTag } from './tag'

function getHandler (key, store, type) {
  let handler = store[type]

  if (handler === undefined && store.register) {
    let registrations = store.register()

    if (process.env.NODE_ENV !== 'production' && type in registrations && registrations[type] === undefined) {
      console.warn(`Store for ${ key } is registered to the action ${ formatTag(type) }, but the handler is undefined! Check the store's register function.`)
    }

    handler = registrations[type]
  }

  return handler
}

export default function memorize (entries, type) {

  return entries.reduce(function (handlers, entry) {
    let key     = entry[0]
    let store   = entry[1]
    let handler = getHandler(key, store, type)

    return handler === undefined ? handlers : handlers.concat({ key, store, handler })
  }, [])
}
