import { defineStore } from 'pinia';

import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: Date;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: null as User | null,
    isAuthenticated: false
  }),
  actions: {
    // Mock login
    async login(username: string) {
      // Mock login API call
      try {
        // Mock network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Create user object
        const newUser = {
          id: uuidv4(),
          username,
          email: `${username}@example.com`,
          createdAt: new Date()
        };

        // Update state
        this.currentUser = newUser;
        this.isAuthenticated = true;

        // Save to local storage
        localStorage.setItem('currentUser', JSON.stringify(newUser));

        // Update creator ID of existing test quizzes
        const { useQuizStore } = await import('./quizStore');
        const quizStore = useQuizStore();
        if (quizStore.quizzes.length > 0) {
          const defaultUserId = 'default-user-123';
          const hasDefaultQuizzes = quizStore.quizzes.some(q => q.creatorId === defaultUserId);
          if (hasDefaultQuizzes) {
            quizStore.quizzes = quizStore.quizzes.map(quiz => 
              quiz.creatorId === defaultUserId ? { ...quiz, creatorId: newUser.id } : quiz
            );
            localStorage.setItem('quizzes', JSON.stringify(quizStore.quizzes));
          }
        }

        // Check and generate test data after login
        const userQuizzes = quizStore.getUserQuizzesWithFilters(newUser.id);
        if (userQuizzes.quizzes.length === 0) {
          await quizStore.generateTestQuizzes();
        }

        return newUser;
      } catch (error) {
        throw error;
      }
    },
    // Logout
    logout() {
      this.currentUser = null;
      this.isAuthenticated = false;
      localStorage.removeItem('currentUser');
    },
    // Load user from localStorage on initialization
    initAuth() {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        this.isAuthenticated = true;
      }
    }
  }
});