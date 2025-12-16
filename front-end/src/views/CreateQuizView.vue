<template>
  <div class="w-full max-w-3xl mx-auto">
    <!-- Notification prompt -->
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
      <!-- Quiz header -->
      <v-card-title
        class="bg-gradient-to-r from-primary to-primary/90 text-white py-6 px-8"
      >
        <v-icon class="mr-2" size="32"
          >mdi-file-document-multiple-outline</v-icon
        >
        <div>
          <h1
            class="text-[clamp(1.5rem,3vw,2rem)] font-bold mb-1 tracking-tight"
          >
            Create Quiz
          </h1>
          <p class="text-white opacity-90 text-sm">
            Design your exclusive quiz challenge, set questions and points
          </p>
        </div>
      </v-card-title>

      <!-- Form content -->
      <v-card-text class="p-8">
        <v-form @submit.prevent="handleCreateQuiz">
          <v-text-field
            v-model="quizTitle"
            label="Quiz Title"
            variant="outlined"
            density="compact"
            required
            placeholder="Enter quiz title"
            prepend-inner-icon="mdi-pencil"
            class="mb-4"
          ></v-text-field>

          <v-textarea
            v-model="quizDescription"
            label="Quiz Description"
            variant="outlined"
            density="compact"
            rows="3"
            placeholder="Briefly describe the quiz content"
            prepend-inner-icon="mdi-comment-text"
            class="mb-6"
          ></v-textarea>

          <div class="mb-6">
            <h2 class="text-lg font-semibold mb-3 flex items-center">
              <v-icon class="mr-2" color="primary"
                >mdi-comment-question-outline</v-icon
              >
              Question List
            </h2>
            <v-card
              v-for="(question, index) in questions"
              :key="question.id"
              variant="outlined"
              class="mb-4"
            >
              <v-card-text class="p-6">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="text-base font-medium text-gray-800">
                    Question {{ index + 1 }}
                  </h3>
                  <v-btn
                    type="button"
                    @click="removeQuestion(index)"
                    color="error"
                    variant="text"
                    size="small"
                  >
                    <v-icon size="16">mdi-delete</v-icon>
                  </v-btn>
                </div>
                <v-text-field
                  v-model="question.text"
                  label="Question Content"
                  variant="outlined"
                  density="compact"
                  required
                  placeholder="Enter question content"
                  prepend-inner-icon="mdi-question-mark"
                  class="mb-4"
                ></v-text-field>
                <div class="mb-4">
                  <label class="block text-gray-700 mb-1 font-medium"
                    >Question Type</label
                  >
                  <v-radio-group v-model="question.type" density="compact">
                    <v-radio
                      value="single"
                      label="Single Choice"
                      color="primary"
                    ></v-radio>
                    <v-radio
                      value="multiple"
                      label="Multiple Choice"
                      color="primary"
                    ></v-radio>
                  </v-radio-group>
                </div>
                <v-text-field
                  v-model.number="question.points"
                  label="Question Points"
                  type="number"
                  variant="outlined"
                  density="compact"
                  min="1"
                  required
                  placeholder="Enter points"
                  prepend-inner-icon="mdi-trophy"
                  class="mb-4"
                  style="max-width: 150px"
                ></v-text-field>
                <div class="mb-4">
                  <label class="block text-gray-700 mb-1 font-medium"
                    >Options</label
                  >
                  <div
                    v-for="(_option, optIndex) in question.options"
                    :key="optIndex"
                    class="flex items-center mb-2"
                  >
                    <v-text-field
                      v-model="question.options[optIndex]"
                      variant="outlined"
                      density="compact"
                      placeholder="Option {{ optIndex + 1 }}"
                      required
                      class="flex-1"
                    ></v-text-field>
                    <v-btn
                      type="button"
                      @click="removeOption(question, optIndex)"
                      color="error"
                      variant="text"
                      size="small"
                      class="ml-2"
                      :disabled="question.options.length <= 2"
                    >
                      Delete
                    </v-btn>
                  </div>
                  <v-btn
                    type="button"
                    @click="addOption(question)"
                    color="primary"
                    variant="text"
                    size="small"
                    class="mt-1"
                  >
                    <v-icon size="16" class="mr-1">mdi-plus</v-icon>
                    Add Option
                  </v-btn>
                </div>
                <div class="mb-1">
                  <label class="block text-gray-700 mb-1 font-medium"
                    >Correct Answer</label
                  >
                  <div v-if="question.type === 'single'">
                    <v-select
                      v-model.number="question.correctAnswers[0]"
                      :items="
                        question.options.map((option, index) => ({
                          text: option,
                          value: index,
                        }))
                      "
                      variant="outlined"
                      density="compact"
                      required
                      placeholder="Select correct answer"
                      prepend-inner-icon="mdi-check-circle"
                    ></v-select>
                  </div>
                  <div v-else>
                    <div class="space-y-2">
                      <p class="text-xs text-gray-500 mb-1">
                        Select all correct answers
                      </p>
                      <div
                        v-for="(option, optIndex) in question.options"
                        :key="optIndex"
                        class="flex items-center"
                      >
                        <v-checkbox
                          v-model="question.correctAnswers"
                          :value="optIndex"
                          :label="option"
                          color="primary"
                          density="compact"
                        ></v-checkbox>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
            <v-btn
              type="button"
              @click="addQuestion"
              color="primary"
              variant="outlined"
              class="mt-3"
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
              :disabled="questions.length === 0"
              color="primary"
              variant="elevated"
              start-icon="mdi-check"
            >
              Publish Quiz
            </v-btn>
          </v-row>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import { useMutation } from "@vue/apollo-composable";
import { CREATE_QUIZ } from "../graphql/quizMutations";

interface Question {
  id: string;
  text: string;
  points: number;
  type: "single" | "multiple";
  options: string[];
  correctAnswers: number[];
}

const quizTitle = ref("");
const quizDescription = ref("");
const questions = reactive<Question[]>([]);
const loading = ref(false);
const errorMessage = ref("");

// Notification related
const showNotification = ref(false);
const notificationMessage = ref("");
const notificationType = ref("success");

const showSnackbar = (message: string, type: string = "success") => {
  notificationMessage.value = message;
  notificationType.value = type;
  showNotification.value = true;
  setTimeout(() => (showNotification.value = false), 3000);
};

const router = useRouter();
const authStore = useAuthStore();

// Check if user is logged in on initialization
onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push("/login");
  }
});

// Add new question
const addQuestion = () => {
  questions.push({
    id: crypto.randomUUID(),
    text: "",
    points: 10,
    type: "single",
    options: ["", ""],
    correctAnswers: [0],
  });
};

// Delete question
const removeQuestion = (index: number) => {
  questions.splice(index, 1);
};

// Add option
const addOption = (question: Question) => {
  question.options.push("");
};

// Delete option
const removeOption = (question: Question, optIndex: number) => {
  question.options.splice(optIndex, 1);
  // If the deleted option is one of the current correct answers, update the correct answers array
  question.correctAnswers = question.correctAnswers
    .filter((index) => index !== optIndex)
    .map((index) => (index > optIndex ? index - 1 : index));
  // If there are no correct answers left, automatically set the first option as the correct answer
  if (question.correctAnswers.length === 0) {
    question.correctAnswers.push(0);
  }
};

// Create quiz using GraphQL mutation
const { mutate: createQuizMutation } = useMutation(CREATE_QUIZ);

// Parse error message
const parseErrorMessage = (error: any): string => {
  if (!error) return "";
  
  if (error.quizNotFound) return `Quiz not found: ID ${error.quizNotFound.value}`;
  if (error.quizNotStarted) return `Quiz not started: ID ${error.quizNotStarted.value}`;
  if (error.quizEnded) return `Quiz ended: ID ${error.quizEnded.value}`;
  if (error.alreadySubmitted) return `${error.alreadySubmitted.user} has already submitted this quiz: ID ${error.alreadySubmitted.value}`;
  if (error.unauthorized) return "Unauthorized access, please login first";
  if (error.invalidInput) return `Invalid input parameters: ${error.invalidInput.value}`;
  if (error.invalidAnswerFormat) return `Invalid answer format: ${error.invalidAnswerFormat.value}`;
  if (error.invalidTimestampFormat) return `Invalid timestamp format: ${error.invalidTimestampFormat.value}`;
  if (error.invalidTimeRange) return `Invalid time range: ${error.invalidTimeRange.value}`;
  if (error.storageError) return `Storage operation failed: ${error.storageError.value}`;
  if (error.other) return `Other error: ${error.other.value}`;
  
  return "Unknown error";
};

// Handle quiz publishing
const handleCreateQuiz = async () => {
  if (!authStore.currentUser) return;
  
  // Form validation
  if (!quizTitle.value.trim()) {
    showSnackbar("Please enter quiz title", "error");
    return;
  }
  
  if (questions.length === 0) {
    showSnackbar("Please add at least one question", "error");
    return;
  }
  
  // Validate each question
  for (const question of questions) {
    if (!question.text.trim()) {
      showSnackbar("Please fill in all question content", "error");
      return;
    }
    
    if (question.options.length < 2) {
      showSnackbar("Each question needs at least two options", "error");
      return;
    }
    
    if (question.options.some(opt => !opt.trim())) {
      showSnackbar("Please fill in all option content", "error");
      return;
    }
    
    if (question.correctAnswers.length === 0) {
      showSnackbar("Please set correct answer for each question", "error");
      return;
    }
  }
  
  try {
    loading.value = true;
    errorMessage.value = "";
    
    // Build submission parameters
    const params = {
      field0: {
        title: quizTitle.value,
        description: quizDescription.value,
        questions: questions.map(q => ({
          text: q.text,
          points: q.points,
          options: q.options,
          correctAnswers: q.correctAnswers,
        })),
        startTime: Date.now(), // Start time now
        endTime: Date.now() + 3600000, // End time after 1 hour
      },
    };
    
    // Call GraphQL API to create quiz
    const result = await createQuizMutation(params);
    if (!result) {
      errorMessage.value = "Failed to create quiz, please try again later";
      showSnackbar(errorMessage.value, "error");
      return;
    }
    const createResult = result.data?.createQuiz;
    
    // Check for errors
    if (createResult?.error) {
      errorMessage.value = parseErrorMessage(createResult.error);
      showSnackbar(errorMessage.value, "error");
      return;
    }
    
    // Creation successful
    showSnackbar("Quiz created successfully!");
    router.push("/");
  } catch (err) {
    console.error("Failed to create quiz:", err);
    showSnackbar("Failed to create quiz, please try again later", "error");
  } finally {
    loading.value = false;
  }
};

// Add one question initially
addQuestion();
</script>
