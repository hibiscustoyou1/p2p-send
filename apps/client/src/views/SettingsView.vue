<template>
  <div class="relative z-10 p-8 w-full max-w-4xl mx-auto flex flex-col gap-8 fade-in h-full pb-20">
    <div class="flex flex-col gap-2">
      <h2 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">设置</h2>
      <p class="text-slate-500 dark:text-slate-400 text-base">管理您的个人资料和应用偏好设置</p>
    </div>

    <!-- 标签页 -->
    <div class="border-b border-slate-200 dark:border-slate-800">
      <div class="flex gap-8 overflow-x-auto no-scrollbar">
        <button
          class="relative pb-4 pt-2 text-primary dark:text-white text-sm font-bold tracking-wide whitespace-nowrap after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:bg-primary dark:after:bg-white after:rounded-t-full">
          常规
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6">

      <!-- 设备配置卡片 -->
      <div
        class="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center shadow-soft">
        <div class="relative group cursor-pointer">
          <div
            class="h-28 w-28 rounded-full bg-cover bg-center ring-4 ring-slate-100 dark:ring-slate-800 flex items-center justify-center text-4xl text-white font-bold bg-gradient-to-br from-primary to-purple-500">
            {{ currentMyDeviceId.substring(0, 2).toUpperCase() }}
          </div>
          <div
            class="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary-dark transition-colors">
            <span class="material-symbols-outlined text-[20px]">devices</span>
          </div>
        </div>
        <div class="flex-1 w-full max-w-md">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">设备配置</h3>
          <p class="text-slate-500 dark:text-slate-400 text-xs mb-3 font-mono">物理指纹: {{ currentMyDeviceId }}</p>
          <label class="block">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">设备名称 (开发中)</span>
            <div class="relative">
              <input v-model="formRef.deviceName"
                class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-400 font-medium"
                type="text" placeholder="输入名称" />
              <span
                class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-primary">edit</span>
            </div>
          </label>
        </div>
      </div>

      <!-- 传输偏好卡片 -->
      <div
        class="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 shadow-soft">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">应用偏好</h3>
        <div class="space-y-6">
          <!-- 切换黑暗模式 -->
          <div class="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
            <div class="flex flex-col gap-1 pr-4">
              <span class="text-base font-medium text-slate-900 dark:text-white">深色模式</span>
              <span class="text-sm text-slate-500 dark:text-slate-400">开启原生的护眼深邃黑呈现</span>
            </div>
            <button @click="toggleTheme"
              :class="formRef.theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'"
              class="w-12 h-7 rounded-full relative transition-colors focus:outline-none shrink-0">
              <span :class="formRef.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'"
                class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"></span>
            </button>
          </div>

          <!-- 全局密码修改 -->
          <div class="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
            <div class="flex flex-col gap-1 pr-4 w-full">
              <span class="text-base font-medium text-slate-900 dark:text-white">全局接入密码</span>
              <span class="text-sm text-slate-500 dark:text-slate-400 mb-2">更新保存在本地用于与私人服务器鉴权的凭证</span>
              <input v-model="formRef.accessToken" type="password" placeholder="未设置凭证"
                class="w-full max-w-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-400 text-sm font-medium" />
            </div>
          </div>
        </div>
      </div>

      <!-- 高级设置卡片（用于找回历史设备号） -->
      <div
        class="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border border-red-500/20 dark:border-red-500/30 rounded-2xl p-6 md:p-8 shadow-soft relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <h3 class="text-xl font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
          <span class="material-symbols-outlined">warning</span> 高级选项与抢救
        </h3>
        <p class="text-slate-500 dark:text-slate-400 text-sm mb-6">如果清除了浏览器缓存导致您的短码变更，您可在此输入原始历史 UUID 强行夺回账户。仅限知晓原 UUID
          的拥有者使用。</p>

        <div class="flex items-center gap-4">
          <input v-model="recoveryUuid" type="text" placeholder="输入历史遗留的 `dev_...` UUID"
            class="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-slate-400 font-mono text-sm" />
          <button @click="doRecover"
            class="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 font-bold rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap">
            抢占抢救
          </button>
        </div>
      </div>

      <!-- 保存操作栏 -->
      <div class="flex flex-col sm:flex-row gap-4 pt-4">
        <button @click="save"
          class="flex-1 sm:flex-none px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-95">
          保存更改并重载设置
        </button>
        <button @click="resetCurrent"
          class="flex-1 sm:flex-none px-8 py-3 bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-bold rounded-xl transition-all active:scale-95">
          撤销修改
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { settingsManager } from '@/services/settingsManager';
import { getMyDeviceId } from '@/services/socket';

// 我们在 mounted 里把最新的 settings 拿出来展示在表单上
const formRef = ref({
  theme: 'light',
  deviceName: '',
  accessToken: '',
  autoAccept: false,
  playSound: false
});

const currentMyDeviceId = ref('');
const recoveryUuid = ref('');

onMounted(() => {
  resetCurrent();
  currentMyDeviceId.value = getMyDeviceId();
});

const toggleTheme = () => {
  formRef.value.theme = formRef.value.theme === 'dark' ? 'light' : 'dark';
  settingsManager.updateSettings({ theme: formRef.value.theme as 'light' | 'dark' });
};

const resetCurrent = () => {
  const current = settingsManager.getSettings();
  formRef.value.theme = current.theme;
  formRef.value.deviceName = current.deviceName;
  formRef.value.autoAccept = current.autoAccept;
  formRef.value.playSound = current.playSound;
  formRef.value.accessToken = current.globalAccessToken || '';
};

const save = () => {
  settingsManager.updateSettings({
    theme: formRef.value.theme as 'light' | 'dark',
    deviceName: formRef.value.deviceName,
    autoAccept: formRef.value.autoAccept,
    playSound: formRef.value.playSound,
    globalAccessToken: formRef.value.accessToken
  });
  alert('设置已成功保存！');
  // 强制重新应用所有变更特别是需要带 token 重连的场景，此处利用原生刷新最稳健
  window.location.reload();
};

const doRecover = () => {
  if (!recoveryUuid.value.trim() || !recoveryUuid.value.startsWith('dev_')) {
    alert('格式异常，UUID 应以 dev_ 开头。');
    return;
  }
  const answer = confirm(`您确信要抢占历史身份 ID [${recoveryUuid.value}] 吗？\n如抢占成功，本浏览器即刻伪装为该遗失设备并在全网中顶替它。`);
  if (answer) {
    localStorage.setItem('my_device_id', recoveryUuid.value.trim());
    alert('抢注凭证成功植入。页面将立即重启重写您的档案。');
    window.location.reload();
  }
};
</script>
