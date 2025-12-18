<template>
  <div class="w-full max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Available Quizzes</h2>
    
    <!-- Pagination and Sorting Controls -->
    <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
      <!-- Sort Controls -->
      <div class="flex items-center gap-3">
        <span class="text-gray-700 font-medium">Sort by:</span>
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          variant="outlined"
          density="compact"
          class="w-36"
          @change="handleSortChange"
        ></v-select>
        <v-btn-toggle
          v-model="sortDirection"
          density="compact"
          variant="outlined"
          size="small"
          @change="handleSortChange"
        >
          <v-btn value="ASC" variant="outlined">
            <v-icon>mdi-sort-ascending</v-icon>
          </v-btn>
          <v-btn value="DESC" variant="outlined">
            <v-icon>mdi-sort-descending</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>
      
      <!-- Pagination Controls -->
      <v-pagination
        v-model="currentPage"
        :length="pageCount"
        color="primary"
        density="compact"
        @change="handlePageChange"
      ></v-pagination>
    </div>
    
    <v-card v-if="loading" elevation="4" rounded="lg" class="py-12 mb-6">
      <v-card-text class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
          class="mb-4"
        ></v-progress-circular>
        <p class="text-gray-600">Loading quizzes...</p>
      </v-card-text>
    </v-card>
    <v-alert
      v-else-if="error"
      type="error"
      variant="outlined"
      density="compact"
      class="mb-6"
    >
      {{ error.message }}
    </v-alert>
    <div v-if="quizSets.length > 0">
      <v-row :gutter="{ xs: 4, sm: 8, md: 16 }" align="stretch">
        <v-col
          v-for="quiz in quizSets"
          :key="quiz.id"
          :cols="12"
          :sm="6"
          :md="4"
        >
          <v-card
            elevation="4"
            rounded="xl"
            class="overflow-hidden transition-all duration-300 hover:elevation-12 hover:shadow-lg hover:-translate-y-1 d-flex flex-column h-full"
          >
            <div class="p-5 flex-grow-1 flex flex-column">
              <h3 class="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">
                {{ quiz.title }}
              </h3>
              <p class="text-gray-600 mb-3 line-clamp-3 text-sm h-16">
                {{ quiz.description }}
              </p>
              <div class="text-sm text-gray-500 mb-2 flex items-center">
                <v-icon size="16" class="mr-1" color="primary"
                  >mdi-account</v-icon
                >
                Creator: {{ quiz.creator }}
              </div>
              <div class="text-sm text-gray-500 mb-2 flex items-center">
                <v-icon size="16" class="mr-1" color="primary"
                  >mdi-clipboard-text-multiple</v-icon
                >
                Number of Questions: {{ quiz.questions.length }}
              </div>
              <div class="text-sm text-gray-500 mb-2 flex items-center">
                <v-icon size="16" class="mr-1" color="primary"
                  >mdi-calendar-clock</v-icon
                >
                Start Time: {{ formatDateTime(quiz.startTime) }}
              </div>
              <div class="text-sm text-gray-500 mb-4 flex items-center">
                <v-icon size="16" class="mr-1" color="primary"
                  >mdi-calendar-clock-outline</v-icon
                >
                End Time: {{ formatDateTime(quiz.endTime) }}
              </div>
              <v-alert
                v-if="checkQuizStatus(quiz) === 'not_started'"
                type="info"
                variant="text"
                density="compact"
                class="mb-3"
              >
                ⏰ Quiz not started yet
              </v-alert>
              <v-alert
                v-if="checkQuizStatus(quiz) === 'ended'"
                type="error"
                variant="text"
                density="compact"
                class="mb-3"
              >
                ⏰ Quiz has ended
              </v-alert>
              <!-- Button group container -->
              <div class="flex gap-2 mt-auto pt-3">
                <!-- Not started status -->
                <template v-if="checkQuizStatus(quiz) === 'not_started'">
                  <v-btn
                    flex
                    grow
                    color="grey"
                    variant="flat"
                    prepend-icon="mdi-clock-outline"
                    class="transition-all duration-300"
                    disabled
                  >
                    not Started
                  </v-btn>
                </template>

                <!-- Available status -->
                <template v-else-if="checkQuizStatus(quiz) === 'available'">
                  <v-btn
                    flex
                    grow
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-trophy-outline"
                    class="transition-all duration-300 hover:shadow-lg"
                    @click="
                      router.push({
                        name: 'quizRank',
                        params: { quizId: quiz.id },
                      })
                    "
                  >
                    Rank
                  </v-btn>
                  <v-btn
                    flex
                    grow
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-play-circle-outline"
                    class="transition-all duration-300 hover:shadow-lg"
                    @click="
                      router.push({
                        name: 'quizTaking',
                        params: { quizId: quiz.id },
                      })
                    "
                  >
                    Take Quiz
                  </v-btn>
                </template>

                <!-- Ended status -->
                <template v-else-if="checkQuizStatus(quiz) === 'ended'">
                  <v-btn
                    flex
                    grow
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-trophy-outline"
                    class="transition-all duration-300 hover:shadow-lg"
                    @click="
                      router.push({
                        name: 'quizRank',
                        params: { quizId: quiz.id },
                      })
                    "
                  >
                    Rank
                  </v-btn>
                </template>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>
    <div v-else class="text-center py-12">
      <p class="text-gray-600 text-lg">No available quizzes</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { GET_ALL_QUIZ_SETS } from "../graphql/quizQueries";

const router = useRouter();

// 分页和排序相关响应式变量
const sortBy = ref("id");
const sortDirection = ref("ASC");
const currentPage = ref(1);
const limit = ref(10);

// 排序选项
const sortOptions = [
  { text: "ID", value: "id" },
  { text: "Title", value: "title" },
  { text: "Created At", value: "created_at" }
];

// 计算属性，当result.value变化时自动更新
const quizSets = computed(() => result.value?.quizSets || []);

// 总记录数，这里假设我们从后端获取总数，目前用quizSets的长度代替
const totalItems = computed(() => quizSets.value.length);

// 计算总页数
const pageCount = computed(() => Math.ceil(totalItems.value / limit.value));

// 计算当前页码对应的offset
const offset = computed(() => (currentPage.value - 1) * limit.value);

// 使用useQuery并传递分页和排序参数
const { loading, error, result, refetch } = useQuery(GET_ALL_QUIZ_SETS, {
  variables: {
    limit: limit.value,
    offset: offset.value,
    sortBy: sortBy.value,
    sortDirection: sortDirection.value
  }
});

// 处理排序变化
const handleSortChange = () => {
  // 排序变化时重置到第一页
  currentPage.value = 1;
  refetch({
    variables: {
      limit: limit.value,
      offset: offset.value,
      sortBy: sortBy.value,
      sortDirection: sortDirection.value
    }
  });
};

// 处理页面变化
const handlePageChange = () => {
  refetch({
    variables: {
      limit: limit.value,
      offset: offset.value,
      sortBy: sortBy.value,
      sortDirection: sortDirection.value
    }
  });
};

// 格式化时间戳为可读格式
const formatDateTime = (timestamp: string) => {
  try {
    // 转换为毫秒并创建Date对象
    const date = new Date(Number(timestamp) / 1000); // 微秒转毫秒
    return date.toLocaleString();
  } catch (error) {
    return "Invalid date";
  }
};

// 时间状态检查逻辑
const currentTime = ref(Date.now());

// 检查测验时间状态
const checkQuizStatus = (quiz: any) => {
  const now = currentTime.value;
  const startTime = Number(quiz.startTime) / 1000;
  const endTime = Number(quiz.endTime) / 1000;

  if (now < startTime) return "not_started";
  if (now > endTime) return "ended";
  return "available";
};

// 定时器定期更新时间
let timeCheckTimer: NodeJS.Timeout;

onMounted(() => {
  // 每分钟更新一次当前时间
  timeCheckTimer = setInterval(() => {
    currentTime.value = Date.now();
  }, 60000);
});

onUnmounted(() => {
  clearInterval(timeCheckTimer);
});
</script>

<style scoped>
.quiz-list-container {
  width: 100%;
}
</style>
