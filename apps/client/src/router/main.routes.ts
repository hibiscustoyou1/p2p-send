export default [
  {
    path: '/',
    name: 'Transfer',
    component: () => import('@/views/TransferView.vue'),
    meta: { layout: 'MainLayout' }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { layout: 'MainLayout' }
  },
  {
    path: '/devices',
    name: 'Devices',
    component: () => import('@/views/DevicesView.vue'),
    meta: { layout: 'MainLayout' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { layout: 'MainLayout' }
  }
];
