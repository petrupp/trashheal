import type { Method } from 'axios'
import { httpClient } from '@/services/httpClient'
import { env } from '@tempmono/utils'

type MaybePromise<T> = T | Promise<T>

export interface RequestOptions<TResponse = unknown, TData = unknown, TParams = unknown> {
  url: string
  method?: Method
  data?: TData
  params?: TParams
  headers?: Record<string, string>
  /**
   * env.isMockMode 또는 useMock 옵션이 true일 때 호출되는 핸들러
   */
  mockHandler?: () => MaybePromise<TResponse>
  /**
   * 목 데이터 사용을 강제하거나 비활성화하고 싶을 때 사용
   */
  useMock?: boolean
}

export async function request<TResponse = unknown, TData = unknown, TParams = unknown>(
  options: RequestOptions<TResponse, TData, TParams>
): Promise<TResponse> {
  const { url, method = 'GET', data, params, headers, mockHandler, useMock } = options

  const shouldUseMock = typeof useMock === 'boolean' ? useMock : env.isMockMode

  if (shouldUseMock && mockHandler) {
    return await Promise.resolve(mockHandler())
  }

  const response = await httpClient.request<TResponse>({
    url,
    method,
    data,
    params,
    headers
  })

  return response.data
}


