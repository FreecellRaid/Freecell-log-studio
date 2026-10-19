import Dexie, { type Table } from 'dexie';
import type { ProjectFile } from '@/types/projectFile';
import type { ImageResourceRecord } from '@/types/resource';
import { imageMetadata } from '@/types/resource';
import { resourceFileToRecord } from '@/io/storage/resourceEncoding';
import { generateId } from '@/utils/id';

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
    resources!: Table<ImageResourceRecord, string>;

    constructor(name = PROJECT_DATABASE_NAME) {
        super(name);
        this.version(1).stores({
            projects: '&projectId, time',
            migrations: '&key',
        });
        this.version(2)
            .stores({ resources: '&resourceId' })
            .upgrade(async (transaction) => {
                const projects = await transaction
                    .table<ProjectFile>('projects')
                    .toArray();
                for (const project of projects) {
                    const ids = new Map<string, string>();
                    const resources: ProjectFile['resources'] = {};
                    for (const [oldId, file] of Object.entries(
                        project.resources,
                    )) {
                        const id = generateId();
                        ids.set(oldId, id);
                        await transaction
                            .table('resources')
                            .add(resourceFileToRecord(id, file));
                        resources[id] = imageMetadata(file);
                    }
                    project.documents.forEach((doc) =>
                        doc.chunks.forEach((chunk) =>
                            chunk.messages.forEach((message) => {
                                message.images.forEach((image) => {
                                    image.resourceId =
                                        ids.get(image.resourceId) ??
                                        image.resourceId;
                                });
                            }),
                        ),
                    );
                    project.resources = resources;
                    await transaction.table('projects').put(project);
                }
            });
        this.on('blocked', () => this.close());
    }
}

export const projectDatabase = new ProjectDatabase();
