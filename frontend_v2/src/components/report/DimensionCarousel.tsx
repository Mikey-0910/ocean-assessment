import { useState, useCallback } from 'react';
import type { AssessmentResults, DimensionCode } from '@/types';
import { DimensionDetailCard } from '@/components/report/DimensionDetailCard';
import { useSwipe } from '@/hooks/useScrollReveal';
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';

interface DimensionCarouselProps {
  results: AssessmentResults;
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

const DIMS: DimensionCode[] = ['O', 'C', 'E', 'A', 'N'];
const COUNT = DIMS.length;

export function DimensionCarousel({
  results,
  activeIndex,
  onIndexChange,
}: DimensionCarouselProps) {
  const goTo = useCallback(
    (i: number) => {
      onIndexChange(Math.max(0, Math.min(COUNT - 1, i)));
    },
    [onIndexChange]
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  const swipeHandlers = useSwipe(goNext, goPrev);

  return (
    <div className="relative" {...swipeHandlers}>
      {/* Carousel Track */}
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {DIMS.map((dim, i) => (
            <DimensionDetailCard
              key={dim}
              dimCode={dim}
              result={results[dim]}
              index={i}
              isActive={i === activeIndex}
            />
          ))}
        </div>
      </div>

      {/* Arrows - Desktop */}
      <button
        onClick={goPrev}
        className="absolute left-0 md:-left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass
          flex items-center justify-center text-gray-600 hover:text-brand-primary hover:shadow-lift
          transition-all z-20 hidden md:flex disabled:opacity-30"
        disabled={activeIndex === 0}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-0 md:-right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass
          flex items-center justify-center text-gray-600 hover:text-brand-primary hover:shadow-lift
          transition-all z-20 hidden md:flex disabled:opacity-30"
        disabled={activeIndex === COUNT - 1}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {DIMS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${
              i === activeIndex
                ? 'bg-brand-primary w-6 h-2.5'
                : 'bg-gray-300 hover:bg-gray-400 w-2.5 h-2.5'
            }`}
            aria-label={`切换到第 ${i + 1} 个维度`}
          />
        ))}
      </div>

      {/* Mobile swipe hint */}
      <p className="md:hidden text-center text-sm text-gray-400 mt-4 flex items-center justify-center gap-1">
        <ArrowLeftRight className="w-4 h-4" />
        左右滑动切换维度
      </p>
    </div>
  );
}
