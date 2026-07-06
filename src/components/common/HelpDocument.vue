<template>
    <div
        class="help-overlay"
        data-focus-area="modal"
        @pointerdown.self="handleClose"
    >
        <div class="help-dialog" role="dialog" aria-modal="true">
            <div class="help-header">
                <div class="header-title">
                    <HelpCircle class="ui-icon" />
                    <h2>{{ helpDocument.title }}</h2>
                </div>
                <button
                    class="close-button icon-interactive"
                    type="button"
                    :title="helpDocument.closeTitle"
                    @click="handleClose"
                >
                    <X class="ui-icon" />
                </button>
            </div>

            <div class="help-content">
                <section
                    v-for="section in helpDocument.sections"
                    :key="section.title"
                    class="help-section"
                >
                    <div class="section-title">
                        <component
                            :is="iconComponents[section.icon]"
                            class="ui-icon"
                        />
                        <h3>{{ section.title }}</h3>
                    </div>
                    <ul v-if="section.type === 'tips'" class="tip-list">
                        <li
                            v-for="item in section.items"
                            :key="item.term"
                        >
                            <strong>{{ item.term }}</strong>
                            - {{ item.description }}
                        </li>
                    </ul>
                    <div v-else class="shortcut-grid">
                        <div
                            v-for="shortcut in section.items"
                            :key="shortcut.key"
                            class="shortcut-row"
                        >
                            <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
                            <span>{{ shortcut.description }}</span>
                        </div>
                    </div>
                </section>
            </div>

            <div class="help-footer">
                <a
                    :href="helpDocument.footer.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="github-link"
                >
                    <CodeXml class="ui-icon" />
                    <span>{{ helpDocument.footer.label }}</span>
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
    Upload,
} from '@lucide/vue';
import { useWindowStore } from '@/stores/windowStore';
import helpDocumentJson from '@/data/helpDocument.json';

type HelpIconName =
    | 'Upload'
    | 'MessageSquare'
    | 'FolderOpen'
    | 'UserRound'
    | 'Palette'
    | 'TextInitial'
    | 'Keyboard';

type HelpTipSection = {
    type: 'tips';
    icon: HelpIconName;
    title: string;
    items: Array<{
        term: string;
        description: string;
    }>;
};

type HelpShortcutSection = {
    type: 'shortcuts';
    icon: HelpIconName;
    title: string;
    items: Array<{
        key: string;
        description: string;
    }>;
};

type HelpDocumentContent = {
    title: string;
    closeTitle: string;
    sections: Array<HelpTipSection | HelpShortcutSection>;
    footer: {
        url: string;
        label: string;
    };
};

const helpDocument = helpDocumentJson as HelpDocumentContent;

const iconComponents = {
    Upload,
    MessageSquare,
    FolderOpen,
    UserRound,
    Palette,
    TextInitial,
    Keyboard,
} satisfies Record<HelpIconName, unknown>;

const windowStore = useWindowStore();

function handleClose() {
    windowStore.closeHelpDocument();
}
</script>

<style scoped>
.help-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--box-shadow);
}

.help-dialog {
    width: min(520px, calc(100vw - 32px));
    max-height: min(80vh, 520px);
    display: flex;
    flex-direction: column;
    background: var(--bg-topbar);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px var(--box-shadow);
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

.shortcut-key {
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
