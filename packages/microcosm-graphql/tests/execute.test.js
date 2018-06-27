import { SolarSystem } from './fixtures/solar'
import gql from 'graphql-tag'

function finish(observable) {
  let result = null

  return new Promise(function(resolve, reject) {
    observable.subscribe({
      next: value => {
        result = value
      },
      complete() {
        resolve(result)
      },
      error: reject
    })
  })
}

describe('Execute', function() {
  it.skip('streams answers', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planet(name: Venus) {
            name
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let update = jest.fn()

    result.subscribe(update)

    await finish(result)

    expect(update).toHaveBeenCalledTimes(2)

    expect(update).toHaveBeenCalledWith({ planet: { __missing: true } })
    expect(update).toHaveBeenCalledWith({ planet: { name: 'Venus' } })
  })

  it.skip('caches lookups', async () => {
    let repo = new SolarSystem()

    // A and B should not be the same query, but have the same
    // planets answer
    let query = repo.compile(
      gql`
        {
          a: planets(name: Venus) {
            name
          }
          b: planets(name: Venus) {
            id
            name
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(repo.queries.Query.planets.resolver).toHaveBeenCalledTimes(1)

    expect(answer).toHaveProperty('a')
    expect(answer).toHaveProperty('b')

    // The actual queries themselves have different selections. They should not
    // cache
    expect(answer.a).not.toEqual(answer.b)
  })

  it('caches nested lookups to the same relationship', async () => {
    let repo = new SolarSystem()

    // A and B should not be the same query, but have the same
    // planets answer
    let query = repo.compile(
      gql`
        {
          a: planets(name: Venus) {
            star {
              name
            }
          }
          b: planets(name: Earth) {
            star {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(repo.queries.Planet.star.prepare).toHaveBeenCalledTimes(1)

    expect(answer).toHaveProperty('a')
    expect(answer).toHaveProperty('b')
  })

  it('gracefully handles missing lists', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planets(name: "Alpha Centari") {
            name
            star {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(answer).toHaveProperty('planets', [])
  })

  it('gracefully handles missing objects', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planet(name: "Meteor") {
            name
            star {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(answer).toHaveProperty('planet', { __missing: true })
  })

  it('gracefully handles missing relationships', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planet(name: "Meteor") {
            name
            star {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(answer).toHaveProperty('planet', { __missing: true })
  })

  it('gracefully handles missing nested relationships', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          star(name: "Sol") {
            name
            planets(name: "Meteor") {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(answer).toHaveProperty('star.planets', [])
  })

  it('does not cache lookups for different arguments', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          venus: planet(name: Venus) {
            name
            star {
              name
            }
          }
          earth: planet(name: Earth) {
            name
            star {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(answer.venus.name).toBe('Venus')
    expect(answer.earth.name).toBe('Earth')

    expect(repo.queries.Query.planet.prepare).toHaveBeenCalledTimes(2)
    expect(repo.queries.Query.planet.resolver).toHaveBeenCalledTimes(2)

    // 1. Venus initializes
    // 2. Earth initializes
    // 3. Venus loads
    // 4. Earth loads
    // 5. Venus star loads
    // 6. Earth star loads
    expect(repo.queries.Planet.star.prepare).toHaveBeenCalledTimes(1)
    expect(repo.queries.Planet.star.resolver).toHaveBeenCalledTimes(2)
  })

  it.skip('does not cache lookups for records in a list', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planets {
            name
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    let names = answer.planets.map(p => p.name)

    expect(names).toEqual(['Mercury', 'Venus', 'Earth'])
  })

  it('builds relationships for single fields', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planet(name: Venus) {
            star {
              name
            }
          }
        }
      `
    )

    let result = query({ repo, state: repo.state })
    let answer = await finish(result)

    expect(answer.planet.star.name).toEqual('Sol')
  })

  it('uses variables', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          planet(name: $name) {
            name
          }
        }
      `
    )

    let result = query({
      repo: repo,
      state: repo.state,
      variables: { name: 'Venus' }
    })

    let answer = await finish(result)

    expect(answer.planet.name).toEqual('Venus')
  })

  it('can paginate results', async () => {
    let repo = new SolarSystem()

    let query = repo.compile(
      gql`
        {
          paginatedPlanets(offset: 2, limit: 1) {
            name
          }
        }
      `
    )

    query({ repo, state: repo.state }).subscribe({
      next: answer => console.log('next', answer),
      complete: answer => console.log('complete', answer)
    })

    //expect(answer.paginatedPlanets).toEqual([{ name: 'Earth' }])
  })
})
