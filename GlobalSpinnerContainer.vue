<template>
  <Transition name="spinner-fade">
    <div v-if="isSpinnerVisible" class="global-spinner-container">
      <Spinner />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Spinner } from '@tempmono/ui'
import { useGlobalSpinner } from '@tempmono/composables'

const { isSpinnerVisible } = useGlobalSpinner()
</script>

<script lang="ts">
export default {
  name: 'GlobalSpinnerContainer'
}
</script>

<style scoped>
.global-spinner-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 10000;
  pointer-events: none;
}

.global-spinner-container > * {
  pointer-events: auto;
}

/* Transition 애니메이션 */
.spinner-fade-enter-active,
.spinner-fade-leave-active {
  transition: opacity 0.3s ease;
}

.spinner-fade-enter-from,
.spinner-fade-leave-to {
  opacity: 0;
}
</style>

