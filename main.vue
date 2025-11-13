<template>
  <div class="todo-demo-page">
    <header class="page-header">
      <div>
        <h1>📝 Todo 리스트 데모</h1>
        <p>Vue Query를 사용한 가장 단순한 CRUD 예제</p>
      </div>
    </header>

    <section class="card">
      <h2>{{ isEditing ? 'Todo 수정' : '새 Todo 추가' }}</h2>

      <form class="todo-form" @submit.prevent="handleSubmit">
        <label class="form-field">
          <span>제목</span>
          <input
            v-model="formState.title"
            type="text"
            placeholder="할 일을 입력하세요"
            :disabled="isMutating"
            required
          />
        </label>

        <label class="form-field">
          <span>설명</span>
          <textarea
            v-model="formState.description"
            placeholder="간단한 설명을 입력하세요"
            rows="3"
            :disabled="isMutating"
          ></textarea>
        </label>

        <div class="form-actions">
          <button class="primary" type="submit" :disabled="isMutating">
            {{ isEditing ? '저장하기' : '등록하기' }}
          </button>
          <button
            v-if="isEditing"
            class="secondary"
            type="button"
            @click="resetForm"
            :disabled="isMutating"
          >
            취소
          </button>
        </div>
      </form>
    </section>

    <section class="card">
      <div class="list-header">
        <h2>Todo 목록</h2>
        <span class="total-count">{{ totalCount }}개</span>
      </div>

      <div v-if="isInitialLoading" class="loading">불러오는 중...</div>
      <div v-else-if="isError" class="error">
        데이터를 불러오는 중 문제가 발생했습니다.<br />
        {{ error?.message }}
      </div>
      <div v-else-if="isEmptyState" class="empty">등록된 Todo가 없습니다. 첫 Todo를 추가해보세요.</div>
      <ul v-else class="todo-list">
        <li v-for="todo in todos" :key="todo.id" class="todo-item">
          <div class="todo-main">
            <label class="todo-checkbox">
              <input
                type="checkbox"
                :checked="todo.completed"
                :disabled="isMutating"
                @change="() => handleToggle(todo)"
              />
              <span></span>
            </label>

            <div
              class="todo-content"
              role="button"
              tabindex="0"
              @click="goToDetail(todo.id)"
              @keydown.enter.prevent="goToDetail(todo.id)"
              @keydown.space.prevent="goToDetail(todo.id)"
              @mouseenter="handleMouseEnter(todo.id)"
              @focus="handleMouseEnter(todo.id)"
            >
              <h3 :class="{ completed: todo.completed }">{{ todo.title }}</h3>
              <p>{{ todo.description }}</p>
              <small>업데이트: {{ formatDate(todo.updatedAt) }}</small>
            </div>
          </div>

          <div class="todo-actions">
            <button class="secondary" type="button" @click="populateForm(todo)" :disabled="isMutating">
              수정
            </button>
            <button class="danger" type="button" @click="handleDelete(todo.id)" :disabled="isMutating">
              삭제
            </button>
          </div>
        </li>
      </ul>
      <div
        v-if="hasNextPage"
        ref="loadTrigger"
        class="load-trigger"
        aria-hidden="true"
      ></div>
      <div v-if="isFetchingNextPage" class="loading-more">추가 데이터를 가져오는 중...</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { modalService, toastService } from '@tempmono/composables'
import { useTodoDetailPrefetch, useTodoInfiniteQuery, useTodoMutations } from './queries/useTodoQueries'
import type { Todo } from './types'

const LIST_PARAMS = { pageSize: 5 }

const router = useRouter()

const {
  data,
  isLoading,
  isError,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useTodoInfiniteQuery(LIST_PARAMS)
const { createTodoMutation, updateTodoMutation, deleteTodoMutation } = useTodoMutations(LIST_PARAMS)

const todos = computed(() => {
  if (!data.value) return []
  return data.value.pages.flatMap((page) => page.items)
})
const totalCount = computed(() => {
  if (!data.value || !data.value.pages.length) return 0
  return data.value.pages[0]?.total ?? todos.value.length
})

const formState = reactive({
  title: '',
  description: ''
})
const editingId = ref<number | null>(null)
const prefetchTargetId = ref<number | null>(null)

const loadTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const isInitialLoading = computed(() => isLoading.value && !data.value?.pages.length)
const isEmptyState = computed(() => !isInitialLoading.value && todos.value.length === 0)

const isEditing = computed(() => editingId.value !== null)
const isMutating = computed(
  () =>
    createTodoMutation.isPending.value ||
    updateTodoMutation.isPending.value ||
    deleteTodoMutation.isPending.value
)

const prefetchTodoDetail = useTodoDetailPrefetch(prefetchTargetId)

const resetForm = () => {
  editingId.value = null
  formState.title = ''
  formState.description = ''
}

const populateForm = (todo: Todo) => {
  editingId.value = todo.id
  formState.title = todo.title
  formState.description = todo.description
}

const handleSubmit = async () => {
  if (!formState.title.trim()) {
    toastService.warning('제목을 입력해주세요.')
    return
  }

  try {
    if (isEditing.value && editingId.value !== null) {
      await updateTodoMutation.mutateAsync({
        id: editingId.value,
        data: {
          title: formState.title,
          description: formState.description
        }
      })
      toastService.success('Todo가 수정되었습니다.')
    } else {
      await createTodoMutation.mutateAsync({
        title: formState.title,
        description: formState.description
      })
      toastService.success('Todo가 추가되었습니다.')
    }
    resetForm()
  } catch (mutationError) {
    console.error(mutationError)
    toastService.error('작업을 처리하는 중 오류가 발생했습니다.')
  }
}

const handleToggle = async (todo: Todo) => {
  try {
    await updateTodoMutation.mutateAsync({
      id: todo.id,
      data: { completed: !todo.completed }
    })
  } catch (mutationError) {
    console.error(mutationError)
    toastService.error('상태를 변경하는 중 오류가 발생했습니다.')
  }
}

const handleDelete = async (id: number) => {
  const confirmed = await modalService.confirm(
    '이 Todo를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.',
    'Todo 삭제',
    {
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger'
    }
  )

  if (!confirmed) {
    return
  }

  try {
    await deleteTodoMutation.mutateAsync(id)
    toastService.info('Todo가 삭제되었습니다.')
    if (editingId.value === id) {
      resetForm()
    }
  } catch (mutationError) {
    console.error(mutationError)
    toastService.error('삭제 중 오류가 발생했습니다.')
  }
}

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const formatDate = (isoString: string) => {
  return dateTimeFormatter.format(new Date(isoString))
}

const handleMouseEnter = async (id: number) => {
  prefetchTargetId.value = id
  await prefetchTodoDetail()
}

const goToDetail = (id: number) => {
  router.push({ name: 'todo-demo-detail', params: { id } })
}

const isObserverActive = () => observer !== null

const createObserver = () => {
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (
          entry.isIntersecting &&
          hasNextPage.value &&
          !isFetchingNextPage.value &&
          !isLoading.value
        ) {
          fetchNextPage()
        }
      })
    },
    { root: null, threshold: 1 }
  )
}

const observeLoadTrigger = () => {
  if (!observer || !loadTrigger.value) return
  if (!hasNextPage.value) {
    observer.unobserve(loadTrigger.value)
    return
  }
  observer.observe(loadTrigger.value)
}

const disconnectObserver = () => {
  if (!observer) return
  observer.disconnect()
  observer = null
}

onMounted(() => {
  if (!isObserverActive()) {
    createObserver()
  }
  observeLoadTrigger()
})

onBeforeUnmount(() => {
  disconnectObserver()
})

watch(hasNextPage, (next) => {
  if (!observer || !loadTrigger.value) return
  if (next) {
    observer.observe(loadTrigger.value)
  } else {
    observer.unobserve(loadTrigger.value)
  }
})

watch(
  () => loadTrigger.value,
  (el, prevEl) => {
    if (!observer) {
      createObserver()
    }
    if (observer && prevEl) {
      observer.unobserve(prevEl)
    }
    if (observer && el && hasNextPage.value) {
      observer.observe(el)
    }
  }
)
</script>

<style scoped>
.todo-demo-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: fadeIn 0.4s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #2d3748;
}

.page-header p {
  color: #718096;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card h2 {
  font-size: 1.5rem;
  color: #2d3748;
}

.todo-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field span {
  font-weight: 600;
  color: #4a5568;
}

input,
textarea {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus,
textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  outline: none;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

button {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

button.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #ffffff;
}

button.secondary {
  background: #edf2f7;
  color: #2d3748;
}

button.danger {
  background: #fc8181;
  color: #1f2933;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.total-count {
  background: #ebf4ff;
  color: #2c5282;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
}

.loading,
.empty,
.error {
  text-align: center;
  padding: 2rem 1rem;
  border-radius: 12px;
  background: #f7fafc;
  color: #4a5568;
  line-height: 1.6;
}

.error {
  background: #fed7d7;
  color: #c53030;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.todo-main {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.todo-checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.todo-checkbox input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.todo-checkbox span {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid #cbd5e0;
  display: inline-block;
  position: relative;
  transition: all 0.2s ease;
}

.todo-checkbox input:checked + span {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

.todo-checkbox input:checked + span::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  font-size: 0.9rem;
  color: #ffffff;
}

.todo-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
  transition: background-color 0.2s ease;
}

.todo-content:focus,
.todo-content:hover {
  background-color: rgba(102, 126, 234, 0.08);
  outline: none;
}

.todo-content h3 {
  font-size: 1.1rem;
  color: #2d3748;
}

.todo-content h3.completed {
  text-decoration: line-through;
  color: #718096;
}

.todo-content p {
  color: #4a5568;
  line-height: 1.5;
}

.todo-content small {
  color: #a0aec0;
}

.todo-actions {
  display: flex;
  gap: 0.5rem;
}

.load-trigger {
  width: 100%;
  height: 1px;
}

.loading-more {
  text-align: center;
  margin-top: 1rem;
  color: #4a5568;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .todo-item {
    flex-direction: column;
  }

  .todo-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

