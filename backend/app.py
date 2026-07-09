"""
OCEAN 人格测评后端 API
提供开放文本的 LLM 赋分服务。
"""

import json
import os
from typing import Dict, Tuple

import httpx
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# 加载环境变量
load_dotenv()

app = Flask(__name__)
CORS(app)  # 允许前端跨域访问

# 前端 web 目录（部署时由 Flask 一并 serve）
__file_dir = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(os.path.dirname(__file_dir), 'web')


# LLM 配置（兼容 LLM_API_KEY 和 OPENROUTER_API_KEY 两种命名）
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("OPENROUTER_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")

# 关键词词表（同步传给 LLM 作为评分依据）
INTENSIFY_STRONG = [
    "甚至", "超额", "必须", "立刻", "绝对", "极度享受", "完全无法忍受",
    "毫无疑问", "完全", "极其", "总是", "一定",
]
INTENSIFY_MEDIUM = ["非常", "特别", "格外"]
INTENSIFY_WEAK = ["很喜欢", "很期待", "很享受", "很感兴趣", "比较喜欢", "倾向于"]

WEAKEN_STRONG = [
    "抗拒", "讨厌", "不喜欢", "懒得", "完全不", "绝不", "打死也不", "被迫", "不得已",
]
WEAKEN_MEDIUM = [
    "偶尔", "尽量", "看心情", "不得不", "有点", "虽然", "但是", "有时",
    "可能", "大概", "勉强", "不太想", "不情愿",
]
WEAKEN_WEAK = ["不太确定"]

MIXED_WORDS = [
    "有时候", "看情况", "一半一半", "视情况而定", "时好时坏", "不一定",
    "摇摆不定", "忽上忽下",
]


def call_llm_chat(messages: list, temperature: float = 0.2) -> str:
    """使用 httpx 直接调用 OpenAI 兼容接口。"""
    if not LLM_API_KEY or LLM_API_KEY in ("your-api-key-here", "", "your-kimi-api-key-here"):
        raise ValueError("未配置 LLM_API_KEY，请检查 backend/.env 文件")

    url = f"{LLM_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
    }

    with httpx.Client(timeout=60) as client:
        resp = client.post(url, headers=headers, json=payload)

        if resp.status_code == 401:
            raise ValueError("API Key 无效或已过期（401 Unauthorized）")
        if resp.status_code == 429:
            raise ValueError("API 调用频率超限或余额不足（429 Rate Limit）")
        if resp.status_code == 402:
            raise ValueError("API 账户余额不足（402 Payment Required）")

        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def build_grading_prompt(
    question_text: str,
    dimension: str,
    options: Dict[str, str],
    open_text: str,
) -> str:
    """构建 LLM 评分提示词（锚点优先六步法）。"""
    dim_label = {
        "O": "开放性 Openness",
        "C": "尽责性 Conscientiousness",
        "E": "外向性 Extraversion",
        "A": "宜人性 Agreeableness",
        "N": "神经质 Neuroticism",
    }.get(dimension, dimension)

    dimension_anchors = {
        "O": """
O-4(4分): 主动探索未知, 享受新奇体验, 喜欢抽象思辨. 关键特征: 主动寻求思维挑战和智力刺激, 对"烧脑"内容有内在兴趣.
O-3(3分): 愿意尝试新事物, 但不排斥熟悉的方案. 关键特征: 在新鲜与安全之间保持开放, 对复杂话题有适度兴趣但不一定主动深究.
O-2(2分): 更偏好熟悉可预期的事物. 关键特征: 对变化持观望态度, 需要足够理由才愿尝试, 不太主动进行抽象思考.
O-1(1分): 回避新鲜和不确定. 关键特征: 坚持已知和常规, 对变化有明显抵触, 回避需要深度思考或智力挑战的场景.""",
        "C": """
C-4(4分): 自发制定计划并严格执行, 追求卓越. 关键特征: 信守承诺, 自我驱动, 注重细节, 做事有条不紊, 不依赖外部督促.
C-3(3分): 基本有条理, 能按时完成任务. 关键特征: 偶尔灵活调整但不影响整体质量, 能平衡计划和随性.
C-2(2分): 倾向于随性而为, 计划执行力一般. 关键特征: 对细节关注不多, 需要外部提醒, 有时拖延但最终能完成.
C-1(1分): 明显拖延, 不拘小节. 关键特征: 对承诺较随意, 最后期限才能推动行动, 做事缺乏条理, 经常遗漏任务.""",
        "E": """
E-4(4分): 从社交中获得能量, 喜欢成为焦点. 关键特征: 主动发起对话和活动, 乐于公开表达, 在人群中感到充电.
E-3(3分): 能享受社交也能独处. 关键特征: 在社交场合中适度表达, 不排斥成为焦点但不主动寻求.
E-2(2分): 偏好安静和小圈子. 关键特征: 在社交中较被动, 需要独处恢复能量, 不太主动公开表达.
E-1(1分): 回避社交场合. 关键特征: 需要大量独处时间, 在人群中感到消耗, 极力避免成为焦点.""",
        "A": """
A-4(4分): 优先考虑他人感受, 高度共情. 关键特征: 为维护关系和谐愿意退让, 本能信任他人, 乐于合作和帮助他人.
A-3(3分): 在坚持自我和照顾他人之间保持平衡. 关键特征: 友善但有底线, 愿意合作但也会表达自己的不同意见.
A-2(2分): 更重逻辑和原则, 有时显得直接. 关键特征: 对陌生人善意保持警惕, 优先考虑事实而非人际和谐.
A-1(1分): 优先自身利益, 不惧冲突. 关键特征: 较难信任他人, 在分歧中坚持己见不退让, 认为"好心往往被利用".""",
        "N": """
N-4(4分): 情绪体验强烈且持久, 容易焦虑担忧. 关键特征: 小事也能引起较大波动, 反复思考, 需要较长时间恢复平静.
N-3(3分): 面对压力有明显波动, 但能逐渐平复. 关键特征: 偶尔会多想但能拉回来, 情绪恢复需要一定时间.
N-2(2分): 多数时候情绪稳定. 关键特征: 压力下有反应但不持久, 能较快恢复平静, 不太纠结于负面事件.
N-1(1分): 情绪稳定, 抗压能力突出. 关键特征: 几乎不因小事波动, 快速恢复平静, 面对挫折保持理性和平静.""",
    }

    return (
        f"=== 评分原则(最重要, 请先阅读) ===\n"
        f"你的任务是评测用户在「{dim_label}」维度上的水平(1-4分).\n\n"
        f"A/B/C/D 四个选项仅仅是该维度不同水平档位的示例参考, 不是评分 rubric 本身.\n"
        f"评分 rubric 是下面的四档行为锚点表.\n\n"
        f"核心原则:\n"
        f"1. [识别人格核心]从用户的回答中提取与该维度定义相关的核心人格倾向.\n"
        f"   不要被回答中对某个具体选项的\"表面赞同\"或\"表面反对\"所误导.\n\n"
        f"2. [匹配锚点, 而非匹配选项]将用户的核心人格倾向与四档锚点进行语义比对,\n"
        f"   找到最匹配的锚点档位. A/B/C/D 仅作为\"与该锚点档位对应的典型回答示例\"参考.\n\n"
        f"3. [区分\"不喜欢题目内容\"与\"不喜欢维度行为\"]\n"
        f"   - 用户说\"不喜欢科幻片\"不等于不喜欢抽象思辨(O维度). 需看用户是否有替代性的思考需求.\n"
        f"   - 用户说\"对伦理问题不感兴趣\"不等于不喜欢深度讨论(O维度). 需看用户是否在其他话题上寻求思想碰撞.\n"
        f"   - 用户说\"不喜欢团队合作\"不等于宜人性低(A维度). 需看用户是喜欢独立工作还是难以信任他人.\n"
        f"   必须透过题目表面的具体内容, 看到用户在该维度人格特质上的真实水平.\n\n"
        f"4. [先评维度, 再算分数]\n"
        f"   评分流程: 提取核心人格倾向 -> 比对四档锚点确定档位 ->\n"
        f"   用 A/B/C/D 作为该档位的示例参考来校准分数 -> 输出分数.\n\n"
        f"=== 第一步: 情境锚定 ===\n"
        f"评估维度: {dim_label}\n"
        f"题目情境: {question_text}\n"
        f"(仅用于理解上下文, 不代表评分方向)\n\n"
        f"=== 第二步: 核心人格倾向提取(这是评分的基础) ===\n"
        f"从用户的开放回答中提取该维度的核心人格倾向, 用一句话概括.\n"
        f"注意: 提取的是人格特质(如\"喜欢深度思考\"\"偏好独处恢复\"\"重视承诺和计划\"),\n"
        f"      不是内容偏好(如\"喜欢科幻片\"\"不喜欢伦理话题\"\"经常去超市\").\n"
        f"如果用户表达了与题目内容不同的替代性行为, 应重点关注替代性行为反映的人格特质.\n\n"
        f"正例:\n"
        f"- \"不喜欢科幻片但喜欢有思考过程的恐怖片\" -> 核心倾向: 喜欢有思考深度的内容, 主动寻求智力刺激\n"
        f"- \"对伦理问题不感兴趣, 但喜欢辩论政治历史到爽\" -> 核心倾向: 享受深度讨论和思想碰撞, 喜欢挑战性观点\n"
        f"- \"不喜欢列清单, 但心里有数从不忘事\" -> 核心倾向: 有内在计划系统, 有责任心\n"
        f"- \"不喜欢KTV和派对, 但喜欢约朋友一对一聊天\" -> 核心倾向: 喜欢社交但偏好深度互动形式\n"
        f"- \"表面上不慌, 但晚上会失眠\" -> 核心倾向: 情绪内化但焦虑仍在\n\n"
        f"=== 第三步: 匹配四档锚点 ===\n"
        f"将提取出的核心人格倾向与以下四档维度行为锚点进行语义比对, 确定最匹配的档位:\n\n"
        f"{dimension_anchors.get(dimension, '')}\n\n"
        f"输出匹配的锚点编号(如 O-3, C-2, E-4 等)及匹配理由.\n"
        f"四个预设选项(仅作该档位的示例参考):\n"
        f"A(4分档): {options.get('A', '')}\n"
        f"B(3分档): {options.get('B', '')}\n"
        f"C(2分档): {options.get('C', '')}\n"
        f"D(1分档): {options.get('D', '')}\n\n"
        f"=== 第四步: 用A/B/C/D选项校准分数 ===\n"
        f"A/B/C/D 是锚点档位对应的典型回答示例. 以锚点档位为主, 参照对应选项文本, 微调 +/- 0.5 确定 base_score.\n\n"
        f"例如:\n"
        f"- 锚点匹配 O-3, 用户表达强度与 B 选项相当 -> 3.0分\n"
        f"- 锚点匹配 O-3, 但用户表达比 B 选项明显更强烈 -> 3.5分\n"
        f"- 锚点匹配 O-4, 用户表达高度契合 A 选项的强度 -> 4.0分\n\n"
        f"严禁行为:\n"
        f"- 禁止因为用户说了某个选项中的某个词就直接跳到该选项的分数\n"
        f"- 禁止因为用户反对题目中的某个事物就判定低分(如\"不喜欢科幻片\"->低O)\n"
        f"- 禁止只看表面文字匹配, 不看核心人格倾向\n"
        f"- 禁止从选项分数倒推锚点--必须先匹配锚点, 再校准分数\n\n"
        f"=== 第五步: 关键词强度微调(幅度 +/- 1.5) ===\n"
        f"加分词-强(weight=1.5): {', '.join(INTENSIFY_STRONG)}\n"
        f"加分词-中(weight=1.0): {', '.join(INTENSIFY_MEDIUM)}\n"
        f"加分词-弱(weight=0.5): {', '.join(INTENSIFY_WEAK)}\n"
        f"减分词-强(weight=1.5): {', '.join(WEAKEN_STRONG)}\n"
        f"减分词-中(weight=1.0): {', '.join(WEAKEN_MEDIUM)}\n"
        f"减分词-弱(weight=0.5): {', '.join(WEAKEN_WEAK)}\n"
        f"混合词(出现即触发 ambiguity=true): {', '.join(MIXED_WORDS)}\n\n"
        f"否定前缀反转规则: 检查否定结构(不, 没, 无, 非, 别, 甭, 莫, 不太, 不是很, "
        f"不怎么, 并不, 从未, 绝不, 决不, 不要, 不能, 别去, 不准). "
        f"如果关键词前有否定前缀, 反转该关键词的加减方向并降一级权重. "
        f"例如\"不讨厌\"应识别为加分词-弱(weight=0.5). 从最长复合否定开始匹配. 双重否定还原为正向.\n\n"
        f"语境方向判定规则: 先由核心人格倾向确定用户的特质方向(高分倾向或低分倾向). "
        f"如果关键词修饰的是与该核心倾向相反的方向, 则关键词加减方向反转.\n\n"
        f"混合词优先规则: 任何混合词匹配 -> ambiguity=true, 该词不再计入 intensity_boost 或 weaken_penalty.\n\n"
        f"微调计算公式:\n"
        f"intensity_boost = sum(加分词出现次数 x 该级 weight)  // 先执行否定反转与语境方向判定\n"
        f"weaken_penalty  = sum(减分词出现次数 x 该级 weight)\n"
        f"net_adjustment  = min(1.5, intensity_boost) - min(1.5, weaken_penalty)\n"
        f"final_score     = base_score + net_adjustment\n"
        f"最终结果限制在[1.0, 4.0].\n\n"
        f"=== 第六步: 质量标记(quality_flag) + 置信度(confidence) ===\n"
        f"| 标记 | 触发条件 |\n"
        f"| valid | 回答与情境相关, 语义清晰, 核心人格倾向可明确提取 |\n"
        f"| weak_match | 核心人格倾向可推断但不够清晰, 或锚点匹配在两级间摇摆 |\n"
        f"| boundary | 锚点匹配在两级边界, 或两种倾向兼有 |\n"
        f"| off_topic | 答非所问, 明显敷衍, 字数 <5个有意义汉字 |\n"
        f"| contradictory | 文本内部自相矛盾, 或关键词密度 >40% |\n\n"
        f"置信度输出 0.0-1.0. >=0.7 可信, 0.5-0.7 存疑, <0.5 不可信.\n"
        f"置信度调整: 核心倾向明确 +0.1; boundary -0.1; 有效汉字数>=15且关键词密度<10% +0.1; 关键词密度>40% -0.2.\n"
        f"最终 confidence 限制在[0.0, 1.0].\n\n"
        f"=== 用户开放回答 ===\n"
        f"{open_text}\n\n"
        f"=== 输出格式 ===\n"
        f"请只输出如下 JSON(不要 Markdown 代码块):\n"
        f'{{\n'
        f'  "base_score": float,          // 锚点匹配+选项校准后的基础分\n'
        f'  "best_match": "A/B/C/D",      // 最匹配的选项(作为该锚点档位的示例)\n'
        f'  "matched_anchor": "X-N",      // 匹配的锚点编号(如 O-3, C-2, E-4)\n'
        f'  "final_score": float,         // 最终得分(1.0-4.0, 支持0.5)\n'
        f'  "quality_flag": "valid|weak_match|boundary|off_topic|contradictory",\n'
        f'  "confidence": float,          // 0.0-1.0\n'
        f'  "reason": str                 // 简要说明评分依据(含锚点匹配理由)\n'
        f'}}'
    )


def score_with_llm(
    question_text: str,
    dimension: str,
    options: Dict[str, str],
    open_text: str,
) -> Tuple[float, str, str, str, float]:
    """调用 LLM 对开放文本赋分. 返回(分数, 理由, 最匹配选项, quality_flag, confidence)."""
    prompt = build_grading_prompt(question_text, dimension, options, open_text)

    system_msg = (
        "你是一位专业的人格心理学评估助手. 请严格按照《AI 评分标准》六步法"
        "(情境锚定->核心人格倾向提取->匹配四档锚点->选项校准->关键词强度微调->质量标记->置信度)"
        "对用户的开放回答评分. 分数范围 1.0-4.0, 支持 0.5 分精度."
        "必须输出 quality_flag 和 confidence. 只输出 JSON 格式, 不要输出任何解释性文字."
    )

    # ---- 辅助函数: 解析 LLM 返回的 JSON ----
    def _parse_response(content: str) -> dict:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()
        return json.loads(cleaned)

    # ---- 第一次评分(temperature=0.2) ----
    content1 = call_llm_chat([
        {"role": "system", "content": system_msg},
        {"role": "user", "content": prompt},
    ], temperature=0.2)
    data1 = _parse_response(content1)

    fs1 = float(data1.get("final_score", data1.get("base_score", 2.5)))
    qf1 = data1.get("quality_flag", "valid")
    conf1 = float(data1.get("confidence", 0.7))

    # ---- 判断是否触发二次评分 ----
    needs_rescore = (conf1 < 0.5 or qf1 not in ("valid",))

    if needs_rescore:
        try:
            content2 = call_llm_chat([
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ], temperature=0.5)
            data2 = _parse_response(content2)

            fs2 = float(data2.get("final_score", data2.get("base_score", 2.5)))
            qf2 = data2.get("quality_flag", "valid")
            diff = abs(fs1 - fs2)

            if diff <= 0.5:
                final_score = round((fs1 + fs2) / 2, 1)
                # quality_flag 取两次中较优者
                flag_rank = {"valid": 0, "boundary": 1, "weak_match": 2, "contradictory": 3, "off_topic": 4}
                quality_flag = qf1 if flag_rank.get(qf1, 9) <= flag_rank.get(qf2, 9) else qf2
            else:
                final_score = 2.5
                quality_flag = "unreliable"

            reason = f"二次评分: 第一次={fs1}({qf1}), 第二次={fs2}({qf2}), 差异={diff:.1f}"
            confidence = 0.0  # 二次评分后置信度失效
            best_match = data1.get("best_match", "") or data2.get("best_match", "")
        except Exception as exc:
            print(f"[二次评分失败] {exc}, 使用第一次评分结果.")
            final_score = fs1
            quality_flag = qf1
            reason = data1.get("reason", "")
            confidence = conf1
            best_match = data1.get("best_match", "")
    else:
        final_score = fs1
        quality_flag = qf1
        reason = data1.get("reason", "")
        confidence = conf1
        best_match = data1.get("best_match", "")

    # 限制在合理范围
    final_score = max(1.0, min(4.0, final_score))
    confidence = max(0.0, min(1.0, confidence))

    return final_score, reason, best_match, quality_flag, confidence


def format_reason(best_match: str, reason: str, quality_flag: str, confidence: float) -> str:
    """格式化评分理由."""
    parts = []
    if best_match:
        parts.append(f"最匹配选项: {best_match}")
    if reason:
        parts.append(f"判定: {reason}")
    parts.append(f"质量标记: {quality_flag}")
    parts.append(f"置信度: {confidence:.2f}")
    return ";".join(parts) if parts else "LLM 评分"


@app.route("/api/health", methods=["GET"])
def health():
    """健康检查接口."""
    return jsonify({
        "status": "ok",
        "model": LLM_MODEL,
        "base_url": LLM_BASE_URL,
        "api_key_configured": bool(LLM_API_KEY and LLM_API_KEY not in ("your-api-key-here", "your-openrouter-api-key-here", "your-kimi-api-key-here")),
    })


@app.route("/api/score", methods=["POST"])
def score():
    """对开放文本进行 AI 赋分."""
    try:
        data = request.get_json()

        # 参数校验
        required = ["question_id", "dimension", "question_text", "options", "open_text"]
        for field in required:
            if field not in data:
                return jsonify({"error": f"缺少必填字段: {field}"}), 400

        question_text = data["question_text"]
        dimension = data["dimension"]
        options = data["options"]
        open_text = data["open_text"].strip()

        if not open_text:
            return jsonify({"error": "开放文本不能为空"}), 400

        # 调用 LLM 评分
        score_val, reason, best_match, quality_flag, confidence = score_with_llm(
            question_text, dimension, options, open_text
        )

        return jsonify({
            "score": score_val,
            "reason": format_reason(best_match, reason, quality_flag, confidence),
            "best_match": best_match,
            "quality_flag": quality_flag,
            "confidence": confidence,
            "model": LLM_MODEL,
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        user_message = "LLM 调用失败"

        # 识别常见错误类型, 给前端更清晰的提示
        if "401" in error_msg or "Authentication" in error_msg or "Unauthorized" in error_msg:
            user_message = "API Key 无效或已过期, 请检查 backend/.env 中的 LLM_API_KEY"
        elif "429" in error_msg or "Rate limit" in error_msg:
            user_message = "API 调用频率超限或余额不足, 请稍后再试或充值"
        elif "Connection" in error_msg or "Timeout" in error_msg:
            user_message = "无法连接到 LLM 服务, 请检查网络或 LLM_BASE_URL"
        elif "Credit" in error_msg or "balance" in error_msg.lower():
            user_message = "API 账户余额不足, 请充值"

        # 出错时返回默认分数, 让前端可以降级继续
        return jsonify({
            "score": 2.5,
            "reason": f"{user_message}, 已降级为本地规则评分. 技术详情: {error_msg[:200]}",
            "best_match": "",
            "quality_flag": "off_topic",
            "confidence": 0.0,
            "model": LLM_MODEL,
            "fallback": True,
            "error_type": "llm_error",
        }), 200


# ---------------------------------------------------------------------------
# 画像答疑 Agent
# ---------------------------------------------------------------------------

QA_AGENT_PROMPT = """你是「人格测评报告解读助手」(画像答疑Agent), 面向大学生.

## 身份
- 基于用户已完成的 OCEAN 人格测评结果, 回答职业方向, 学习风格, 人际策略, 情绪调节等方面的一般性参考问题.
- 你不是心理咨询师, 精神科医生, 职业规划师, 治疗师或任何真人专业人士.
- 你提供的所有建议都是参考性的, 非诊断性的, 非治疗性的.

## 语气
- 温和, 通俗, 不贴标签.
- 先描述行为倾向, 再解释分数.
- 正例: 「尽责性得分较高的你, 通常善于做计划和信守承诺.」
- 反例(严禁): 「你是内向型人格, 所以你不适合社交.」「你神经质很高, 可能有焦虑症.」

## 硬边界(不可突破)
以下请求必须拒绝并转介, 绝不能回答:
1. 心理疾病诊断: 拒绝下诊断, 建议正规医院或心理科评估.
2. 药物/治疗建议: 拒绝开药/治疗建议, 建议就医.
3. 替代真人咨询: 声明边界, 建议联系学校心理咨询中心或医院.
4. 自伤/自杀/伤人信号: 立即停止回答, 声明无法处理危机, 给出资源:
   - 全国 24 小时心理援助热线: 400-161-9995
   - 学校心理咨询中心
   - 家人, 辅导员或就近医院精神科
5. 绝对化标签: 拒绝贴标签, 重申人格是倾向不是定论.
6. 线下邀约/私人联系/性暗示/政治敏感: 拒绝并声明只讨论人格测评相关话题.

## 回答策略
1. 基于画像, 回扣到用户的具体维度分数.
2. 使用「倾向 + 场景 + 小建议 + 提醒边界」结构, 每次回答 3-5 句话.
3. 不给唯一答案. 例如不说「你最适合做老师」, 而说「基于你的尽责性和宜人性, 教师, 社工, 项目管理等方向可能比较匹配」.
4. 鼓励用户自己验证: 「你可以在生活中观察一下, 这个建议是否适合你.」

## 自检环
每句话发出前检查: 是否越界? 是否贴标签? 是否给唯一答案?
"""


def build_qa_system_message(profile: dict) -> str:
    """把用户画像注入 QA Agent 的 system prompt."""
    dimension_labels = {
        "O": "开放性 Openness",
        "C": "尽责性 Conscientiousness",
        "E": "外向性 Extraversion",
        "A": "宜人性 Agreeableness",
        "N": "神经质 Neuroticism",
    }

    profile_text = "\n".join(
        f"- {dimension_labels[d]}: 总分 {profile[d]['total']:.2f} / 20, 均分 {profile[d]['avg']:.2f} / 4.0, 等级: {profile[d]['level']}"
        for d in ["O", "C", "E", "A", "N"]
    )

    return (
        f"{QA_AGENT_PROMPT}\n\n"
        f"## 当前用户画像\n"
        f"{profile_text}\n\n"
        f"请基于以上画像回答用户问题. 每次回答都要回扣到具体维度分数, 不贴标签, 不给唯一答案."
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    """画像答疑 Agent 对话接口."""
    try:
        data = request.get_json()

        # 参数校验
        if "messages" not in data or not isinstance(data["messages"], list):
            return jsonify({"error": "缺少 messages 字段"}), 400
        if "profile" not in data or not isinstance(data["profile"], dict):
            return jsonify({"error": "缺少 profile 字段"}), 400

        messages = data["messages"]
        profile = data["profile"]

        # 构建 system message
        system_msg = build_qa_system_message(profile)

        # 构造发给 LLM 的消息列表
        llm_messages = [{"role": "system", "content": system_msg}]
        for msg in messages:
            if msg.get("role") in ("user", "assistant") and msg.get("content"):
                llm_messages.append({"role": msg["role"], "content": msg["content"]})

        # 调用 LLM
        reply = call_llm_chat(llm_messages, temperature=0.7)

        return jsonify({
            "reply": reply,
            "model": LLM_MODEL,
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"Agent 调用失败: {str(e)[:200]}",
            "reply": "抱歉, 我暂时无法回答这个问题. 你可以稍后重试, 或联系真人专业人士.",
        }), 200



@app.route('/')
def serve_frontend():
    """Serve the main frontend page."""
    return send_from_directory(WEB_DIR, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve other static files from the web directory."""
    return send_from_directory(WEB_DIR, path)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
