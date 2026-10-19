import type { ViewSettings, StyleRule } from './style';
import type { LogDocument } from './log';
import type { ImageResourceFile } from './projectFile';

export interface ProjectFile {
    version: 2;
    projectId: string;
    projectName: string;
    time: string;
    documents: LogDocument[];
    styleRules: StyleRule[];
    viewSettings: ViewSettings;
    // 仅用于导入期间传递资源；编辑区本身不持有 Blob 或 Base64。
    resources?: Record<string, ImageResourceFile>;
}

export interface StoredProjectsIndex {
    projects: ProjectFile[];
}
