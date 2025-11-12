import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '@/pages/Home.vue'
import ParticipantProfile from '@/pages/ParticipantProfile.vue'
import LoginPage from '@/pages/LoginPage.vue'
import SignUpPage from '@/pages/SignUpPage.vue'
import TwoFAPage from '@/pages/TwoFAPage.vue'
import InstructorProfile from '@/pages/InstructorProfile.vue'
import ChangePassword from '@/pages/ChangePassword.vue'   // ✅ DODANO

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
    path: '/instructor-profile',
    name: 'InstructorProfile',
    component: InstructorProfile
  },
  {
    path: '/change-password',        // ✅ NOVA RUTA
    name: 'ChangePassword',
    component: ChangePassword
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
