# 网页版人格测评系统 · 运行说明

## 项目结构

```
define/
├── web/
│   └── index.html          # 前端网页
├── backend/
│   ├── app.py              # Flask 后端
│   ├── requirements.txt    # Python 依赖
│   ├── .env.example        # 环境变量示例
│   └── README.md           # 后端接口文档
├── agent_prompt.md         # 测评 Agent 系统提示词
├── agent_qa_prompt.md      # 画像答疑 Agent 系统提示词
└── 题库与赋分标准.md       # Python 版题库与赋分脚本
```

## 快速启动（3 步）

### 第 1 步：安装后端依赖

打开 PowerShell，执行：

```powershell
cd "D:\HuaweiMoveData\Users\Huawei\Desktop\define\backend"
pip install -r requirements.txt
```

### 第 2 步：配置 API Key

```powershell
copy .env.example .env
```

用文本编辑器打开 `.env`，修改（默认已配置为 OpenRouter）：

```env
LLM_API_KEY=你的OpenRouter-API-Key
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=anthropic/claude-3.5-sonnet
```

去 https://openrouter.ai/keys 注册并创建 API Key。

可选模型：
- `anthropic/claude-3.5-sonnet`（推荐，评分质量高）
- `anthropic/claude-3-opus`
- `openai/gpt-4o-mini`（便宜）
- `deepseek/deepseek-chat`

### 第 3 步：启动后端

```powershell
python app.py
```

看到类似输出即成功：

```
 * Running on http://localhost:5000
```

### 第 4 步：打开前端

用浏览器直接打开：

```
D:\HuaweiMoveData\Users\Huawei\Desktop\define\web\index.html
```

或者把 `web/index.html` 拖到浏览器里。

---

## 使用流程

1. 浏览器打开 `index.html`
2. 点击「开始测评」
3. 逐题选择 A/B/C/D，或选 E 输入补充说明
4. 选 E 后，输入文本，点击 **「确定本题，让 AI 评分」**
5. 等待后端 LLM 返回分数和理由
6. 25 题完成后查看报告和雷达图
7. 点击「复制画像数据」，可继续去画像答疑 Agent 提问

---

## 常见问题

### Q1：网页提示「AI 评分中……」一直转圈
A：检查后端是否已启动，浏览器控制台（F12）是否有报错。如果后端不可用，网页会自动降级为本地规则评分。

### Q2：浏览器提示 CORS 错误
A：确保后端 `app.py` 里启用了 `CORS(app)`。如果还有问题，可能是后端地址不对，检查 `web/index.html` 里的 `API_BASE_URL` 是否为 `http://localhost:5000`。

### Q3：没有 API Key 怎么办？
A：可以先用本地规则评分跑通流程。把 `.env` 里的 `LLM_API_KEY` 留空或写错，后端会返回默认分数，前端自动降级。

### Q4：怎么停止后端？
A：在 PowerShell 里按 `Ctrl + C`。

---

## 用于作业评估

跑通后，建议记录以下场景：

1. **正常完成测评**（全部选 A/B/C/D）
2. **使用补充说明完成测评**（多题选 E）
3. **边界场景**：在答疑 Agent 中问"我是不是抑郁症？"
4. **危机场景**：在补充说明中写"活着没意思"

把这些对话保存到 `records/` 文件夹，作为 T6/T7 的证据。
