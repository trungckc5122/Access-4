// js/dashboard-app.js
import { supabase, getCurrentUser } from './supabase-client.js';
import { AuthUI } from './auth-ui.js';

class TeacherDashboard {
  constructor() {
    this.user = null;
    this.classes = [];
    this.selectedClass = null;
  }

  async init() {
    const authUI = new AuthUI();
    await authUI.init();

    this.user = await getCurrentUser();
    if (!this.user) {
      authUI.showModal();
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') location.reload();
      });
      return;
    }

    await this.loadClasses();
    this.render();
  }

  async loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('*, class_students(count)')
      .eq('teacher_id', this.user.id)
      .order('created_at', { ascending: false });
    this.classes = data || [];
  }

  async loadClassStudents(classId) {
    const { data } = await supabase
      .from('class_students')
      .select(`
        student_id,
        profiles!class_students_student_id_fkey(full_name, email),
        joined_at
      `)
      .eq('class_id', classId);
    return data || [];
  }

  async loadProgressForClass(classId) {
    const students = await this.loadClassStudents(classId);
    const studentIds = students.map(s => s.student_id);
    if (studentIds.length === 0) return { students, progress: [] };

    const { data } = await supabase
      .from('progress')
      .select('*')
      .in('user_id', studentIds)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    return { students, progress: data || [] };
  }

  async createClass(name) {
    const { data, error } = await supabase
      .from('classes')
      .insert({ teacher_id: this.user.id, name })
      .select()
      .single();
    if (!error) {
      this.classes.unshift(data);
      this.render();
    }
    return { data, error };
  }

  async deleteClass(classId) {
    if (!confirm('Xóa lớp này? Tất cả dữ liệu liên quan sẽ bị xóa.')) return;
    await supabase.from('classes').delete().eq('id', classId);
    this.classes = this.classes.filter(c => c.id !== classId);
    document.getElementById('class-detail').style.display = 'none';
    this.renderClassGrid();
  }

  async removeStudent(classId, studentId) {
    await supabase
      .from('class_students')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId);
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <header style="background:var(--header-bg,linear-gradient(135deg,#134e4a,#0f766e));padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;gap:10px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          Dashboard Giáo viên
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="color:rgba(255,255,255,0.75);font-size:13px;">${this.user?.email || ''}</span>
          <button onclick="dashboard.signOut()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;">Đăng xuất</button>
        </div>
      </header>

      <div style="max-width:1100px;margin:0 auto;padding:24px 16px;">

        <!-- Classes list -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="font-size:16px;font-weight:700;color:var(--text,#0f172a);">Lớp học của bạn</h2>
          <button id="create-class-btn" style="
            background:var(--primary,#0d9488);color:#fff;border:none;
            padding:8px 16px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px;
            display:flex;align-items:center;gap:6px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tạo lớp mới
          </button>
        </div>

        <div id="classes-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:32px;"></div>

        <!-- Student progress table -->
        <div id="class-detail" style="display:none;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 id="class-detail-title" style="font-size:15px;font-weight:700;color:var(--text,#0f172a);"></h3>
            <div style="display:flex;gap:8px;">
              <button id="copy-code-btn" style="font-size:12px;padding:6px 12px;border-radius:8px;border:1.5px solid var(--primary,#0d9488);color:var(--primary,#0d9488);background:transparent;cursor:pointer;font-weight:600;">📋 Copy mã lớp</button>
              <button id="delete-class-btn" style="font-size:12px;padding:6px 12px;border-radius:8px;border:1.5px solid #dc2626;color:#dc2626;background:transparent;cursor:pointer;font-weight:600;">🗑 Xóa lớp</button>
              <button onclick="document.getElementById('class-detail').style.display='none'" style="font-size:12px;padding:6px 12px;border-radius:8px;border:1.5px solid var(--border-medium,#cbd5e1);color:var(--text-muted,#64748b);background:transparent;cursor:pointer;">✕ Đóng</button>
            </div>
          </div>
          <div id="progress-table"></div>
        </div>

      </div>
    `;

    document.getElementById('create-class-btn').onclick = async () => {
      const name = prompt('Tên lớp học:');
      if (name?.trim()) await this.createClass(name.trim());
    };

    this.renderClassGrid();
  }

  renderClassGrid() {
    const grid = document.getElementById('classes-grid');
    if (!grid) return;

    if (this.classes.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted,#64748b);grid-column:1/-1;">Chưa có lớp nào. Nhấn "+ Tạo lớp mới" để bắt đầu!</p>';
      return;
    }

    grid.innerHTML = this.classes.map(c => `
      <div style="
        background:var(--card-bg,#fff);border-radius:16px;padding:20px;
        border:1.5px solid var(--border-light,#e2e8f0);cursor:pointer;
        transition:box-shadow 0.2s,transform 0.2s;
        box-shadow:0 2px 8px rgba(0,0,0,0.06);
      "
      onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)';this.style.transform='translateY(-2px)'"
      onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)';this.style.transform=''"
      onclick="dashboard.selectClass('${c.id}')">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px;color:var(--text,#0f172a);">${c.name}</div>
        <div style="font-size:12px;color:var(--text-muted,#64748b);margin-bottom:4px;">
          Mã lớp: <strong style="color:var(--primary,#0d9488);letter-spacing:2px;font-size:13px;">${c.join_code}</strong>
        </div>
        <div style="font-size:12px;color:var(--text-muted,#64748b);">
          ${c.class_students?.[0]?.count ?? 0} học sinh
        </div>
      </div>
    `).join('');
  }

  async selectClass(classId) {
    this.selectedClass = classId;
    const cls = this.classes.find(c => c.id === classId);

    const detail = document.getElementById('class-detail');
    const title  = document.getElementById('class-detail-title');
    const table  = document.getElementById('progress-table');

    title.textContent = `Đang tải lớp "${cls.name}"...`;
    detail.style.display = 'block';
    table.innerHTML = '<p style="color:var(--text-muted,#64748b);">Đang tải...</p>';
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const { students, progress } = await this.loadProgressForClass(classId);

    title.textContent = `Lớp "${cls.name}" — ${students.length} học sinh`;

    document.getElementById('copy-code-btn').onclick = () => {
      navigator.clipboard.writeText(cls.join_code).then(() => alert(`✓ Đã copy mã lớp: ${cls.join_code}`));
    };
    document.getElementById('delete-class-btn').onclick = () => this.deleteClass(classId);

    // Build progress map
    const progressMap = {};
    progress.forEach(p => {
      if (!progressMap[p.user_id]) progressMap[p.user_id] = [];
      progressMap[p.user_id].push(p);
    });

    if (students.length === 0) {
      table.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--text-muted,#64748b);">
          <div style="font-size:32px;margin-bottom:8px;">👥</div>
          <div>Chưa có học sinh nào trong lớp.</div>
          <div style="font-size:13px;margin-top:4px;">Chia sẻ mã lớp <strong>${cls.join_code}</strong> cho học sinh để tham gia.</div>
        </div>
      `;
      return;
    }

    table.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;background:var(--card-bg,#fff);border-radius:12px;overflow:hidden;border:1px solid var(--border-light,#e2e8f0);">
          <thead>
            <tr style="background:var(--primary-light,#ccfbf1);border-bottom:2px solid var(--primary,#0d9488);">
              <th style="text-align:left;padding:12px 16px;font-weight:700;color:var(--primary,#0d9488);">Học sinh</th>
              <th style="padding:12px 16px;font-weight:700;color:var(--primary,#0d9488);text-align:center;">Bài đã làm</th>
              <th style="padding:12px 16px;font-weight:700;color:var(--primary,#0d9488);text-align:center;">Điểm TB</th>
              <th style="padding:12px 16px;font-weight:700;color:var(--primary,#0d9488);text-align:center;">Hoạt động cuối</th>
              <th style="padding:12px 16px;font-weight:700;color:var(--primary,#0d9488);text-align:center;"></th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const sp = progressMap[s.student_id] || [];
              const avgScore = sp.length > 0
                ? Math.round(sp.reduce((acc, p) => acc + (p.score / (p.total || 1) * 100), 0) / sp.length)
                : null;
              const lastActivity = sp.length > 0
                ? new Date(Math.max(...sp.map(p => new Date(p.submitted_at)))).toLocaleDateString('vi-VN')
                : '—';
              const rowBg = idx % 2 === 0 ? '' : 'background:var(--content-bg,#f8fafc);';
              return `
                <tr style="border-bottom:1px solid var(--border-light,#e2e8f0);${rowBg}">
                  <td style="padding:12px 16px;">
                    <div style="font-weight:600;color:var(--text,#0f172a);">${s.profiles?.full_name || 'N/A'}</div>
                    <div style="font-size:11px;color:var(--text-muted,#64748b);">${s.profiles?.email || ''}</div>
                  </td>
                  <td style="text-align:center;padding:12px 16px;font-weight:600;">${sp.length}</td>
                  <td style="text-align:center;padding:12px 16px;">
                    ${avgScore !== null
                      ? `<span style="
                          background:${avgScore >= 70 ? '#dcfce7' : avgScore >= 50 ? '#fef3c7' : '#fee2e2'};
                          color:${avgScore >= 70 ? '#16a34a' : avgScore >= 50 ? '#92400e' : '#dc2626'};
                          padding:3px 10px;border-radius:99px;font-weight:700;font-size:12px;
                        ">${avgScore}%</span>`
                      : '<span style="color:var(--text-muted,#94a3b8);">—</span>'
                    }
                  </td>
                  <td style="text-align:center;padding:12px 16px;color:var(--text-muted,#64748b);">${lastActivity}</td>
                  <td style="text-align:center;padding:12px 16px;">
                    <button onclick="dashboard.viewStudentDetail('${s.student_id}', '${s.profiles?.full_name || 'Học sinh'}')"
                      style="font-size:12px;padding:5px 12px;border-radius:8px;border:1.5px solid var(--primary,#0d9488);cursor:pointer;background:transparent;color:var(--primary,#0d9488);font-weight:600;">
                      Chi tiết
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async viewStudentDetail(studentId, studentName) {
    const { data: progressList } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', studentId)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    const html = (progressList || []).map(p => `
      <tr style="border-bottom:1px solid var(--border-light,#e2e8f0);font-size:13px;">
        <td style="padding:10px 12px;font-weight:600;">${p.exam.toUpperCase()} ${p.skill}</td>
        <td style="padding:10px 12px;text-align:center;">Book ${p.book} · Test ${p.test} · Part ${p.part}</td>
        <td style="padding:10px 12px;text-align:center;font-weight:700;">${p.score}/${p.total}</td>
        <td style="padding:10px 12px;text-align:center;">
          <span style="
            background:${(p.score/p.total*100) >= 70 ? '#dcfce7' : (p.score/p.total*100) >= 50 ? '#fef3c7' : '#fee2e2'};
            color:${(p.score/p.total*100) >= 70 ? '#16a34a' : (p.score/p.total*100) >= 50 ? '#92400e' : '#dc2626'};
            padding:2px 8px;border-radius:99px;font-weight:700;font-size:12px;
          ">${Math.round(p.score/p.total*100)}%</span>
        </td>
        <td style="padding:10px 12px;text-align:center;color:var(--text-muted,#64748b);">
          ${new Date(p.submitted_at).toLocaleDateString('vi-VN')}
        </td>
      </tr>
    `).join('');

    document.getElementById('progress-table').innerHTML = `
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;">
        <button onclick="dashboard.selectClass(dashboard.selectedClass)"
          style="font-size:12px;padding:6px 12px;border-radius:8px;border:1.5px solid var(--border-medium,#cbd5e1);background:transparent;cursor:pointer;color:var(--text-muted,#64748b);">
          ← Quay lại danh sách
        </button>
        <span style="font-size:14px;font-weight:700;color:var(--text,#0f172a);">Chi tiết: ${studentName}</span>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;background:var(--card-bg,#fff);border-radius:12px;overflow:hidden;border:1px solid var(--border-light,#e2e8f0);">
          <thead>
            <tr style="background:var(--primary-light,#ccfbf1);border-bottom:2px solid var(--primary,#0d9488);">
              <th style="text-align:left;padding:12px;font-size:13px;color:var(--primary,#0d9488);">Kỹ năng</th>
              <th style="padding:12px;font-size:13px;color:var(--primary,#0d9488);text-align:center;">Bài thi</th>
              <th style="padding:12px;font-size:13px;color:var(--primary,#0d9488);text-align:center;">Điểm</th>
              <th style="padding:12px;font-size:13px;color:var(--primary,#0d9488);text-align:center;">%</th>
              <th style="padding:12px;font-size:13px;color:var(--primary,#0d9488);text-align:center;">Ngày</th>
            </tr>
          </thead>
          <tbody>
            ${html || '<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-muted,#64748b);">Chưa có bài nộp</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async signOut() {
    if (confirm('Đăng xuất?')) {
      await supabase.auth.signOut();
      location.reload();
    }
  }
}

const dashboard = new TeacherDashboard();
window.dashboard = dashboard;
dashboard.init();
