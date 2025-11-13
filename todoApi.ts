import type { ApiResponse } from '@tempmono/types'
import { createApiResponse, simulateDelay } from '@tempmono/api'
import { request } from './ajax'
import type {
  Todo,
  TodoInput,
  TodoUpdateInput,
  TodoPageParams,
  TodoPageResult
} from '@/pages/todoDemo/types'

const TODO_API = {
  TODOS: {
    LIST: {
      url: '/todo-demo/todos',
      method: 'GET' as const
    },
    DETAIL: (id: number) => ({
      url: `/todo-demo/todos/${id}`,
      method: 'GET' as const
    }),
    CREATE: {
      url: '/todo-demo/todos',
      method: 'POST' as const
    },
    UPDATE: (id: number) => ({
      url: `/todo-demo/todos/${id}`,
      method: 'PUT' as const
    }),
    DELETE: (id: number) => ({
      url: `/todo-demo/todos/${id}`,
      method: 'DELETE' as const
    })
  }
} as const

const sampleTitles = [
  'Vue Query 학습하기',
  'API 목업 구조 정리',
  '컴포넌트 리팩토링',
  '테스트 코드 작성',
  '문서 업데이트'
]

const sampleDescriptions = [
  'Vue Query의 기본 사용법을 정리하고 예제를 만들어봅니다.',
  '목업 API 레이어를 재사용할 수 있도록 구조화합니다.',
  '중복되는 컴포넌트를 정리하고 재사용성을 높입니다.',
  '핵심 기능에 대한 테스트 코드를 작성합니다.',
  '팀 내 공유를 위한 문서를 업데이트합니다.'
]

let sequence = 1

const now = () => new Date().toISOString()

const getRandomFrom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

let todos: Todo[] = Array.from({ length: 5 }, () => {
  const timestamp = now()
  return {
    id: sequence++,
    title: getRandomFrom(sampleTitles),
    description: getRandomFrom(sampleDescriptions),
    completed: Math.random() > 0.5,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

const findTodoIndex = (id: number) => todos.findIndex((todo) => todo.id === id)

const mockHandlers = {
  async fetchTodoPage(params: TodoPageParams): Promise<ApiResponse<TodoPageResult>> {
    await simulateDelay(200)
    const { page, pageSize } = params
    const start = page * pageSize
    const sliced = todos.slice(start, start + pageSize)
    const total = todos.length
    const hasNextPage = start + pageSize < total

    return createApiResponse({
      items: sliced,
      total,
      page,
      pageSize,
      hasNextPage,
      nextPage: hasNextPage ? page + 1 : undefined
    })
  },

  async fetchTodo(id: number): Promise<ApiResponse<Todo>> {
    await simulateDelay(150)
    const target = todos.find((todo) => todo.id === id)
    if (!target) {
      throw new Error('존재하지 않는 TODO 입니다.')
    }
    return createApiResponse(target)
  },

  async createTodo(payload: TodoInput): Promise<ApiResponse<Todo>> {
    await simulateDelay(250)
    const timestamp = now()
    const todo: Todo = {
      id: sequence++,
      title: payload.title,
      description: payload.description,
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    todos = [todo, ...todos]
    return createApiResponse(todo, true, 'Todo created')
  },

  async updateTodo(id: number, payload: TodoUpdateInput): Promise<ApiResponse<Todo>> {
    await simulateDelay(250)
    const index = findTodoIndex(id)
    if (index === -1) {
      throw new Error('존재하지 않는 TODO 입니다.')
    }
    const updated: Todo = {
      ...todos[index],
      ...payload,
      updatedAt: now()
    }
    todos.splice(index, 1, updated)
    return createApiResponse(updated, true, 'Todo updated')
  },

  async deleteTodo(id: number): Promise<ApiResponse<{ id: number }>> {
    await simulateDelay(200)
    todos = todos.filter((todo) => todo.id !== id)
    return createApiResponse({ id }, true, 'Todo deleted')
  }
}

export const todoApi = {
  fetchTodoPage(params: TodoPageParams) {
    const endpoint = TODO_API.TODOS.LIST
    return request<ApiResponse<TodoPageResult>, undefined, TodoPageParams>({
      ...endpoint,
      params,
      useMock: true,
      mockHandler: () => mockHandlers.fetchTodoPage(params)
    })
  },

  fetchTodo(id: number) {
    const endpoint = TODO_API.TODOS.DETAIL(id)
    return request<ApiResponse<Todo>>({
      ...endpoint,
      useMock: true,
      mockHandler: () => mockHandlers.fetchTodo(id)
    })
  },

  createTodo(payload: TodoInput) {
    const endpoint = TODO_API.TODOS.CREATE
    return request<ApiResponse<Todo>, TodoInput>({
      ...endpoint,
      data: payload,
      useMock: true,
      mockHandler: () => mockHandlers.createTodo(payload)
    })
  },

  updateTodo(id: number, payload: TodoUpdateInput) {
    const endpoint = TODO_API.TODOS.UPDATE(id)
    return request<ApiResponse<Todo>, TodoUpdateInput>({
      ...endpoint,
      data: payload,
      useMock: true,
      mockHandler: () => mockHandlers.updateTodo(id, payload)
    })
  },

  deleteTodo(id: number) {
    const endpoint = TODO_API.TODOS.DELETE(id)
    return request<ApiResponse<{ id: number }>>({
      ...endpoint,
      useMock: true,
      mockHandler: () => mockHandlers.deleteTodo(id)
    })
  }
}

