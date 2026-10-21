import { imageResourceText } from '@/data/imageResourceText';
import type { ImageResourceSummary, ResourceTaskState } from '@/types/resource';
import { normalizeImageUrl } from '@/utils/imageUrl';

export type ImageResourceStatus =
    | 'reading'
    | 'readError'
    | 'missing'
    | 'uploading'
    | 'ready'
    | 'queued'
    | 'loading'
    | 'error'
    | 'cancelled'
    | 'remote'
    | 'placeholder';

export function imageSourceUrl(url?: string): string {
    try {
        return url ? normalizeImageUrl(url) : '';
    } catch {
        return '';
    }
}

// 编辑器和项目资源列表共用状态优先级；已有副本不会被旧任务错误覆盖。
export function resolveImageResourceState(input: {
    resource?: Pick<ImageResourceSummary, 'sourceUrl' | 'hasLocalCopy'>;
    task?: ResourceTaskState;
    reading?: boolean;
    readError?: string;
    uploading?: boolean;
}) {
    const { resource, task } = input;
    const sourceUrl = imageSourceUrl(resource?.sourceUrl);
    const status: ImageResourceStatus = input.reading
        ? 'reading'
        : input.readError
          ? 'readError'
          : !resource
            ? 'missing'
            : input.uploading
              ? 'uploading'
              : resource.hasLocalCopy
                ? 'ready'
                : task && task.status !== 'ready'
                  ? task.status
                  : sourceUrl
                    ? 'remote'
                    : 'placeholder';
    const descriptions: Record<ImageResourceStatus, string> = {
        ...imageResourceText.description,
        readError: input.readError || imageResourceText.errors.read,
        error: `${task?.error || imageResourceText.errors.download} ${imageResourceText.description.manualUpload}`,
    };
    return {
        status,
        label: imageResourceText.status[status],
        description: descriptions[status],
        sourceUrl,
        downloadLabel:
            task?.status === 'error'
                ? imageResourceText.actions.retry
                : task?.status === 'cancelled'
                  ? imageResourceText.actions.resume
                  : imageResourceText.actions.download,
        pending: status === 'queued' || status === 'loading',
        warning:
            status === 'readError' ||
            status === 'missing' ||
            status === 'error',
        error:
            status === 'readError'
                ? input.readError
                : status === 'error'
                  ? task?.error
                  : undefined,
    };
}

// 汇总沿用单张图片状态名称，优先显示需要关注的下载任务。
export function formatImageDownloadSummary(
    summary: Record<ResourceTaskState['status'], number>,
    includeZero = false,
): string {
    const statuses: ResourceTaskState['status'][] = [
        'loading',
        'queued',
        'error',
        'cancelled',
        'ready',
    ];
    return statuses
        .filter((status) => includeZero || summary[status] > 0)
        .map(
            (status) =>
                `${imageResourceText.status[status]} ${summary[status]}`,
        )
        .join(' · ');
}
