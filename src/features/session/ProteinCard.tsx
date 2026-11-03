/**
 * 運動後のたんぱく質の目安（要件定義書 3.4.1、F-REC-14、基本設計書 5.11）。
 */
import { IconMilk } from '@tabler/icons-react';
import { calcProtein, PROTEIN_BASE_PER_KG } from '../../domain/protein';
import type { Session } from '../../domain/types';
import { Card, Sub } from '../../ui/Card';
import styles from '../page.module.css';

export function ProteinCard({ session }: { session: Session }) {
  const result = calcProtein(session.weightKg, session.kcal, session.categoryIds);

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconMilk size={20} aria-hidden="true" />
          運動後のたんぱく質の目安
        </span>
      }
    >
      {result.grams > 0 ? (
        <p>
          <span className={styles.bigNumber}>{result.grams}</span> g
        </p>
      ) : (
        <p>
          <span className={styles.bigNumber}>0</span> g（摂取不要）
        </p>
      )}
      {result.partCoefficient > 0 ? (
        <Sub>
          体重 {session.weightKg.toFixed(1)}kg × {PROTEIN_BASE_PER_KG} × 部位係数{' '}
          {result.partCoefficient.toFixed(2)} × カロリー係数 {result.calorieCoefficient.toFixed(2)} ＝{' '}
          {result.exactGrams.toFixed(1)}g を、10g単位に四捨五入しています。
        </Sub>
      ) : (
        <Sub>ケア系（ストレッチなど）だけのため、運動後のたんぱく質の補給は不要としています。</Sub>
      )}
      <Sub>
        たんぱく質そのものの量です。プロテイン粉末には、たんぱく質が7〜8割ほど含まれるため、商品の表示（1杯あたりのたんぱく質量）を見て量を調整してください。一般的な目安であり、医学的・栄養学的な助言ではありません。
      </Sub>
    </Card>
  );
}
