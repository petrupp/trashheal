import { computed, toValue, type MaybeRef } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/vue-query'
import type { ApiResponse } from '@tempmono/types'
import { todoApi } from '@/apis/todoApi'
import type { Todo, TodoInput, TodoUpdateInput, TodoPageResult } from '../types'
import { createTodoQueryHelpers } from '../helpers/queryHelpers'

const DEFAULT_PAGE_SIZE = 5

type TodoInfiniteParams = {
  pageSize: number
  [key: string]: unknown
}

const { keys: todoQueryKeys, invalidate: invalidateTodoQueries } = createTodoQueryHelpers(
  'todo-demo',
  {
    listSegment: 'infinite',
    detailSegment: 'detail'
  }
)

export const useTodoInfiniteQuery = (params: TodoInfiniteParams = { pageSize: DEFAULT_PAGE_SIZE }) =>
  useInfiniteQuery<TodoPageResult, Error>({
    queryKey: todoQueryKeys.infinite(params),
    initialPageParam: 0,
    getNextPageParam: (lastPage: TodoPageResult) => {
      if (lastPage.hasNextPage && typeof lastPage.nextPage === 'number') {
        return lastPage.nextPage
      }
      return undefined
    },
    queryFn: async ({ pageParam }) => {
      const response = await todoApi.fetchTodoPage({
        page: typeof pageParam === 'number' ? pageParam : 0,
        pageSize: params.pageSize
      })
      return response.data
    },
    staleTime: 1000 * 30
  })

export const useTodoDetailQuery = (id: MaybeRef<string | number | null>) =>
  useQuery<Todo, Error>({
    queryKey: computed(() => {
      const todoId = toValue(id)
      return todoId ? todoQueryKeys.detail(todoId) : todoQueryKeys.detailPlaceholder()
    }),
    enabled: computed(() => {
      const todoId = toValue(id)
      if (todoId === null || todoId === undefined) return false
      const numericId = Number(todoId)
      return !Number.isNaN(numericId) && numericId > 0
    }),
    queryFn: async () => {
      const todoId = toValue(id)
      if (todoId === null || todoId === undefined) {
        throw new Error('잘못된 Todo ID 입니다.')
      }
      const response = await todoApi.fetchTodo(Number(todoId))
      return response.data
    },
    staleTime: 1000 * 30
  })

type UpdateTodoVariables = {
  id: number
  data: TodoUpdateInput
}

export const useTodoMutations = (
  params: TodoInfiniteParams = { pageSize: DEFAULT_PAGE_SIZE }
) => {
  const queryClient = useQueryClient()

  const invalidateTodoLists = () => {
    invalidateTodoQueries(queryClient)
  }

  const createTodoMutation = useMutation({
    mutationFn: (payload: TodoInput) => todoApi.createTodo(payload),
    onSuccess: (response: ApiResponse<Todo>) => {
      const created = response.data
      queryClient.setQueriesData<InfiniteData<TodoPageResult> | undefined>(
        { queryKey: todoQueryKeys.listRoot(), exact: false },
        (current) => {
          if (!current) return current
          const [firstPage, ...rest] = current.pages
          if (!firstPage) return current
          const totalAfter = (firstPage.total ?? firstPage.items.length) + 1
          const updatedFirstPage: TodoPageResult = {
            ...firstPage,
            items: [created, ...firstPage.items].slice(0, params.pageSize),
            total: totalAfter,
            hasNextPage: firstPage.hasNextPage || totalAfter > params.pageSize,
            nextPage:
              firstPage.hasNextPage || totalAfter > params.pageSize
                ? firstPage.nextPage ?? 1
                : undefined
          }
          return {
            ...current,
            pages: [updatedFirstPage, ...rest],
            pageParams: current.pageParams
          }
        }
      )
      invalidateTodoLists()
    }
  })

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, data }: UpdateTodoVariables) => todoApi.updateTodo(id, data),
    onSuccess: (response: ApiResponse<Todo>) => {
      const updated = response.data
      queryClient.setQueriesData<InfiniteData<TodoPageResult> | undefined>(
        { queryKey: todoQueryKeys.listRoot(), exact: false },
        (current) => {
          if (!current) return current
          const updatedPages = current.pages.map((page) => ({
            ...page,
            items: page.items.map((todo) => (todo.id === updated.id ? { ...todo, ...updated } : todo))
          }))

          return {
            ...current,
            pages: updatedPages
          }
        }
      )
      queryClient.setQueryData(todoQueryKeys.detail(updated.id), updated)
      invalidateTodoLists()
    }
  })

  const deleteTodoMutation = useMutation({
    mutationFn: (id: number) => todoApi.deleteTodo(id),
    onSuccess: (response: ApiResponse<{ id: number }>) => {
      const deletedId = response.data.id
      queryClient.setQueriesData<InfiniteData<TodoPageResult> | undefined>(
        { queryKey: todoQueryKeys.listRoot(), exact: false },
        (current) => {
          if (!current) return current
          const updatedPages = current.pages.map((page) => {
            const filteredItems = page.items.filter((todo) => todo.id !== deletedId)
            return {
              ...page,
              items: filteredItems,
              total: Math.max(page.total - 1, 0)
            }
          })

          return {
            ...current,
            pages: updatedPages
          }
        }
      )
      queryClient.removeQueries({ queryKey: todoQueryKeys.detail(deletedId), exact: true })
      invalidateTodoLists()
    }
  })

  return {
    createTodoMutation,
    updateTodoMutation,
    deleteTodoMutation
  }
}

export const useTodoDetailPrefetch = (id: MaybeRef<string | number | null>) => {
  const queryClient = useQueryClient()

  return async () => {
    const todoId = toValue(id)
    if (!todoId) return

    await queryClient.prefetchQuery({
      queryKey: todoQueryKeys.detail(todoId),
      queryFn: async () => {
        const response = await todoApi.fetchTodo(Number(todoId))
        return response.data
      },
      staleTime: 1000 * 30
    })
  }
}

