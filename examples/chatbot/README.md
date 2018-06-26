# Chatbot Example

A messaging client that interacts with a chat bot. This example
demonstrates optimistic updates, asynchronous requests, and loading
states.

## Setup

```
npm install
make start
open http://localhost:4000
```

## How it works

This example demonstrates using the current state of actions to
provide optimistic updates and loading states. When an action is
pushed into a Microcosm, this example uses the `open`, `done`, and
`error` states to display useful information to the user.

The best place to see where this happens is within
[`./app/domains/message.js`](./app/domains/message.js), where the
domain's registration method listens to specific action states:

```javascript
const Messages = {
  // ..
  register() {
    return {
      [send.open]: Messages.addLoading,
      [send.done]: Messages.add,
      [send.error]: Messages.addError
    }
  }
}
```

## What are action states?

Whenever an action creator is pushed into Microcosm, it creates an
action object to represent the resolution of that action
creator. Domains can hook into the different states of that action as the
action creator resolves. These states _loosely_ follow the
`readyState` property of `XMLHTTPRequest`:

1.  **unset**: Nothing has happened yet. The action creator has not
    started.
2.  **open**: The action creator has started working, such as the opening
    of an XHR request, however no response has been given.
3.  **loading**: The action creator is partially complete, such as
    downloading a response from a server.
4.  **done**: The action creator has resolved.
5.  **cancelled**: The action was cancelled, like if an XHR request is
    aborted.
