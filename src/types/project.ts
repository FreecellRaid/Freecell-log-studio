import type { ViewSettings, ColorRule } from './config';
import type { LogDocument } from './log';

export interface ProjectFile {
    version: 1;
    projectId: string;
    projectName: string;
    time: string;
    documents: LogDocument[];
    colorRules: ColorRule[];
    viewSettings: ViewSettings;
}

export interface StoredProjectsIndex {
    projects: ProjectFile[];
}
