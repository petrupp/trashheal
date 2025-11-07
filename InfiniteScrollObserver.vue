<template>
  <div ref="observerTarget" class="observer-target">
    <Spinner v-if="!disabled" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Spinner from './Spinner.vue'

interface Props {
  disabled?: boolean // 마지막 페이지에 도달했을 때 true로 설정
  rootMargin?: string // Intersection Observer의 rootMargin 설정
  threshold?: number // Intersection Observer의 threshold 설정
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  rootMargin: '100px',
  threshold: 0.1
})

const emit = defineEmits<{
  intersect: []
}>()

const observerTarget = ref<HTMLElement>()
let observer: IntersectionObserver | null = null

const setupObserver = () => {
  if (!observerTarget.value) return

  // 기존 observer가 있다면 정리
  if (observer) {
    observer.disconnect()
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // 요소가 보이고, disabled 상태가 아닐 때만 이벤트 발생
        if (entry.isIntersecting && !props.disabled) {
          emit('intersect')
        }
      })
    },
    {
      rootMargin: props.rootMargin,
      threshold: props.threshold
    }
  )

  observer.observe(observerTarget.value)
}

// disabled 상태가 변경될 때 observer 재설정
watch(() => props.disabled, () => {
  setupObserver()
})

onMounted(() => {
  setupObserver()
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<style scoped>
.observer-target {
  min-height: 1px;
  width: 100%;
}
</style>

