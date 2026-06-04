// js/cloud-storage.js
import { supabase, getCurrentUser, parseStorageKey } from './supabase-client.js';

export class CloudStorage {

  // ─────────────────────────────────────────────
  // SAVE PROGRESS (draft hoặc completed)
  // Gọi thay cho: localStorage.setItem(key, JSON.stringify(data))
  // ─────────────────────────────────────────────
  static async save(localStorageKey, data) {
    // 1. Chỉ ghi localStorage khi KHÔNG phải Cloud-Only mode
    if (localStorage.getItem('_storage_mode') !== 'cloud_only') {
      try { localStorage.setItem(localStorageKey, JSON.stringify(data)); } catch {}
    }

    // 2. Nếu đã đăng nhập → sync lên Supabase
    const user = await getCurrentUser();
    if (!user) {
      // Guest đang làm bài — đánh dấu owner là 'guest' nếu chưa có owner
      if (!localStorage.getItem('_local_progress_owner')) {
        localStorage.setItem('_local_progress_owner', 'guest');
      }
      return { synced: false };
    }

    // User đã đăng nhập → cập nhật owner thành user.id
    localStorage.setItem('_local_progress_owner', user.id);

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
      // Lưu toàn bộ object data vào answers để bảo toàn cấu trúc (bao gồm details, correctCount...)
      upsertData.answers      = data;
      upsertData.score        = data.score  ?? data.correctCount  ?? null;
      upsertData.total        = data.total  ?? data.totalQuestions ?? null;
      upsertData.submitted_at = new Date().toISOString();
    }
    else {
      // completed result cũ hoặc result từ dashboard
      upsertData.status       = 'completed';
      upsertData.answers      = data;
      upsertData.score        = data.score  ?? data.correctCount;
      upsertData.total        = data.total  ?? data.totalQuestions;
      upsertData.submitted_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('progress')
      .upsert(upsertData, {
        onConflict: 'user_id,exam,skill,book,test,part'
      });

    if (!error) {
      // Suppress Realtime echo trên chính tab này trong 2 giây (tránh tự reload)
      window._suppressRealtimeUntil = Date.now() + 2000;
    }

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

    // Fallback: localStorage — chỉ dùng nếu dữ liệu local thuộc đúng user hiện tại
    // (Tránh trả về draft/result của user khác còn sót trên máy dùng chung)
    const localOwner = localStorage.getItem('_local_progress_owner');
    const isSafeToReadLocal = !user || !localOwner || localOwner === 'guest' || localOwner === user?.id;
    if (!isSafeToReadLocal) {
      console.warn('[CloudStorage] load(): Skipping local fallback — local data belongs to a different user.');
      return null;
    }
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

    try {
      if (isHighlight) {
        await supabase.from('progress')
          .update({ highlights: null })
          .eq('user_id', user.id)
          .eq('exam', params.exam)
          .eq('skill', params.skill)
          .eq('book', params.book)
          .eq('test', params.test)
          .eq('part', params.part);
      } else if (isNote) {
        await supabase.from('progress')
          .update({ note: null })
          .eq('user_id', user.id)
          .eq('exam', params.exam)
          .eq('skill', params.skill)
          .eq('book', params.book)
          .eq('test', params.test)
          .eq('part', params.part);
      } else if (isDraft) {
        // Chỉ xóa phần draft, giữ lại row nếu đã completed
        await supabase.from('progress')
          .update({ answers: null, status: 'completed' })
          .eq('status', 'draft')
          .eq('user_id', user.id)
          .eq('exam', params.exam)
          .eq('skill', params.skill)
          .eq('book', params.book)
          .eq('test', params.test)
          .eq('part', params.part);
      } else {
        // completed key (no suffix) hoặc _submitted → xóa hẳn row
        await supabase.from('progress')
          .delete()
          .eq('user_id', user.id)
          .eq('exam', params.exam)
          .eq('skill', params.skill)
          .eq('book', params.book)
          .eq('test', params.test)
          .eq('part', params.part);
      }
      console.log('[CloudStorage] Removed from cloud:', localStorageKey);
    } catch (e) {
      console.error('[CloudStorage] Remove failed:', e);
    }
  }

  // ─────────────────────────────────────────────
  // REMOVE ALL — xóa toàn bộ row (dùng khi reset, gọi 1 lần thay vì 3 lần)
  // suppress signal để tab hiện tại không tự reload
  // ─────────────────────────────────────────────
  static async removeAll(baseKey) {
    localStorage.removeItem(baseKey);
    localStorage.removeItem(baseKey + '_draft');
    localStorage.removeItem(baseKey + '_submitted');
    localStorage.removeItem(baseKey + '_highlights');
    localStorage.removeItem(baseKey + '_note');

    const user = await getCurrentUser();
    if (!user) return;

    const params = parseStorageKey(baseKey);
    if (!params) return;

    // Suppress echo realtime trên tab hiện tại
    window._suppressRealtimeUntil = Date.now() + 3000;

    try {
      const { error } = await supabase.from('progress')
        .delete()
        .eq('user_id', user.id)
        .eq('exam',    params.exam)
        .eq('skill',   params.skill)
        .eq('book',    params.book)
        .eq('test',    params.test)
        .eq('part',    params.part);
      if (error) console.error('[CloudStorage] removeAll failed:', error);
      else console.log('[CloudStorage] Row deleted for:', baseKey);
    } catch (e) {
      console.error('[CloudStorage] removeAll exception:', e);
    }
  }

    // ─────────────────────────────────────────────
  // OWNER HELPERS
  // ─────────────────────────────────────────────

  // Đánh dấu dữ liệu local hiện tại là của guest (chưa đăng nhập)
  static setGuestOwner() {
    if (!localStorage.getItem('_local_progress_owner')) {
      localStorage.setItem('_local_progress_owner', 'guest');
    }
  }

  // Xóa toàn bộ progress keys của user khác khỏi localStorage
  static clearLocalProgressKeys() {
    const examPrefixes = ['pet_reading_', 'pet_listening_', 'ket_reading_', 'ket_listening_'];
    const keysToRemove = Object.keys(localStorage).filter(k =>
      examPrefixes.some(p => k.startsWith(p))
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.log(`[CloudStorage] Cleared ${keysToRemove.length} local progress keys belonging to another user.`);
  }

  static async handleAuthSync(user = null) {
    const currentUser = user || await getCurrentUser();
    if (!currentUser) return { syncedCount: 0, migratedCount: 0, action: 'none' };
    if (CloudStorage._authSyncPromise) return CloudStorage._authSyncPromise;

    CloudStorage._authSyncPromise = (async () => {

    const owner = localStorage.getItem('_local_progress_owner');
    const examPrefixes = ['pet_reading_', 'pet_listening_', 'ket_reading_', 'ket_listening_'];
    const hasLocalProgress = Object.keys(localStorage).some(k =>
      examPrefixes.some(p => k.startsWith(p))
    );

    if (!owner || owner === 'guest') {
      if (!owner && hasLocalProgress) {
        const { data: cloudRows } = await supabase
          .from('progress')
          .select('id')
          .eq('user_id', currentUser.id)
          .limit(1);

        if (cloudRows && cloudRows.length > 0) {
          console.warn('[CloudStorage] Legacy local progress found, but current user already has cloud data. Clearing local progress before sync.');
          CloudStorage.clearLocalProgressKeys();
          localStorage.setItem('_local_progress_owner', currentUser.id);
          localStorage.setItem('_cloud_migrated_' + currentUser.id, '1');
          const syncedCount = await CloudStorage.syncCloudToLocal();
          return { syncedCount, migratedCount: 0, action: 'cleared-legacy-and-synced' };
        }
      }

      const migratedCount = await CloudStorage.migrateLocalStorageToCloud();
      localStorage.setItem('_local_progress_owner', currentUser.id);
      return { syncedCount: 0, migratedCount, action: 'migrated' };
    }

    if (owner === currentUser.id) {
      const syncedCount = await CloudStorage.syncCloudToLocal();
      return { syncedCount, migratedCount: 0, action: 'synced' };
    }

    console.warn('[CloudStorage] Local progress belongs to another user. Clearing local progress before sync.');
    CloudStorage.clearLocalProgressKeys();
    localStorage.setItem('_local_progress_owner', currentUser.id);
    localStorage.setItem('_cloud_migrated_' + currentUser.id, '1');
    const syncedCount = await CloudStorage.syncCloudToLocal();
    return { syncedCount, migratedCount: 0, action: 'cleared-and-synced' };
    })();

    try {
      return await CloudStorage._authSyncPromise;
    } finally {
      CloudStorage._authSyncPromise = null;
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
    // Chỉ migrate nếu dữ liệu local là của guest hoặc chưa có owner
    const owner = localStorage.getItem('_local_progress_owner');
    const isGuestData = !owner || owner === 'guest';
    return isGuestData && !localStorage.getItem('_cloud_migrated_' + user.id);
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

      // Khai báo biến dùng chung cho upload offline và parity check
      const examPrefixes = ['pet_reading_', 'pet_listening_', 'ket_reading_', 'ket_listening_'];
      const LAST_SYNC_KEY = '_last_cloud_sync_' + user.id;
      const lastSyncTime = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');
      const now = Date.now();

      // ── KIỂM TRA OWNER TRƯỚC KHI UPLOAD ──────────────────────────────────
      // Nếu dữ liệu local thuộc user khác → xóa hết, không upload lên cloud user hiện tại
      const localOwner = localStorage.getItem('_local_progress_owner');
      const hasLocalProgress = Object.keys(localStorage).some(k =>
        examPrefixes.some(p => k.startsWith(p))
      );
      if (!localOwner && hasLocalProgress && data && data.length > 0) {
        console.warn('[CloudStorage] Legacy local progress found during sync, but current user already has cloud data. Clearing local progress before pull.');
        CloudStorage.clearLocalProgressKeys();
        localStorage.setItem('_local_progress_owner', user.id);
        localStorage.setItem('_cloud_migrated_' + user.id, '1');
      } else if (localOwner && localOwner !== 'guest' && localOwner !== user.id) {
        console.warn(`[CloudStorage] Local progress belongs to user "${localOwner}", current user is "${user.id}". Clearing local data to prevent cross-account contamination.`);
        CloudStorage.clearLocalProgressKeys();
        localStorage.setItem('_local_progress_owner', user.id);
        // Không upload gì — chỉ pull dữ liệu đúng của user này từ cloud xuống
      } else {
        // Dữ liệu local là guest hoặc đúng user hiện tại → an toàn để upload offline data

      // Scan localStorage tìm dữ liệu mới hơn lastSyncTime mà cloud chưa có
      // → đây là bài làm khi offline / chưa đăng nhập → đẩy lên cloud trước
      const offlineKeys = Object.keys(localStorage).filter(k =>
        examPrefixes.some(p => k.startsWith(p)) && !cloudKeys.has(k)
      );
      const uploadPromises = [];
      for (const localKey of offlineKeys) {
        const localTimestamp = getLocalDataTimestamp(localKey);
        if (localTimestamp > lastSyncTime) {
          try {
            const raw = localStorage.getItem(localKey);
            const parsed = JSON.parse(raw);
            console.log('[CloudStorage] Uploading offline data:', localKey);
            uploadPromises.push(CloudStorage.save(localKey, parsed));
          } catch {}
        }
      }
      if (uploadPromises.length > 0) {
        await Promise.allSettled(uploadPromises);
        // Re-fetch cloudKeys after upload
        const { data: refreshedData } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id);
        if (refreshedData) {
          refreshedData.forEach(row => {
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
      }

      } // end else (safe owner)

      // Chỉ thực hiện xóa nếu user đã được đánh dấu là đã migrate
      if (localStorage.getItem('_cloud_migrated_' + user.id)) {
        Object.keys(localStorage).forEach(localKey => {
          if (examPrefixes.some(p => localKey.startsWith(p)) && !cloudKeys.has(localKey)) {
            const localTimestamp = getLocalDataTimestamp(localKey);

            if (localTimestamp <= lastSyncTime) {
              if (localTimestamp === 0 && (localKey.endsWith('_highlights') || localKey.endsWith('_note'))) {
                console.log('[CloudStorage] Parity: Kept local sub-key with no timestamp:', localKey);
              } else {
                // Dữ liệu cũ hơn hoặc bằng lần sync cuối → có thể đã bị xóa trên cloud hoặc thiết bị khác
                localStorage.removeItem(localKey);
                console.log('[CloudStorage] Parity: Removed old local key missing from cloud:', localKey);
              }
            } else if (localTimestamp > 0) {
              // Dữ liệu mới hơn lần sync cuối → giữ lại (đã được upload ở bước 0)
              console.log('[CloudStorage] Parity: Preserved newer local work missing from cloud:', localKey);
            }
          }
        });
      }
      // Luôn cập nhật LAST_SYNC_KEY sau mỗi lần sync
      localStorage.setItem(LAST_SYNC_KEY, now.toString());

      if (!data || data.length === 0) {
        console.log('[CloudStorage] No data found on cloud for this user.');
        return 0;
      }

      let synced = 0;
      data.forEach(row => {
        const exam = row.exam || 'pet'; 
        const prefix = `${exam}_${row.skill}`;
        const baseKey = `${prefix}_book${row.book}_test${row.test}_part${row.part}`;

        const cloudTimestamp = new Date(row.submitted_at || row.updated_at).getTime();
        const localValue = localStorage.getItem(baseKey);
        const localData = localValue ? JSON.parse(localValue) : null;
        const localTimestamp = localData?.timestamp || (localData?.submitted_at ? new Date(localData.submitted_at).getTime() : 0);

        // 1. Sync Completed Result
        if (row.status === 'completed') {
          if (!localData || cloudTimestamp > localTimestamp) {
            // Cloud mới hơn hoặc local chưa có → Kéo về
            let completedData = {
              correctCount: row.score ?? 0,
              totalQuestions: row.total ?? 0,
              submitted: true,
              synced: true
            };

            if (row.answers && typeof row.answers === 'object') {
              completedData = { ...completedData, ...row.answers };
            } else {
              completedData.answers = row.answers;
            }

            if (row.score !== null && row.score !== undefined) {
              completedData._hasScore = true;
            }
            
            // Luôn ghi completed result vào localStorage (kể cả cloud-only)
            // vì isCompleted(), loadSubmittedState() là sync và đọc từ localStorage.
            // Không có cache này → isCompleted() luôn false → UI bị broken.
            localStorage.setItem(baseKey, JSON.stringify(completedData));
            localStorage.setItem(baseKey + '_submitted', JSON.stringify({
              ...completedData,
              timestamp: cloudTimestamp
            }));
            synced++;
          } else if (localTimestamp > cloudTimestamp) {
            // Local mới hơn (vừa làm xong offline) → Đẩy lên cloud
            CloudStorage.save(baseKey, localData);
            console.log('[CloudStorage] Local newer than cloud, pushed up:', baseKey);
          }
        }

        // 2. Sync Draft
        if (row.answers && row.status === 'draft') {
          const draftKey = baseKey + '_draft';
          const localDraftVal = localStorage.getItem(draftKey);
          const localDraftData = localDraftVal ? JSON.parse(localDraftVal) : null;
          const localDraftTimestamp = localDraftData?.timestamp || 0;
          const cloudDraftTimestamp = new Date(row.updated_at).getTime();

          if (!localDraftVal || cloudDraftTimestamp > localDraftTimestamp) {
            // Cloud mới hơn → Kéo về
            localStorage.setItem(draftKey, JSON.stringify(row.answers));
            synced++;
          } else if (localDraftTimestamp > cloudDraftTimestamp) {
            // Local mới hơn → Đẩy lên
            CloudStorage.save(draftKey, localDraftData);
            console.log('[CloudStorage] Local draft newer than cloud, pushed up:', draftKey);
          }
        }

        // 3. Sync Highlights (với timestamp comparison)
        if (row.highlights) {
          const highlightKey = baseKey + '_highlights';
          const localHighlight = localStorage.getItem(highlightKey);
          const cloudHighlightTimestamp = new Date(row.updated_at).getTime();
          const localHighlightTimestamp = localHighlight
            ? (JSON.parse(localHighlight)?.timestamp || 0)
            : 0;

          if (!localHighlight || cloudHighlightTimestamp > localHighlightTimestamp) {
            localStorage.setItem(highlightKey, JSON.stringify(row.highlights));
            synced++;
          } else if (localHighlightTimestamp > cloudHighlightTimestamp) {
            CloudStorage.save(highlightKey, JSON.parse(localHighlight));
          }
        }

        // 4. Sync Note (với timestamp comparison)
        if (row.note) {
          const noteKey = baseKey + '_note';
          const localNote = localStorage.getItem(noteKey);
          const cloudNoteTimestamp = new Date(row.updated_at).getTime();
          const localNoteTimestamp = localNote
            ? (JSON.parse(localNote)?.timestamp || 0)
            : 0;

          if (!localNote || cloudNoteTimestamp > localNoteTimestamp) {
            localStorage.setItem(noteKey, row.note);
            synced++;
          } else if (localNoteTimestamp > cloudNoteTimestamp) {
            CloudStorage.save(noteKey, JSON.parse(localNote));
          }
        }
      });

      console.log(`[CloudStorage] Successfully synced ${synced} items from cloud to this device.`);
      return synced;
    } catch (e) {
      console.error('[CloudStorage] Sync process failed:', e);
      return 0;
    }
  }

  // ─────────────────────────────────────────────
  // GET ALL PROGRESS (cho Cloud-Only mode)
  // Trả về object map với key là storageKey, value là dữ liệu
  // ─────────────────────────────────────────────
  static async getAllProgress() {
    const readLocalProgress = () => {
      const map = {};
      const prefixes = ['pet_reading_', 'pet_listening_', 'ket_reading_', 'ket_listening_'];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (prefixes.some(p => key.startsWith(p))) {
          try {
            map[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            map[key] = localStorage.getItem(key);
          }
        }
      }
      return map;
    };

    const user = await getCurrentUser();
    // Nếu có user, lấy từ Supabase (ưu tiên vì đồng bộ nhất)
    if (user) {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', user.id);
      if (!error && data) {
        const map = {};
        data.forEach(row => {
          const exam = row.exam || 'pet';
          const prefix = `${exam}_${row.skill}`;
          const baseKey = `${prefix}_book${row.book}_test${row.test}_part${row.part}`;
          
          // Lưu kết quả completed (nếu có)
          if (row.status === 'completed' && row.answers) {
            map[baseKey] = {
              correctCount: row.score ?? 0,
              totalQuestions: row.total ?? 0,
              answers: row.answers,
              status: 'completed'
            };
          }
          // Draft
          if (row.answers && row.status === 'draft') {
            map[baseKey + '_draft'] = row.answers;
          }
          // Highlights
          if (row.highlights) {
            map[baseKey + '_highlights'] = row.highlights;
          }
          // Note
          if (row.note) {
            map[baseKey + '_note'] = row.note;
          }
        });
        // Chỉ merge local vào nếu local thuộc đúng user này (tránh dữ liệu user cũ ghi đè cloud)
        const localOwner = localStorage.getItem('_local_progress_owner');
        if (!localOwner || localOwner === 'guest' || localOwner === user.id) {
          Object.assign(map, readLocalProgress());
        }
        return map;
      }
    }
    // Fallback: đọc localStorage (hoặc dùng khi không có user)
    return readLocalProgress();
  }
}

// Helper: trích xuất timestamp từ dữ liệu local
function getLocalDataTimestamp(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    return data?.timestamp || (data?.submitted_at ? new Date(data.submitted_at).getTime() : 0);
  } catch {
    return 0;
  }
}
