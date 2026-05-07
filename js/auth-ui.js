// js/auth-ui.js
import { supabase } from './supabase-client.js';

export class AuthUI {
  constructor() {
    this.modal = null;
    this.registerModal = null;
    this.forgotModal = null;
    this.changePassModal = null;
  }

  async init(options = { injectButton: true }) {
    this.injectModal();
    this.injectRegisterModal();
    this.injectForgotModal();
    this.injectChangePassModal();
    if (options.injectButton) this.injectAuthButton();

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthUI] Event:', event);
      if (event === 'SIGNED_IN') {
        localStorage.removeItem('_user_signed_out');
        this.onSignedIn(session.user);
        this.hideModal();
        this.hideRegisterModal();
      }
      if (event === 'INITIAL_SESSION' && localStorage.getItem('_user_signed_out') === '1') {
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
      if (event === 'SIGNED_OUT') this.onSignedOut();
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && localStorage.getItem('_user_signed_out') !== '1') {
      this.onSignedIn(session.user);
    }
  }

  injectAuthButton() {
    const header = document.getElementById('cloud-action-bar');
    if (!header || document.getElementById('auth-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'auth-btn';
    btn.style.cssText = `display:flex;align-items:center;gap:8px;cursor:pointer;padding:7px 16px;
      border-radius:10px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;
      font-size:13px;font-weight:700;margin-left:8px;flex-shrink:0;white-space:nowrap;
      box-shadow:0 2px 8px rgba(13,148,136,0.3);`;
    btn.innerHTML = `<span id="auth-btn-text">🔑 Đăng nhập</span>`;
    btn.onclick = () => this.showModal();
    header.appendChild(btn);
  }

  // ─── MODAL ĐĂNG NHẬP ────────────────────────────────────
  injectModal() {
    if (document.getElementById('auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = `display:none;position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;`;
    modal.innerHTML = `
      <div style="position:relative;background:var(--card-bg,#fff);border-radius:20px;
        padding:32px;width:360px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);
        animation:authSlideIn 0.28s cubic-bezier(.22,.68,0,1.2);">
        <h2 style="font-size:20px;font-weight:800;color:#0d9488;margin-bottom:8px;">Đăng nhập</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Lưu tiến trình học lên cloud, xem lại mọi lúc mọi nơi.</p>
        <input id="auth-email" type="email" placeholder="Email" autocomplete="email"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none;">
        <input id="auth-password" type="password" placeholder="Mật khẩu" autocomplete="current-password"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:4px;box-sizing:border-box;outline:none;">
        <p style="text-align:right;margin:4px 0 12px;">
          <span id="auth-forgot-link" style="font-size:12px;color:#0d9488;cursor:pointer;text-decoration:underline;">Quên mật khẩu?</span>
        </p>
        <button id="auth-login-btn" style="width:100%;padding:10px;border-radius:10px;
          background:#0d9488;color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;">
          Đăng nhập
        </button>
        <p id="auth-error" style="color:#dc2626;font-size:12px;margin-top:10px;display:none;"></p>
        <p style="text-align:center;font-size:13px;color:#64748b;margin:14px 0 0;">
          Chưa có tài khoản?
          <span id="auth-switch-to-register" style="color:#0d9488;font-weight:700;cursor:pointer;text-decoration:underline;">Đăng ký ngay</span>
        </p>
        <button id="auth-close-btn" style="position:absolute;top:16px;right:16px;background:none;
          border:none;cursor:pointer;font-size:20px;color:#94a3b8;">✕</button>
      </div>
      <style>@keyframes authSlideIn{from{opacity:0;transform:translateY(-18px) scale(.96)}to{opacity:1;transform:none}}</style>
    `;
    document.body.appendChild(modal);
    this.modal = modal;

    const em = modal.querySelector('#auth-email');
    const pw = modal.querySelector('#auth-password');
    em.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); pw.focus(); } };
    pw.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); this.signInWithEmail(); } };
    modal.querySelector('#auth-login-btn').onclick          = () => this.signInWithEmail();
    modal.querySelector('#auth-close-btn').onclick          = () => this.hideModal();
    modal.querySelector('#auth-switch-to-register').onclick = () => { this.hideModal(); this.showRegisterModal(); };
    modal.querySelector('#auth-forgot-link').onclick        = () => { this.hideModal(); this.showForgotModal(); };
    modal.onclick = (e) => { if (e.target === modal) this.hideModal(); };
  }

  // ─── MODAL ĐĂNG KÝ ────────────────────────────────────
  injectRegisterModal() {
    if (document.getElementById('auth-register-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-register-modal';
    modal.style.cssText = `display:none;position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;`;
    modal.innerHTML = `
      <div style="position:relative;background:var(--card-bg,#fff);border-radius:20px;
        padding:32px;width:360px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);
        animation:authSlideIn 0.28s cubic-bezier(.22,.68,0,1.2);">
        <h2 style="font-size:20px;font-weight:800;color:#0d9488;margin-bottom:8px;">Tạo tài khoản</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Miễn phí — lưu tiến trình học mãi mãi.</p>
        <input id="reg-email" type="email" placeholder="Email" autocomplete="email"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none;">
        <input id="reg-password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="new-password"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;">
        <button id="reg-submit-btn" style="width:100%;padding:10px;border-radius:10px;
          background:#0d9488;color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;">
          Tạo tài khoản
        </button>
        <p id="reg-error" style="font-size:12px;margin-top:10px;display:none;"></p>
        <p style="text-align:center;font-size:13px;color:#64748b;margin:14px 0 0;">
          Đã có tài khoản?
          <span id="reg-switch-to-login" style="color:#0d9488;font-weight:700;cursor:pointer;text-decoration:underline;">Đăng nhập</span>
        </p>
        <button id="reg-close-btn" style="position:absolute;top:16px;right:16px;background:none;
          border:none;cursor:pointer;font-size:20px;color:#94a3b8;">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    this.registerModal = modal;

    const em = modal.querySelector('#reg-email');
    const pw = modal.querySelector('#reg-password');
    em.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); pw.focus(); } };
    pw.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); this.signUpWithEmail(); } };
    modal.querySelector('#reg-submit-btn').onclick      = () => this.signUpWithEmail();
    modal.querySelector('#reg-close-btn').onclick       = () => this.hideRegisterModal();
    modal.querySelector('#reg-switch-to-login').onclick = () => { this.hideRegisterModal(); this.showModal(); };
    modal.onclick = (e) => { if (e.target === modal) this.hideRegisterModal(); };
  }

  // ─── MODAL QUÊN MẬT KHẨU ────────────────────────────────────
  injectForgotModal() {
    if (document.getElementById('auth-forgot-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-forgot-modal';
    modal.style.cssText = `display:none;position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;`;
    modal.innerHTML = `
      <div style="position:relative;background:var(--card-bg,#fff);border-radius:20px;
        padding:32px;width:360px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);
        animation:authSlideIn 0.28s cubic-bezier(.22,.68,0,1.2);">
        <h2 style="font-size:20px;font-weight:800;color:#0d9488;margin-bottom:8px;">Quên mật khẩu</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Nhập email đã đăng ký — chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
        <input id="forgot-email" type="email" placeholder="Email đã đăng ký" autocomplete="email"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;">
        <button id="forgot-submit-btn" style="width:100%;padding:10px;border-radius:10px;
          background:#0d9488;color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;">
          Gửi link đặt lại mật khẩu
        </button>
        <p id="forgot-error" style="font-size:12px;margin-top:10px;display:none;"></p>
        <p style="text-align:center;font-size:13px;color:#64748b;margin:14px 0 0;">
          <span id="forgot-back-login" style="color:#0d9488;font-weight:700;cursor:pointer;text-decoration:underline;">← Quay lại đăng nhập</span>
        </p>
        <button id="forgot-close-btn" style="position:absolute;top:16px;right:16px;background:none;
          border:none;cursor:pointer;font-size:20px;color:#94a3b8;">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    this.forgotModal = modal;

    const em = modal.querySelector('#forgot-email');
    em.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); this.sendPasswordReset(); } };
    modal.querySelector('#forgot-submit-btn').onclick = () => this.sendPasswordReset();
    modal.querySelector('#forgot-close-btn').onclick  = () => this.hideForgotModal();
    modal.querySelector('#forgot-back-login').onclick = () => { this.hideForgotModal(); this.showModal(); };
    modal.onclick = (e) => { if (e.target === modal) this.hideForgotModal(); };
  }

  // ─── MODAL ĐỔI MẬT KHẨU ────────────────────────────────────
  injectChangePassModal() {
    if (document.getElementById('auth-changepass-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-changepass-modal';
    modal.style.cssText = `display:none;position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;`;
    modal.innerHTML = `
      <div style="position:relative;background:var(--card-bg,#fff);border-radius:20px;
        padding:32px;width:360px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);
        animation:authSlideIn 0.28s cubic-bezier(.22,.68,0,1.2);">
        <h2 style="font-size:20px;font-weight:800;color:#0d9488;margin-bottom:8px;">Đổi mật khẩu</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        <input id="cp-new-password" type="password" placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:8px;box-sizing:border-box;outline:none;">
        <input id="cp-confirm-password" type="password" placeholder="Nhập lại mật khẩu mới"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;
          font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;">
        <button id="cp-submit-btn" style="width:100%;padding:10px;border-radius:10px;
          background:#0d9488;color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;">
          Cập nhật mật khẩu
        </button>
        <p id="cp-error" style="font-size:12px;margin-top:10px;display:none;"></p>
        <button id="cp-close-btn" style="position:absolute;top:16px;right:16px;background:none;
          border:none;cursor:pointer;font-size:20px;color:#94a3b8;">✕</button>
      </div>
    `;
    document.body.appendChild(modal);
    this.changePassModal = modal;

    const p1 = modal.querySelector('#cp-new-password');
    const p2 = modal.querySelector('#cp-confirm-password');
    p1.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); p2.focus(); } };
    p2.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); this.changePassword(); } };
    modal.querySelector('#cp-submit-btn').onclick = () => this.changePassword();
    modal.querySelector('#cp-close-btn').onclick  = () => this.hideChangePassModal();
    modal.onclick = (e) => { if (e.target === modal) this.hideChangePassModal(); };
  }

  // ─── AUTH ACTIONS ────────────────────────────────────
  async signInWithEmail() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!email || !password) { this.showError('login', 'Vui lòng nhập email và mật khẩu.'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) this.showError('login', this._translateError(error.message));
  }

  async signUpWithEmail() {
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!email)    { this.showError('reg', 'Vui lòng nhập email.'); return; }
    if (!password) { this.showError('reg', 'Vui lòng nhập mật khẩu.'); return; }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) this.showError('reg', this._translateError(error.message));
    else       this.showError('reg', '✓ Tài khoản đã tạo! Đang đăng nhập...');
  }

  async sendPasswordReset() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) { this.showError('forgot', 'Vui lòng nhập email.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) this.showError('forgot', this._translateError(error.message));
    else       this.showError('forgot', '✓ Đã gửi! Kiểm tra hộp thư email của bạn để đặt lại mật khẩu.');
  }

  async changePassword() {
    const p1 = document.getElementById('cp-new-password').value;
    const p2 = document.getElementById('cp-confirm-password').value;
    if (!p1)     { this.showError('cp', 'Vui lòng nhập mật khẩu mới.'); return; }
    if (p1 !== p2) { this.showError('cp', 'Mật khẩu nhập lại không khớp.'); return; }
    if (p1.length < 6) { this.showError('cp', 'Mật khẩu cần ít nhất 6 ký tự.'); return; }
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) this.showError('cp', this._translateError(error.message));
    else {
      this.showError('cp', '✓ Đổi mật khẩu thành công!');
      setTimeout(() => this.hideChangePassModal(), 1500);
    }
  }

  async signOut() {
    if (!confirm('Bạn có chắc muốn đăng xuất khỏi hệ thống?')) return;
    try { await supabase.auth.signOut({ scope: 'global' }); } catch (e) { console.error('SignOut error:', e); }

    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-') && !key.includes('supabase') && !key.includes('auth-token'))
        backup[key] = localStorage.getItem(key);
    }
    localStorage.clear();
    sessionStorage.clear();

    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const name = c.indexOf('=') > -1 ? c.substr(0, c.indexOf('=')).trim() : c.trim();
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

  // ─── USER MENU KHI ĐÃ ĐĂNG NHẬP ────────────────────────────────────
  async onSignedIn(user) {
    let displayName = user.email;
    try {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (data?.full_name) displayName = data.full_name;
    } catch {}

    const btn = document.getElementById('auth-btn');
    const txt = document.getElementById('auth-btn-text');
    if (txt) txt.textContent = displayName;
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.style.position = 'relative';
      newBtn.onclick = () => this._toggleUserMenu(newBtn, user.email);
    }
  }

  _toggleUserMenu(btn, email) {
    const existing = document.getElementById('auth-user-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'auth-user-menu';
    menu.style.cssText = `
      position:absolute;top:calc(100% + 8px);right:0;
      background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);
      padding:8px;min-width:200px;z-index:100000;
      border:1px solid #e2e8f0;
    `;
    menu.innerHTML = `
      <p style="font-size:11px;color:#94a3b8;padding:6px 10px 4px;margin:0;">${email}</p>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:4px 0;">
      <div id="menu-change-pass" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;
        color:#0f172a;font-weight:600;display:flex;align-items:center;gap:8px;"
        onmouseenter="this.style.background='#f0fdfa'" onmouseleave="this.style.background='transparent'">
        🔐 Đổi mật khẩu
      </div>
      <div id="menu-sign-out" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;
        color:#dc2626;font-weight:600;display:flex;align-items:center;gap:8px;"
        onmouseenter="this.style.background='#fef2f2'" onmouseleave="this.style.background='transparent'">
        🚪 Đăng xuất
      </div>
    `;

    btn.appendChild(menu);

    menu.querySelector('#menu-change-pass').onclick = (e) => { e.stopPropagation(); menu.remove(); this.showChangePassModal(); };
    menu.querySelector('#menu-sign-out').onclick    = (e) => { e.stopPropagation(); menu.remove(); this.signOut(); };

    // Đóng menu khi click ngoài
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }

  onSignedOut() {
    const btn = document.getElementById('auth-btn');
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      const txt = newBtn.querySelector('#auth-btn-text');
      if (txt) txt.textContent = '🔑 Đăng nhập';
      newBtn.addEventListener('click', () => this.showModal());
    }
  }

  // ─── HELPERS ────────────────────────────────────────
  showModal()          { if (this.modal)           this.modal.style.display           = 'flex'; }
  hideModal()          { if (this.modal)           this.modal.style.display           = 'none'; }
  showRegisterModal()  { if (this.registerModal)   this.registerModal.style.display   = 'flex'; }
  hideRegisterModal()  { if (this.registerModal)   this.registerModal.style.display   = 'none'; }
  showForgotModal()    { if (this.forgotModal)     this.forgotModal.style.display     = 'flex'; }
  hideForgotModal()    { if (this.forgotModal)     this.forgotModal.style.display     = 'none'; }
  showChangePassModal(){ if (this.changePassModal) this.changePassModal.style.display = 'flex'; }
  hideChangePassModal(){ if (this.changePassModal) this.changePassModal.style.display = 'none'; }

  showError(form, msg) {
    const map = { login: 'auth-error', reg: 'reg-error', forgot: 'forgot-error', cp: 'cp-error' };
    const el = document.getElementById(map[form]);
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      el.style.color = msg.startsWith('✓') ? '#0d9488' : '#dc2626';
    }
  }

  _translateError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
    if (msg.includes('Email not confirmed'))       return 'Email chưa được xác nhận. Kiểm tra hộp thư nhé!';
    if (msg.includes('User already registered'))   return 'Email này đã được đăng ký rồi.';
    if (msg.includes('Password should be'))        return 'Mật khẩu cần ít nhất 6 ký tự.';
    if (msg.includes('For security purposes'))     return 'Vui lòng chờ vài phút trước khi thử lại.';
    return msg;
  }
}
