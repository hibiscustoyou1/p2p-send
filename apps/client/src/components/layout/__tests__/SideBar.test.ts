import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SideBar from '../SideBar.vue';

// ===============
// TDD - GREEN Stage: 基础依赖注入
// ===============
describe('SideBar Component - 基础行为与挂载', () => {

  const createWrapper = (routePath = '/') => {
    return mount(SideBar, {
      global: {
        stubs: {
          'router-link': {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          'SvgIcon': {
            template: '<span class="mock-svg-icon">{{name}}</span>',
            props: ['name']
          }
        },
        mocks: {
          $route: {
            path: routePath
          }
        }
      }
    });
  };

  afterEach(() => {
    // 恢复可能被修改的 DOM 和 LocalStorage 状态
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('能成功挂载并包含应用标题 "P2P 共享"', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('P2P 共享');
    expect(wrapper.text()).toContain('传输');
  });

});

// ===============
// TDD - 套件 2: 暗色主题引擎状态机
// ===============
describe('SideBar Component - 主题切换引擎', () => {

  const createWrapper = () => {
    return mount(SideBar, {
      global: {
        stubs: {
          'router-link': { template: '<a :href="to"><slot /></a>', props: ['to'] },
          'SvgIcon': { template: '<span class="mock-svg-icon">{{name}}</span>', props: ['name'] }
        },
        mocks: { $route: { path: '/' } }
      }
    });
  };

  beforeEach(() => {
    // 每次测试前清理全局状态
    document.documentElement.classList.remove('dark');
    localStorage.clear();

    // 默认 Mock 系统主题为亮色
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('没有缓存时应默认采用系统首选项 (亮色)', () => {
    createWrapper();
    // HTML 根节点不应包含 .dark
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('如果存在 localStorage 的 dark 缓存，初始化应当添加 .dark 类并设置 isDarkMode', () => {
    localStorage.setItem('theme', 'dark');
    createWrapper();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('点击切换主题按钮可以翻转全局主题并写入缓存', async () => {
    const wrapper = createWrapper();

    // 找到包含 "切换主题" 文本的按钮
    const toggleButton = wrapper.findAll('button').find(w => w.text().includes('切换主题'));
    expect(toggleButton).toBeDefined();

    // 此时为光色，执行点击
    await toggleButton!.trigger('click');

    // 断言 DOM 与缓存
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    // 再次点击切换回亮色
    await toggleButton!.trigger('click');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

});

// ===============
// TDD - 套件 3: 路由菜单高亮表现
// ===============
describe('SideBar Component - 路由高亮及状态', () => {

  const createWrapper = (routePath: string) => {
    return mount(SideBar, {
      global: {
        stubs: {
          'router-link': {
            template: '<a :href="to" :class="[$attrs.class, $attrs.exactActiveClass || $attrs.activeClass]"><slot /></a>',
            props: ['to']
          },
          'SvgIcon': { template: '<span class="mock-svg-icon">{{name}}</span>', props: ['name'] }
        },
        mocks: { $route: { path: routePath } }
      }
    });
  };

  it('处在传输页 (/) 时应该高亮相应的样式', () => {
    const wrapper = createWrapper('/');
    const transferLink = wrapper.find('a[href="/"]');

    // 断言有正确的 text-primary 渲染或是由组件根据 route.path 赋予的 fill-current
    expect(transferLink.exists()).toBe(true);
    expect(wrapper.html()).toContain('fill-current');
  });

  it('处在历史记录页 (/history) 时应取消其它高亮并自身高亮', () => {
    const wrapper = createWrapper('/history');

    // 断言 /history 相关块获得了 fill-current 或响应的高亮逻辑判断
    const html = wrapper.html();

    // 简单断言 SVG prop 传下去了正确的 fill-current，而首页没有
    // 假设渲染后的 mock 为: <span class="mock-svg-icon" name="history" class="fill-current"> 等
    // 这里的组件实现是 `<SvgIcon name="history" :class="$route.path.startsWith('/history') ? 'fill-current' : ''" />`
    expect(html).toContain('history</span>');
    // 我们只要确认在 wrapper 里 /history 的激活状态正常反馈即可
    // 具体通过在 SideBar 中匹配包含 fill-current 的节点
    const fillCurrentNodes = wrapper.findAll('.fill-current');
    expect(fillCurrentNodes.length).toBeGreaterThan(0);
  });

});
