import { Sparkles } from 'lucide-react';
import type { AssessmentResults } from '@/types';
import { computeArchetype, computeTotalScore, generateOverallPortrait } from '@/lib/dimensionData';
import { Button } from '@/components/ui/Button';

interface HeroSectionProps {
  results: AssessmentResults;
  summary: string;
  onRestart: () => void;
}

export function HeroSection({ results, summary, onRestart }: HeroSectionProps) {
  const archetype = computeArchetype(results);
  const totalScore = computeTotalScore(results);

  const handleScrollToOverview = () => {
    document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyData = () => {
    const profile = {
      测评时间: new Date().toLocaleString('zh-CN'),
      整体画像: generateOverallPortrait(results),
      各维度分数: {
        开放性: { 总分: results.O.total, 均分: results.O.avg, 等级: results.O.level },
        尽责性: { 总分: results.C.total, 均分: results.C.avg, 等级: results.C.level },
        外向性: { 总分: results.E.total, 均分: results.E.avg, 等级: results.E.level },
        宜人性: { 总分: results.A.total, 均分: results.A.avg, 等级: results.A.level },
        神经质: { 总分: results.N.total, 均分: results.N.avg, 等级: results.N.level },
      },
    };
    navigator.clipboard.writeText(JSON.stringify(profile, null, 2)).then(() => {
      alert('画像数据已复制，可以粘贴到画像答疑 Agent 中继续提问。');
    }).catch(() => {
      alert('复制失败，请手动复制。');
    });
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="max-w-4xl mx-auto text-center">
        {/* Welcome badge */}
        <div className="hero-fade inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
          <Sparkles className="w-4 h-4 text-brand-primary" />
          <span className="text-sm font-medium text-gray-600">测评完成</span>
        </div>

        {/* Main title */}
        <h1 className="hero-fade hero-fade-delay-1 text-4xl md:text-6xl font-bold text-gray-800 leading-tight mb-6">
          今天，我们重新认识了一次自己
        </h1>

        {/* Subtitle */}
        <p className="hero-fade hero-fade-delay-2 text-xl md:text-2xl text-gray-500 font-light leading-relaxed mb-12">
          人格不是标签，<br className="md:hidden" />
          而是理解自己的起点
        </p>

        {/* Portrait Card */}
        <div className="hero-fade hero-fade-delay-3 max-w-xl mx-auto mb-12">
          <div className="glass rounded-3xl p-8 md:p-10 card-float animate-float relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-primary/10 to-brand-auxiliary/10 rounded-full -mr-10 -mt-10 blur-2xl" />

            <div className="relative z-10">
              <p className="text-sm text-gray-500 mb-2">你的综合画像</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">{archetype}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{summary}</p>

              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-primary">{totalScore}</p>
                  <p className="text-xs text-gray-400">综合得分</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-auxiliary">5</p>
                  <p className="text-xs text-gray-400">维度</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="hero-fade hero-fade-delay-4 flex flex-wrap items-center justify-center gap-3 mb-10">
          <Button variant="secondary" icon={<RotateCcwIcon />} onClick={onRestart}>
            重新测评
          </Button>
          <Button variant="secondary" icon={<PrinterIcon />} onClick={() => window.print()}>
            打印报告
          </Button>
          <Button variant="primary" icon={<CopyIcon />} onClick={handleCopyData}>
            复制数据
          </Button>
        </div>

        {/* CTA */}
        <div className="hero-fade hero-fade-delay-4">
          <Button
            variant="primary"
            size="lg"
            iconRight={<ArrowDownIcon />}
            onClick={handleScrollToOverview}
          >
            开始查看报告
          </Button>
        </div>
      </div>
    </section>
  );
}

// Simple inline SVG icons to avoid extra dependencies
function RotateCcwIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}
