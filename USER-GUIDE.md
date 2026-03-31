# Caption KB Assistant — 使用说明

## 软件简介

Caption KB Assistant（字幕知识库助手）是一款桌面应用，专为中英混合学术讲座视频的字幕制作而设计。它不处理视频本身，只处理字幕文件——通过 AI 和知识库对 ASR（自动语音识别）生成的字幕进行智能修正，输出高质量的字幕文件。

## 典型工作流程

```
Adobe Premiere（ASR 生成字幕）
        ↓ 导出 SRT 文件
Caption KB Assistant（AI 修正字幕）
        ↓ 导出修正后的 SRT 文件
Adobe Premiere（导入修正后的 SRT，调整样式，导出视频）
```

## 快速上手

### 第一次使用

1. 打开 Caption KB Assistant
2. 进入 **Settings**（设置）：
   - 设置数据存储路径（所有项目文件将保存在这里）
   - 输入 Claude API Key（或 OpenAI 兼容 API Key）
   - 选择默认语言（中文 / English / 中英混合）
3. 进入 **Global KB**（全局知识库）：
   - 填写个人档案（姓名、职称、机构、研究领域）
   - 添加常用术语表条目（可后续逐步积累）

### 处理一个视频的字幕

#### Step 1：创建项目并导入 SRT

1. 在 **Projects**（项目列表）页面，点击 **New Project**
2. 输入项目名称（如 "赵显教授-微关联讲座"）
3. 选择语言类型：**中英混合**
4. 点击 **Import SRT** 导入从 Adobe Premiere 导出的 SRT 文件
5. 导入后可以看到完整的字幕列表（编号 | 时间轴 | 文字）

> 如果需要修正时间轴偏移（如字幕整体超前 2 秒），在此步骤使用 **Adjust Timing** 功能。

#### Step 2：提取纯文本

1. 点击 **Extract Text** 按钮
2. 系统自动从 SRT 中提取纯文本（去掉时间轴和编号）
3. 纯文本显示在右侧编辑面板中
4. 你可以直接编辑，也可以点击 **Download** 下载后用其他编辑器修改再上传

#### Step 3：配置项目知识库

1. 点击 **Knowledge Base** 标签
2. 上传与本视频相关的参考文件：
   - 讲座海报（PDF）
   - PPT 课件（PPTX）
   - 讲稿（DOCX / TXT）
   - 其他参考材料
3. 勾选哪些文件参与本次润色
4. 查看 token 估算（了解知识库的信息量大小）

> **知识库越丰富，修正效果越好。** 至少上传讲座海报可以覆盖演讲者姓名、机构名、主题术语等关键信息。

#### Step 4：AI 润色

1. 点击 **Correct with AI** 按钮
2. 选择 LLM 提供商和模型（默认 Claude Sonnet）
3. 选择 Prompt 模板（默认：学术讲座字幕润色）
4. 查看成本预览：
   - 预估 API 调用次数
   - 预估 token 消耗
   - 预估费用
   - 预估处理时间
5. 确认后点击 **Start Correction**
6. 等待处理完成（可看到进度条：已处理 X / 总共 Y 批）
7. 完成后进入 **Diff 对比视图**：
   - 左侧：原始文本
   - 右侧：修正后文本
   - 差异部分高亮显示
8. 浏览修正结果，可以：
   - 逐条接受或拒绝修改
   - 直接编辑修正后的文本
   - 发现的术语修正一键添加到全局术语表

#### Step 5：合并生成最终 SRT

1. 点击 **Merge** 按钮
2. 系统将修正后的文本与原始 SRT 的时间轴合并
3. 预览合并结果（列表形式显示最终字幕）
4. 确认无误后保存

#### Step 6：导出

1. 点击 **Export** 按钮
2. 选择导出格式：
   - **SRT**（推荐，最通用，可导入 Adobe Premiere）
   - **ASS**（带字体样式信息）
   - **TXT**（纯文本）
   - **修正报告**（Markdown 格式，记录所有修改项）
3. 如需设置字幕字体样式（在 ASS 格式中）：
   - 中文字体：宋体 / 黑体
   - 英文字体：Times New Roman / Arial
   - 字号、加粗、斜体
   - 字体颜色、描边颜色
4. 导出的 SRT 文件可直接在 Adobe Premiere 中通过 **File → Import** 导入

## 全局知识库管理

### 个人档案

在 **Global KB → Personal Profile** 中维护你的个人信息：

```markdown
# 个人档案
- 姓名：王宝玉 / Baoyu Wang
- 职称：Assistant Teaching Professor
- 机构：Arizona State University, School of Social and Behavioral Sciences
- 研究领域：社会心理学、文化心理学
- 论坛名称：AZX 心理学论坛
```

这些信息会在每次 AI 润色时作为背景知识传入，帮助 AI 理解主持人身份和论坛背景。

### 术语表

在 **Terminology** 页面维护常用术语修正对照表：

| 错误词（ASR 常见误识） | 正确词 | 备注 |
|:-----|:-----|:-----|
| 群体关系 | 群际关系 | intergroup relations |
| 童话观 | 同化观 | assimilation expectation |
| 少数意义 | 少数裔 | ethnic minority |
| 凯特斯大学 | 堪萨斯大学 | University of Kansas |

术语表的积累是一个持续过程——每处理一个视频，发现的新术语修正就加入表中。随着术语表的增长，后续视频的修正质量会越来越高。

术语表可以独立于 AI 润色使用：即使没有 API key，也可以用术语表做离线批量替换。

## 设置说明

### LLM 配置

| 设置项 | 说明 |
|:-----|:-----|
| Provider | Claude API（推荐）或 OpenAI 兼容 API |
| API Key | 从 Anthropic Console 或 OpenAI 平台获取 |
| Model | Claude Sonnet（推荐，性价比最优）或 Claude Opus（最高质量） |
| Base URL | 默认不需要修改。使用第三方兼容 API 时需要填写 |

### 数据路径

所有项目数据存储在你指定的本地文件夹中。建议设置为：
- Obsidian vault 中的子目录（如 `D:\ObsidianVault\CaptionKB\`）
- 或任意本地路径（如 `D:\CaptionProjects\`）

数据不会上传到任何云端服务。API 调用时只发送字幕文本和知识库内容。

## 常见问题

### SRT 导入后显示乱码？
文件编码问题。软件会自动检测 UTF-8 / UTF-8-BOM / GBK，但如果仍然乱码，请在导出 SRT 时确保选择 UTF-8 编码。

### AI 润色中途失败了怎么办？
软件支持断点续传。已完成的批次结果会保存，你可以从失败的位置继续。

### 修正后段数和原始 SRT 条数不一致？
合并时会显示警告。多余的 SRT 条目保留原文，多余的修正文本忽略。通常不一致是因为润色过程中 AI 合并或拆分了某些段落——Prompt 模板已经明确要求"不合并不拆分"，但偶尔仍可能发生。

### 没有 API key 能用吗？
可以。除了 AI 润色（Step 4）需要 API key，其他所有功能（导入、提取、术语表替换、合并、导出）都完全离线可用。

### 如何导入回 Adobe Premiere？
在 Premiere 中：**File → Import** → 选择导出的 SRT 文件 → SRT 会作为字幕轨道出现在时间线上 → 在 Essential Graphics 面板中调整样式。

## 成本参考

使用 Claude Sonnet API 润色一段 60 分钟讲座视频（约 27,000 字 / 746 条字幕）：

| 项目 | 预估值 |
|:-----|:-----|
| API 调用次数 | 8-10 次 |
| Token 消耗 | ~50,000 input + ~30,000 output |
| 费用 | ~$0.30 - $0.50 |
| 处理时间 | 3-5 分钟 |

对比人工外包字幕制作，成本降低约 95% 以上。
