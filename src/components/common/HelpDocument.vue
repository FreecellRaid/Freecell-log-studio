<template>
    <div
        class="help-overlay"
        data-focus-area="modal"
        @pointerdown.self="windowStore.closeHelpDocument()"
    >
        <div class="help-dialog" role="dialog" aria-modal="true">
            <div class="help-header">
                <div class="header-title">
                    <HelpCircle class="ui-icon" />
                    <h2>帮助文档</h2>
                </div>
                <button
                    class="close-button icon-interactive"
                    type="button"
                    title="关闭帮助 (Esc)"
                    @click="windowStore.closeHelpDocument()"
                >
                    <X class="ui-icon" />
                </button>
            </div>

            <div class="help-content">
                <section class="help-section">
                    <div class="section-title">
                        <MessageSquare class="ui-icon" />
                        <h3>消息操作</h3>
                    </div>
                    <ul class="tip-list">
                        <li>
                            <strong>悬停消息</strong>
                            - 显示操作按钮
                        </li>
                        <li>
                            <strong>拖拽消息</strong>
                            - 移动消息
                        </li>
                        <li>
                            <strong>Ctrl + 点击</strong>
                            - 多选消息
                        </li>
                        <li>
                            <strong>Shift + 点击</strong>
                            - 范围选择
                        </li>
                    </ul>
                </section>

                <section class="help-section">
                    <div class="section-title">
                        <FolderOpen class="ui-icon" />
                        <h3>场景管理</h3>
                    </div>
                    <ul class="tip-list">
                        <li>
                            <strong>双击名称</strong>
                            - 重命名
                        </li>
                        <li>
                            <strong>拖拽场景</strong>
                            - 移动场景
                        </li>
                        <li>
                            <strong>向下合并</strong>
                            - 合并相邻场景
                        </li>
                    </ul>
                </section>
                <section class="help-section">
                    <div class="section-title">
                        <UserRound class="ui-icon" />
                        <h3>身份管理</h3>
                    </div>
                    <ul class="tip-list">
                        <li>
                            <strong>切换模式</strong>
                            - 点击标题旁图标可在角色/账号模式间切换
                        </li>
                        <li>
                            <strong>双击名称</strong>
                            - 重命名身份，会同步更新所有关联消息
                        </li>
                        <li>
                            <strong>下拉选择</strong>
                            - 修改身份角色
                        </li>
                        <li>
                            <strong>点击色块</strong>
                            - 修改该身份的染色
                        </li>
                    </ul>
                </section>
                <section class="help-section">
                    <div class="section-title">
                        <Palette class="ui-icon" />
                        <h3>染色规则</h3>
                    </div>
                    <ul class="tip-list">
                        <li>
                            <strong>优先级</strong>
                            - 数字越大越优先，高优先级覆盖低优先级
                        </li>
                        <li>
                            <strong>筛选条件</strong>
                            - 文本字段支持逗号分隔多个关键词
                        </li>
                        <li>
                            <strong>选区绑定</strong>
                            - 可将当前选中的消息直接绑定到规则
                        </li>
                    </ul>
                </section>

                <section class="help-section">
                    <div class="section-title">
                        <TextInitial class="ui-icon" />
                        <h3>导出模板占位符</h3>
                    </div>
                    <ul class="tip-list">
                        <li>
                            <strong v-pre>{{ name }}</strong>
                            - 角色名
                        </li>
                        <li>
                            <strong v-pre>{{ account }}</strong>
                            - 账号
                        </li>
                        <li>
                            <strong v-pre>{{ content }}</strong>
                            - 消息内容
                        </li>
                        <li>
                            <strong v-pre>{{ time }}</strong>
                            - 时间
                        </li>
                        <li>
                            <strong>\t</strong>
                            - 制表符
                        </li>
                        <li>
                            <strong>\n</strong>
                            - 换行符
                        </li>
                    </ul>
                </section>

                <section class="help-section">
                    <div class="section-title">
                        <Keyboard class="ui-icon" />
                        <h3>快捷键</h3>
                    </div>
                    <div class="shortcut-grid">
                        <div
                            v-for="shortcut in shortcuts"
                            :key="shortcut.key"
                            class="shortcut-row"
                        >
                            <kbd>{{ shortcut.key }}</kbd>
                            <span>{{ shortcut.desc }}</span>
                        </div>
                    </div>
                </section>
            </div>

            <div class="help-footer">
                <a
                    href="https://github.com/FreecellRaid/Freecell-log-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="github-link"
                >
                    <CodeXml class="ui-icon" />
                    <span>GitHub 项目主页</span>
                </a>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    HelpCircle,
    X,
    Keyboard,
    MessageSquare,
    FolderOpen,
    Palette,
    TextInitial,
    UserRound,
    CodeXml,
} from '@lucide/vue';
import { useWindowStore } from '@/stores/windowStore';

const windowStore = useWindowStore();

const shortcuts = [
    { key: 'Ctrl + A', desc: '全选' },
    { key: 'Esc', desc: '取消选择' },
    { key: 'Ctrl + C', desc: '复制' },
    { key: 'Ctrl + V', desc: '粘贴' },
    { key: 'Ctrl + Z', desc: '撤销' },
    { key: 'Ctrl + Y', desc: '重做' },
    { key: 'Ctrl + E', desc: '合并' },
    { key: 'Ctrl + ↑/↓', desc: '选中上/下一条' },
    { key: 'Ctrl + D', desc: '选中相同发言人' },
    { key: 'Ctrl + /', desc: '切换场内外' },
    { key: 'Ctrl + \\', desc: '切换指令' },
    { key: 'Ctrl + backspace', desc: '删除' },
    { key: 'Ctrl + S', desc: '保存' },
    { key: 'Ctrl + P', desc: '导出预览' },
    { key: 'Ctrl + B', desc: '切换左侧边栏' },
    { key: 'Ctrl + I', desc: '切换右侧边栏' },
    { key: 'Ctrl + K', desc: '打开帮助文档' },
];
</script>

<style scoped>
.help-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
}

.help-dialog {
    width: min(520px, calc(100vw - 32px));
    max-height: min(80vh, 520px);
    display: flex;
    flex-direction: column;
    background: var(--bg-topbar);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
}

.help-header .header-title {
    margin-top: 0;
}

.help-header h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}

.close-button {
    background: none;
    border: none;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-button:hover {
    background: var(--hover-bg);
}

.close-button .ui-icon {
    width: 16px;
    height: 16px;
}

.help-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    font-size: 13px;
    line-height: 1.6;
}

.help-section {
    margin-bottom: 20px;
}

.help-section:last-child {
    margin-bottom: 0;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.section-title h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.section-title .ui-icon {
    width: 14px;
    height: 14px;
    color: var(--icon-color);
}

.shortcut-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
}

.shortcut-row {
    display: contents;
}

kbd {
    display: inline-block;
    padding: 2px 6px;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    color: var(--text-primary);
    background: var(--bg-sidebar);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    white-space: nowrap;
}

.tip-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-primary);
}

.tip-list li {
    margin-bottom: 6px;
}

.tip-list strong {
    color: var(--active-accent);
    font-weight: 600;
}

.help-footer {
    display: flex;
    padding: 8px 20px;
    font-size: 12px;
    color: var(--text-muted);
}

.github-link {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
}

.github-link:hover {
    color: var(--active-accent);
}

.github-link .ui-icon {
    width: 14px;
    height: 14px;
}
</style>
