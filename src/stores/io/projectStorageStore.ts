import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { projectRepository } from '@/io/storage/projectStorage';

export const useProjectStorageStore = defineStore('projectStorage', () => {
    const pendingSaves = ref(0);
    const isSaving = computed(() => pendingSaves.value > 0);
    const migrationWarnings = ref<string[]>([]);
    async function initialize() {
        const report = await projectRepository.initialize();
        migrationWarnings.value = report.warnings;
    }
    return { pendingSaves, isSaving, migrationWarnings, initialize };
});
