<template>
  <div id="app">
    <header class="app-header">
      <h1>🚀 tempMono - Turborepo</h1>
      <nav class="main-nav">
        <RouterLink to="/">홈</RouterLink>
        <RouterLink to="/items">아이템 관리</RouterLink>
        <RouterLink to="/demo">데모</RouterLink>
        <RouterLink to="/suspense-demo">Suspense 데모</RouterLink>
        <RouterLink to="/gallery">갤러리</RouterLink>
        <RouterLink to="/infinite-scroll">인피니티 스크롤</RouterLink>
        <RouterLink to="/order-management">주문 관리</RouterLink>
        <RouterLink to="/todo-demo">Todo 데모</RouterLink>
        <SearchIcon 
          :active="isSearchOpen" 
          title="검색"
          @click="openSearchLayer" 
        />
        <Button
          variant="outline"
          size="small"
          class="theme-toggle-btn"
          :title="`테마 전환: ${isDark ? '다크' : '라이트'}`"
          aria-label="테마 전환"
          @click="toggleTheme"
        >
          {{ isDark ? '🌙' : '☀️' }}
        </Button>
      </nav>
    </header>
    
    <main class="app-main">
      <RouterView />
    </main>
    
    <footer class="app-footer">
      <p>tempMono - Turborepo + pnpm workspace</p>
    </footer>
    
    <!-- 전역 UI 컨테이너 -->
    <ModalContainer />
    <ToastContainer />
    <GlobalSpinnerContainer />
    
    <!-- 검색 레이어 -->
    <SearchLayer 
      :is-open="isSearchOpen"
      @close="closeSearchLayer"
      @search="handleSearch"
      @select="handleSearchSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import ModalContainer from './components/ModalContainer.vue'
import ToastContainer from './components/ToastContainer.vue'
import GlobalSpinnerContainer from './components/GlobalSpinnerContainer.vue'
import { SearchIcon, SearchLayer, Button } from '@tempmono/ui'
import { useSearchLayer, useTheme } from '@tempmono/composables'

const router = useRouter()
const route = useRoute()
const { isSearchOpen, openSearchLayer, closeSearchLayer } = useSearchLayer()
const { isDark, toggleTheme } = useTheme()

const handleSearch = (query: string) => {
  // 검색 레이어 내에서 검색 처리 (실제 검색 로직은 SearchLayer 컴포넌트에서 처리)
  console.log('Search query:', query)
  // 필요시 여기서 검색 결과를 처리하거나 다른 액션을 수행
}

const handleSearchSelect = (result: any) => {
  // 검색 결과 선택 시 처리
  console.log('Selected result:', result)
  if (result.url) {
    router.push(result.url)
  }
  closeSearchLayer()
}

// 쿼리 파라미터 변경 감지하여 검색 레이어 열기
watch(() => route.query.search, (newSearch) => {
  if (newSearch === 'layer') {
    openSearchLayer()
  }
}, { immediate: true })
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--text-color);
}

.app-header {
  background: var(--header-bg);
  color: var(--header-text-color);
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin-bottom: 1rem;
  font-size: 2rem;
}

.main-nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.main-nav a {
  color: var(--link-on-header-color);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s;
}

.main-nav a:hover {
  background: var(--link-hover-bg);
}

.main-nav a.router-link-active {
  background: var(--link-active-bg);
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  background: var(--footer-bg);
  padding: 1rem;
  text-align: center;
  color: var(--footer-text-color);
}
</style>

