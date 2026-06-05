// js/supabase-client.js
// Load Supabase SDK từ CDN — không cần npm

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://naxqzojtjaehggbbucwb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_YiqKXa_aHECEv_HiDm_puw_Iz3vqmJx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,         // BẬT lại ghi nhớ phiên đăng nhập
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper: lấy user hiện tại
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── QUÊN MẬT KHẨU ────────────────────────────────────────────────

// Gửi email reset password (wrapper tiện dụng)
export async function sendPasswordResetEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

// Tạo mật khẩu ngẫu nhiên (backup nếu cần)
export function generateRandomPassword(length = 6) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(b => chars[b % chars.length]).join('');
}

// Bắt link recovery trong URL — gọi khi DOMContentLoaded
export async function handlePasswordRecovery() {
  const params = new URLSearchParams(window.location.search);
  const hashStr = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hashStr);
  const type = params.get('type') || hashParams.get('type');
  if (type !== 'recovery') return { handled: false };

  // Xóa token khỏi URL ngay lập tức tránh F5 loop
  window.history.replaceState({}, document.title, window.location.pathname);

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return { handled: true, success: false, message: 'Link có thể đã hết hạn.' };
  }
  return { handled: true, success: true };
}

// Helper: convert localStorage key cũ → object params
// 'pet_reading_book1_test1_part1' → { exam:'pet', skill:'reading', book:1, test:1, part:1 }
export function parseStorageKey(key) {
  const clean = key
    .replace('_submitted', '')
    .replace('_draft', '')
    .replace('_highlights', '')
    .replace('_note', '');
  const match = clean.match(/^(pet|ket)_(reading|listening)_book(\d+)_test(\d+)_part(\d+)$/);
  if (!match) return null;
  return {
    exam:  match[1],
    skill: match[2],
    book:  parseInt(match[3]),
    test:  parseInt(match[4]),
    part:  parseInt(match[5])
  };
}
