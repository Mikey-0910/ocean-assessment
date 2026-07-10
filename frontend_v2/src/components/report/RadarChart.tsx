import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { AssessmentResults, DimensionCode } from '@/types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarChartProps {
  results: AssessmentResults;
  activeDimensionIndex: number;
}

export function RadarChart({ results, activeDimensionIndex }: RadarChartProps) {
  const labels = ['开放性', '尽责性', '外向性', '宜人性', '神经质'];
  const dims: DimensionCode[] = ['O', 'C', 'E', 'A', 'N'];
  const data = dims.map((d) => results[d].total);

  const pointColors = data.map((_, i) =>
    i === activeDimensionIndex ? '#4A88D8' : 'rgba(74, 136, 216, 0.5)'
  );
  const pointRadii = data.map((_, i) => (i === activeDimensionIndex ? 8 : 4));

  const chartData = {
    labels,
    datasets: [
      {
        label: '你的得分',
        data,
        backgroundColor: 'rgba(74, 136, 216, 0.18)',
        borderColor: '#4A88D8',
        borderWidth: 2,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: pointRadii,
        pointHoverRadius: 10,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        min: 5,
        max: 20,
        ticks: {
          stepSize: 5,
          backdropColor: 'transparent',
          color: '#9CA3AF',
          font: { size: 11 },
        },
        grid: {
          color: 'rgba(74, 136, 216, 0.08)',
        },
        angleLines: {
          color: 'rgba(74, 136, 216, 0.1)',
        },
        pointLabels: {
          font: { size: 13, weight: 'normal' },
          color: '#6B7280',
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      <Radar data={chartData} options={options} />
    </div>
  );
}
