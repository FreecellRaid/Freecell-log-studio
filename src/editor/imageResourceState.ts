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
    const labels: Record<ImageResourceStatus, string> = {
        reading: '读取中',
        readError: '读取失败',
        missing: '资源缺失',
        uploading: '正在保存副本',
        ready: '已保存本地副本',
        queued: '等待下载',
        loading: '正在下载',
        error: '副本未保存',
        cancelled: '下载已停止',
        remote: '仅链接',
        placeholder: '待补全',
    };
    const descriptions: Record<ImageResourceStatus, string> = {
        reading: '正在读取资源信息…',
        readError: input.readError || '图片读取失败，请重新打开编辑。',
        missing: '资源记录已缺失，可在下方替换当前图片。',
        uploading: '正在验证并保存本地图片，请稍候。',
        ready: '可离线预览，并随工程文件一起备份。',
        queued: '图片已加入下载队列，可继续编辑其他内容。',
        loading: '正在保存图片副本，原始链接会继续保留。',
        error: `${task?.error || '下载失败，'} 可打开原图自行保存，再上传本地副本。`,
        cancelled: '原始链接仍然保留，可继续下载或上传本地副本。',
        remote: '链接图片可直接预览；内嵌到 DOCX 需要先保存本地副本。',
        placeholder: '没有可下载的链接，可上传本地副本补全图片。',
    };
    return {
        status,
        label: labels[status],
        description: descriptions[status],
        sourceUrl,
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
