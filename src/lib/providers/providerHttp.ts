import { invoke } from "@tauri-apps/api/core"
import type {
  ProviderInstance,
  ProviderPlugin,
  ProviderSettingValue,
  ProviderType,
} from "./providerTypes"

export type ProviderFetchSecret = {
  settingKey: string
  headerName: string
  valueTemplate: string
}

export type ProviderFetchOptions = Omit<RequestInit, "headers" | "body"> & {
  headers?: HeadersInit
  body?: BodyInit | null
  secret?: ProviderFetchSecret
}

type RustProviderFetchResponse = {
  ok: boolean
  status: number
  statusText: string
  url: string
  headers: Record<string, string>
  bodyBase64: string
}

export type ProviderFetchFor = (
  url: string,
  options?: ProviderFetchOptions,
) => Promise<Response>

export function createProviderFetch<Type extends ProviderType>(
  provider: ProviderInstance<Type>,
  plugin: ProviderPlugin,
  settings: Record<string, unknown>,
): ProviderFetchFor {
  return async (url, options = {}) => {
    const encryptedValue = options.secret
      ? provider.settings[options.secret.settingKey]
      : undefined

    if (options.secret && typeof encryptedValue !== "string") {
      throw new Error(
        `Provider "${provider.displayName}" is missing secret setting "${options.secret.settingKey}".`,
      )
    }

    const response = await invoke<RustProviderFetchResponse>("provider_fetch", {
      request: {
        providerType: provider.type,
        url,
        method: options.method,
        headers: serializeHeaders(options.headers),
        body: await serializeBody(options.body),
        allowedOrigins: getAllowedOrigins(plugin, settings),
        settings: provider.settings,
        secret:
          options.secret && typeof encryptedValue === "string"
            ? {
                encryptedValue,
                settingKey: options.secret.settingKey,
                headerName: options.secret.headerName,
                valueTemplate: options.secret.valueTemplate,
              }
            : undefined,
      },
    })

    return createResponse(response)
  }
}

export type ProviderFetchSettings = Record<string, ProviderSettingValue>

function getAllowedOrigins(
  plugin: ProviderPlugin,
  settings: Record<string, unknown>,
) {
  return [
    ...(plugin.httpAccess?.staticAllowedOrigins ?? []),
    ...(plugin.httpAccess?.getAllowedOrigins?.(
      settings as never,
    ) ?? []),
  ]
}

function createResponse(response: RustProviderFetchResponse) {
  const body = decodeBase64(response.bodyBase64)
  const headers = new Headers(response.headers)
  const fetchResponse = new Response(body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })

  setReadonlyResponseProperty(fetchResponse, "url", response.url)

  return fetchResponse
}

function serializeHeaders(headers: HeadersInit | undefined) {
  if (!headers) {
    return undefined
  }

  return Object.fromEntries(new Headers(headers).entries())
}

async function serializeBody(body: BodyInit | null | undefined) {
  if (body === undefined || body === null) {
    return undefined
  }

  if (typeof body === "string") {
    return body
  }

  if (body instanceof URLSearchParams) {
    return body.toString()
  }

  if (body instanceof Blob) {
    return await body.text()
  }

  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body)
  }

  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body)
  }

  if (body instanceof FormData) {
    throw new Error("providerFetch does not support FormData bodies yet.")
  }

  throw new Error("providerFetch received an unsupported request body.")
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function setReadonlyResponseProperty<
  Key extends "url",
>(response: Response, key: Key, value: Response[Key]) {
  Object.defineProperty(response, key, {
    configurable: true,
    value,
  })
}
