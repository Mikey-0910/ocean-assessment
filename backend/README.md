# 人格测评后端 API

基于 Flask + OpenAI 兼容接口，为网页版提供 LLM 开放文本赋分服务。

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置 API Key

复制示例环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 API Key。默认使用 **OpenRouter**：

```env
LLM_API_KEY=你的OpenRouter-API-Key
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=anthropic/claude-3.5-sonnet
```

可选模型（OpenRouter 支持很多）：
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-opus`
- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `deepseek/deepseek-chat`

去 https://openrouter.ai/keys 注册并创建 API Key。

### 3. 启动后端

```bash
python app.py
```

默认运行在 `http://localhost:5000`。

### 4. 打开前端

用浏览器打开 `web/index.html` 即可。

## API 接口

### POST /api/score

对开放文本进行 AI 赋分。

请求体：

```json
{
  "question_id": 1,
  "dimension": "O",
  "question_text": "题干文本",
  "options": {
    "A": "选项A文本",
    "B": "选项B文本",
    "C": "选项C文本",
    "D": "选项D文本"
  },
  "open_text": "用户的开放说明"
}
```

响应：

```json
{
  "score": 2.5,
  "reason": "最匹配选项：B；相似度：A:40%, B:75%, C:20%, D:5%；微调：表达温和且混合，-0.5 → 3.5",
  "best_match": "B",
  "model": "anthropic/claude-3.5-sonnet"
}
```

## 注意事项

- API Key 只保存在后端 `.env` 文件中，不要提交到公开仓库。
- 如果 LLM 调用失败，后端会返回默认分数 2.5 并附带错误信息，前端可以降级使用。
