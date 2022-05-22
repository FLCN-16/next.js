import type { I18NConfig } from '../../config-shared'
import { NextURL } from '../next-url'
import { toNodeHeaders, validateURL } from '../utils'

import { NextCookies } from './cookies'

const INTERNALS = Symbol('internal response')
const REDIRECTS = new Set([301, 302, 303, 307, 308])

export class NextResponse extends Response {
  [INTERNALS]: {
    cookies: NextCookies
    url?: NextURL
  }

  constructor(body?: BodyInit | null, init: ResponseInit = {}) {
    super(body, init)

    this[INTERNALS] = {
      cookies: new NextCookies(this),
      url: init.url
        ? new NextURL(init.url, {
            basePath: init.nextConfig?.basePath,
            i18n: init.nextConfig?.i18n,
            trailingSlash: init.nextConfig?.trailingSlash,
            headers: toNodeHeaders(this.headers),
          })
        : undefined,
    }
  }

  public get cookies() {
    return this[INTERNALS].cookies
  }

  static json(body: any, init?: ResponseInit) {
    const { headers, ...responseInit } = init || {}
    return new NextResponse(JSON.stringify(body), {
      ...responseInit,
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
    })
  }

  static redirect(
    url: string | NextURL | URL,
    init: 307 | 308 | 301 | 302 | ResponseInit = 307
  ) {
    const responseInit = typeof init === 'number'
      ? {
        headers: {
          Location: validateURL(URL),
        },
        status: init;
      }
      : {
        ...init,
        headers: {
          ...init.headers,
          Location: validateURL(URL),
        }
      }

    if (!REDIRECTS.has(responseInit.status)) {
      throw new RangeError(
        'Failed to execute "redirect" on "response": Invalid status code'
      )
    }

    return new NextResponse(null, {
      ...init,
      headers: {
        ...init.headers,
        Location: validateURL(url),
      },
      status,
    })
  }

  static rewrite(destination: string | NextURL | URL, init: ResponseInit = {}) {
    if (init.headers) {
      init.headers = {
        ...init.headers,
        'x-middleware-rewrite': validateURL(destination),
      }
    } else {
      init.headers = {
        'x-middleware-rewrite': validateURL(destination),
      }
    }

    return new NextResponse(null, init)
  }

  static next() {
    return new NextResponse(null, {
      headers: { 'x-middleware-next': '1' },
    })
  }
}

interface ResponseInit extends globalThis.ResponseInit {
  nextConfig?: {
    basePath?: string
    i18n?: I18NConfig
    trailingSlash?: boolean
  }
  url?: string
}
