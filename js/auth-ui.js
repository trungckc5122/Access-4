// js/auth-ui.js
import { supabase } from './supabase-client.js';

export class AuthUI {
  constructor() {
    this.modal = null;
  }

  // Gọi hàm này ở đầu mỗi trang
  async init() {
    this.injectModal();
    this.injectAuthButton();

    // Lắng nghe thay đổi auth state
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this.onSignedIn(session.user);
        this.hideModal();
      }
      if (event === 'SIGNED_OUT') {
        this.onSignedOut();
      }
    });

    // Check session hiện tại
    const { data: { user } } = await supabase.auth.getUser();
    if (user) this.onSignedIn(user);
  }

  injectAuthButton() {
    // Chỉ inject vào thanh công cụ cloud trên trang chủ
    const header = document.getElementById('cloud-action-bar');
    if (!header) return;

    // Tránh inject 2 lần
    if (document.getElementById('auth-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'auth-btn';
    btn.style.cssText = `
      display:flex; align-items:center; gap:8px;
      cursor:pointer; padding:7px 16px;
      border-radius:10px;
      background:linear-gradient(135deg, #0d9488, #14b8a6);
      color:#fff; font-size:13px; font-weight:700;
      margin-left:8px; flex-shrink:0; white-space:nowrap;
      box-shadow:0 2px 8px rgba(13,148,136,0.3);
    `;
    btn.innerHTML = `<span id="auth-btn-text">🔑 Đăng nhập</span>`;
    btn.onclick = () => this.showModal();
    
    // Luôn append vào cuối container
    header.appendChild(btn);
  }

  injectModal() {
    if (document.getElementById('auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = `
      display:none; position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,0.5); align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
      <div style="
        position:relative;
        background:var(--card-bg,#fff); border-radius:20px;
        padding:32px; width:360px; max-width:90vw;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);
      ">
        <h2 style="font-size:20px;font-weight:800;color:var(--primary,#0d9488);margin-bottom:8px;">
          Đăng nhập
        </h2>
        <p style="font-size:13px;color:var(--text-muted,#64748b);margin-bottom:24px;">
          Lưu tiến trình học lên cloud, xem lại mọi lúc mọi nơi.
        </p>

        <!-- Google OAuth -->
        <button id="auth-google-btn" style="
          width:100%; padding:12px; border-radius:12px;
          border:1.5px solid #e2e8f0; background:#fff;
          display:flex; align-items:center; justify-content:center; gap:10px;
          font-size:14px; font-weight:600; cursor:pointer; margin-bottom:12px;
          color:#0f172a;
        ">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Đăng nhập với Google
        </button>

        <!-- Email/Password -->
        <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:4px;">
          <input id="auth-email" type="email" placeholder="Email"
            style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
            font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none;">
          <input id="auth-password" type="password" placeholder="Mật khẩu"
            style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
            font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;">
          <div style="display:flex;gap:8px;">
            <button id="auth-login-btn" style="
              flex:1;padding:10px;border-radius:10px;background:var(--primary,#0d9488);
              color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;
            ">Đăng nhập</button>
            <button id="auth-register-btn" style="
              flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--primary,#0d9488);
              color:var(--primary,#0d9488);font-size:13px;font-weight:700;background:transparent;cursor:pointer;
            ">Đăng ký</button>
          </div>
        </div>

        <p id="auth-error" style="color:#dc2626;font-size:12px;margin-top:10px;display:none;"></p>
        <button id="auth-close-btn" style="
          position:absolute;top:16px;right:16px;background:none;border:none;
          cursor:pointer;font-size:20px;color:#94a3b8;
        ">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    this.modal = modal;

    // Bind events
    modal.querySelector('#auth-google-btn').onclick  = () => this.signInWithGoogle();
    modal.querySelector('#auth-login-btn').onclick   = () => this.signInWithEmail();
    modal.querySelector('#auth-register-btn').onclick= () => this.signUpWithEmail();
    modal.querySelector('#auth-close-btn').onclick   = () => this.hideModal();
    modal.onclick = (e) => { if (e.target === modal) this.hideModal(); };
  }

  async signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
  }

  async signInWithEmail() {
    const email    = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) this.showError(error.message);
  }

  async signUpWithEmail() {
    const email    = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) this.showError(error.message);
    else this.showError('✓ Kiểm tra email để xác nhận tài khoản!');
  }

  async signOut() {
    await supabase.auth.signOut();
  }

  onSignedIn(user) {
    const btn = document.getElementById('auth-btn');
    const txt = document.getElementById('auth-btn-text');
    if (txt) {
      const name = user.user_metadata?.full_name || user.email.split('@')[0];
      txt.textContent = name;
    }
    if (btn) btn.onclick = () => {
      if (confirm('Đăng xuất?')) this.signOut();
    };
  }

  onSignedOut() {
    const txt = document.getElementById('auth-btn-text');
    if (txt) txt.textContent = 'Đăng nhập';
    const btn = document.getElementById('auth-btn');
    if (btn) btn.onclick = () => this.showModal();
  }

  showModal() {
    if (this.modal) { this.modal.style.display = 'flex'; }
  }
  hideModal() {
    if (this.modal) { this.modal.style.display = 'none'; }
  }
  showError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
}
