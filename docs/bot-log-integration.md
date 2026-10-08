# 机器人日志链接接入

Freecell-log-studio （以下简称“本项目”）可以从机器人发出的链接自动下载日志并进入编辑。上传和存储由机器人原有的日志服务负责，本项目负责读取、解析和编辑，不提供上传接口或编辑结果回写服务。

## 链接约定

使用页面 hash 参数，不需要为静态部署配置额外路由：

```text
https://freecellraid.github.io/Freecell-log-studio/#source=oliva&id=<URL编码后的日志标识>
https://freecellraid.github.io/Freecell-log-studio/#source=url&url=<URL编码后的HTTPS下载地址>&format=standard-adapter
```

- `source`：来源适配器的 ID，目前支持 `oliva`、`url`。
- `id`：由来源服务解释的日志标识；青果使用完整的 `log_<UUID>_<日志名>`，临时日志包含 `_temp` 后缀。
- `url`：`url` 来源使用的直接下载地址，不是网页预览地址。
- `format`：可选的格式 ID。省略时自动识别；明确指定时仍检查内容是否符合格式。

参数值必须逐项编码，不能把整个链接一起编码。JavaScript 可使用 `URLSearchParams`，Python 示例：

```python
from urllib.parse import urlencode

download_url = "https://your-log-service.example/logs/session.json"
params = urlencode({
    "source": "url",
    "url": download_url,
    "format": "freecell-log-v1",
})
editor_link = "https://freecellraid.github.io/Freecell-log-studio/#" + params
```

默认的 HTTPS 直链来源不发送浏览器登录凭证。服务必须允许本项目所在域跨域读取（CORS）。重定向后的服务也需要支持 HTTPS 和 CORS；不能只允许机器人上传而禁止浏览器读取。

当前一次远程导入的总下载上限为 10 MiB，整体下载超时为 30 秒，均可通过 `RemoteReadOptions` 调整。服务错误、超时、过期和格式错误会显示在导入窗口中，用户可重试或取消。

## 青果机器人

兼容已有的 `#2-log_…` 链接格式。Logger 仍上传到原来的青果服务器，只需把返回链接前缀改为：

```python
OlivaDiceLogger.data.dataLogPainterUrl = (
    "https://freecellraid.github.io/Freecell-log-studio/#2-"
)
```

可修改 Logger 的配置常量，或用独立 OlivOS 桥接插件在 Logger 可用后设置该值。需验证插件加载顺序和重载行为。本项目不包含机器人端插件。

本项目先请求青果 `logReader.php?m=metaData&id=…`，检查 `code`，再读取 `rawData` 或元信息中的 `redirectDownloadUrl`。青果来源默认指定 `standard-adapter`，因此单条文字消息也可以导入。

## 文本格式

目前可以显式指定以下 ID：

| ID                    | 格式                            |
| --------------------- | ------------------------------- |
| `standard-adapter`    | 昵称(账号) 日期时间，下一行正文 |
| `qq-adapter`          | 新版 QQ 消息管理器              |
| `legacy-qq-adapter`   | 旧版 QQ 消息管理器              |
| `painted-log-adapter` | 染色器日志                      |
| `ccfolia-adapter`     | Ccfolia HTML                    |
| `pineapple-adapter`   | 菠萝日志                        |
| `sealchat-adapter`    | SealChat                        |
| `freecell-log-v1`     | 下述结构化 JSON                 |

现有文本适配器继续使用原有清洗规则（包括删除 CQ 码）。结构化 JSON 的正文不经过文本格式的 CQ/HTML 清洗，但显示仍使用编辑器现有的安全文本/Markdown 渲染。图片、语音、引用的专门展示暂未实现。

## 结构化 JSON 协议 v1

第三方机器人可以直接输出消息数组，避免依赖文本正则。此协议与本项目的工程 JSON 独立；远程来源不会触发工程文件替换工作区。

```json
{
    "schema": "freecell-log",
    "version": 1,
    "name": "调查记录",
    "messages": [
        {
            "id": "platform-message-001",
            "playerName": "调查员",
            "account": "123456",
            "time": "2026-10-09T20:00:00+08:00",
            "content": "推开房门。",
            "role": "pl",
            "isOoc": false,
            "isCommand": false,
            "note": "主频道",
            "meta": { "channel": "main" }
        }
    ]
}
```

- 顶层必需：`schema`、`version`、`messages`；`name` 可选。
- 每条消息必需：字符串 `content`。空正文会跳过，整份日志没有可导入消息则报错。
- `id`、`playerName`、`account`、`note` 可选，必须是字符串。
- `time` 可选；提供时必须是包含 `Z` 或时区偏移的 ISO 日期时间。省略时使用导入时间。
- `role` 可选：`gm`、`pl`、`ob`、`bot`、`npc`、`unknown`。省略时按昵称推断。
- `isOoc`、`isCommand` 可选，必须是布尔值。提供的值优先于正文推断。
- `meta` 可选，必须是 JSON 对象。

平台消息 `id` 保存在 `originalMessageId`，本项目另外生成自己的内部消息 ID。来源标识、原始消息 ID 和元信息随工程保存，并保留在撤销/重做中。旧版工程文件仍可读取。

同一来源和日志标识在当前工作区只导入一次，重复打开会聚焦已有文档，保留编辑内容。如果希望重新获取更新后的临时日志，先删除当前工作区中的对应文档再导入。此版本不进行远程自动同步。

## 增加特殊日志服务

1. 在 `src/io/import/sources/` 实现 `LogSourceAdapter`。
2. 在 `registry.ts` 的 `LOG_SOURCES` 中注册唯一 ID。
3. 在 `load()` 中校验请求、解析服务元信息，并通过 `context.readText()` 下载，以复用超时、取消、编码检测及大小限制。
4. 返回 `ImportTextEntry`：`name`、`text`、可选 `format`，以及 `source: { provider, id }`。该来源和日志标识组合用于重复导入判断，应保持稳定。
5. 如内容不是现有格式，新增内容适配器；来源服务与内容格式无需一一绑定。
6. 添加服务错误、正常下载、过期或重定向等测试，并让机器人返回 `#source=<新ID>&id=…` 链接。

来源适配器是随应用发布的代码扩展点，不从链接下载或执行第三方插件。若只需提供公开的文本或 JSON 下载地址，直接使用 `url` 来源即可，无需改本项目。
