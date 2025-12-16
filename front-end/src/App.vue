<template>
  <v-app>
    <v-app-bar :elevation="4" rounded="none" color="primary" class="px-4">
      <v-toolbar-title>
        <div
          @click="router.push('/')"
          class="text-xl font-bold text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          Quiz Challenge
        </div>
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn
        v-if="isAuthenticated"
        @click="router.push('/')"
        variant="text"
        color="white"
        size="large"
        :class="['font-medium', 'hover:bg-white/10']"
      >
        Home
      </v-btn>

      <v-btn
        v-if="isAuthenticated"
        @click="router.push('/quiz-list')"
        variant="text"
        color="white"
        size="large"
        :class="['font-medium', 'hover:bg-white/10']"
      >
        Quiz List
      </v-btn>

      <v-btn
        v-if="isAuthenticated"
        @click="router.push('/create-quiz')"
        variant="text"
        color="white"
        size="large"
        :class="['font-medium', 'hover:bg-white/10']"
      >
        Create Quiz
      </v-btn>
      <v-divider
        v-if="isAuthenticated"
        vertical
        class="mx-2"
        color="white"
      ></v-divider>
      <v-menu
        v-if="isAuthenticated"
        location="bottom end"
        transition="scale-transition"
        offset-y
        min-width="200px"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            color="white"
            :class="['font-bold', 'bg-white/5', 'hover:bg-white/10']"
            rounded="full"
            size="large"
            prepend-icon="mdi-account"
            v-bind="props"
          >
            {{ currentUser?.username }}
          </v-btn>
        </template>

        <v-card class="p-2">
          <v-list density="compact">
            <v-list-item
              title="Logout"
              @click="logout"
              prepend-icon="mdi-logout"
              density="compact"
            ></v-list-item>
          </v-list>
        </v-card>
      </v-menu>

      <v-btn
        v-else
        @click="router.push('/login')"
        variant="text"
        color="white"
        size="large"
        rounded="full"
        prepend-icon="mdi-login"
      >
        Login
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="py-8">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from "./stores/authStore";
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { provideApolloClient } from "@vue/apollo-composable";
import { apolloClient } from "./apollo";

// Provide Apollo Client for @vue/apollo-composable
provideApolloClient(apolloClient);

const authStore = useAuthStore();
const router = useRouter();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const currentUser = computed(() => authStore.currentUser);

onMounted(() => {
  authStore.initAuth();
});

const logout = () => {
  authStore.logout();
  router.push("/login");
};
</script>
