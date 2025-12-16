import { defineStore } from 'pinia';
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

interface Question {
  id: string;
  text: string;
  points: number;
  options: string[];
  type: 'single' | 'multiple';
  correctAnswers: number[];
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  questions: Question[];
  createdAt: Date;
}

interface QuizSubmission {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  score: number;
  timeTaken: number; // in seconds
  submittedAt: Date;
}

export const useQuizStore = defineStore('quiz', () => {
  const quizzes = ref<Quiz[]>([]);
  const submissions = ref<QuizSubmission[]>([]);

  // Initialize data - load from localStorage
  const initQuizzes = () => {
    const savedQuizzes = localStorage.getItem('quizzes');
    const savedSubmissions = localStorage.getItem('submissions');

    if (savedQuizzes) {
      quizzes.value = JSON.parse(savedQuizzes);
      // Convert string dates to Date objects
      quizzes.value.forEach(quiz => {
        quiz.createdAt = new Date(quiz.createdAt);
      });
    }

    if (savedSubmissions) {
      submissions.value = JSON.parse(savedSubmissions);
      // 转换字符串日期为Date对象
      submissions.value.forEach(submission => {
        submission.submittedAt = new Date(submission.submittedAt);
      });
    }
  };

  // Create new quiz
  const createQuiz = (title: string, description: string, creatorId: string): Quiz => {
    const newQuiz: Quiz = {
      id: uuidv4(),
      title,
      description,
      creatorId,
      questions: [],
      createdAt: new Date()
    };

    quizzes.value.push(newQuiz);
    localStorage.setItem('quizzes', JSON.stringify(quizzes.value));
    return newQuiz;
  };

  // Add question to quiz
  const addQuestion = (quizId: string, question: Omit<Question, 'id'>): boolean => {
    const quizIndex = quizzes.value.findIndex(q => q.id === quizId);
    if (quizIndex === -1) return false;
  
    const newQuestion: Question = {
      ...question,
      id: uuidv4()
    };
  
    const quiz = quizzes.value[quizIndex];
    if (quiz) {
      quiz.questions.push(newQuestion);
    }
    localStorage.setItem('quizzes', JSON.stringify(quizzes.value));
    return true;
  };
  
  // Submit quiz answers and calculate score
  const submitQuiz = (
    quizId: string,
    userId: string,
    userName: string,
    answers: { questionId: string; selectedAnswers: number[]; timeTaken: number }[]
  ): QuizSubmission => {
    const quiz = quizzes.value.find(q => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');
  
    let totalScore = 0;
    let totalTime = 0;
  
    // Calculate score (shorter correct answer time, higher weight)
    answers.forEach(answer => {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (question) {
        totalTime += answer.timeTaken;
        let isCorrect = false;
  
        if (question.type === 'single') {
          // Single-choice question: check if correct answer is selected
          isCorrect = answer.selectedAnswers.length === 1 && question.correctAnswers.includes(answer.selectedAnswers[0]);
        } else {
          // Multiple-choice question: check if all correct answers are selected and no incorrect answers are selected
          isCorrect = question.correctAnswers.every(ca => answer.selectedAnswers.includes(ca)) &&
                     answer.selectedAnswers.every(sa => question.correctAnswers.includes(sa));
        }
  
        if (isCorrect) {
          // Time weight formula: base score × (1 - time ratio), time ratio = time used / 30 seconds (assuming 30 seconds as benchmark)
          const timeRatio = Math.min(answer.timeTaken / 30, 1);
          const weightedScore = Math.round(question.points * (1 - timeRatio));
          totalScore += weightedScore;
        }
      }
    });
  
    const submission: QuizSubmission = {
      id: uuidv4(),
      quizId,
      userId,
      userName,
      score: totalScore,
      timeTaken: totalTime,
      submittedAt: new Date()
    };
  
    submissions.value.push(submission);
    localStorage.setItem('submissions', JSON.stringify(submissions.value));
    return submission;
  };

  // Get quiz rankings (sorted by score descending, same score sorted by time used ascending)
  const getQuizRankings = (quizId: string) => {
    return submissions.value
      .filter(sub => sub.quizId === quizId)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.timeTaken - b.timeTaken;
      })
      .map((sub, index) => ({
        ...sub,
        rank: index + 1
      }));
  };

  // Get single quiz
  const getQuizById = (quizId: string) => {
    return quizzes.value.find(q => q.id === quizId);
  };

  // Get quizzes created by user (supports pagination, search and sorting)
  const getUserQuizzesWithFilters = (userId: string, page = 1, pageSize = 6, searchTerm = '', sortBy = 'createdAt') => {
    let filteredQuizzes = quizzes.value.filter(q => q.creatorId === userId);

    // Search functionality
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredQuizzes = filteredQuizzes.filter(quiz => 
        quiz.title.toLowerCase().includes(term) || 
        quiz.description.toLowerCase().includes(term)
      );
    }

    // Sorting functionality
    filteredQuizzes.sort((a, b) => {
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'questions') {
        return b.questions.length - a.questions.length;
      }
      return 0;
    });

    // Pagination functionality
    const startIndex = (page - 1) * pageSize;
    const paginatedQuizzes = filteredQuizzes.slice(startIndex, startIndex + pageSize);

    return {
      quizzes: paginatedQuizzes,
      total: filteredQuizzes.length,
      totalPages: Math.ceil(filteredQuizzes.length / pageSize)
    };
  };

  // Generate test quiz data
  const generateTestQuizzes = async () => {
    // 动态导入authStore以避免循环依赖
    const { useAuthStore } = await import('./authStore');
    const authStore = useAuthStore();
    const creatorId = authStore.currentUser?.id || 'default-user-123';
    const titles = [
      'Basic Mathematics Quiz', 'World Historical Events Quiz', 'Natural Science General Knowledge Test',
      'Literary Classics Knowledge', 'Olympic Sports Knowledge', 'China Geography Overview',
      'Classical Music Appreciation Basics', 'Introduction to Western Art History', 'Computer Basic Concepts', 'English Common Vocabulary Test'
    ];

    const descriptions = [
      'Covers basic mathematics knowledge such as algebra, geometry, etc.',
      'Important historical events from ancient to modern times',
      'Basic science knowledge including physics, chemistry, biology, etc.',
      'Domestic and foreign classic literary works and authors',
      'Olympic events and historical records',
      'Geographical features of China\'s provinces and regions',
      'Classical music periods and composers\' works',
      'Art movements from Renaissance to modern times',
      'Computer principles and basic operations',
      'English CET-4 core vocabulary test'
    ];

    // 清空现有数据
    quizzes.value = [];
    submissions.value = [];

    for (let i = 0; i < 10; i++) {
      const quiz = createQuiz(titles[i], descriptions[i], creatorId);

      // 为每份问卷添加2-4个问题
      for (let j = 0; j < Math.floor(Math.random() * 3) + 2; j++) {
        addQuestion(quiz.id, {
          text: `Question ${j + 1}: This is a test question about ${titles[i]}`,
          points: 10,
          type: 'single',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswers: [Math.floor(Math.random() * 4)]
        });
      }

      // 为每份问卷添加5-15条随机提交记录
      const submissionCount = Math.floor(Math.random() * 11) + 5;
      for (let k = 0; k < submissionCount; k++) {
        const score = Math.floor(Math.random() * 51) + 50; // 50-100分
        const timeTaken = Math.floor(Math.random() * 241) + 60; // 60-300秒
        const date = new Date();
        date.setMinutes(date.getMinutes() - Math.floor(Math.random() * 1440 * 7)); // 过去7天内

        submissions.value.push({
          id: uuidv4(),
          quizId: quiz.id,
          userId: `user-${Math.floor(Math.random() * 1000)}`,
          userName: `User ${k + 1}`,
          score,
          timeTaken,
          submittedAt: date
        });
      }
    }

    localStorage.setItem('quizzes', JSON.stringify(quizzes.value));
    localStorage.setItem('submissions', JSON.stringify(submissions.value));
  };

  return {
    quizzes,
    submissions,
    initQuizzes,
    createQuiz,
    addQuestion,
    submitQuiz,
    getQuizRankings,
    getQuizById,
    getUserQuizzesWithFilters,
    generateTestQuizzes
  };
});