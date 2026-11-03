/**
 * IndexedDBの定義（基本設計書 4.1〜4.4）。
 * データベースの読み書きは db/ の中だけで行い、画面から直接 Dexie を操作しないこと。
 */
import Dexie, { type EntityTable } from 'dexie';
import type {
  ActiveSession,
  Category,
  Exercise,
  MetaRecord,
  Session,
  Settings,
  SorenessLog,
  WeightLog,
} from '../domain/types';

/**
 * データベース名。同じドメイン（ryotasg24.github.io）のほかのサイトと衝突しないよう、
 * このアプリ専用の接頭辞 dat- を付ける（要件定義書 7.1）。
 */
export const DB_NAME = 'dat-training';

/** 現在のデータ形式の版。stores を変えたら1つ上げ、upgrade で移行処理を書くこと（4.4） */
export const SCHEMA_VERSION = 1;

export class TrainingDb extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  sorenessLogs!: EntityTable<SorenessLog, 'id'>;
  weightLogs!: EntityTable<WeightLog, 'id'>;
  settings!: EntityTable<Settings, 'key'>;
  activeSession!: EntityTable<ActiveSession, 'key'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor(name: string = DB_NAME) {
    super(name);
    // 最初の項目が主キー、2番目以降が索引（検索を速くする項目）
    this.version(1).stores({
      sessions: 'id, localDate, startAt, deleted',
      categories: 'id',
      exercises: 'id, categoryId',
      sorenessLogs: 'id, [sessionId+categoryId]',
      weightLogs: 'id, date',
      settings: 'key',
      activeSession: 'key',
      meta: 'key',
    });
  }

  /** バックアップと復元の対象になる全テーブル */
  get dataTables() {
    return [
      this.sessions,
      this.categories,
      this.exercises,
      this.sorenessLogs,
      this.weightLogs,
      this.settings,
      this.activeSession,
    ];
  }
}

/** アプリ全体で使うデータベース */
export const db = new TrainingDb();
