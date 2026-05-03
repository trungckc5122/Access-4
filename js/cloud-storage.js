// js/cloud-storage.js
import { supabase, getCurrentUser, parseStorageKey } from './supabase-client.js';

export class CloudStorage {

  // ─────────────────────────────────────────────
  // SAVE PROGRESS (draft hoặc completed)
  // Gọi thay cho: localStorage.setItem(key, JSON.stringify(data))
  // ─────────────────────────────────────────────
  static async save(localStorageKey, data) {
    // 1. Luôn lưu localStorage trước (offline fallback)
    try { localStorage.setItem(localStorageKey, JSON.stringify(data)); } catch {}

    // 2. Nếu đã đăng nhập → sync lên Supabase
    const user = await getCurrentUser();
    if (!user) return { synced: false };

    const params = parseStorageKey(localStorageKey);
    if (!params) return { synced: false };

    const isDraft     = localStorageKey.endsWith('_draft');
    const isHighlight = localStorageKey.endsWith('_highlights');
    const isNote      = localStorageKey.endsWith('_note');

    const upsertData = {
      user_id: user.id,
      ...params,
      updated_at: new Date().toISOString()
    };

    if (isDraft)          upsertData.answers = data;
    else if (isHighlight) upsertData.highlights = data;
    else if (isNote)      upsertData.note = typeof data === 'string' ? data : JSON.stringify(data);
    else {
      // completed result: { answers, score, total }
      upsertData.status       = 'completed';
      upsertData.answers      = data.answers || data;
      upsertData.score        = data.score;
      upsertData.total        = data.total;
      upsertData.submitted_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('progress')
      .upsert(upsertData, {
        onConflict: 'user_id,exam,skill,book,test,part'
      });

    return { synced: !error, error };
  }

  // ─────────────────────────────────────────────
  // LOAD PROGRESS
  // Ưu tiên: Supabase (nếu đăng nhập) → localStorage (fallback)
  // ─────────────────────────────────────────────
  static async load(localStorageKey) {
    // Thử load từ Supabase trước
    const user = await getCurrentUser();
    if (user) {
      const params = parseStorageKey(localStorageKey);
      if (params) {
        const { data, error } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('exam', params.exam)
          .eq('skill', params.skill)
          .eq('book', params.book)
          .eq('test', params.test)
          .eq('part', params.part)
          .single();

        if (!error && data) {
          const isDraft     = localStorageKey.endsWith('_draft');
          const isHighlight = localStorageKey.endsWith('_highlights');
          const isNote      = localStorageKey.endsWith('_note');

          if (isDraft)          return data.answers;
          if (isHighlight)      return data.highlights;
          if (isNote)           return data.note;
          return {
            answers: data.answers,
            score:   data.score,
            total:   data.total,
            status:  data.status
          };
        }
      }
    }

    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(localStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return localStorage.getItem(localStorageKey);
    }
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  static async remove(localStorageKey) {
    localStorage.removeItem(localStorageKey);

    const user = await getCurrentUser();
    if (!user) return;

    const params = parseStorageKey(localStorageKey);
    if (!params) return;

    // Reset field tương ứng thay vì xóa cả row
    const isHighlight = localStorageKey.endsWith('_highlights');
    const isNote      = localStorageKey.endsWith('_note');

    if (isHighlight) {
      await supabase.from('progress')
        .update({ highlights: null })
        .eq('user_id', user.id)
        .eq('exam', params.exam).eq('skill', params.skill)
        .eq('book', params.book).eq('test', params.test).eq('part', params.part);
    } else if (isNote) {
      await supabase.from('progress')
        .update({ note: null })
        .eq('user_id', user.id)
        .match(params);
    } else {
      // Xóa hẳn row
      await supabase.from('progress')
        .delete()
        .eq('user_id', user.id)
        .match({ ...params });
    }
  }

  // ─────────────────────────────────────────────
  // MIGRATE: Đẩy toàn bộ localStorage cũ lên Supabase
  // Gọi 1 lần sau khi user đăng nhập lần đầu
  // ─────────────────────────────────────────────
  static async migrateLocalStorageToCloud() {
    const user = await getCurrentUser();
    if (!user) return 0;

    const examPrefixes = ['pet_reading_', 'pet_listening_', 'ket_reading_', 'ket_listening_'];
    const keysToMigrate = Object.keys(localStorage).filter(k =>
      examPrefixes.some(p => k.startsWith(p))
    );

    let migrated = 0;
    for (const key of keysToMigrate) {
      try {
        const value = localStorage.getItem(key);
        await CloudStorage.save(key, JSON.parse(value));
        migrated++;
      } catch {}
    }

    // Đánh dấu đã migrate
    localStorage.setItem('_cloud_migrated_' + user.id, '1');
    console.log(`[CloudStorage] Migrated ${migrated} items for ${user.email}`);
    return migrated;
  }

  static async shouldMigrate() {
    const user = await getCurrentUser();
    if (!user) return false;
    return !localStorage.getItem('_cloud_migrated_' + user.id);
  }
}
