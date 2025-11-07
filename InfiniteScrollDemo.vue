<template>
  <div class="infinite-scroll-demo">
    <div class="header">
      <h1>인피니티 스크롤 데모</h1>
      <p>총 {{ totalItems }}개의 아이템 중 {{ items.length }}개 로드됨</p>
    </div>

    <InfiniteScrollList
      :items="items"
      :loading="loading"
      :has-more="hasMore"
      @load-more="loadMore"
    >
      <!-- 아이템 렌더링 슬롯 -->
      <template #items="{ items: listItems }">
        <div class="items-grid">
          <div
            v-for="item in listItems"
            :key="item.id"
            class="item-card"
          >
            <div class="item-image">
              <img :src="item.image" :alt="item.title" />
            </div>
            <div class="item-content">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <div class="item-meta">
                <span class="price">{{ item.price.toLocaleString() }}원</span>
                <span class="category">{{ item.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 커스텀 로딩 메시지 (선택적) -->
      <template #loading>
        <div class="custom-loading">
          <p>더 많은 상품을 불러오는 중...</p>
        </div>
      </template>

      <!-- 커스텀 끝 메시지 (선택적) -->
      <template #end>
        <div class="custom-end">
          <p>✨ 모든 상품을 확인하셨습니다! ✨</p>
        </div>
      </template>
    </InfiniteScrollList>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { InfiniteScrollList } from '@tempmono/ui'

// 목업 데이터 타입
interface MockItem {
  id: number
  title: string
  description: string
  price: number
  category: string
  image: string
}

// 상태 관리
const items = ref<MockItem[]>([])
const loading = ref(false)
const currentPage = ref(0)
const totalPages = 3
const itemsPerPage = 10
const totalItems = totalPages * itemsPerPage

// 더 로드할 데이터가 있는지 계산
const hasMore = computed(() => currentPage.value < totalPages)

// 목업 API: 실제 API를 시뮬레이션
const fetchMockData = (page: number): Promise<MockItem[]> => {
  return new Promise((resolve) => {
    // 네트워크 지연 시뮬레이션 (0.5~1초)
    const delay = Math.random() * 500 + 500
    
    setTimeout(() => {
      const startId = page * itemsPerPage + 1
      const mockItems: MockItem[] = []
      
      for (let i = 0; i < itemsPerPage; i++) {
        const id = startId + i
        mockItems.push({
          id,
          title: `상품 ${id}`,
          description: `이것은 상품 ${id}의 상세 설명입니다. 고품질의 제품을 합리적인 가격에 만나보세요.`,
          price: Math.floor(Math.random() * 100000) + 10000,
          category: ['전자기기', '패션', '도서', '식품', '생활용품'][Math.floor(Math.random() * 5)],
          image: `https://picsum.photos/seed/${id}/400/300`
        })
      }
      
      resolve(mockItems)
    }, delay)
  })
}

// 더 많은 데이터 로드
const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  
  try {
    const newItems = await fetchMockData(currentPage.value)
    items.value.push(...newItems)
    currentPage.value++
  } catch (error) {
    console.error('데이터 로드 실패:', error)
  } finally {
    loading.value = false
  }
}

// 초기 데이터 로드
loadMore()
</script>

<style scoped>
.infinite-scroll-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.header p {
  color: #666;
  font-size: 1rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.item-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.item-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f0f0f0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-content {
  padding: 1.5rem;
}

.item-content h3 {
  font-size: 1.25rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.item-content p {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price {
  font-size: 1.1rem;
  font-weight: bold;
  color: #3498db;
}

.category {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  background: #f0f0f0;
  border-radius: 20px;
  color: #666;
}

.custom-loading,
.custom-end {
  text-align: center;
  padding: 2rem;
  font-size: 1rem;
  color: #666;
}

.custom-end {
  color: #3498db;
  font-weight: 500;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .infinite-scroll-demo {
    padding: 1rem;
  }
}
</style>

