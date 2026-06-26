<template>
    <div
        class="view"
        data-focus-id="defaultView"
        :class="{ 'is-active': windowStore.activeFocus === 'defaultView' }"
        @pointerdown="windowStore.setFocus('defaultView')"
    >
        <header class="view-header">
            <div class="view-title">
                <LayoutDashboard class="ui-icon icon-view-title" />
                <h2 class="text-view-title">工作台</h2>
            </div>
        </header>

        <div class="welcome-content">
            <div class="welcome-container">
                <Dices class="bg-icon" />
                <p class="kaomoji">
                    {{ currentKaomoji.text }}
                </p>
                <p class="subtitle">从左侧场景列表中选择一个以开始编辑</p>

                <div class="foot-hint">
                    <div class="foot-hint-item">
                        <span>切换侧边栏</span>
                        <span>Ctrl + B</span>
                    </div>
                    <div class="foot-hint-item">
                        <span>打开帮助文档</span>
                        <span>Ctrl + K</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Dices, LayoutDashboard } from '@lucide/vue';
import { useWindowStore } from '@/stores/windowStore';

const windowStore = useWindowStore();
onMounted(() => {
    windowStore.registerWindow({
        windowId: 'defaultView',
        windowName: 'defaultView',
        windowType: 'view',
        originalId: 'defaultView',
    });
});

const kaomojis = [
    { text: '(*^▽^*) 今天也要愉快的跑团哦！' },
    { text: '(๑•̀ㅂ•́)و✧ 大成功!!!!' },
    { text: 'φ(>ω<*) 正在记录关键线索...' },
    { text: 'O(∩_∩)O 日志整理中' },
    { text: '大失败！(╯°Д°)╯︵ ┻━┻' },
    { text: '（〃｀ 3′〃）DM 正在注视着你' },
    { text: 'ヽ(✿✿▽ﾟ)诺 结档撒花！' },
    { text: 'ヘ(_ _ヘ) san check 中...' },
];
const currentKaomoji = ref({ text: '' });
onMounted(() => {
    const randomIndex = Math.floor(Math.random() * kaomojis.length);
    currentKaomoji.value = kaomojis[randomIndex];
});
</script>

<style scoped>
.welcome-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 400px;
}

.kaomoji {
    font-size: 24px;
    font-weight: 600;
    color: var(--active-accent);
    opacity: 0.8;
}

.subtitle {
    font-size: 14px;
    color: var(--text-muted);
}

.foot-hint {
    margin-top: 24px;
    font-size: 12px;
    min-width: 200px;
    color: var(--text-muted);
}

.foot-hint-item {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    padding: 4px 8px;
    background-color: var(--bg-secondary);
    border-radius: 4px;
}
</style>
