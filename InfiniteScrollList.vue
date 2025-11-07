<template>
  <div class="infinite-scroll-list">
    <!-- 리스트 아이템들을 위한 슬롯 -->
    <div class="list-content">
      <slot name="items" :items="items"></slot>
    </div>

    <!-- 로딩 상태를 위한 슬롯 (선택적) -->
    <div v-if="loading && !isLastPage" class="loading-slot">
      <slot name="loading">
        <div class="default-loading">로딩 중...</div>
      </slot>
    </div>

    <!-- Intersection Observer -->
    <InfiniteScrollObserver
      :disabled="isLastPage || loading"
      @intersect="handleIntersect"
    />

    <!-- 마지막 페이지 메시지를 위한 슬롯 (선택적) -->
    <div v-if="isLastPage" class="end-slot">
      <slot name="end">
        <div class="default-end">모든 항목을 불러왔습니다.</div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InfiniteScrollObserver from './InfiniteScrollObserver.vue'

interface Props {
  items: any[] // 현재 로드된 아이템 배열
  loading: boolean // 로딩 상태
  hasMore: boolean // 더 로드할 데이터가 있는지 여부
}

const props = defineProps<Props>()

const emit = defineEmits<{
  loadMore: []
}>()

const isLastPage = computed(() => !props.hasMore)

const handleIntersect = () => {
  if (!props.loading && props.hasMore) {
    emit('loadMore')
  }
}
</script>

<style scoped>
.infinite-scroll-list {
  width: 100%;
}

.list-content {
  width: 100%;
}

.loading-slot,
.end-slot {
  padding: 1rem;
  text-align: center;
}

.default-loading,
.default-end {
  color: #666;
  font-size: 0.9rem;
}

.default-end {
  padding: 2rem 0;
  color: #999;
}
</style>

