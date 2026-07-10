import type { AssessmentResults, DimensionCode, DimensionMeta, LevelProfile } from '@/types';
import { LevelBadge } from '@/components/ui/Badge';
import { dimensionData } from '@/lib/dimensionData';
import { DIMENSION_GRADIENTS } from '@/theme';
import {
  Compass,
  ClipboardList,
  Zap,
  HeartHandshake,
  Waves,
  Info,
  School,
  Gift,
  CloudMoon,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  compass: Compass,
  'clipboard-list': ClipboardList,
  zap: Zap,
  'heart-handshake': HeartHandshake,
  waves: Waves,
};

interface DimensionDetailCardProps {
  dimCode: DimensionCode;
  result: AssessmentResults[DimensionCode];
  index: number;
  isActive: boolean;
}

export function DimensionDetailCard({
  dimCode,
  result,
  index,
  isActive,
}: DimensionDetailCardProps) {
  const dim = dimensionData[dimCode];
  const profile = dim.levels[result.level];
  const Icon = iconMap[dim.icon] || Compass;

  return (
    <div
      className={`w-full flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.96]'}`}
    >
      <div className="glass rounded-3xl p-6 md:p-10 mx-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${dim.color}15` }}
            >
              <Icon className="w-6 h-6" style={{ color: dim.color }} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {dim.name}{' '}
                <span className="text-base font-normal text-gray-400">{dim.nameEn}</span>
              </h3>
              <p className="text-sm text-gray-500">维度 {index + 1} / 5</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LevelBadge level={result.level} />
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: dim.color }}>
                {result.total.toFixed(1)}
              </p>
              <p className="text-xs text-gray-400">总分 / 20</p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="mb-8">
          <p className="text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed">
            {profile.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-white/60 rounded-2xl p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Info className="w-4 h-4 text-brand-primary" />
                这个维度在说什么
              </h4>
              <p className="text-gray-600 leading-relaxed text-sm">{profile.definition}</p>
            </div>

            <div className="bg-white/60 rounded-2xl p-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <School className="w-4 h-4 text-brand-primary" />
                在大学生活里
              </h4>
              <ul className="space-y-2">
                {profile.campus.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: dim.color }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="rounded-2xl p-5 bg-brand-auxiliary/10">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-auxiliary mb-2">
                <Gift className="w-4 h-4" />
                礼物
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.gifts}</p>
            </div>

            <div className="rounded-2xl p-5 bg-brand-warm/10">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-warm mb-2">
                <CloudMoon className="w-4 h-4" />
                阴影
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.shadows}</p>
            </div>

            <div className="rounded-2xl p-5 border border-brand-primary/20 bg-brand-primary/5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-primary mb-2">
                <Lightbulb className="w-4 h-4" />
                一个小提醒
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed italic">{profile.tip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
