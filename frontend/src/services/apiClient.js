export class ApiError extends Error {
  constructor(message, { status = null, code = 'unknown_error', cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function getErrorDetails(payload, response) {
  const backendError = payload?.error
  if (
    backendError &&
    typeof backendError.code === 'string' &&
    typeof backendError.message === 'string'
  ) {
    return { code: backendError.code, message: backendError.message }
  }

  return {
    code: 'http_error',
    message:
      response.statusText ||
      `The request failed with status ${response.status}.`,
  }
}

export function createApiClient({
  baseUrl = import.meta.env?.VITE_API_BASE_URL,
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  async function getCsrfToken(apiBaseUrl) {
    let response
    try {
      response = await fetchImpl(`${apiBaseUrl}/api/auth/csrf`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
    } catch (cause) {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', {
        code: 'network_error',
        cause,
      })
    }
    if (!response.ok) {
      throw new ApiError('Unable to initialize CSRF protection.', {
        status: response.status,
        code: 'csrf_initialization_error',
      })
    }
    const payload = await response.json()
    if (typeof payload?.csrf_token !== 'string' || !payload.csrf_token) {
      throw new ApiError('The server returned an invalid CSRF token.', {
        status: response.status,
        code: 'invalid_csrf_response',
      })
    }
    return payload.csrf_token
  }

  async function request(path, { method = 'GET', body, headers, ...options } = {}) {
    const apiBaseUrl =
      typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : ''
    if (!apiBaseUrl) {
      throw new ApiError(
        'The API base URL is not configured. Set VITE_API_BASE_URL before making requests.',
        { code: 'api_configuration_error' },
      )
    }

    const requestHeaders = new Headers(headers)
    requestHeaders.set('Accept', 'application/json')
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      requestHeaders.set('X-CSRF-Token', await getCsrfToken(apiBaseUrl))
    }
    if (body !== undefined) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    let response
    try {
      response = await fetchImpl(
        `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`,
        {
          ...options,
          method,
          headers: requestHeaders,
          credentials: 'include',
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      )
    } catch (cause) {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', {
        code: 'network_error',
        cause,
      })
    }

    if (response.status === 204) {
      return undefined
    }

    if (!response.ok) {
      let payload
      try {
        payload = await response.json()
      } catch (cause) {
        if (!(cause instanceof SyntaxError)) {
          throw new ApiError('Unable to read the server error response.', {
            status: response.status,
            code: 'invalid_response',
            cause,
          })
        }
      }

      const { code, message } = getErrorDetails(payload, response)
      throw new ApiError(message, { status: response.status, code })
    }

    try {
      return await response.json()
    } catch (cause) {
      throw new ApiError('The server returned an invalid JSON response.', {
        status: response.status,
        code: 'invalid_json_response',
        cause,
      })
    }
  }

  return { request }
}

export const apiClient = createApiClient()
