import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { auth } from './auth'

// Route guards are UX only; server functions are endpoints reachable on their own.
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    return next({ context: { user: session.user } })
  },
)
