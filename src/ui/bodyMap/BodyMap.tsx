/**
 * 人体図（前面・背面）（要件定義書 F-BODY-01、02、04、デザイン仕様書 8章）。
 * 部位ごとに色を付け、onSelect を渡すと部位をタップ（またはキーボードで選択）できる。
 */
import type { KeyboardEvent } from 'react';
import type { BodyRegionId } from '../../domain/types';
import { BODY_BACK, BODY_FRONT, type BodySide } from './bodyPaths';
import { REGION_NAMES } from './regionNames';
import styles from './BodyMap.module.css';

interface BodyMapProps {
  /** 部位の塗りの色（CSSの色の値）。色を付けない部位は undefined を返す */
  colorOf: (region: BodyRegionId) => string | undefined;
  /** 画面読み上げ用に、部位の状態を文字で返す（例：「疲労中、あと38時間」） */
  describe?: (region: BodyRegionId) => string;
  selectedRegion?: BodyRegionId | null;
  onSelect?: (region: BodyRegionId) => void;
  /** small：記録の詳細などに小さく表示する */
  size?: 'normal' | 'small';
}

export function BodyMap({ colorOf, describe, selectedRegion, onSelect, size = 'normal' }: BodyMapProps) {
  return (
    <div className={size === 'small' ? `${styles.map} ${styles.small}` : styles.map}>
      <Side side={BODY_FRONT} label="前面" {...{ colorOf, describe, selectedRegion, onSelect }} />
      <Side side={BODY_BACK} label="背面" {...{ colorOf, describe, selectedRegion, onSelect }} />
    </div>
  );
}

function Side({
  side,
  label,
  colorOf,
  describe,
  selectedRegion,
  onSelect,
}: Omit<BodyMapProps, 'size'> & { side: BodySide; label: string }) {
  return (
    <figure className={styles.side}>
      <svg viewBox={side.viewBox} className={styles.svg} role="group" aria-label={`人体図（${label}）`}>
        <path d={side.outline} className={styles.outline} />
        {side.shapes.map((shape, index) => {
          const region = shape.region;
          const fill = region ? colorOf(region) : undefined;
          const paths = shape.paths.map((d) => <path key={d} d={d} />);

          // 色を付けない部分（手・足・すねなど）は、押せないただの形として描く
          if (!region) {
            return (
              <g key={index} className={styles.base}>
                {paths}
              </g>
            );
          }

          const name = REGION_NAMES[region];
          const description = describe ? `${name}：${describe(region)}` : name;
          const isSelected = selectedRegion === region;
          // SVGの中には button 要素を置けないため、g 要素に role="button" を付けてキーボードでも押せるようにする
          const interactive = onSelect
            ? {
                role: 'button',
                tabIndex: 0,
                'aria-pressed': isSelected,
                onClick: () => onSelect(region),
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(region);
                  }
                },
              }
            : {};
          return (
            <g
              key={index}
              className={[styles.region, onSelect ? styles.clickable : '', isSelected ? styles.selected : '']
                .filter(Boolean)
                .join(' ')}
              style={fill ? { fill } : undefined}
              aria-label={description}
              {...interactive}
            >
              <title>{description}</title>
              {paths}
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
}
