<template>
  <div class="w-full max-w-5xl mx-auto">
    <!-- 复制成功提示 -->
    <v-snackbar
      v-model="showNotification"
      :color="notificationType"
      location="top center"
      timeout="3000"
      density="compact"
      close-icon="mdi-close"
    >
      <v-icon class="mr-2">{{
        notificationType === "success" ? "mdi-check-circle" : "mdi-alert-circle"
      }}</v-icon>
      {{ notificationMessage }}
    </v-snackbar>

    <v-card class="mb-8" elevation="8" rounded="2xl" gap="12">
      <!-- 头部 -->
      <v-card-title
        class="bg-gradient-to-r from-primary to-primary/90 text-white py-6 px-8"
        title-level="h1"
      >
        <div class="text-left">
          <div
            class="text-[clamp(1.5rem,3vw,2.5rem)] font-bold mb-1 tracking-tight"
          >
            Quiz Challenge
          </div>
          <div class="text-white opacity-90">
            Create, share, and participate in quizzes
          </div>
        </div>
      </v-card-title>

      <!-- 内容区 -->
      <v-card-text class="p-8">
        <v-row align="center" justify="space-between" class="mb-8 mt-2">
          <v-col cols="4" sm="auto" class="mb-3 sm:mb-0">
            <h2
              class="text-xl font-semibold text-primary"
              style="letter-spacing: 0.5px"
            >
              <span class="border-b-2 border-primary/60 pb-1">My Quizes</span>
            </h2>
          </v-col>
          <v-col
            cols="20"
            sm="auto"
            class="d-flex flex-wrap gap-3 justify-sm-end"
          >
            <v-text-field
              v-model="searchTerm"
              placeholder="Search quizzes..."
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              style="width: 180px"
              hide-details
              rounded="full"
              elevation="1"
            ></v-text-field>
            <v-select
              v-model="sortBy"
              :items="sortOptions"
              variant="outlined"
              density="compact"
              class="max-w-xs w-200"
              hide-details
              rounded="full"
              elevation="1"
            ></v-select>
            <v-btn
              @click="router.push('/create-quiz')"
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus-circle-outline"
              size="large"
              rounded="full"
              elevation="4"
              hover="elevation-8"
            >
              Create Quiz
            </v-btn>
          </v-col>
        </v-row>

        <!-- 加载状态 -->
        <v-row v-if="loading" justify="center">
          <v-col class="text-center py-12 bg-gray-50 rounded-xl">
            <v-progress-circular
              indeterminate
              color="primary"
              size="48"
            ></v-progress-circular>
            <div class="text-gray-500 mt-4">Loading...</div>
          </v-col>
        </v-row>

        <!-- 错误状态 -->
        <v-row v-else-if="error || errorMessage" justify="center">
          <v-col class="text-center py-12 bg-gray-50 rounded-xl">
            <v-alert
              type="error"
              variant="text"
              title="Failed to load quizzes"
              class="mb-6"
            >
              {{ errorMessage || error?.message }}
            </v-alert>
            <v-btn
              @click="processQuizData()"
              color="primary"
              variant="elevated"
              size="large"
              density="compact"
            >
              Retry
            </v-btn>
          </v-col>
        </v-row>

        <!-- 问卷列表 -->
        <v-row
          v-else-if="filteredQuizzes.length > 0"
          :cols="12"
          :sm="6"
          :md="4"
          gutter="lg"
        >
          <v-col v-for="quiz in filteredQuizzes" :key="quiz.id">
            <v-card
              elevation="4"
              rounded="xl"
              class="h-full transition-all duration-300 hover:shadow-xl hover:bg-primary/5"
            >
              <v-card-text class="p-5">
                <h3 class="text-lg font-medium mb-2 line-clamp-1">
                  {{ quiz.title }}
                </h3>
                <p class="text-sm text-gray-600 mb-4 line-clamp-2">
                  {{ quiz.description }}
                </p>
                <div class="flex items-center text-xs text-gray-500 mb-4">
                  <span>Questions: {{ quiz.questions.length }}</span>
                  <span class="mx-2">•</span>
                  <span>Created at: {{ formatDate(quiz.createdAt) }}</span>
                </div>
                <div class="d-flex gap-2">
                  <v-btn
                    @click="router.push(`/quiz-rank/${quiz.id}`)"
                    color="primary"
                    variant="outlined"
                    class="text-sm flex-1"
                  >
                    <v-icon size="16" class="mr-1">mdi-chart-bar</v-icon>
                    View Rankings
                  </v-btn>
                  <v-btn
                    color="success"
                    variant="outlined"
                    class="text-sm flex-1"
                    @click="copyQuizLink(quiz.id)"
                  >
                    <v-icon size="16" class="mr-1">mdi-content-copy</v-icon>
                    Copy Link
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- 空状态 -->
        <v-row v-else justify="center">
          <v-col class="text-center py-12 bg-gray-50 rounded-xl">
            <v-icon size="80" color="primary" class="opacity-20 mb-4"
              >mdi-file-document-outline</v-icon
            >
            <div class="text-gray-500 mb-6">No matching quizzes found</div>
            <v-btn
              @click="router.push('/create-quiz')"
              color="primary"
              variant="elevated"
              size="large"
              density="compact"
              rounded="full"
              elevation="4"
              hover="elevation-8"
            >
              Create Quiz
            </v-btn>
          </v-col>
        </v-row>

        <!-- 分页控件 -->
        <v-row v-if="totalPages > 1" justify="center" class="mt-8">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            size="large"
            color="primary"
          ></v-pagination>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 使用指南 -->
    <v-card class="mb-8" elevation="8" rounded="2xl">
      <v-card-text class="p-8">
        <h2 class="text-xl font-semibold mb-6">How to Use</h2>
        <v-row :cols="12" :md="3" gutter="lg">
          <v-col
            v-for="(step, index) in usageSteps"
            :key="index"
            class="flex-shrink-0 min-w-[250px]"
          >
            <v-card
              variant="text"
              rounded="xl"
              class="p-6 min-h-[200px] w-full flex flex-col justify-between hover:bg-primary/5 transition-all duration-300"
            >
              <v-avatar
                size="64"
                color="primary"
                variant="tonal"
                class="mx-auto mb-4 d-flex align-center justify-center"
              >
                <span class="text-primary font-bold text-2xl">{{
                  index + 1
                }}</span>
              </v-avatar>
              <h3
                class="font-medium text-lg mb-3 text-center overflow-hidden break-words break-all"
              >
                {{ step.title }}
              </h3>
              <p
                class="text-gray-600 text-center overflow-hidden break-words break-all"
                style="word-wrap: break-word; word-break: break-word"
              >
                {{ step.description }}
              </p>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { useAuthStore } from "../stores/authStore";
import { GET_USER_CREATED_QUIZZES } from "../graphql/quizQueries";

const authStore = useAuthStore();
const router = useRouter();
const searchTerm = ref("");
const sortBy = ref("createdAt");
const errorMessage = ref("");

// 排序选项
const sortOptions = [
  { title: "Recently Created", value: "createdAt" },
  { title: "Sort by Title", value: "title" },
  { title: "Number of Questions", value: "questions" },
];

// 使用指南步骤
const usageSteps = [
  {
    title: "Create Quiz",
    description:
      "Add questions and set points for each question to create your own quiz challenge",
  },
  {
    title: "Share & Participate",
    description:
      "Invite others to participate, the system will calculate scores based on answer speed and accuracy",
  },
  {
    title: "View Rankings",
    description:
      "Check real-time participant rankings to see the fastest and most accurate quiz masters",
  },
];

// 格式化日期
const formatDate = (timestamp: string) => {
  try {
    // 转换为毫秒并创建Date对象
    const date = new Date(Number(timestamp) / 1000); // 微秒转毫秒
    return date.toLocaleDateString("en-US");
  } catch (error) {
    return "Invalid date";
  }
};

const showNotification = ref(false);
const notificationMessage = ref("");
const notificationType = ref("success");

const showToast = (message: string, isSuccess: boolean = true) => {
  notificationMessage.value = message;
  notificationType.value = isSuccess ? "success" : "error";
  showNotification.value = true;
  setTimeout(() => (showNotification.value = false), 3000);
};

const copyQuizLink = (quizId: string) => {
  const link = `${window.location.origin}/quiz/${quizId}`;
  navigator.clipboard
    .writeText(link)
    .then(() => {
      showToast("Quiz link copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy link: ", err);
      showToast("Failed to copy link: " + link, false);
    });
};

// 使用GraphQL查询获取所有问卷
const { result, loading, error } = useQuery(GET_USER_CREATED_QUIZZES, {
  nickname: authStore.currentUser?.username || "",
});

// 从result中获取数据
const data = result;

// 过滤和排序问卷数据
const filteredQuizzes = ref<any[]>([]);
const totalQuizzes = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);
const pageSize = ref(6);

// 解析错误信息
const parseErrorMessage = (error: any): string => {
  if (!error) return "";
  
  if (error.quizNotFound) return `测验不存在: ID ${error.quizNotFound.value}`;
  if (error.quizNotStarted) return `测验尚未开始: ID ${error.quizNotStarted.value}`;
  if (error.quizEnded) return `测验已结束: ID ${error.quizEnded.value}`;
  if (error.alreadySubmitted) return `${error.alreadySubmitted.user} 已经提交过该测验: ID ${error.alreadySubmitted.value}`;
  if (error.unauthorized) return "未授权访问，请先登录";
  if (error.invalidInput) return `输入参数无效: ${error.invalidInput.value}`;
  if (error.invalidAnswerFormat) return `答案格式错误: ${error.invalidAnswerFormat.value}`;
  if (error.invalidTimestampFormat) return `时间戳格式错误: ${error.invalidTimestampFormat.value}`;
  if (error.invalidTimeRange) return `时间范围错误: ${error.invalidTimeRange.value}`;
  if (error.storageError) return `存储操作失败: ${error.storageError.value}`;
  if (error.other) return `其他错误: ${error.other.value}`;
  
  return "未知错误";
};

// 处理查询结果
const processQuizData = () => {
  if (!data.value?.getUserCreatedQuizzes) {
    filteredQuizzes.value = [];
    totalQuizzes.value = 0;
    totalPages.value = 1;
    return;
  }

  const queryResult = data.value.getUserCreatedQuizzes;
  
  // 检查是否有错误
  if (queryResult.error) {
    errorMessage.value = parseErrorMessage(queryResult.error);
    filteredQuizzes.value = [];
    totalQuizzes.value = 0;
    totalPages.value = 1;
    return;
  }

  let quizzes = [...(queryResult.data || [])];

  // 搜索功能
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    quizzes = quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(term) ||
        quiz.description.toLowerCase().includes(term)
    );
  }

  // 排序功能
  quizzes.sort((a, b) => {
    if (sortBy.value === "createdAt") {
      return Number(b.createdAt) - Number(a.createdAt);
    } else if (sortBy.value === "title") {
      return a.title.localeCompare(b.title);
    } else if (sortBy.value === "questions") {
      return b.questions.length - a.questions.length;
    }
    return 0;
  });

  totalQuizzes.value = quizzes.length;
  totalPages.value = Math.ceil(quizzes.length / pageSize.value);

  // 分页功能
  const startIndex = (currentPage.value - 1) * pageSize.value;
  filteredQuizzes.value = quizzes.slice(
    startIndex,
    startIndex + pageSize.value
  );
};

onMounted(() => {
  // 初始化数据
  authStore.initAuth();

  // 未登录用户重定向到登录页
  if (!authStore.isAuthenticated) {
    router.push("/login");
    return;
  }

  processQuizData();
});

// 监听搜索和排序变化
watch([searchTerm, sortBy], () => {
  currentPage.value = 1; // 重置到第一页
  processQuizData();
});

// 监听页码变化
watch(currentPage, processQuizData);

// 监听GraphQL数据变化
watch(() => data?.value?.getUserCreatedQuizzes, processQuizData, {
  deep: true,
});
</script>

{{ formatDate(quiz.createdAt) }}
