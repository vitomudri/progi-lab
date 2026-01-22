import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Instructors from "@/pages/Instructors.vue";
import About from '@/pages/About.vue'
import AdminPage from '@/pages/AdminPage.vue'
import Home from '@/pages/Home.vue'
import ParticipantProfile from '@/pages/ParticipantProfile.vue'
import LoginPage from '@/pages/LoginPage.vue'
import SignUpPage from '@/pages/SignUpPage.vue'
import TwoFAPage from '@/pages/TwoFAPage.vue'
import TwoFASettings from '@/pages/TwoFASettings.vue'
import InstructorProfile from '@/pages/InstructorProfile.vue'
import ChangePassword from '@/pages/ChangePassword.vue'
import AddRecipe from '@/pages/AddRecipe.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/participant-profile',
    name: 'ParticipantProfile',
    component: ParticipantProfile
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUpPage
  },
  {
    path: '/2fa',
    name: 'TwoFA',
    component: TwoFAPage
  },

  {
    path: '/2fa-settings',
    name: 'TwoFASettings',
    component: TwoFASettings
  },
  {
    path: "/instructors",
    name: "Instructors",
    component: Instructors
  },
  {
    path: '/instructor/:id',
    name: 'InstructorProfile',
    component: InstructorProfile
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: ChangePassword
  },
  {
    path: '/recipe/:id',
    name: 'RecipePage',
    component: () => import('@/pages/RecipePage.vue')
  },
  {
    path: '/add-recipe',
    name: 'AddRecipe',
    component: AddRecipe
  },
  {
  path: '/admin',
  name: 'Admin',
  component: AdminPage
},
{
  path: '/about',
  name: 'About',
  component: About
},
{
  path: "/courses",
  name: "courses",
  component: () => import("@/pages/Courses.vue"),
},
{
  path: "/courses/:id",
  name: "course-page",
  component: () => import("@/pages/CoursePage.vue"),
},



]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
