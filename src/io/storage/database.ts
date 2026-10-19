import Dexie, { type Table } from 'dexie';
import type { ProjectFile } from '@/types/projectFile';

export const PROJECT_DATABASE_NAME = 'freecell-log-studio';

export interface LegacyMigrationReport {
    key: 'localStorage-projects-v1';
    completedAt: string;
    importedCount: number;
    skippedCount: number;
    warnings: string[];
}

// 数据库版本独立于应用版本和工程文件 schema；Blob 表在资源层阶段增加。
export class ProjectDatabase extends Dexie {
    projects!: Table<ProjectFile, string>;
    migrations!: Table<LegacyMigrationReport, string>;

    constructor(name = PROJECT_DATABASE_NAME) {
        super(name);
        this.version(1).stores({
            projects: '&projectId, time',
            migrations: '&key',
        });
        this.on('blocked', () => this.close());
    }
}
