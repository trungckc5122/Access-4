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
        // NGAY LẬP TỨC xóa hash trên URL sau khi đăng nhập thành công (đặc biệt là sau OAuth)
        // Điều này ngăn chặn việc F5 trang web tự động đăng nhập lại bằng token cũ trên URL.
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState("", document.title, window.location.pathname + window.location.search);
        }
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

        <!-- Email/Password -->
        <div style="padding-top:4px;">
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
    const emailInput = modal.querySelector('#auth-email');
    const passInput  = modal.querySelector('#auth-password');

    emailInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        passInput.focus();
      }
    };

    passInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.signInWithEmail();
      }
    };

    modal.querySelector('#auth-login-btn').onclick   = () => this.signInWithEmail();
    modal.querySelector('#auth-register-btn').onclick= () => this.signUpWithEmail();
    modal.querySelector('#auth-close-btn').onclick   = () => this.hideModal();
    modal.onclick = (e) => { if (e.target === modal) this.hideModal(); };
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
    // 0. Hiển thị trạng thái đang thoát
    this.onSignedOut();

    try {
      // 1. Gọi lệnh signOut của Supabase
      await supabase.auth.signOut({ scope: 'global' });
    } catch(e) {
      console.error("SignOut error:", e);
    }
    
    // 2. Sao lưu dữ liệu bài làm (tiến độ, ghi chú, highlights, v.v.)
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-') && !key.includes('supabase') && !key.includes('auth-token')) {
        backup[key] = localStorage.getItem(key);
      }
    }

    // 3. Xóa sạch LocalStorage & SessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // 4. Xóa sạch Cookie để diệt tận gốc session ngầm
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
    }

    // 5. Xóa sạch IndexedDB (Supabase đôi khi lưu session ở đây)
    if (window.indexedDB && window.indexedDB.databases) {
      try {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name && (db.name.includes('supabase') || db.name.includes('auth'))) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (e) {
        console.error("IndexedDB clear error:", e);
      }
    }

    // 6. Khôi phục lại dữ liệu bài làm từ bản sao lưu
    Object.entries(backup).forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });
    
    // 7. Điều hướng về trang sạch hoàn toàn (loại bỏ mọi hash/token)
    window.location.replace(window.location.origin + window.location.pathname);
  }

  onSignedIn(user) {
    const btn = document.getElementById('auth-btn');
    const txt = document.getElementById('auth-btn-text');
    if (txt) {
      // Hiển thị trực tiếp email của người dùng
      txt.textContent = user.email;
    }
    if (btn) {
      // Xóa các listener cũ để tránh trùng lặp
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn đăng xuất khỏi hệ thống?')) {
          this.signOut();
        }
      });
    }
  }

  onSignedOut() {
    const btn = document.getElementById('auth-btn');
    if (btn) {
      // Làm mới nút để dọn sạch mọi listener cũ (như cái confirm đăng xuất)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      const txt = newBtn.querySelector('#auth-btn-text');
      if (txt) txt.textContent = '🔑 Đăng nhập';
      
      newBtn.addEventListener('click', () => this.showModal());
    }
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
