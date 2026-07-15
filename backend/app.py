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


def precheck_open_text(text: str) -> dict:
    """规则层预检测，在 LLM 评分前执行。"""
    import re

    # 去除标点和空白后的纯汉字
    pure_chinese = re.sub(r'[^一-鿿]', '', text)
    char_count = len(pure_chinese)

    # 有效汉字（去除"啊""嗯""哦""哈"等语气词后的字数）
    filler_chars = set('嗯啊哦哈呵嘿嘻呜呀哇啧诶')
    meaningful_chars = [c for c in pure_chinese if c not in filler_chars]
    meaningful_count = len(meaningful_chars)

    # 敷衍检测
    perfunctory_patterns = ['随便', '不知道', '无所谓', '都可以', '没什么', '不太清楚', '就这样']
    is_perfunctory = any(p in text for p in perfunctory_patterns) and meaningful_count < 8

    # 关键词密度检测
    all_keywords = (INTENSIFY_STRONG + INTENSIFY_MEDIUM + INTENSIFY_WEAK +
                    WEAKEN_STRONG + WEAKEN_MEDIUM + WEAKEN_WEAK + MIXED_WORDS)
    keyword_chars = sum(len(kw) for kw in all_keywords if kw in text)
    keyword_density = keyword_chars / max(len(text), 1)

    # 内部矛盾检测（简单规则）
    intensify_count = sum(1 for kw in INTENSIFY_STRONG + INTENSIFY_MEDIUM if kw in text)
    weaken_count = sum(1 for kw in WEAKEN_STRONG + WEAKEN_MEDIUM if kw in text)
    has_contradiction = (intensify_count >= 1 and weaken_count >= 1)

    # 基础置信度（由规则层计算）
    base_confidence = 0.70  # 起点

    if meaningful_count >= 30:
        base_confidence += 0.10
    elif meaningful_count >= 15:
        base_confidence += 0.05
    elif meaningful_count < 5:
        base_confidence -= 0.15
        return {
            "force_flag": "off_topic",
            "force_score": 2.5,
            "confidence_cap": 0.40,
            "reason_suffix": " [规则检测: 有效字数不足5个, 判定为敷衍回答]",
            "meaningful_char_count": meaningful_count,
            "keyword_density": round(keyword_density, 3),
            "has_contradiction": has_contradiction,
            "rule_base_confidence": min(1.0, max(0.0, base_confidence)),
        }

    if is_perfunctory:
        base_confidence -= 0.15
        return {
            "force_flag": "off_topic",
            "force_score": 2.5,
            "confidence_cap": 0.45,
            "reason_suffix": " [规则检测: 检测到敷衍表达]",
            "meaningful_char_count": meaningful_count,
            "keyword_density": round(keyword_density, 3),
            "has_contradiction": has_contradiction,
            "rule_base_confidence": min(1.0, max(0.0, base_confidence)),
        }

    if keyword_density > 0.40:
        base_confidence -= 0.20
        return {
            "force_flag": "contradictory",
            "confidence_cap": 0.50,
            "reason_suffix": " [规则检测: 关键词密度过高, 可能存在刻意填充]",
            "meaningful_char_count": meaningful_count,
            "keyword_density": round(keyword_density, 3),
            "has_contradiction": has_contradiction,
            "rule_base_confidence": min(1.0, max(0.0, base_confidence)),
        }

    precheck_result = {
        "meaningful_char_count": meaningful_count,
        "keyword_density": round(keyword_density, 3),
        "has_contradiction": has_contradiction,
        "rule_base_confidence": min(1.0, max(0.0, base_confidence)),
    }

    # 轻度标记
    if meaningful_count < 15:
        precheck_result["suggest_weak_match"] = True

    return precheck_result


def build_grading_prompt(
    question_text: str,
    dimension: str,
    options: Dict[str, str],
    open_text: str,
) -> str:
    """构建 LLM 评分提示词（锚点优先七步法，含语义复杂性检测）。"""
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
        f"   评分流程: 语义解锁 -> 提取核心人格倾向 -> 比对四档锚点确定档位 ->\n"
        f"   用 A/B/C/D 作为该档位的示例参考来校准分数 -> 输出分数.\n\n"
        f"=== 第一步: 情境锚定 ===\n"
        f"评估维度: {dim_label}\n"
        f"题目情境: {question_text}\n"
        f"(仅用于理解上下文, 不代表评分方向)\n\n"
        f"=== 第二步: 语义复杂性检测与解锁（新增, 评分前必做） ===\n"
        f"用户在开放回答中可能使用以下复杂语义表达, 你需要先识别、再翻译, 然后再进入人格倾向提取.\n\n"
        f"请逐一检查用户文本中是否存在以下四种情况:\n\n"
        f"┌────────────────────┬──────────────────────────────────────┬──────────────────────────────┐\n"
        f"│ 类型               │ 特征与示例                           │ 你的处理方式                 │\n"
        f"├────────────────────┼──────────────────────────────────────┼──────────────────────────────┤\n"
        f"│ 1. 网络用语/流行语  │ 非字面意思的俚语、新造词.           │ 根据上下文推理其真实含义,    │\n"
        f"│                    │ 如\"社恐\"\"i人\"\"纯纯大怨种\"            │ 翻译为标准语义描述.         │\n"
        f"│                    │ 如\"绝绝子\"\"yyds\"                     │ 不确定时结合情境推断.       │\n"
        f"│                    │ 如\"社交恐怖分子\"\"社交牛逼症\"          │                              │\n"
        f"├────────────────────┼──────────────────────────────────────┼──────────────────────────────┤\n"
        f"│ 2. 反语/讽刺        │ 说反话, 字面与真实意图相反.          │ 识别反语信号, 翻转字面意思.  │\n"
        f"│                    │ 如\"我社交超厉害的呢（加白眼emoji）\"    │ 注意语气词、emoji、上下文   │\n"
        f"│                    │ 如\"团队合作？那可太棒了（敷衍语气）\"   │ 矛盾等线索.                 │\n"
        f"│                    │ 如\"对对我就是那种人（不耐烦）\"        │                              │\n"
        f"├────────────────────┼──────────────────────────────────────┼──────────────────────────────┤\n"
        f"│ 3. 夸张/自嘲式表达  │ 用极端说法表达情绪, 非字面事实.       │ 识别夸张成分, 提取核心情感.  │\n"
        f"│                    │ 如\"当场去世\" → 极度尴尬/不适          │ 夸张通常反映更强的情绪强度, │\n"
        f"│                    │ 如\"社死一百次\" → 非常在意社交评价      │ 应在关键词强度微调时体现.    │\n"
        f"│                    │ 如\"我直接裂开\" → 极度崩溃/无奈        │                              │\n"
        f"│                    │ 如\"天都要塌了\" → 极度焦虑             │                              │\n"
        f"│                    │ 如\"熬夜到地老天荒\" → 拖延但完成了      │                              │\n"
        f"├────────────────────┼──────────────────────────────────────┼──────────────────────────────┤\n"
        f"│ 4. 省略/模糊表达    │ 用简略语暗示, 不直接说明.             │ 根据上下文补全隐含语义.      │\n"
        f"│                    │ 如\"懂的都懂\" → 隐含某种共识性态度      │ 如果不确定, 标记为 weak_match│\n"
        f"│                    │ 如\"就那样吧\" → 回避深入表达            │ 或 boundary.                │\n"
        f"│                    │ 如\"说不清楚\" → 可能自我认知模糊        │                              │\n"
        f"└────────────────────┴──────────────────────────────────────┴──────────────────────────────┘\n\n"
        f"语义解锁输出格式（内部推理, 不输出给用户）:\n"
        f"- 检测结果: [有语义复杂性 / 无语义复杂性]\n"
        f"- 检测到的类型: [网络用语 / 反语 / 夸张 / 省略]（可多选）\n"
        f"- 语义翻译: 将用户文本中所有非字面表达翻译为与人格维度相关的标准语义描述. 保留原文中无需翻译的部分.\n"
        f"- 翻译示例:\n"
        f'  * 原文"我是社交恐怖分子来着" → 翻译"我在社交场合极度恐惧和不自在"\n'
        f'  * 原文"我选择当场去世" → 翻译"我会感到极度尴尬和不适, 想要立刻离开那个场合"\n'
        f'  * 原文"表面笑嘻嘻心里mmp" → 翻译"我在人际冲突中选择表面维持和谐, 但内心有强烈不满"\n'
        f'  * 原文"这个问题太抽象了我直接愣住" → 翻译"面对抽象复杂的话题, 我的第一反应是困惑和回避, 不太愿意深入思考"\n\n'
        f"关键原则:\n"
        f"- 绝不从字面理解网络用语. 如果一段文字读起来\"字面意思很奇怪\", 那大概率是网络用语.\n"
        f"- 绝不从字面理解情绪极端表达.\"我要死了\"\"裂开了\"\"天塌了\"几乎总是夸张而非事实.\n"
        f"- 注意 emoji 和标点: 😅🤣🙃 等表情符号、重复的句号(……)、波浪号(～)常伴随非字面表达.\n"
        f"- 翻译后的语义才是评分的真正输入. 人格倾向提取应基于翻译后的语义, 而非原文字面.\n\n"
        f"===[以下进入原有的评分步骤]===\n\n"
        f"=== 第三步: 核心人格倾向提取（这是评分的基础，基于语义翻译后的文本进行） ===\n"
        f"从用户经过语义解锁后的回答中提取该维度的核心人格倾向, 用一句话概括.\n"
        f"注意: 提取的是人格特质(如\"喜欢深度思考\"\"偏好独处恢复\"\"重视承诺和计划\"),\n"
        f"      不是内容偏好(如\"喜欢科幻片\"\"不喜欢伦理话题\"\"经常去超市\").\n"
        f"如果用户表达了与题目内容不同的替代性行为, 应重点关注替代性行为反映的人格特质.\n\n"
        f"正例:\n"
        f"- \"不喜欢科幻片但喜欢有思考过程的恐怖片\" -> 核心倾向: 喜欢有思考深度的内容, 主动寻求智力刺激\n"
        f"- \"对伦理问题不感兴趣, 但喜欢辩论政治历史到爽\" -> 核心倾向: 享受深度讨论和思想碰撞, 喜欢挑战性观点\n"
        f"- \"不喜欢列清单, 但心里有数从不忘事\" -> 核心倾向: 有内在计划系统, 有责任心\n"
        f"- \"不喜欢KTV和派对, 但喜欢约朋友一对一聊天\" -> 核心倾向: 喜欢社交但偏好深度互动形式\n"
        f"- \"表面上不慌, 但晚上会失眠\" -> 核心倾向: 情绪内化但焦虑仍在\n\n"
        f"=== 第四步: 匹配四档锚点 ===\n"
        f"将提取出的核心人格倾向与以下四档维度行为锚点进行语义比对, 确定最匹配的档位:\n\n"
        f"{dimension_anchors.get(dimension, '')}\n\n"
        f"输出匹配的锚点编号(如 O-3, C-2, E-4 等)及匹配理由.\n"
        f"四个预设选项(仅作该档位的示例参考):\n"
        f"A(4分档): {options.get('A', '')}\n"
        f"B(3分档): {options.get('B', '')}\n"
        f"C(2分档): {options.get('C', '')}\n"
        f"D(1分档): {options.get('D', '')}\n\n"
        f"=== 第五步: 用A/B/C/D选项校准分数 ===\n"
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
        f"=== 第六步: 关键词强度微调(幅度 +/- 1.5) ===\n"
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
        f"=== 第七步: 质量标记(quality_flag) + 置信度(confidence) ===\n"
        f"| 标记 | 触发条件 |\n"
        f"| valid | 回答与情境相关, 语义清晰, 核心人格倾向可明确提取 |\n"
        f"| weak_match | 核心人格倾向可推断但不够清晰, 或锚点匹配在两级间摇摆 |\n"
        f"| boundary | 锚点匹配在两级边界, 或两种倾向兼有 |\n"
        f"| off_topic | 答非所问, 明显敷衍, 字数 <5个有意义汉字 |\n"
        f"| contradictory | 文本内部自相矛盾, 或关键词密度 >40% |\n\n"
        f"置信度细则（精细化调整）:\n"
        f"基础置信度起点: 0.70.\n\n"
        f"与语义解锁相关的调整:\n"
        f"+0.05  语义表达直接清晰, 无需解锁（白话文, 无网络用语/反语/夸张）\n"
        f"+0.00  检测到网络用语/夸张但语义翻译明确, 翻译后含义清晰\n"
        f"-0.05  存在反语或省略表达, 语义翻译需要一定推理\n"
        f"-0.10  存在多重语义复杂性（如同时有网络用语+反语）, 翻译可能不够确定\n"
        f"-0.15  语义解锁困难, 多种翻译方向都有可能, 无法确定真实含义\n"
        f"       → 此时应同时将 quality_flag 标记为 weak_match 或 boundary\n\n"
        f"其他置信度调整因子（每一项最多生效一次）:\n"
        f"加分项:\n"
        f"+0.08  核心人格倾向非常明确, 且有一致的行为描述支撑\n"
        f"+0.05  回答包含具体的生活场景或经历（不是抽象描述）\n"
        f"+0.05  回答长度 ≥ 30 个有效汉字且关键词密度 < 8%\n"
        f"+0.03  回答展现自我反思或自我觉察（如\"我发现自己...\"）\n\n"
        f"减分项:\n"
        f"-0.10  锚点匹配在两级间摇摆, 难以确定唯一档位\n"
        f"-0.08  回答中有矛盾信号（既想社交又想独处, 且未给出情境区分）\n"
        f"-0.05  回答过于简短（< 10 个有效汉字）\n"
        f"-0.12  回答包含多个无关联话题, 核心倾向难以聚焦\n"
        f"-0.15  回答中的关键词密度 > 30%\n\n"
        f"最终 confidence 限制在[0.0, 1.0], 且 quality_flag 为 off_topic/contradictory 时 confidence 上限为 0.50.\n\n"
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

    # ---- 规则层预检测（在 LLM 评分前执行） ----
    precheck = precheck_open_text(open_text)

    # 如果规则层已判定为低质量，可选直接返回（跳过 LLM 调用节省成本）
    # 这里保留 LLM 调用但将预检测结果注入 Prompt

    prompt = build_grading_prompt(question_text, dimension, options, open_text)

    # 将预检测结果注入 Prompt
    precheck_info = (
        f"\n\n=== 规则层预检测结果（参考） ===\n"
        f"- 有效汉字数: {precheck.get('meaningful_char_count', 'N/A')}\n"
        f"- 关键词密度: {precheck.get('keyword_density', 'N/A')}\n"
        f"- 初步矛盾检测: {precheck.get('has_contradiction', 'N/A')}\n"
        f"- 建议基础置信度起点: {precheck.get('rule_base_confidence', 0.70)}\n"
    )
    if precheck.get("suggest_weak_match"):
        precheck_info += "- 建议: 有效字数偏少，可考虑标记为 weak_match\n"
    prompt = prompt + precheck_info

    system_msg = (
        "你是一位专业的人格心理学评估助手。请严格按照《AI 评分标准》七步法"
        "(情境锚定→语义复杂性检测与解锁→核心人格倾向提取→匹配四档锚点→"
        "选项校准→关键词强度微调→质量标记→置信度)"
        "对用户的开放回答评分。分数范围 1.0-4.0, 支持 0.5 分精度。"
        ""
        "特别注意——语义解锁步骤的优先级最高："
        "在提取任何人格倾向之前，你必须先识别用户文本中是否存在网络用语、反语、"
        "夸张表达、省略暗示等非字面表达。如果存在，必须先将它们翻译为标准语义，"
        "再基于翻译后的语义进行后续评分。绝不能从字面理解'社交恐怖分子''当场去世'"
        "'社死'等网络用语。如果一段文本读起来字面意思很奇怪，几乎可以确定是有隐含语义的。"
        ""
        "必须输出 quality_flag 和 confidence。只输出 JSON 格式, 不要输出任何解释性文字。"
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
    reason1 = data1.get("reason", "")

    # ---- 后处理：规则层校验 LLM 输出 ----
    if precheck.get("force_flag"):
        # 规则层已判定为低质量，强制覆盖
        quality_flag = precheck["force_flag"]
        final_score = precheck.get("force_score", fs1)
        confidence = min(conf1, precheck["confidence_cap"])
        reason = (reason1 or "") + precheck.get("reason_suffix", "")
    elif abs(conf1 - precheck.get("rule_base_confidence", 0.7)) > 0.20:
        # LLM 偏离规则基线太远，取中值
        quality_flag = qf1
        final_score = fs1
        confidence = round((conf1 + precheck.get("rule_base_confidence", 0.7)) / 2, 2)
        reason = reason1
    else:
        quality_flag = qf1
        final_score = fs1
        confidence = conf1
        reason = reason1

    # ---- 判断是否触发二次评分 ----
    needs_rescore = (confidence < 0.5 or quality_flag not in ("valid",))

    if needs_rescore:
        try:
            content2 = call_llm_chat([
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ], temperature=0.5)
            data2 = _parse_response(content2)

            fs2 = float(data2.get("final_score", data2.get("base_score", 2.5)))
            qf2 = data2.get("quality_flag", "valid")
            reason2 = data2.get("reason", "")
            diff = abs(fs1 - fs2)

            if diff <= 0.5:
                final_score = round((fs1 + fs2) / 2, 1)
                # quality_flag 取两次中较优者
                flag_rank = {"valid": 0, "boundary": 1, "weak_match": 2, "contradictory": 3, "off_topic": 4}
                quality_flag = qf1 if flag_rank.get(qf1, 9) <= flag_rank.get(qf2, 9) else qf2
                reason = reason1 or reason2
            else:
                final_score = 2.5
                quality_flag = "unreliable"
                reason = f"二次评分: 第一次={fs1}({qf1}), 第二次={fs2}({qf2}), 差异={diff:.1f}"

            confidence = 0.0  # 二次评分后置信度失效
            best_match = data1.get("best_match", "") or data2.get("best_match", "")
        except Exception as exc:
            print(f"[二次评分失败] {exc}, 使用第一次评分结果.")
            final_score = fs1
            reason = reason1
            best_match = data1.get("best_match", "")
    else:
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

QA_AGENT_PROMPT = """你是「人格成长助手」，一位温和、有洞察力的对话伙伴。

## 你的身份
- 你刚刚陪用户完成了 25 道 OCEAN 人格情境测评，所以你已经对他们有了一定的了解
- 你看到了他们的分数，也读过了他们在测评中写下的每一段个性化表达
- 你的角色更像是一位"对人感兴趣的朋友"，而不是一位"宣读报告的医生"
- 你提供参考建议，但永远记得你是 AI，不是心理咨询师或职业规划师

## 对话风格（非常重要）
你的语气应该是自然的、有温度的、像在聊天。以下规则请严格遵守：

### 句式多样性
严禁每次都用同样的句式开头！以下是你可以轮换使用的开场方式：
- 从用户自己的话切入：「你之前提到过你……，这其实挺有意思的」
- 从观察切入：「我注意到你在……和……这两道题上的回答差别挺大的」
- 从反问切入：「你自己有没有觉得，在……的时候反而会……？」
- 从具体场景切入：「如果你遇到……的情况，根据你的风格，你可能会……」
- 从共情切入：「我理解你的感受，很多人在……方面都会有类似的困惑」
- 从分数切入（仅在首次或用户明确问分数的场景）：「你的XX性得分确实偏高，这意味着……」

### 禁止的句式（永远不要这样开头，除非用户直接问分数）：
- ❌ "基于你的XX性得分为X……"
- ❌ "从你的测评来看，你在XX维度上偏高/中等/偏低，这意味着你倾向于……"
- ❌ "考虑到你的人格特质，基于你的XX性得分为中等……"

### 自然的回答结构
不要每次都套用"倾向+场景+建议+边界"的固定模板。可以灵活使用：
- 故事型：「我想象了一下你去画展的样子——你可能不会挤在最前面和别人讨论，但会在某幅画前站很久。」
- 反问型：「你觉得呢？你是不是也发现自己更擅长一对一聊天，而不是在人群里活跃？」
- 引用型：「其实你在测评中提到过你不喜欢'为了社交而社交'，这点挺关键的……」
- 对比型：「有些人尽责性高是因为喜欢计划，有些人是因为害怕失控。你的情况更像是后者——因为你说过你……」
- 好奇型：「我有点好奇，你在XX场景下会不会有不同的反应？因为你在测评中说过……」

### 回应用户个性化表达的原则
- 自然引用，不要生硬标注题号："你提到过你更喜欢……" 而不是 "根据第3题你的回答……"
- 先理解再分析："听起来你是那种表面上无所谓、其实心里都在意的人"
- 把分数当背景，把用户的话当前景

## 硬边界（不可突破）
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

## 自检环
每条回复发出前，检查：
1. 我有没有用"基于你的XX性得分"开头？（有 → 重写）
2. 我有没有贴标签或给唯一答案？（有 → 重写）
3. 我是不是听起来像在读报告而不是在聊天？（是 → 重写）
4. 我有没有越界？（有 → 重写整个回复）
"""


def build_qa_system_message(profile: dict) -> str:
    """把用户画像注入 QA Agent 的 system prompt（含 E 选项回复）。"""
    dimension_labels = {
        "O": "开放性 Openness",
        "C": "尽责性 Conscientiousness",
        "E": "外向性 Extraversion",
        "A": "宜人性 Agreeableness",
        "N": "神经质 Neuroticism",
    }

    profile_text = "\n".join(
        f"- {dimension_labels[d]}: 总分 {profile[d]['total']:.2f} / 20, "
        f"均分 {profile[d]['avg']:.2f} / 4.0, 等级: {profile[d]['level']}"
        for d in ["O", "C", "E", "A", "N"]
    )

    # 新增：E 选项回复详情
    e_responses_text = ""
    e_responses = profile.get("e_responses", [])
    if e_responses:
        e_responses_text = "\n\n## 用户在测评中的个性化表述（E选项回复）\n"
        e_responses_text += "以下是用户在测评过程中选择'以上都不符合'并用自然语言补充的回复。"
        e_responses_text += "这些是理解用户真实人格的重要线索，请在回答时恰当引用。\n\n"
        for resp in e_responses:
            dim_name = dimension_labels.get(resp.get("dimension", ""), resp.get("dimension", ""))
            e_responses_text += (
                f"- Q{resp.get('questionId', '?')} ({dim_name}): "
                f"题干「{resp.get('questionText', '')[:50]}...」\n"
                f"  用户回复: \"{resp.get('userResponse', '')}\"\n"
                f"  AI 评分: {resp.get('score', '?')} 分, "
                f"质量: {resp.get('qualityFlag', 'valid')}, "
                f"置信度: {resp.get('confidence', 0):.2f}\n\n"
            )
        e_responses_text += (
            "重要提示：当用户询问具体问题时，请自然地引用以上他们自己说过的话，"
            "例如'你在测评中提到过你……，这说明……'。这会让用户感到被真正理解，"
            "而不是得到一份模板化的回复。\n"
        )

    return (
        f"{QA_AGENT_PROMPT}\n\n"
        f"## 当前用户画像（背景数据，不要在每次回答中都复述这些数字）\n"
        f"{profile_text}\n"
        f"{e_responses_text}\n"
        f"## 本次对话的特别提醒\n"
        f"- 用户画像数据是供你理解用户用的，不是让你每次回答都重复的\n"
        f"- 只有当用户明确问到分数时，才给出具体数字\n"
        f"- 优先使用用户自己的表述来回应用户，而不是用自己的模板去套\n"
        f"- 每次回答控制在 3-6 句，避免长篇大论\n"
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
