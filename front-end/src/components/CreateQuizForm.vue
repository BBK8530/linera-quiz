<template>
  <div class="w-full max-w-5xl mx-auto">
    <!-- Notification Prompt -->
    <v-snackbar
      v-model="showNotification"
      :color="notificationType"
      location="top center"
      timeout="3000"
      density="compact"
    >
      <v-icon class="mr-2">{{
        notificationType === "success" ? "mdi-check-circle" : "mdi-alert-circle"
      }}</v-icon>
      {{ notificationMessage }}
    </v-snackbar>
    <v-card elevation="8" rounded="2xl" class="mt-8">
      <v-card-title
        class="bg-gradient-to-r from-primary to-primary/90 text-white py-6 px-8"
      >
        Create New Quiz
      </v-card-title>
      <v-card-text class="p-8">
        <v-form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="title"
            label="Quiz Title"
            variant="outlined"
            density="compact"
            required
            placeholder="Enter quiz title"
            prepend-inner-icon="mdi-pencil"
            class="mb-4"
          ></v-text-field>

          <v-textarea
            v-model="description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="3"
            placeholder="Enter quiz description"
            prepend-inner-icon="mdi-comment-text"
            class="mb-4"
          ></v-textarea>

          <v-row class="mb-4" gap="4">
            <v-col cols="12" md="6">
              <v-text-field
                v-model="startTime"
                label="Start Time"
                type="datetime-local"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-clock-start"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="endTime"
                label="End Time"
                type="datetime-local"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-clock-end"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-text-field
            v-model.number="timeLimit"
            label="Time Limit (seconds)"
            type="number"
            variant="outlined"
            density="compact"
            min="1"
            required
            placeholder="Enter time limit (seconds)"
            prepend-inner-icon="mdi-timer"
            class="mb-6"
          ></v-text-field>

          <div class="mb-6">
            <h3 class="text-xl font-semibold mb-3">Questions</h3>
            <v-card
              v-for="(question, index) in questions"
              :key="index"
              variant="outlined"
              class="mb-4"
            >
              <v-card-text class="p-6">
                <v-text-field
                  v-model="question.text"
                  :label="`Question ${index + 1}`"
                  variant="outlined"
                  density="compact"
                  placeholder="Enter question content"
                  required
                  prepend-inner-icon="mdi-file-question"
                  class="mb-4"
                ></v-text-field>

                <div class="mb-4">
                  <label class="text-subtitle-2 mb-2 d-block">Options:</label>
                  <div
                    v-for="(_, idx) in question.options"
                    :key="idx"
                    class="mb-2"
                  >
                    <v-row align="center">
                      <v-col cols="10">
                        <v-text-field
                          v-model="question.options[idx]"
                          :label="`Option ${idx + 1}`"
                          variant="outlined"
                          density="compact"
                          required
                          prepend-inner-icon="mdi-format-list-bulleted"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="2">
                        <v-btn
                          @click="removeOption(question, idx)"
                          color="error"
                          variant="text"
                          size="small"
                          icon="mdi-delete"
                          :disabled="question.options.length <= 1"
                        ></v-btn>
                      </v-col>
                    </v-row>
                  </div>
                  <v-btn
                    @click="addOption(question)"
                    color="primary"
                    variant="text"
                    size="small"
                    start-icon="mdi-plus"
                  >
                    Add Option
                  </v-btn>
                </div>

                <div class="mb-4">
                  <label class="text-subtitle-2 mb-2 d-block"
                    >Question Type:</label
                  >
                  <v-radio-group v-model="question.questionType" row>
                    <v-radio label="Single Choice" value="single"></v-radio>
                    <v-radio label="Multiple Choice" value="multiple"></v-radio>
                  </v-radio-group>
                </div>

                <v-row gap="4" class="mb-4">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model.number="question.points"
                      label="Points"
                      type="number"
                      variant="outlined"
                      density="compact"
                      min="1"
                      required
                      placeholder="Enter points for this question"
                      prepend-inner-icon="mdi-trophy"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <div class="mb-4">
                  <label class="text-subtitle-2 mb-2 d-block">
                    Correct Answer{{
                      question.questionType === "multiple" ? "s" : ""
                    }}:
                  </label>
                  <div
                    v-for="(_, idx) in question.options"
                    :key="idx"
                    class="ml-2"
                  >
                    <template v-if="question.questionType === 'single'">
                      <v-radio
                        v-model="question.correctOptions"
                        :value="[idx]"
                        :label="`Option ${idx + 1}: ${question.options[idx]}`"
                        color="primary"
                      ></v-radio>
                    </template>
                    <template v-else>
                      <v-checkbox
                        v-model="question.correctOptions"
                        :value="idx"
                        :label="`Option ${idx + 1}: ${question.options[idx]}`"
                        color="primary"
                      ></v-checkbox>
                    </template>
                  </div>
                </div>

                <v-btn
                  type="button"
                  @click="removeQuestion(index)"
                  color="error"
                  variant="text"
                  size="small"
                  start-icon="mdi-delete"
                >
                  Delete Question
                </v-btn>
              </v-card-text>
            </v-card>

            <v-btn
              type="button"
              @click="addQuestion"
              color="primary"
              variant="outlined"
              class="mb-4"
              start-icon="mdi-plus"
            >
              Add Question
            </v-btn>
          </div>

          <v-row justify="end" gap="2">
            <v-btn
              @click="router.push('/')"
              color="secondary"
              variant="outlined"
            >
              Cancel
            </v-btn>
            <v-btn
              type="submit"
              :disabled="loading"
              color="primary"
              variant="elevated"
              start-icon="mdi-check"
              class="ml-4"
            >
              {{ loading ? "Creating..." : "Create Quiz" }}
            </v-btn>
          </v-row>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useMutation } from "@vue/apollo-composable";
import { CREATE_QUIZ } from "../graphql/quizMutations";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
interface Question {
  text: string;
  options: string[];
  points: number;
  correctOptions: number[];
  questionType: string;
}

const title = ref("");
const description = ref("");
const startTime = ref("");
const endTime = ref("");
const timeLimit = ref(300); // Default 5 minutes
const questions = ref<Question[]>([
  {
    text: "",
    options: [""],
    points: 10,
    correctOptions: [],
    questionType: "single",
  },
]);
const router = useRouter();
const userStore = useAuthStore();
// Notification related
const showNotification = ref(false);
const notificationMessage = ref("");
const notificationType = ref("error");

const { mutate: createQuiz, loading } = useMutation(CREATE_QUIZ);

const addQuestion = () => {
  questions.value.push({
    text: "",
    options: [""],
    points: 10,
    correctOptions: [],
    questionType: "single",
  });
};

const removeQuestion = (index: number) => {
  if (questions.value.length > 1) {
    questions.value.splice(index, 1);
  }
};

const addOption = (question: Question) => {
  question.options.push("");
};

const removeOption = (question: Question, index: number) => {
  if (question.options.length <= 1) return;
  question.options.splice(index, 1);
  // Update correct answer index
  question.correctOptions = question.correctOptions
    .filter((idx) => idx !== index)
    .map((idx) => (idx > index ? idx - 1 : idx));
};

const showSnackbar = (message: string, type: string = "error") => {
  notificationMessage.value = message;
  notificationType.value = type;
  showNotification.value = true;
};

const handleSubmit = async () => {
  try {
    // Convert time to millisecond timestamp string
    const startTimestamp = new Date(startTime.value).getTime().toString();
    const endTimestamp = new Date(endTime.value).getTime().toString();

    // Validate time range
    if (new Date(startTime.value) <= new Date()) {
      showSnackbar("Start time must be a future time");
      return;
    }

    if (new Date(endTime.value) <= new Date(startTime.value)) {
      showSnackbar("End time must be after start time");
      return;
    }

    // Validate question format
    const formattedQuestions = questions.value.map((q) => ({
      text: q.text,
      options: q.options,
      correctOptions: q.correctOptions,
      points: q.points,
      questionType: q.questionType,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate a unique ID for each question
    }));

    // Build parameters
    const params = {
      title: title.value,
      description: description.value,
      startTime: startTimestamp,
      endTime: endTimestamp,
      timeLimit: timeLimit.value,
      questions: formattedQuestions,
      nickName: userStore.currentUser?.username || "QuizCreator",
    };

    await createQuiz({ field0: params });

    // Return to homepage after successful creation
    router.push("/");
  } catch (error) {
    console.error("Error creating quiz set:", error);
    showSnackbar("Failed to create quiz, please try again.");
  }
};
</script>
