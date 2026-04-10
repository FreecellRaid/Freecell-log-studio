<template>
    <div class="view">
        <header class="view-header">
            <div class="view-title">
                <LayoutDashboard class="ui-icon icon-view-title" />
                <h2>工作台</h2>
            </div>
        </header>

        <div class="welcome-content">
            <div class="welcome-container">
                <div class="icon-container">
                    <Dices class="ui-icon icon" />
                </div>

                <p class="kaomoji-egg">
                    {{ currentKaomoji.text }}
                </p>

                <div class="foot-hint">
                    <div class="foot-hint-item">
                        <span>Cmd + K 查看快捷键列表</span>
                    </div>
                    <div class="foot-hint-item">
                        当前没有处于活跃状态的场景。
                        <br />
                        从左侧场景列表中选择一个以开始编辑。
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Dices, LayoutDashboard } from '@lucide/vue';

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
    max-width: 400px;
    text-align: center;
}

.icon-container .icon {
    width: 64px;
    height: 64px;
    opacity: 0.6;
    color: var(--icon-color);
}

.kaomoji-egg {
    font-size: 24px;
    font-weight: normal;
    color: var(--active-accent);
    opacity: 0.8;
}

.foot-hint {
    margin-top: 24px;
    font-size: 12px;
    color: var(--text-muted);
}

.foot-hint-item {
    display: flex;
    justify-content: center;
    margin: 4px 0;
    padding: 4px 8px;
    background-color: var(--bg-secondary);
    border-radius: 4px;
}
</style>
