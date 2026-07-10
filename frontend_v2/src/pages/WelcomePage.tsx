import { Button } from '@/components/ui/Button';
import { RedLineWarning } from '@/components/assessment/AssessmentComponents';
import { useAppContext } from '@/hooks/useAppContext';
import { ArrowRight } from 'lucide-react';

export function WelcomePage() {
  const { startAssessment } = useAppContext();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <h1 className="text-center text-3xl md:text-4xl font-bold text-white mb-2">
          OCEAN 人格情境测评
        </h1>
        <p className="text-center text-white/80 text-sm mb-8">
          25 道情境题 · 选项不符可用自然语言补充 · 结果仅供参考
        </p>

        {/* Main Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="leading-relaxed text-gray-600 mb-6">
            <p>
              欢迎来到人格测评补充说明 Agent。本测评包含 25 道情境选择题，每题有
              A/B/C/D/E 五个选项：
            </p>
            <ul className="my-3 ml-6 space-y-2">
              <li>
                <strong>A</strong>：非常符合 / 强烈倾向
              </li>
              <li>
                <strong>B</strong>：比较符合 / 一般倾向
              </li>
              <li>
                <strong>C</strong>：不太符合 / 轻微倾向
              </li>
              <li>
                <strong>D</strong>：很不符合 / 没有倾向
              </li>
              <li>
                <strong>E</strong>：以上都不符合，我想自己说明
              </li>
            </ul>
            <p>
              如果你选择 E，请用一句话描述你在该情境下的真实反应。系统会按评分标准对补充说明赋分。
            </p>
          </div>

          <RedLineWarning>
            <strong>重要提示：</strong>{' '}
            本测评结果仅供自我理解参考，不诊断任何心理疾病，不替代专业心理咨询。如果你在测评过程中出现自伤、自杀或伤害他人的念头，请立即停止并联系专业人士：全国 24
            小时心理援助热线 400-161-9995。
          </RedLineWarning>

          <div className="flex justify-end mt-6">
            <Button
              size="lg"
              iconRight={<ArrowRight className="w-5 h-5" />}
              onClick={startAssessment}
            >
              开始测评
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
