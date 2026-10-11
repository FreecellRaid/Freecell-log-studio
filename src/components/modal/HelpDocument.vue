<template>
    <ModalDialog
        :title="helpDocument.title"
        title-id="help-title"
        :close-title="helpDocument.closeTitle"
        @close="handleClose"
    >
        <template #icon><HelpCircle class="ui-icon" /></template>
        <section
            v-for="section in helpDocument.sections"
            :key="section.title"
            class="help-section"
        >
            <div class="section-title">
                <component :is="iconComponents[section.icon]" class="ui-icon" />
                <h3>{{ section.title }}</h3>
            </div>
            <ul v-if="section.type === 'tips'" class="tip-list">
                <li v-for="item in section.items" :key="item.term">
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
        <template #footer>
            <a
                :href="helpDocument.footer.url"
                target="_blank"
                rel="noopener noreferrer"
                class="github-link"
            >
                <CodeXml class="ui-icon" />
                <span>{{ helpDocument.footer.label }}</span>
            </a>
        </template>
    </ModalDialog>
</template>

<script setup lang="ts">
import {
    HelpCircle,
    Keyboard,
    MessageSquare,
    FolderOpen,
    Palette,
    TextInitial,
    UserRound,
    CodeXml,
    Upload,
} from '@lucide/vue';
import { useWindowStore } from '@/stores/ui/windowStore';
import ModalDialog from '@/components/modal/ModalDialog.vue';
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
