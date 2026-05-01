import { createRouter, createWebHashHistory } from 'vue-router'

// Dynamically import all .vue files from pages directory and subdirectories
const pages = import.meta.glob<{ default: any }>(
  './../views/pages/**/*.vue',
  { eager: true },
)

/**
 * Convert file path to route path
 * Examples:
 * - './HomePage.vue' -> '/home'
 * - './index.vue' -> '/'
 * - './admin/DashboardPage.vue' -> '/admin/dashboard'
 * - './admin/index.vue' -> '/admin'
 */
function filePathToRoutePath(filePath: string): string {
  const normalized = filePath
    .replace(/^\.\//, '') // Remove leading ./
    .replace(/\.vue$/, '') // Remove .vue extension

  // Handle index files - they map to the directory path
  if (normalized.endsWith('/index')) {
    return normalized.replace(/\/index$/, '') || '/'
  }

  // Convert camelCase to kebab-case and make lowercase
  return (
    '/' +
    normalized
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab-case
      .toLowerCase()
      .replace(/page$/, '') // Remove 'page' suffix (e.g., HomePage -> home)
  )
}

/**
 * Generate routes from page components
 */
function generateRoutes() {
  return Object.entries(pages).map(([
    path,
    module,
  ]) => {
    const routePath = filePathToRoutePath(path)
    const componentName = path.split('/').pop()?.replace('.vue', '') || 'Page'

    return {
      path:      routePath,
      name:      componentName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
      component: module.default,
    }
  })
}

const routes = [
  ...generateRoutes(),
  {
    path:      '/',
    name:      'default',
    component: () => import('@/views/DefaultView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
