const routes = {
  path: '/',
  name: 'Hello',
  // 路由懒加载
  component: () => import('@/components/hello-world.vue'),
}

export default routes