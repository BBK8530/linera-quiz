<template>
  <div class="w-full max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Available Quizzes</h2>
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
      <v-row :gutter="{ xs: 4, sm: 8, md: 16 }">
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
            class="overflow-hidden transition-all duration-300 hover:elevation-12 hover:shadow-lg hover:-translate-y-1"
          >
            <div class="p-5">
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
              <v-btn
                block
                :color="
                  checkQuizStatus(quiz) === 'available' ? 'primary' : 'grey'
                "
                :variant="
                  checkQuizStatus(quiz) === 'available' ? 'elevated' : 'flat'
                "
                :disabled="checkQuizStatus(quiz) !== 'available'"
                :prepend-icon="
                  checkQuizStatus(quiz) === 'available'
                    ? 'mdi-play-circle-outline'
                    : 'mdi-lock'
                "
                class="transition-all duration-300 hover:shadow-lg"
                @click="
                  router.push({
                    name: 'quizTaking',
                    params: { quizId: quiz.id },
                  })
                "
              >
                {{
                  checkQuizStatus(quiz) === "available"
                    ? "Take Quiz"
                    : checkQuizStatus(quiz) === "not_started"
                    ? `not Started `
                    : `Ended `
                }}
              </v-btn>
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

const { loading, error, result } = useQuery(GET_ALL_QUIZ_SETS);

// Computed property, automatically updates when result.value changes
const quizSets = computed(() => result.value?.quizSets || []);

// Format timestamp to readable format
const formatDateTime = (timestamp: string) => {
  try {
    // Convert to milliseconds and create Date object
    const date = new Date(Number(timestamp) / 1000); // Convert microseconds to milliseconds
    return date.toLocaleString();
  } catch (error) {
    return "Invalid date";
  }
};

// Time status check logic
const currentTime = ref(Date.now());

// Check quiz time status
const checkQuizStatus = (quiz: any) => {
  const now = currentTime.value;
  const startTime = Number(quiz.startTime) / 1000;
  const endTime = Number(quiz.endTime) / 1000;

  if (now < startTime) return "not_started";
  if (now > endTime) return "ended";
  return "available";
};

// Timer to update time periodically
let timeCheckTimer: NodeJS.Timeout;

onMounted(() => {
  // Update current time every minute
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
