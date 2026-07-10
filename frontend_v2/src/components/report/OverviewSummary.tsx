import type { AssessmentResults } from '@/types';
import { computeArchetype, computeTotalScore, getKeywords } from '@/lib/dimensionData';
import { TagPill } from '@/components/ui/Badge';
import { KEYWORD_COLORS } from '@/theme';
import { Sparkles } from 'lucide-react';

interface OverviewSummaryProps {
  results: AssessmentResults;
  summary: string;
}

export function OverviewSummary({ results, summary }: OverviewSummaryProps) {
  const archetype = computeArchetype(results);
  const totalScore = computeTotalScore(results);
  const keywords = getKeywords(results);

  return (
    <div className="glass rounded-3xl p-8">
      <p className="text-sm text-gray-500 mb-2">你是一位</p>
      <h3 className="text-3xl font-bold text-gray-800 mb-4">{archetype}</h3>
      <p className="text-gray-600 leading-relaxed mb-6">{summary}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {keywords.map((kw, i) => (
          <TagPill key={i} className={KEYWORD_COLORS[i % KEYWORD_COLORS.length]}>
            {kw}
          </TagPill>
        ))}
      </div>

      <div className="bg-gradient-to-r from-brand-primary/10 to-brand-auxiliary/10 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">总体评分</p>
            <p className="text-3xl font-bold text-brand-primary">{totalScore}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-brand-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
