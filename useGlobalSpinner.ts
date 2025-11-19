import { computed } from 'vue'
import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/vue-query'

/**
 * 글로벌 스피너 상태를 관리하는 composable
 * useIsFetching과 useIsMutating을 사용하여 로딩 상태를 추적하고,
 * meta.ignoreSpinner 옵션을 통해 특정 쿼리/뮤테이션을 스피너에서 제외할 수 있습니다.
 */
export const useGlobalSpinner = () => {
  const queryClient = useQueryClient()
  
  // fetching 중인 쿼리 개수
  const fetchingCount = useIsFetching()
  
  // mutating 중인 mutation 개수
  const mutatingCount = useIsMutating()

  // fetching 중인 쿼리 중 ignoreSpinner가 아닌 것들의 개수
  const activeFetchingCount = computed(() => {
    if (fetchingCount.value === 0) return 0

    const queryCache = queryClient.getQueryCache()
    const queries = queryCache.getAll()
    
    let count = 0
    queries.forEach((query) => {
      if (query.state.fetchStatus === 'fetching') {
        const meta = query.options.meta as { ignoreSpinner?: boolean } | undefined
        if (!meta?.ignoreSpinner) {
          count++
        }
      }
    })
    
    return count
  })

  // mutating 중인 mutation 중 ignoreSpinner가 아닌 것들의 개수
  const activeMutatingCount = computed(() => {
    if (mutatingCount.value === 0) return 0

    const mutationCache = queryClient.getMutationCache()
    const mutations = mutationCache.getAll()
    
    let count = 0
    mutations.forEach((mutation) => {
      if (mutation.state.status === 'pending') {
        const meta = mutation.options.meta as { ignoreSpinner?: boolean } | undefined
        if (!meta?.ignoreSpinner) {
          count++
        }
      }
    })
    
    return count
  })

  // 스피너를 표시할지 여부
  const isSpinnerVisible = computed(() => {
    return activeFetchingCount.value > 0 || activeMutatingCount.value > 0
  })

  return {
    isSpinnerVisible,
    activeFetchingCount,
    activeMutatingCount,
    fetchingCount,
    mutatingCount
  }
}

