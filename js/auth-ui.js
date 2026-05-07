// js/auth-ui.js
import { supabase } from './supabase-client.js';

export class AuthUI {
  constructor() {
    this.modal = null;
    this.registerModal = null;
  }

  async init(options = { injectButton: true }) {
    this.injectModal();
    this.injectRegisterModal();
    if (options.injectButton) {
      this.injectAuthButton();
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthUI] Event:', event);

      if (event === 'SIGNED_IN') {
        localStorage.removeItem('_user_signed_out');
        await this.onSignedIn(session.user);
        this.hideModal();
        this.hideRegisterModal();
      }

      if (event === 'INITIAL_SESSION' && localStorage.getItem('_user_signed_out') === '1') {
        console.log('[AuthUI] Ignoring INITIAL_SESSION due to manual sign-out.');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      if (event === 'SIGNED_OUT') {
        this.onSignedOut();
      }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && localStorage.getItem('_user_signed_out') !== '1') {
      await this.onSignedIn(session.user);
    }
  }

  injectAuthButton() {
    const header = document.getElementById('cloud-action-bar');
    if (!header) return;
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
      transition: opacity 0.2s;
    `;
    btn.innerHTML = `<span id="auth-btn-text">🔑 Đăng nhập</span>`;
    btn.onmouseenter = () => btn.style.opacity = '0.88';
    btn.onmouseleave = () => btn.style.opacity = '1';
    btn.onclick = () => this.showModal();
    header.appendChild(btn);
  }

  // ─── MODAL ĐĂNG NHẬP ─────────────────────────────────
  injectModal() {
    if (document.getElementById('auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = `
      display:none; position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,0.45); align-items:center; justify-content:center;
      backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
      <div style="
        position:relative;
        background:var(--card-bg,#fff); border-radius:20px;
        padding:36px 32px 28px; width:380px; max-width:92vw;
        box-shadow:0 24px 64px rgba(0,0,0,0.22);
        animation: authSlideIn 0.28s cubic-bezier(.22,.68,0,1.2);
      ">
        <div style="margin-bottom:20px;">
          <h2 style="font-size:22px;font-weight:800;color:var(--primary,#0d9488);margin:0 0 6px;">Đăng nhập</h2>
          <p style="font-size:13px;color:var(--text-muted,#64748b);margin:0;">
            Lưu tiến trình học lên cloud — xem lại mọi lúc mọi nơi.
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <input id="auth-email" type="email" placeholder="Email" autocomplete="email"
            style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
            font-size:14px;box-sizing:border-box;outline:none;transition:border-color .2s;
            color:var(--text,#0f172a);"
            onfocus="this.style.borderColor='#0d9488'" onblur="this.style.borderColor='#e2e8f0'">
          <input id="auth-password" type="password" placeholder="Mật khẩu" autocomplete="current-password"
            style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
            font-size:14px;box-sizing:border-box;outline:none;transition:border-color .2s;
            color:var(--text,#0f172a);"
            onfocus="this.style.borderColor='#0d9488'" onblur="this.style.borderColor='#e2e8f0'">
        </div>

        <button id="auth-login-btn" style="
          width:100%;margin-top:14px;padding:12px;border-radius:10px;
          background:linear-gradient(135deg,#0d9488,#14b8a6);
          color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;
          box-shadow:0 4px 12px rgba(13,148,136,0.3);
          transition:opacity .2s;
        " onmouseenter="this.style.opacity='.88'" onmouseleave="this.style.opacity='1'">
          Đăng nhập
        </button>

        <p style="text-align:center;font-size:13px;color:#64748b;margin:16px 0 0;">
          Chưa có tài khoản?
          <span id="auth-switch-to-register" style="
            color:#0d9488;font-weight:700;cursor:pointer;
            text-decoration:underline;text-underline-offset:2px;
          ">Đăng ký ngay</span>
        </p>

        <p id="auth-error" style="color:#dc2626;font-size:12px;margin-top:10px;display:none;"></p>
        <button id="auth-close-btn" style="
          position:absolute;top:16px;right:16px;background:none;border:none;
          cursor:pointer;font-size:20px;color:#94a3b8;line-height:1;
          transition:color .2s;
        " onmouseenter="this.style.color='#475569'" onmouseleave="this.style.color='#94a3b8'">✕</button>
      </div>
      <style>
        @keyframes authSlideIn {
          from { opacity:0; transform:translateY(-18px) scale(.96); }
          to   { opacity:1; transform:none; }
        }
      </style>
    `;
    document.body.appendChild(modal);
    this.modal = modal;

    const emailInput = modal.querySelector('#auth-email');
    const passInput  = modal.querySelector('#auth-password');

    emailInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); passInput.focus(); } };
    passInput.onkeydown  = (e) => { if (e.key === 'Enter') { e.preventDefault(); this.signInWithEmail(); } };

    modal.querySelector('#auth-login-btn').onclick       = () => this.signInWithEmail();
    modal.querySelector('#auth-close-btn').onclick       = () => this.hideModal();
    modal.querySelector('#auth-switch-to-register').onclick = () => { this.hideModal(); this.showRegisterModal(); };
    modal.onclick = (e) => { if (e.target === modal) this.hideModal(); };
  }

  // ─── MODAL ĐĂNG KÝ ────────────────────────────────────
  injectRegisterModal() {
    if (document.getElementById('auth-register-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-register-modal';
    modal.style.cssText = `
      display:none; position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,0.45); align-items:center; justify-content:center;
      backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
      <div style="
        position:relative;
        background:var(--card-bg,#fff); border-radius:20px;
        padding:36px 32px 28px; width:400px; max-width:92vw;
        box-shadow:0 24px 64px rgba(0,0,0,0.22);
        animation: authSlideIn 0.28s cubic-bezier(.22,.68,0,1.2);
      ">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="
            width:42px;height:42px;border-radius:12px;
            background:linear-gradient(135deg,#0d9488,#14b8a6);
            display:flex;align-items:center;justify-content:center;
            font-size:20px;flex-shrink:0;
          ">✨</div>
          <div>
            <h2 style="font-size:20px;font-weight:800;color:var(--primary,#0d9488);margin:0 0 3px;">Tạo tài khoản</h2>
            <p style="font-size:12px;color:var(--text-muted,#64748b);margin:0;">Miễn phí — lưu tiến trình học mãi mãi.</p>
          </div>
        </div>

        <!-- Fields -->
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="position:relative;">
            <span style="
              position:absolute;left:12px;top:50%;transform:translateY(-50%);
              font-size:15px;pointer-events:none;
            ">👤</span>
            <input id="reg-display-name" type="text" placeholder="Tên hiển thị (vd: Minh Trung)" autocomplete="name"
              style="width:100%;padding:11px 14px 11px 36px;border-radius:10px;border:1.5px solid #e2e8f0;
              font-size:14px;box-sizing:border-box;outline:none;transition:border-color .2s;
              color:var(--text,#0f172a);"
              onfocus="this.style.borderColor='#0d9488'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
          <div style="position:relative;">
            <span style="
              position:absolute;left:12px;top:50%;transform:translateY(-50%);
              font-size:15px;pointer-events:none;
            ">✉️</span>
            <input id="reg-email" type="email" placeholder="Email" autocomplete="email"
              style="width:100%;padding:11px 14px 11px 36px;border-radius:10px;border:1.5px solid #e2e8f0;
              font-size:14px;box-sizing:border-box;outline:none;transition:border-color .2s;
              color:var(--text,#0f172a);"
              onfocus="this.style.borderColor='#0d9488'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
          <div style="position:relative;">
            <span style="
              position:absolute;left:12px;top:50%;transform:translateY(-50%);
              font-size:15px;pointer-events:none;
            ">🔒</span>
            <input id="reg-password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="new-password"
              style="width:100%;padding:11px 14px 11px 36px;border-radius:10px;border:1.5px solid #e2e8f0;
              font-size:14px;box-sizing:border-box;outline:none;transition:border-color .2s;
              color:var(--text,#0f172a);"
              onfocus="this.style.borderColor='#0d9488'" onblur="this.style.borderColor='#e2e8f0'">
          </div>
        </div>

        <button id="reg-submit-btn" style="
          width:100%;margin-top:16px;padding:12px;border-radius:10px;
          background:linear-gradient(135deg,#0d9488,#14b8a6);
          color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;
          box-shadow:0 4px 12px rgba(13,148,136,0.3);
          transition:opacity .2s;
        " onmouseenter="this.style.opacity='.88'" onmouseleave="this.style.opacity='1'">
          Tạo tài khoản
        </button>

        <p style="text-align:center;font-size:13px;color:#64748b;margin:14px 0 0;">
          Đã có tài khoản?
          <span id="reg-switch-to-login" style="
            color:#0d9488;font-weight:700;cursor:pointer;
            text-decoration:underline;text-underline-offset:2px;
          ">Đăng nhập</span>
        </p>

        <p id="reg-error" style="color:#dc2626;font-size:12px;margin-top:10px;display:none;text-align:center;"></p>
        <button id="reg-close-btn" style="
          position:absolute;top:16px;right:16px;background:none;border:none;
          cursor:pointer;font-size:20px;color:#94a3b8;line-height:1;
          transition:color .2s;
        " onmouseenter="this.style.color='#475569'" onmouseleave="this.style.color='#94a3b8'">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    this.registerModal = modal;

    const nameInput = modal.querySelector('#reg-display-name');
    const emailInput= modal.querySelector('#reg-email');
    const passInput = modal.querySelector('#reg-password');

    nameInput.onkeydown  = (e) => { if (e.key === 'Enter') { e.preventDefault(); emailInput.focus(); } };
    emailInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); passInput.focus(); } };
    passInput.onkeydown  = (e) => { if (e.key === 'Enter') { e.preventDefault(); this.signUpWithEmail(); } };

    modal.querySelector('#reg-submit-btn').onclick       = () => this.signUpWithEmail();
    modal.querySelector('#reg-close-btn').onclick        = () => this.hideRegisterModal();
    modal.querySelector('#reg-switch-to-login').onclick  = () => { this.hideRegisterModal(); this.showModal(); };
    modal.onclick = (e) => { if (e.target === modal) this.hideRegisterModal(); };
  }

  // ─── AUTH ACTIONS ─────────────────────────────────────
  async signInWithEmail() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!email || !password) { this.showError('auth', 'Vui lòng nhập email và mật khẩu.'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) this.showError('auth', this._translateError(error.message));
  }

  async signUpWithEmail() {
    const displayName = document.getElementById('reg-display-name').value.trim();
    const email       = document.getElementById('reg-email').value.trim();
    const password    = document.getElementById('reg-password').value;

    if (!displayName) { this.showError('reg', 'Vui lòng nhập tên hiển thị.'); return; }
    if (!email)       { this.showError('reg', 'Vui lòng nhập email.'); return; }
    if (password.length < 6) { this.showError('reg', 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }

    const submitBtn = document.getElementById('reg-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang xử lý...'; }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Tạo tài khoản'; }

    if (error) {
      this.showError('reg', this._translateError(error.message));
    } else {
      // Nếu cần xác nhận email
      if (data?.user && !data.session) {
        this.showError('reg', '✅ Kiểm tra email để xác nhận tài khoản!');
        // Đổi màu thành xanh lá
        const errEl = document.getElementById('reg-error');
        if (errEl) errEl.style.color = '#059669';
      }
      // Nếu không cần xác nhận (auto-confirm bật), onSignedIn sẽ tự kích hoạt qua onAuthStateChange
    }
  }

  // ─── FETCH DISPLAY NAME từ profiles table ────────────
  async getDisplayName(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();
      if (!error && data?.display_name) return data.display_name;
    } catch {}
    return null;
  }

  // ─── SIGNED IN / SIGNED OUT ───────────────────────────
  async onSignedIn(user) {
    // Ưu tiên: display_name từ profiles → user_metadata → email
    let name = null;
    name = await this.getDisplayName(user.id);
    if (!name) name = user.user_metadata?.display_name || null;
    if (!name) name = user.email;

    const btn = document.getElementById('auth-btn');
    const txt = document.getElementById('auth-btn-text');
    if (txt) {
      txt.textContent = name;
    }
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.title = `Đăng xuất (${user.email})`;
      newBtn.addEventListener('click', () => this.signOut());
    }
  }

  onSignedOut() {
    const btn = document.getElementById('auth-btn');
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      const txt = newBtn.querySelector('#auth-btn-text');
      if (txt) txt.textContent = '🔑 Đăng nhập';
      newBtn.removeAttribute('title');
      newBtn.addEventListener('click', () => this.showModal());
    }
  }

  async signOut() {
    if (!confirm('Bạn có chắc muốn đăng xuất khỏi hệ thống?')) return;
    try { await supabase.auth.signOut({ scope: 'global' }); } catch (e) { console.error('SignOut error:', e); }

    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-') && !key.includes('supabase') && !key.includes('auth-token')) {
        backup[key] = localStorage.getItem(key);
      }
    }
    localStorage.clear();
    sessionStorage.clear();

    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const name = (c.indexOf('=') > -1 ? c.substr(0, c.indexOf('=')).trim() : c.trim());
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
    }

    if (window.indexedDB?.databases) {
      try {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name && (db.name.includes('supabase') || db.name.includes('auth')))
            window.indexedDB.deleteDatabase(db.name);
        });
      } catch {}
    }

    Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
    localStorage.setItem('_user_signed_out', '1');
    window.location.replace(window.location.origin + window.location.pathname + '?t=' + Date.now());
  }

  // ─── HELPERS ──────────────────────────────────────────
  showModal()         { if (this.modal)         this.modal.style.display         = 'flex'; }
  hideModal()         { if (this.modal)         this.modal.style.display         = 'none'; }
  showRegisterModal() { if (this.registerModal) this.registerModal.style.display = 'flex'; }
  hideRegisterModal() { if (this.registerModal) this.registerModal.style.display = 'none'; }

  showError(form, msg) {
    const id = form === 'reg' ? 'reg-error' : 'auth-error';
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; el.style.color = '#dc2626'; }
  }

  _translateError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
    if (msg.includes('Email not confirmed'))       return 'Email chưa được xác nhận. Kiểm tra hộp thư nhé!';
    if (msg.includes('User already registered'))   return 'Email này đã được đăng ký rồi.';
    if (msg.includes('Password should be'))        return 'Mật khẩu cần ít nhất 6 ký tự.';
    return msg;
  }
}
