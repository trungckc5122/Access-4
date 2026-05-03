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
    const isSubmitted = localStorageKey.endsWith('_submitted');

    const upsertData = {
      user_id: user.id,
      ...params,
      updated_at: new Date().toISOString()
    };

    if (isDraft)          upsertData.answers = data;
    else if (isHighlight) upsertData.highlights = data;
    else if (isNote)      upsertData.note = typeof data === 'string' ? data : JSON.stringify(data);
    else if (isSubmitted) {
      upsertData.status       = 'completed';
      upsertData.answers      = data.answers || data;
      upsertData.score        = data.score  ?? data.correctCount  ?? null;
      upsertData.total        = data.total  ?? data.totalQuestions ?? null;
      upsertData.submitted_at = new Date().toISOString();
    }
    else {
      // completed result cũ hoặc result từ dashboard
      upsertData.status       = 'completed';
      upsertData.answers      = data.answers || data;
      upsertData.score        = data.score  ?? data.correctCount;
      upsertData.total        = data.total  ?? data.totalQuestions;
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
            answers:        data.answers,
            score:          data.score,
            total:          data.total,
            correctCount:   data.score,
            totalQuestions: data.total,
            status:         data.status
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

    const isHighlight = localStorageKey.endsWith('_highlights');
    const isNote      = localStorageKey.endsWith('_note');
    const isDraft     = localStorageKey.endsWith('_draft');

    const matchClause = {
      user_id: user.id,
      exam:    params.exam,
      skill:   params.skill,
      book:    params.book,
      test:    params.test,
      part:    params.part
    };

    try {
      if (isHighlight) {
        await supabase.from('progress')
          .update({ highlights: null })
          .match(matchClause);
      } else if (isNote) {
        await supabase.from('progress')
          .update({ note: null })
          .match(matchClause);
      } else if (isDraft) {
        // Chỉ xóa phần draft, giữ lại row nếu đã completed
        await supabase.from('progress')
          .update({ answers: null })
          .eq('status', 'draft')
          .match(matchClause);
      } else {
        // completed key (no suffix) hoặc _submitted → xóa hẳn row
        await supabase.from('progress')
          .delete()
          .match(matchClause);
      }
      console.log('[CloudStorage] Removed from cloud:', localStorageKey);
    } catch (e) {
      console.error('[CloudStorage] Remove failed:', e);
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
    
    // Sau khi migrate xong, sync ngược lại để đảm bảo local có đủ bản ghi (nếu login máy mới)
    await this.syncCloudToLocal();
    
    return migrated;
  }

  static async shouldMigrate() {
    const user = await getCurrentUser();
    if (!user) return false;
    return !localStorage.getItem('_cloud_migrated_' + user.id);
  }

  // ─────────────────────────────────────────────
  // SYNC: Tải toàn bộ dữ liệu từ Supabase về LocalStorage
  // ─────────────────────────────────────────────
  static async syncCloudToLocal() {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[CloudStorage] No user logged in, skipping sync.');
      return 0;
    }

    console.log(`[CloudStorage] Pulling all progress for ${user.email}...`);

    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('[CloudStorage] Sync error:', error);
        return 0;
      }

      // 1. Xóa các key local KHÔNG có trên cloud (Parity Check)
      // Lấy danh sách tất cả các key hiện tại trên cloud để so sánh
      const cloudKeys = new Set();
      if (data) {
        data.forEach(row => {
          const exam = row.exam || 'pet';
          const prefix = `${exam}_${row.skill}`;
          const baseKey = `${prefix}_book${row.book}_test${row.test}_part${row.part}`;
          cloudKeys.add(baseKey);
          cloudKeys.add(baseKey + '_submitted');
          cloudKeys.add(baseKey + '_draft');
          cloudKeys.add(baseKey + '_highlights');
          cloudKeys.add(baseKey + '_note');
        });
      }

      // Chỉ thực hiện xóa nếu user đã được đánh dấu là đã migrate
      if (localStorage.getItem('_cloud_migrated_' + user.id)) {
        const examPrefixes = ['pet_reading_', 'pet_listening_', 'ket_reading_', 'ket_listening_'];
        Object.keys(localStorage).forEach(localKey => {
          if (examPrefixes.some(p => localKey.startsWith(p)) && !cloudKeys.has(localKey)) {
            localStorage.removeItem(localKey);
            console.log('[CloudStorage] Parity: Removed local key missing from cloud:', localKey);
          }
        });
      }

      if (!data || data.length === 0) {
        console.log('[CloudStorage] No data found on cloud for this user.');
        return 0;
      }

      let synced = 0;
      console.log(`[CloudStorage] Found ${data.length} rows on cloud. Applying to local...`);
      data.forEach(row => {
        const exam = row.exam || 'pet'; 
        const prefix = `${exam}_${row.skill}`;
        const baseKey = `${prefix}_book${row.book}_test${row.test}_part${row.part}`;

        // 1. Sync Completed Result
        if (row.status === 'completed') {
          const completedData = {
            correctCount: row.score ?? 0,         // Fallback null to 0
            totalQuestions: row.total ?? 0,       // Fallback null to 0
            answers: row.answers,
            submitted: true,
            synced: true
          };

          // Flag để badge biết có điểm thật (tránh hiện 0/0 khi thực tế là null)
          if (row.score !== null && row.score !== undefined) {
            completedData._hasScore = true;
          }
          
          // Ghi vào CẢ HAI key để tương thích cả trang chủ và trang bài thi
          localStorage.setItem(baseKey, JSON.stringify(completedData));
          localStorage.setItem(baseKey + '_submitted', JSON.stringify({
            answers: row.answers,
            submitted: true,
            correctCount: row.score ?? 0,
            totalQuestions: row.total ?? 0,
            timestamp: new Date(row.submitted_at || row.updated_at).getTime(),
            _hasScore: completedData._hasScore
          }));
          synced++;
        }

        // 2. Sync Draft (Chỉ sync nếu máy hiện tại chưa có kết quả completed)
        if (row.answers && row.status === 'draft' && !localStorage.getItem(baseKey)) {
          localStorage.setItem(baseKey + '_draft', JSON.stringify(row.answers));
          synced++;
        }

        // 3. Sync Highlights
        if (row.highlights) {
          localStorage.setItem(baseKey + '_highlights', JSON.stringify(row.highlights));
          synced++;
        }

        // 4. Sync Note
        if (row.note) {
          localStorage.setItem(baseKey + '_note', row.note);
          synced++;
        }
      });

      console.log(`[CloudStorage] Successfully synced ${synced} items from cloud to this device.`);
      return synced;
    } catch (e) {
      console.error('[CloudStorage] Sync process failed:', e);
      return 0;
    }
  }
}
