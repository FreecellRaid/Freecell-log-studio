import type { ViewSettings, StyleRule } from './style';
import type { LogDocument } from './log';

export interface ProjectFile {
    version: 2;
    projectId: string;
    projectName: string;
    time: string;
    documents: LogDocument[];
    styleRules: StyleRule[];
    viewSettings: ViewSettings;
}

export interface StoredProjectsIndex {
    projects: ProjectFile[];
}
