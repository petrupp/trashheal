---
layout: doc
title: Vue Query 가이드
---

# Vue Query 가이드

Vue Query(TanStack Query)는 Vue 애플리케이션에서 서버 상태를 효율적으로 관리하기 위한 강력한 라이브러리입니다. 이 가이드는 tempMono 프로젝트에서 Vue Query를 사용하는 방법을 설명합니다.

## 목차

- [설치 및 설정](#설치-및-설정)
- [기본 개념](#기본-개념)
- [Query 사용하기](#query-사용하기)
- [Mutation 사용하기](#mutation-사용하기)
- [Infinite Query](#infinite-query)
- [Query Key 관리](#query-key-관리)
- [캐시 관리](#캐시-관리)
- [실제 예시](#실제-예시)

## 설치 및 설정

### 패키지 설치

Vue Query는 이미 프로젝트에 설치되어 있습니다:

```json
{
  "dependencies": {
    "@tanstack/vue-query": "5.90.2"
  }
}
```

### 앱 설정

`apps/web/src/main.ts`에서 Vue Query를 설정합니다:

```typescript
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,        // 1분간 데이터를 fresh로 유지
      gcTime: 1000 * 60 * 5,        // 5분간 캐시 유지
      retry: 1,                      // 실패 시 1번 재시도
      refetchOnWindowFocus: false    // 윈도우 포커스 시 자동 재요청 비활성화
    },
    mutations: {
      retry: 1
    }
  }
})

app.use(VueQueryPlugin, {
  queryClient
})
```

## 기본 개념

### Query vs Mutation

- **Query**: 서버에서 데이터를 **읽어오는** 작업 (GET 요청)
- **Mutation**: 서버의 데이터를 **변경하는** 작업 (POST, PUT, DELETE 요청)

### 주요 특징

- **자동 캐싱**: 동일한 쿼리는 자동으로 캐시되어 불필요한 요청을 방지
- **자동 재요청**: 데이터가 stale 상태가 되면 자동으로 재요청
- **로딩/에러 상태**: 로딩, 에러 상태를 자동으로 관리
- **옵티미스틱 업데이트**: UI를 먼저 업데이트하고 나중에 서버와 동기화

## Query 사용하기

### 기본 useQuery

단일 데이터를 가져오는 예시:

```typescript
import { useQuery } from '@tanstack/vue-query'
import { todoApi } from '@/apis/todoApi'

export const useTodoDetailQuery = (id: MaybeRef<string | number | null>) =>
  useQuery<Todo, Error>({
    queryKey: computed(() => {
      const todoId = toValue(id)
      return todoId ? ['todo', todoId] : ['todo', '__pending__']
    }),
    enabled: computed(() => {
      const todoId = toValue(id)
      return todoId !== null && todoId !== undefined
    }),
    queryFn: async () => {
      const todoId = toValue(id)
      const response = await todoApi.fetchTodo(Number(todoId))
      return response.data
    },
    staleTime: 1000 * 30  // 30초간 fresh 상태 유지
  })
```

### 컴포넌트에서 사용

```vue
<script setup lang="ts">
import { useTodoDetailQuery } from './queries/useTodoQueries'

const props = defineProps<{ id: number }>()

const {
  data: todo,
  isLoading,
  isError,
  error
} = useTodoDetailQuery(() => props.id)
</script>

<template>
  <div v-if="isLoading">로딩 중...</div>
  <div v-else-if="isError">에러: {{ error?.message }}</div>
  <div v-else>{{ todo?.title }}</div>
</template>
```

## Mutation 사용하기

### 기본 useMutation

데이터를 생성, 수정, 삭제하는 예시:

```typescript
import { useMutation, useQueryClient } from '@tanstack/vue-query'

export const useTodoMutations = () => {
  const queryClient = useQueryClient()

  const createTodoMutation = useMutation({
    mutationFn: (payload: TodoInput) => todoApi.createTodo(payload),
    onSuccess: (response) => {
      // 성공 시 캐시 무효화하여 리스트 재요청
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TodoUpdateInput }) =>
      todoApi.updateTodo(id, data),
    onSuccess: (response) => {
      // 성공 시 해당 Todo의 캐시 업데이트
      queryClient.setQueryData(['todo', response.data.id], response.data)
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  const deleteTodoMutation = useMutation({
    mutationFn: (id: number) => todoApi.deleteTodo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  return {
    createTodoMutation,
    updateTodoMutation,
    deleteTodoMutation
  }
}
```

### 컴포넌트에서 사용

```vue
<script setup lang="ts">
import { useTodoMutations } from './queries/useTodoQueries'

const { createTodoMutation } = useTodoMutations()

const handleSubmit = async () => {
  try {
    await createTodoMutation.mutateAsync({
      title: '새 할 일',
      description: '설명'
    })
    // 성공 처리
  } catch (error) {
    // 에러 처리
  }
}
</script>
```

## Infinite Query

무한 스크롤이나 페이지네이션을 구현할 때 사용합니다.

### useInfiniteQuery 설정

```typescript
import { useInfiniteQuery } from '@tanstack/vue-query'

export const useTodoInfiniteQuery = (params = { pageSize: 5 }) =>
  useInfiniteQuery<TodoPageResult, Error>({
    queryKey: ['todos', 'infinite', params],
    initialPageParam: 0,
    getNextPageParam: (lastPage: TodoPageResult) => {
      // 다음 페이지가 있으면 다음 페이지 번호 반환
      if (lastPage.hasNextPage && typeof lastPage.nextPage === 'number') {
        return lastPage.nextPage
      }
      return undefined  // 더 이상 페이지가 없음
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
```

### 컴포넌트에서 사용

```vue
<script setup lang="ts">
import { useTodoInfiniteQuery } from './queries/useTodoQueries'

const {
  data,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useTodoInfiniteQuery({ pageSize: 5 })

// 모든 페이지의 아이템을 하나의 배열로 합치기
const todos = computed(() => {
  if (!data.value) return []
  return data.value.pages.flatMap((page) => page.items)
})

// 다음 페이지 로드
const loadMore = () => {
  if (hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage()
  }
}
</script>

<template>
  <div>
    <div v-for="todo in todos" :key="todo.id">
      {{ todo.title }}
    </div>
    <button
      v-if="hasNextPage"
      @click="loadMore"
      :disabled="isFetchingNextPage"
    >
      더 보기
    </button>
  </div>
</template>
```

## Query Key 관리

Query Key는 캐시를 식별하는 고유한 키입니다. 일관된 패턴으로 관리하는 것이 중요합니다.

### Query Helper 패턴

```typescript
export const createTodoQueryHelpers = (
  businessName: string,
  options: TodoQueryHelperOptions = {}
) => {
  const { listSegment = 'todos', detailSegment = 'todo' } = options
  const rootKey = [businessName] as const

  const keys = {
    all: () => rootKey,
    listRoot: () => [...rootKey, ...(listSegment ? [listSegment] : [])] as const,
    infinite: (params: Record<string, unknown>) => {
      return [...keys.listRoot(), params] as readonly unknown[]
    },
    detail: (id: string | number) => {
      return [...rootKey, ...(detailSegment ? [detailSegment] : []), id] as const
    }
  }

  const invalidate = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: rootKey })

  return { keys, invalidate }
}
```

### 사용 예시

```typescript
const { keys, invalidate } = createTodoQueryHelpers('todo-demo', {
  listSegment: 'infinite',
  detailSegment: 'detail'
})

// Query Key 사용
queryKey: keys.infinite(params)
queryKey: keys.detail(id)

// 모든 todo 관련 쿼리 무효화
invalidate(queryClient)
```

## 캐시 관리

### 캐시 업데이트 전략

#### 1. Optimistic Update (낙관적 업데이트)

UI를 먼저 업데이트하고 나중에 서버와 동기화:

```typescript
const updateTodoMutation = useMutation({
  mutationFn: ({ id, data }) => todoApi.updateTodo(id, data),
  onMutate: async (variables) => {
    // 진행 중인 쿼리 취소
    await queryClient.cancelQueries({ queryKey: ['todo', variables.id] })

    // 이전 데이터 백업
    const previousTodo = queryClient.getQueryData(['todo', variables.id])

    // 낙관적 업데이트
    queryClient.setQueryData(['todo', variables.id], (old) => ({
      ...old,
      ...variables.data
    }))

    return { previousTodo }
  },
  onError: (err, variables, context) => {
    // 에러 시 이전 데이터로 롤백
    queryClient.setQueryData(['todo', variables.id], context.previousTodo)
  },
  onSettled: (data, error, variables) => {
    // 성공/실패 관계없이 최종 동기화
    queryClient.invalidateQueries({ queryKey: ['todo', variables.id] })
  }
})
```

#### 2. Manual Cache Update (수동 캐시 업데이트)

Mutation 성공 시 캐시를 직접 업데이트:

```typescript
const createTodoMutation = useMutation({
  mutationFn: (payload) => todoApi.createTodo(payload),
  onSuccess: (response) => {
    const created = response.data
    
    // Infinite Query 캐시 업데이트
    queryClient.setQueriesData<InfiniteData<TodoPageResult>>(
      { queryKey: ['todos', 'infinite'] },
      (current) => {
        if (!current) return current
        
        const [firstPage, ...rest] = current.pages
        const updatedFirstPage = {
          ...firstPage,
          items: [created, ...firstPage.items]
        }
        
        return {
          ...current,
          pages: [updatedFirstPage, ...rest]
        }
      }
    )
  }
})
```

### 캐시 무효화

```typescript
// 특정 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todo', id] })

// 패턴으로 여러 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'], exact: false })

// 모든 쿼리 무효화
queryClient.invalidateQueries()
```

## 실제 예시

프로젝트의 Todo 데모는 Vue Query의 모든 기능을 활용한 완전한 예시입니다:

### 파일 구조

```
pages/todoDemo/
├── queries/
│   ├── useTodoQueries.ts      # Query 및 Mutation 정의
│   └── helpers/
│       └── queryHelpers.ts     # Query Key 헬퍼
├── main.vue                    # 리스트 페이지
└── detail/
    └── main.vue                # 상세 페이지
```

### 주요 기능

1. **Infinite Query**: 무한 스크롤로 Todo 리스트 로드
2. **Detail Query**: Todo 상세 정보 조회
3. **Mutations**: Todo 생성, 수정, 삭제
4. **Optimistic Updates**: 즉각적인 UI 업데이트
5. **Prefetching**: 마우스 호버 시 상세 정보 미리 로드

### 사용 예시

```vue
<script setup lang="ts">
import { useTodoInfiniteQuery, useTodoMutations } from './queries/useTodoQueries'

// Infinite Query로 리스트 가져오기
const {
  data,
  isLoading,
  fetchNextPage,
  hasNextPage
} = useTodoInfiniteQuery({ pageSize: 5 })

// Mutations
const { createTodoMutation, updateTodoMutation, deleteTodoMutation } =
  useTodoMutations({ pageSize: 5 })

// Todo 생성
const handleCreate = async () => {
  await createTodoMutation.mutateAsync({
    title: '새 할 일',
    description: '설명'
  })
}
</script>
```

## 베스트 프랙티스

### 1. Query Key는 배열로 관리

```typescript
// ✅ 좋은 예
['todos', 'infinite', { pageSize: 5 }]
['todo', 'detail', 123]

// ❌ 나쁜 예
'todos-infinite-pageSize-5'
```

### 2. Query Helper 사용

Query Key를 직접 작성하지 말고 헬퍼 함수를 사용하세요:

```typescript
// ✅ 좋은 예
const { keys } = createTodoQueryHelpers('todo-demo')
queryKey: keys.infinite(params)

// ❌ 나쁜 예
queryKey: ['todo-demo', 'infinite', params]
```

### 3. staleTime 적절히 설정

자주 변하지 않는 데이터는 `staleTime`을 길게 설정:

```typescript
// 설정 데이터: 5분
staleTime: 1000 * 60 * 5

// 실시간 데이터: 30초
staleTime: 1000 * 30
```

### 4. 에러 처리

```typescript
const { data, error, isError } = useQuery({
  // ...
  retry: 1,
  retryDelay: 1000
})

if (isError) {
  // 사용자에게 에러 메시지 표시
  toastService.error(error.message)
}
```

## 참고 자료

- [TanStack Query 공식 문서](https://tanstack.com/query/latest/docs/vue/overview)
- [Vue Query 예시 코드](../apps/web/src/pages/todoDemo/queries/useTodoQueries.ts)
- [Query Helper 패턴](../apps/web/src/pages/todoDemo/helpers/queryHelpers.ts)

