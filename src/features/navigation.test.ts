import { describe, expect, it } from 'vitest';
import { decideTransition } from './navigation';

describe('decideTransition（画面遷移の種類）', () => {
  it('最初の表示と、同じ画面はフェード', () => {
    expect(decideTransition(null, '/', 'POP')).toBe('fade');
    expect(decideTransition('/stats', '/stats', 'PUSH')).toBe('fade');
  });

  it('タブの移動は、並びの向きで左右を決める（戻る操作でも）', () => {
    expect(decideTransition('/', '/stats', 'PUSH')).toBe('tabForward');
    expect(decideTransition('/settings', '/calendar', 'PUSH')).toBe('tabBack');
    expect(decideTransition('/stats', '/', 'POP')).toBe('tabBack');
  });

  it('詳しい画面へ進むと右から、戻ると左から', () => {
    expect(decideTransition('/calendar', '/session/abc', 'PUSH')).toBe('push');
    expect(decideTransition('/session/abc', '/calendar', 'POP')).toBe('pop');
    expect(decideTransition('/settings', '/settings/exercises', 'PUSH')).toBe('push');
  });

  it('メニューの選択と手入力は下から', () => {
    expect(decideTransition('/', '/session/plan', 'PUSH')).toBe('sheet');
    expect(decideTransition('/calendar', '/session/new', 'PUSH')).toBe('sheet');
  });

  it('置き換え（計測の開始・保存のあとなど）はフェード', () => {
    expect(decideTransition('/session/plan', '/session/active', 'REPLACE')).toBe('fade');
    expect(decideTransition('/session/x/done', '/', 'REPLACE')).toBe('fade');
  });
});
