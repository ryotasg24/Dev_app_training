/**
 * 推移のグラフ：マーカー付きの折れ線グラフ（データラベル付き）（デザイン仕様書 7.6）。
 * データラベルは、外部のプラグインを入れずに、Chart.js の描画の仕組みで点の上に値を書く。
 */
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
  type ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

interface TrendChartProps {
  labels: string[];
  values: number[];
  /** ツールチップに出す単位（例：日、分、kcal） */
  unit: string;
}

/** CSS変数の色を読む（ダークモードに合わせるため） */
function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** #RRGGBB を、透明度つきの rgba() にする（キャンバスの塗りに使う） */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** 点の上に値を書くプラグイン。0の点には書かない（線が込み合わないように） */
function dataLabelPlugin(color: string, fontSize: number): Plugin<'line'> {
  return {
    id: 'pointValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0]?.data ?? [];
      ctx.save();
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      meta.data.forEach((point, i) => {
        const value = data[i];
        if (typeof value !== 'number' || value === 0) return;
        ctx.fillText(value.toLocaleString('ja-JP'), point.x, point.y - 8);
      });
      ctx.restore();
    },
  };
}

export function TrendChart({ labels, values, unit }: TrendChartProps) {
  const lineColor = cssColor('--color-primary-strong');
  const fillColor = cssColor('--color-primary');
  const surface = cssColor('--color-surface');
  const textColor = cssColor('--color-text-sub');
  const labelColor = cssColor('--color-text');
  const gridColor = cssColor('--color-border');
  // 点が多い（月の30日分など）ときは、点と文字を小さくする
  const dense = values.length > 12;

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    // 点の上のラベルが上端で切れないように、余白を取る
    layout: { padding: { top: 24, left: 4, right: 8 } },
    animation: { duration: 500, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: labelColor,
        titleColor: surface,
        bodyColor: surface,
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: { label: (item) => `${item.formattedValue} ${unit}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: textColor,
          maxRotation: 0,
          // 週（7点）は日付をすべて出す。点が多いときは、重ならないように間引く
          autoSkip: values.length > 7,
          autoSkipPadding: 12,
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grace: '15%',
        border: { display: false },
        grid: { color: withAlpha(gridColor, 0.7) },
        ticks: { color: textColor, precision: 0, maxTicksLimit: 5, font: { size: 11 } },
      },
    },
  };

  return (
    <Line
      options={options}
      plugins={[dataLabelPlugin(labelColor, dense ? 10 : 12)]}
      data={{
        labels,
        datasets: [
          {
            data: values,
            borderColor: lineColor,
            borderWidth: 2.5,
            tension: 0.35,
            // 値が急に変わっても、曲線が0より下や点より上にはみ出さないようにする
            cubicInterpolationMode: 'monotone',
            fill: true,
            // 線の下を、上から下へ薄くなる淡緑色で塗る
            backgroundColor: (context: ScriptableContext<'line'>) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return withAlpha(fillColor, 0.3);
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, withAlpha(fillColor, 0.6));
              gradient.addColorStop(1, withAlpha(fillColor, 0));
              return gradient;
            },
            pointRadius: dense ? 2.5 : 4,
            pointHoverRadius: dense ? 5 : 7,
            pointBackgroundColor: surface,
            pointBorderColor: lineColor,
            pointBorderWidth: 2,
          },
        ],
      }}
    />
  );
}
