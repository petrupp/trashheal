import { defineStore } from 'pinia'
import { computed, ref, type Ref } from 'vue'
import type { InfiniteData } from '@tanstack/vue-query'
import type { TodoPageResult } from '../pages/todoDemo/types'

export const useTodoStore = defineStore('todo', () => {
  // State: Vue Query의 data ref를 저장
  let dataRef: Ref<InfiniteData<TodoPageResult> | undefined> | null = null
  // State: 로딩 상태 ref를 저장
  let isLoadingRef: Ref<boolean> | null = null
  // State: 편집 중인 Todo ID를 직접 관리
  const editingId = ref<number | null>(null)

  // Actions: Vue Query의 data ref를 설정하는 함수
  function setInfiniteData(data: Ref<InfiniteData<TodoPageResult> | undefined>) {
    dataRef = data
  }

  // Actions: 로딩 상태 ref를 설정하는 함수
  function setIsLoading(isLoading: Ref<boolean>) {
    isLoadingRef = isLoading
  }

  // Actions: 편집 중인 Todo ID를 설정하는 함수
  function setEditingIdValue(id: number | null) {
    editingId.value = id
  }

  // Getters: data ref를 기반으로 computed 속성 생성
  // computed 내부에서 dataRef를 참조하면 반응성이 유지됨
  const todos = computed(() => {
    if (!dataRef) return []
    const infiniteData = dataRef.value
    if (!infiniteData) return []
    return infiniteData.pages.flatMap((page: TodoPageResult) => page.items)
  })

  const totalCount = computed(() => {
    if (!dataRef) return 0
    const infiniteData = dataRef.value
    if (!infiniteData || !infiniteData.pages.length) return 0
    return infiniteData.pages[0]?.total ?? todos.value.length
  })

  const isInitialLoading = computed(() => {
    if (!isLoadingRef || !dataRef) return false
    return isLoadingRef.value && !dataRef.value?.pages.length
  })

  const isEmptyState = computed(() => {
    return !isInitialLoading.value && todos.value.length === 0
  })

  const isEditing = computed(() => {
    return editingId.value !== null
  })

  return {
    todos,
    totalCount,
    isInitialLoading,
    isEmptyState,
    isEditing,
    editingId,
    setInfiniteData,
    setIsLoading,
    setEditingIdValue
  }
})

