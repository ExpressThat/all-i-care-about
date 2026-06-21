import type { ProviderFetchFor, ProviderFetchOptions } from "../../providerHttp"

const githubSecret = {
  settingKey: "personalAccessToken",
  headerName: "Authorization",
  valueTemplate: "Bearer {secret}",
} as const

export function createGithubFetch(fetchClient: ProviderFetchFor): typeof fetch {
  return async (input, init) => {
    const options = await createGithubFetchOptions(input, init)

    return fetchClient(getFetchUrl(input), {
      ...options,
      secret: githubSecret,
    })
  }
}

async function createGithubFetchOptions(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
): Promise<ProviderFetchOptions> {
  const inputRequest = input instanceof Request ? input : null
  const headers = new Headers(inputRequest?.headers)

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value)
    })
  }

  headers.delete("authorization")

  return {
    body: init?.body ?? await getRequestBody(inputRequest),
    headers,
    method: init?.method ?? inputRequest?.method,
  }
}

function getFetchUrl(input: Parameters<typeof fetch>[0]) {
  return input instanceof Request ? input.url : String(input)
}

async function getRequestBody(request: Request | null) {
  if (!request || request.method === "GET" || request.method === "HEAD") {
    return undefined
  }

  return await request.clone().text()
}
