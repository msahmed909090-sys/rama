// ============================================
// لوحة الإدارة - الكود الكامل
// ============================================

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCuZZqke1vA0db_CpVzb12epJaOEzJGZ9E",
    authDomain: "lamet-ramadan-c1740.firebaseapp.com",
    projectId: "lamet-ramadan-c1740",
    storageBucket: "lamet-ramadan-c1740.firebasestorage.app",
    messagingSenderId: "179701807452",
    appId: "1:179701807452:web:d662c22e8d6ae9960da999"
  };
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // المتغيرات العامة
  let currentUser = null;
  let adminData = null;
  let selectedUserId = null;
  let allUsers = [];
  let allQuestions = [];
  let allPosts = [];
  let currentChatId = null;
  
  const ADMIN_ID = '4444';
  
  // ============================================
  // التحقق من المصادقة
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
      const loading = document.getElementById('loadingScreen');
      
      if (user) {
        currentUser = user;
        
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          
          if (userDoc.exists && userDoc.data().role === 'admin') {
            adminData = { id: user.uid, ...userDoc.data() };
            showApp();
            init();
          } else {
            showDenied();
          }
        } catch (e) {
          console.error(e);
          showDenied();
        }
      } else {
        showDenied();
      }
      
      setTimeout(() => loading.classList.add('hidden'), 400);
    });
  });
  
  function showDenied() {
    document.getElementById('accessDenied').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  }
  
  function showApp() {
    document.getElementById('accessDenied').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
  }
  
  // ============================================
  // التهيئة
  // ============================================
  function init() {
    updateUI();
    setupNavigation();
    loadDashboard();
  }
  
  function updateUI() {
    const avatar = adminData?.photoURL || defaultAvatar();
    document.getElementById('adminAvatar').src = avatar;
    document.getElementById('adminName').textContent = adminData?.username || 'المدير';
  }
  
  function defaultAvatar() {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a2845" width="100" height="100"/><text x="50" y="65" text-anchor="middle" fill="%23e8b931" font-size="40">👤</text></svg>';
  }
  
  // ============================================
  // التنقل
  // ============================================
  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        showSection(section);
      });
    });
  }
  
  function showSection(name) {
    // تحديث القائمة
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${name}"]`)?.classList.add('active');
    
    // تحديث الأقسام
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(name + 'Section')?.classList.add('active');
    
    // إغلاق القائمة على الموبايل
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
    
    // تحميل البيانات
    loadSection(name);
  }
  
  function loadSection(name) {
    switch(name) {
      case 'dashboard': loadDashboard(); break;
      case 'users': loadUsers(); break;
      case 'questions': loadQuestions(); break;
      case 'posts': loadPosts(); break;
      case 'support': loadSupport(); break;
      case 'logs': loadLogs(); break;
    }
  }
  
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  }
  
  // ============================================
  // لوحة التحكم
  // ============================================
  async function loadDashboard() {
    try {
      const [usersSnap, questionsSnap, postsSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('questions').get(),
        db.collection('fb_posts').get()
      ]);
      
      // عد المستخدمين المتصلين
      let online = 0;
      const users = [];
      
      usersSnap.forEach(doc => {
        const d = doc.data();
        users.push({ id: doc.id, ...d });
        
        if (d.lastOnline) {
          const last = d.lastOnline.toDate ? d.lastOnline.toDate() : new Date(d.lastOnline);
          if (Date.now() - last < 300000) online++;
        }
      });
      
      document.getElementById('totalUsers').textContent = usersSnap.size;
      document.getElementById('onlineUsers').textContent = online;
      document.getElementById('totalQuestions').textContent = questionsSnap.size;
      document.getElementById('totalPosts').textContent = postsSnap.size;
      
      // أفضل المستخدمين
      const topUsers = users.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
      renderTopUsers(topUsers);
      
      // آخر النشاطات
      loadRecentActivity();
      
      // تحديث شارات القائمة
      document.getElementById('usersBadge').textContent = usersSnap.size > 0 ? usersSnap.size : '';
      document.getElementById('questionsBadge').textContent = questionsSnap.size > 0 ? questionsSnap.size : '';
      
    } catch (e) {
      console.error('Dashboard error:', e);
    }
  }
  
  function renderTopUsers(users) {
    const container = document.getElementById('topUsersList');
    if (!container) return;
    
    if (users.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">لا يوجد مستخدمون</p>';
      return;
    }
    
    container.innerHTML = users.map((u, i) => `
      <div class="top-item" onclick="openUserModal('${u.id}')">
        <div class="top-rank r${i + 1}">${i + 1}</div>
        <img src="${u.photoURL || defaultAvatar()}" alt="">
        <div class="top-info">
          <span>${escapeHtml(u.username || 'مستخدم')}</span>
          <span>مستوى ${u.level || 1}</span>
        </div>
        <span class="top-pts">${u.points || 0}</span>
      </div>
    `).join('');
  }
  
  async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
      const snap = await db.collection('adminLogs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      if (snap.empty) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">لا توجد نشاطات</p>';
        return;
      }
      
      container.innerHTML = snap.docs.map(doc => {
        const log = doc.data();
        const iconClass = log.type === 'user' ? 'blue' : log.type === 'content' ? 'orange' : log.type === 'security' ? 'red' : 'green';
        const icon = log.type === 'user' ? 'fa-user' : log.type === 'content' ? 'fa-file' : log.type === 'security' ? 'fa-shield' : 'fa-cog';
        
        return `
          <div class="activity-item">
            <div class="activity-icon ${iconClass}"><i class="fas ${icon}"></i></div>
            <span class="activity-text">${escapeHtml(log.action)}</span>
            <span class="activity-time">${formatTime(log.timestamp)}</span>
          </div>
        `;
      }).join('');
      
    } catch (e) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">لا توجد بيانات</p>';
    }
  }
  
  // ============================================
  // المستخدمون
  // ============================================
  async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
    
    try {
      const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
      allUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderUsers(allUsers);
    } catch (e) {
      container.innerHTML = '<p style="text-align:center;color:var(--danger);">حدث خطأ</p>';
    }
  }
  
  function renderUsers(users) {
    const container = document.getElementById('usersList');
    
    if (users.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">لا يوجد مستخدمون</p>';
      return;
    }
    
    container.innerHTML = users.map(u => {
      const statusClass = u.banned ? 'banned' : u.role === 'admin' ? 'admin' : 'active';
      const statusText = u.banned ? 'محظور' : u.role === 'admin' ? 'مشرف' : 'نشط';
      
      return `
        <div class="user-card ${u.banned ? 'banned' : ''}" onclick="openUserModal('${u.id}')">
          <img src="${u.photoURL || defaultAvatar()}" alt="">
          <div class="info">
            <h4>
              ${escapeHtml(u.username || 'مستخدم')}
              ${u.verified ? '<span class="verified-badge">✓</span>' : ''}
              ${u.role === 'admin' ? '<span class="admin-badge">👑</span>' : ''}
            </h4>
            <p>ID: ${u.chatId || u.id.slice(0, 8)}</p>
          </div>
          <div class="stats-mini">
            <div><span>${u.points || 0}</span><span>نقطة</span></div>
            <div><span>${u.level || 1}</span><span>مستوى</span></div>
          </div>
          <span class="status-tag ${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  }
  
  // بحث المستخدمين
  document.getElementById('userSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    if (!q) return renderUsers(allUsers);
    
    const filtered = allUsers.filter(u => 
      (u.username || '').toLowerCase().includes(q) ||
      (u.chatId || '').includes(q)
    );
    renderUsers(filtered);
  });
  
  // فلترة المستخدمين
  document.getElementById('userFilter')?.addEventListener('change', function() {
    const filter = this.value;
    let filtered = allUsers;
    
    if (filter === 'admin') filtered = allUsers.filter(u => u.role === 'admin');
    else if (filter === 'verified') filtered = allUsers.filter(u => u.verified);
    else if (filter === 'banned') filtered = allUsers.filter(u => u.banned);
    
    renderUsers(filtered);
  });
  
  // ============================================
  // مودال المستخدم
  // ============================================
  async function openUserModal(userId) {
    selectedUserId = userId;
    
    try {
      const doc = await db.collection('users').doc(userId).get();
      if (!doc.exists) return toast('المستخدم غير موجود', 'error');
      
      const u = doc.data();
      
      document.getElementById('modalUserAvatar').src = u.photoURL || defaultAvatar();
      document.getElementById('modalUserName').innerHTML = `
        ${escapeHtml(u.username || 'مستخدم')}
        ${u.verified ? '<span class="verified-badge">✓</span>' : ''}
      `;
      document.getElementById('modalUserId').textContent = `ID: ${u.chatId || userId.slice(0, 8)}`;
      document.getElementById('modalPoints').textContent = u.points || 0;
      document.getElementById('modalLevel').textContent = u.level || 1;
      document.getElementById('modalStreak').textContent = u.streakDays || 0;
      
      document.getElementById('editPoints').value = u.points || 0;
      document.getElementById('editLevel').value = u.level || 1;
      
      document.getElementById('toggleAdmin').checked = u.role === 'admin';
      document.getElementById('toggleVerified').checked = u.verified || false;
      document.getElementById('toggleBanned').checked = u.banned || false;
      
      openModal('userModal');
      
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // تحديث النقاط
  async function updatePoints() {
    if (!selectedUserId) return;
    const points = parseInt(document.getElementById('editPoints').value) || 0;
    
    try {
      await db.collection('users').doc(selectedUserId).update({ points });
      await logAction('تعديل النقاط', 'user', { points });
      
      document.getElementById('modalPoints').textContent = points;
      toast('تم تحديث النقاط', 'success');
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  function addPoints(amount) {
    const current = parseInt(document.getElementById('editPoints').value) || 0;
    document.getElementById('editPoints').value = Math.max(0, current + amount);
    updatePoints();
  }
  
  // تحديث المستوى
  async function updateLevel() {
    if (!selectedUserId) return;
    const level = parseInt(document.getElementById('editLevel').value) || 1;
    
    try {
      await db.collection('users').doc(selectedUserId).update({ level });
      await logAction('تعديل المستوى', 'user', { level });
      
      document.getElementById('modalLevel').textContent = level;
      toast('تم تحديث المستوى', 'success');
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // تبديل المشرف
  document.getElementById('toggleAdmin')?.addEventListener('change', async function() {
    if (!selectedUserId) return;
    
    try {
      await db.collection('users').doc(selectedUserId).update({
        role: this.checked ? 'admin' : 'user'
      });
      await logAction(this.checked ? 'ترقية لمشرف' : 'إزالة صلاحية المشرف', 'user');
      toast(this.checked ? 'تم الترقية' : 'تم إزالة الصلاحية', 'success');
    } catch (e) {
      this.checked = !this.checked;
      toast('حدث خطأ', 'error');
    }
  });
  
  // تبديل التوثيق
  document.getElementById('toggleVerified')?.addEventListener('change', async function() {
    if (!selectedUserId) return;
    
    try {
      await db.collection('users').doc(selectedUserId).update({
        verified: this.checked
      });
      await logAction(this.checked ? 'توثيق الحساب' : 'إلغاء التوثيق', 'user');
      toast(this.checked ? 'تم التوثيق ✓' : 'تم إلغاء التوثيق', 'success');
      
      // تحديث الاسم في المودال
      const nameEl = document.getElementById('modalUserName');
      const name = nameEl.textContent.replace('✓', '').trim();
      nameEl.innerHTML = `${escapeHtml(name)} ${this.checked ? '<span class="verified-badge">✓</span>' : ''}`;
    } catch (e) {
      this.checked = !this.checked;
      toast('حدث خطأ', 'error');
    }
  });
  
  // تبديل الحظر
  document.getElementById('toggleBanned')?.addEventListener('change', async function() {
    if (!selectedUserId) return;
    
    try {
      await db.collection('users').doc(selectedUserId).update({
        banned: this.checked
      });
      await logAction(this.checked ? 'حظر الحساب' : 'إلغاء الحظر', 'user');
      toast(this.checked ? 'تم الحظر' : 'تم إلغاء الحظر', 'success');
    } catch (e) {
      this.checked = !this.checked;
      toast('حدث خطأ', 'error');
    }
  });
  
  // تحذير المستخدم
  async function warnUser() {
    if (!selectedUserId) return;
    
    const reason = prompt('سبب التحذير:');
    if (!reason) return;
    
    try {
      // إضافة تحذير
      await db.collection('users').doc(selectedUserId).update({
        warnings: firebase.firestore.FieldValue.increment(1)
      });
      
      // إضافة إشعار للمستخدم
      await db.collection('notifications').add({
        userId: selectedUserId,
        type: 'warning',
        title: 'تحذير من الإدارة',
        content: reason,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await logAction('تحذير مستخدم: ' + reason, 'user');
      toast('تم إرسال التحذير', 'success');
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // إعادة تعيين المستخدم
  async function resetUser() {
    if (!selectedUserId) return;
    if (!confirm('هل أنت متأكد من إعادة تعيين تقدم المستخدم؟')) return;
    
    try {
      await db.collection('users').doc(selectedUserId).update({
        points: 0,
        level: 1,
        streakDays: 0,
        totalKhatma: 0,
        salawatCount: 0
      });
      
      await logAction('إعادة تعيين التقدم', 'user');
      
      document.getElementById('modalPoints').textContent = '0';
      document.getElementById('modalLevel').textContent = '1';
      document.getElementById('modalStreak').textContent = '0';
      
      toast('تم إعادة التعيين', 'success');
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // حذف المستخدم
  async function deleteUser() {
    if (!selectedUserId) return;
    if (!confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    if (!confirm('هذا الإجراء لا يمكن التراجع عنه!')) return;
    
    try {
      await db.collection('users').doc(selectedUserId).delete();
      await logAction('حذف حساب', 'user');
      
      closeModal('userModal');
      loadUsers();
      toast('تم حذف الحساب', 'success');
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // ============================================
  // الأسئلة
  // ============================================
// ============================================
// QUESTIONS SYSTEM - النظام الكامل
// ============================================

let selectedType = null;
let selectedCorrectIndex = 0;
// let allQuestions = [];

// تحميل الأسئلة
async function loadQuestions() {
  const container = document.getElementById('questionsList');
  if (container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
  }
  
  try {
    const snap = await db.collection('questions').orderBy('createdAt', 'desc').limit(200).get();
    allQuestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // تحديث الإحصائيات
    const activeCount = allQuestions.filter(q => q.isActive).length;
    const inactiveCount = allQuestions.length - activeCount;
    
    const activeEl = document.getElementById('activeQuestions');
    const inactiveEl = document.getElementById('inactiveQuestions');
    
    if (activeEl) activeEl.textContent = activeCount;
    if (inactiveEl) inactiveEl.textContent = inactiveCount;
    
    renderQuestionsTable();
    
  } catch (e) {
    console.error('Load questions error:', e);
  }
}

// فلترة الأسئلة
function filterQuestions() {
  renderQuestionsTable();
}

// عرض جدول الأسئلة
function renderQuestionsTable() {
  const typeFilter = document.getElementById('filterType')?.value || 'all';
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  
  let filtered = allQuestions;
  
  if (typeFilter !== 'all') {
    filtered = filtered.filter(q => q.type === typeFilter);
  }
  
  if (statusFilter === 'active') {
    filtered = filtered.filter(q => q.isActive);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(q => !q.isActive);
  }
  
  const typeLabels = {
    mcq: 'اختيار متعدد',
    true_false: 'صح وخطأ',
    complete_ayah: 'أكمل الآية',
    ordering: 'ترتيب'
  };
  
  const tbody = document.getElementById('questionsTable');
  if (!tbody) return;
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">لا توجد أسئلة</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(q => `
    <tr>
      <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(q.questionText || '')}</td>
      <td><span class="type-badge">${typeLabels[q.type] || q.type}</span></td>
      <td>${q.levelRequired || 1}</td>
      <td class="${q.isActive ? 'status-active' : 'status-inactive'}">${q.isActive ? 'مفعّل' : 'معطّل'}</td>
      <td>${q.points || 10}</td>
      <td>
        <div style="display:flex;gap:8px;">
          <button class="btn-sm" onclick="toggleQuestionStatus('${q.id}', ${!q.isActive})" title="${q.isActive ? 'تعطيل' : 'تفعيل'}">
            <i class="fas fa-${q.isActive ? 'eye-slash' : 'eye'}"></i>
          </button>
          <button class="btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="deleteQuestion('${q.id}')" title="حذف">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// تبديل حالة السؤال
async function toggleQuestionStatus(id, newStatus) {
  try {
    await db.collection('questions').doc(id).update({ isActive: newStatus });
    
    // تحديث محلي
    const idx = allQuestions.findIndex(q => q.id === id);
    if (idx !== -1) allQuestions[idx].isActive = newStatus;
    
    // تحديث الإحصائيات
    const activeCount = allQuestions.filter(q => q.isActive).length;
    const inactiveCount = allQuestions.length - activeCount;
    
    const activeEl = document.getElementById('activeQuestions');
    const inactiveEl = document.getElementById('inactiveQuestions');
    
    if (activeEl) activeEl.textContent = activeCount;
    if (inactiveEl) inactiveEl.textContent = inactiveCount;
    
    renderQuestionsTable();
    toast(newStatus ? 'تم تفعيل السؤال' : 'تم تعطيل السؤال', 'success');
    
  } catch (e) {
    toast('حدث خطأ', 'error');
  }
}

// حذف سؤال
async function deleteQuestion(id) {
  if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
  
  try {
    await db.collection('questions').doc(id).delete();
    
    allQuestions = allQuestions.filter(q => q.id !== id);
    
    const activeCount = allQuestions.filter(q => q.isActive).length;
    const inactiveCount = allQuestions.length - activeCount;
    
    const activeEl = document.getElementById('activeQuestions');
    const inactiveEl = document.getElementById('inactiveQuestions');
    
    if (activeEl) activeEl.textContent = activeCount;
    if (inactiveEl) inactiveEl.textContent = inactiveCount;
    
    renderQuestionsTable();
    toast('تم حذف السؤال', 'success');
    
  } catch (e) {
    toast('حدث خطأ', 'error');
  }
}

// فتح مودال إضافة سؤال
function openAddQuestion() {
  selectedType = null;
  selectedCorrectIndex = 0;
  
  const typeSelector = document.getElementById('typeSelector');
  const formArea = document.getElementById('questionFormArea');
  
  if (typeSelector) typeSelector.style.display = 'grid';
  if (formArea) formArea.style.display = 'none';
  
  // إعادة تعيين الحقول
  const textEl = document.getElementById('questionText');
  const diffEl = document.getElementById('difficultySlider');
  const pointsEl = document.getElementById('pointsInput');
  const activeEl = document.getElementById('activeCheckbox');
  
  if (textEl) textEl.value = '';
  if (diffEl) diffEl.value = 3;
  if (pointsEl) pointsEl.value = 10;
  if (activeEl) activeEl.checked = true;
  
  // إزالة التحديد
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  
  openModal('questionModal');
}

// اختيار نوع السؤال
function selectType(type) {
  selectedType = type;
  selectedCorrectIndex = 0;
  
  // تحديد البطاقة
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  
  // إظهار النموذج
  const typeSelector = document.getElementById('typeSelector');
  const formArea = document.getElementById('questionFormArea');
  
  if (typeSelector) typeSelector.style.display = 'none';
  if (formArea) formArea.style.display = 'block';
  
  // بناء الخيارات حسب النوع
  const optionsSection = document.getElementById('optionsSection');
  const optionsHint = document.getElementById('optionsHint');
  
  if (optionsSection) optionsSection.style.display = 'block';
  
  switch(type) {
    case 'true_false':
      if (optionsHint) optionsHint.textContent = 'اختر الإجابة الصحيحة';
      buildTrueFalseOptions();
      break;
    case 'mcq':
      if (optionsHint) optionsHint.textContent = 'اختر الإجابة الصحيحة';
      buildMCQOptions();
      break;
    case 'complete_ayah':
      if (optionsHint) optionsHint.textContent = 'الخيار الصحيح هو الإجابة';
      buildCompleteAyahOptions();
      break;
    case 'ordering':
      if (optionsHint) optionsHint.textContent = 'أدخل العناصر بالترتيب الصحيح';
      buildOrderingOptions();
      break;
  }
  
  updatePreview();
}

// بناء خيارات صح/خطأ
function buildTrueFalseOptions() {
  const builder = document.getElementById('optionsBuilder');
  if (!builder) return;
  
  builder.innerHTML = `
    <div class="option-row">
      <div class="option-radio selected" onclick="selectCorrect(0)"></div>
      <input type="text" class="option-input correct" value="صح" readonly>
    </div>
    <div class="option-row">
      <div class="option-radio" onclick="selectCorrect(1)"></div>
      <input type="text" class="option-input" value="خطأ" readonly>
    </div>
  `;
}

// بناء خيارات الاختيار المتعدد
function buildMCQOptions() {
  const builder = document.getElementById('optionsBuilder');
  if (!builder) return;
  
  builder.innerHTML = '';
  
  for (let i = 0; i < 4; i++) {
    addOptionRow(i);
  }
  
  // زر إضافة خيار
  const addBtn = document.createElement('button');
  addBtn.className = 'add-option-btn';
  addBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة خيار';
  addBtn.onclick = () => {
    const count = builder.querySelectorAll('.option-row').length;
    if (count < 6) {
      addOptionRow(count);
      builder.appendChild(addBtn);
    }
  };
  builder.appendChild(addBtn);
}

// إضافة صف خيار
function addOptionRow(index) {
  const builder = document.getElementById('optionsBuilder');
  if (!builder) return;
  
  const addBtn = builder.querySelector('.add-option-btn');
  
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <div class="option-radio ${index === 0 ? 'selected' : ''}" onclick="selectCorrect(${index})"></div>
    <input type="text" class="option-input ${index === 0 ? 'correct' : ''}" placeholder="الخيار ${index + 1}" oninput="updatePreview()">
    <button class="remove-option-btn" onclick="removeOption(this)">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  if (addBtn) {
    builder.insertBefore(row, addBtn);
  } else {
    builder.appendChild(row);
  }
}

// حذف خيار
function removeOption(btn) {
  btn.parentElement.remove();
  
  // إعادة ترقيم
  const rows = document.querySelectorAll('.options-builder .option-row');
  rows.forEach((row, i) => {
    const radio = row.querySelector('.option-radio');
    if (radio) radio.setAttribute('onclick', `selectCorrect(${i})`);
  });
  
  updatePreview();
}

// بناء خيارات أكمل الآية
function buildCompleteAyahOptions() {
  const builder = document.getElementById('optionsBuilder');
  if (!builder) return;
  
  builder.innerHTML = '';
  
  for (let i = 0; i < 4; i++) {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
      <div class="option-radio ${i === 0 ? 'selected' : ''}" onclick="selectCorrect(${i})"></div>
      <input type="text" class="option-input ${i === 0 ? 'correct' : ''}" placeholder="كلمة أو عبارة" oninput="updatePreview()">
    `;
    builder.appendChild(row);
  }
}

// بناء خيارات الترتيب
function buildOrderingOptions() {
  const builder = document.getElementById('optionsBuilder');
  if (!builder) return;
  
  builder.innerHTML = '<p style="color:var(--text-muted);margin-bottom:12px;">أدخل العناصر بالترتيب الصحيح:</p>';
  
  for (let i = 0; i < 4; i++) {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
      <span class="option-num">${i + 1}</span>
      <input type="text" class="option-input" placeholder="العنصر ${i + 1}" oninput="updatePreview()">
    `;
    builder.appendChild(row);
  }
  
  // زر إضافة
  const addBtn = document.createElement('button');
  addBtn.className = 'add-option-btn';
  addBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة عنصر';
  addBtn.onclick = () => {
    const count = builder.querySelectorAll('.option-row').length;
    if (count < 8) {
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML = `
        <span class="option-num">${count + 1}</span>
        <input type="text" class="option-input" placeholder="العنصر ${count + 1}" oninput="updatePreview()">
      `;
      builder.insertBefore(row, addBtn);
    }
  };
  builder.appendChild(addBtn);
}

// اختيار الإجابة الصحيحة
function selectCorrect(index) {
  selectedCorrectIndex = index;
  
  document.querySelectorAll('.option-radio').forEach((radio, i) => {
    radio.classList.toggle('selected', i === index);
  });
  
  document.querySelectorAll('.option-input').forEach((input, i) => {
    input.classList.toggle('correct', i === index);
  });
  
  updatePreview();
}

// تحديث شريط الصعوبة
function updateDifficulty() {
  const slider = document.getElementById('difficultySlider');
  const label = document.getElementById('difficultyLabel');
  
  if (!slider || !label) return;
  
  const value = parseInt(slider.value);
  
  label.classList.remove('easy', 'medium', 'hard');
  
  if (value <= 3) {
    label.textContent = 'سهل';
    label.classList.add('easy');
  } else if (value <= 6) {
    label.textContent = 'متوسط';
    label.classList.add('medium');
  } else {
    label.textContent = 'صعب';
    label.classList.add('hard');
  }
}

// تحديث المعاينة
function updatePreview() {
  const textEl = document.getElementById('questionText');
  const previewQ = document.getElementById('previewQuestion');
  const previewOpts = document.getElementById('previewOptions');
  
  if (previewQ) {
    previewQ.textContent = textEl?.value || 'نص السؤال سيظهر هنا...';
  }
  
  if (previewOpts) {
    const inputs = document.querySelectorAll('.options-builder .option-input');
    let html = '';
    
    inputs.forEach((input, i) => {
      const isCorrect = selectedType === 'ordering' || i === selectedCorrectIndex;
      const value = input.value || `خيار ${i + 1}`;
      html += `<div class="preview-option ${isCorrect ? 'correct' : ''}">${escapeHtml(value)}</div>`;
    });
    
    previewOpts.innerHTML = html;
  }
}

// حفظ السؤال
async function saveQuestion() {
  const textEl = document.getElementById('questionText');
  const questionText = textEl?.value.trim();
  
  if (!questionText) {
    toast('الرجاء كتابة نص السؤال', 'error');
    return;
  }
  
  // جمع الخيارات
  const inputs = document.querySelectorAll('.options-builder .option-input');
  const options = Array.from(inputs).map(inp => inp.value.trim()).filter(v => v);
  
  if (options.length < 2 && selectedType !== 'ordering') {
    toast('الرجاء إضافة خيارين على الأقل', 'error');
    return;
  }
  
  // تحديد الإجابة الصحيحة
  let correctAnswer = '';
  
  if (selectedType === 'ordering') {
    correctAnswer = options.join(',');
  } else if (selectedType === 'true_false') {
    correctAnswer = selectedCorrectIndex === 0 ? 'صح' : 'خطأ';
  } else {
    correctAnswer = options[selectedCorrectIndex] || options[0];
  }
  
  const difficultyEl = document.getElementById('difficultySlider');
  const pointsEl = document.getElementById('pointsInput');
  const activeEl = document.getElementById('activeCheckbox');
  
  const questionData = {
    type: selectedType,
    questionText: questionText,
    options: selectedType === 'true_false' ? ['صح', 'خطأ'] : options,
    correctAnswer: correctAnswer,
    difficulty: parseInt(difficultyEl?.value || 3),
    levelRequired: 1, // مهم للظهور في التطبيق
    points: parseInt(pointsEl?.value || 10),
    isActive: activeEl?.checked !== false,
    hideAfterAnswer: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    await db.collection('questions').add(questionData);
    
    closeModal('questionModal');
    loadQuestions();
    toast('تم حفظ السؤال بنجاح ✓', 'success');
    
  } catch (e) {
    console.error('Save error:', e);
    toast('حدث خطأ: ' + e.message, 'error');
  }
}

// تهيئة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
  updateDifficulty();
});
  
  // ============================================
  // المنشورات
  // ============================================
  async function loadPosts() {
    const container = document.getElementById('postsList');
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
    
    try {
      const snap = await db.collection('fb_posts').orderBy('createdAt', 'desc').limit(50).get();
      allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderPosts(allPosts);
    } catch (e) {
      container.innerHTML = '<p style="text-align:center;color:var(--danger);">حدث خطأ</p>';
    }
  }
  
  function renderPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (posts.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">لا توجد منشورات</p>';
      return;
    }
    
    container.innerHTML = posts.map(p => `
      <div class="post-card">
        <div class="p-header">
          <img src="${p.authorPhoto || defaultAvatar()}" alt="">
          <div>
            <div class="name">${escapeHtml(p.authorName || 'مستخدم')}</div>
            <div class="time">${formatTime(p.createdAt)} • ${p.authorID || ''}</div>
          </div>
        </div>
        <p class="p-content">${escapeHtml(p.content || '')}</p>
        <div class="p-actions">
          <button class="btn-sm" onclick="deletePost('${p.id}')">
            <i class="fas fa-trash"></i> حذف
          </button>
        </div>
      </div>
    `).join('');
  }
  
  // بحث المنشورات
  document.getElementById('postSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    if (!q) return renderPosts(allPosts);
    
    const filtered = allPosts.filter(p => 
      (p.content || '').toLowerCase().includes(q) ||
      (p.authorName || '').toLowerCase().includes(q)
    );
    renderPosts(filtered);
  });
  
  // حذف منشور
  async function deletePost(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    
    try {
      await db.collection('fb_posts').doc(id).delete();
      await logAction('حذف منشور', 'content');
      loadPosts();
      toast('تم حذف المنشور', 'success');
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // ============================================
  // الدعم الفني
  // ============================================
  async function loadSupport() {
    const container = document.getElementById('chatsPanel');
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
    
    try {
      const snap = await db.collection('chats')
        .where('participants', 'array-contains', ADMIN_ID)
        .orderBy('lastMessageAt', 'desc')
        .get();
      
      if (snap.empty) {
        container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد محادثات</p>';
        return;
      }
      
      let html = '';
      
      for (const doc of snap.docs) {
        const chat = doc.data();
        const otherId = chat.participants.find(p => p !== ADMIN_ID);
        
        // جلب بيانات المستخدم
        let userData = { username: 'مستخدم' };
        const userSnap = await db.collection('users').where('chatId', '==', otherId).limit(1).get();
        if (!userSnap.empty) {
          userData = userSnap.docs[0].data();
        }
        
        const unread = chat[`unread_${ADMIN_ID}`] || 0;
        
        html += `
          <div class="chat-item ${unread > 0 ? 'unread' : ''}" onclick="openChat('${doc.id}', '${otherId}')">
            <img src="${userData.photoURL || defaultAvatar()}" alt="">
            <div class="c-info">
              <h4>${escapeHtml(userData.username || 'مستخدم')}</h4>
              <p>${escapeHtml(chat.lastMessage || '')}</p>
            </div>
            <span class="c-time">${formatTime(chat.lastMessageAt)}</span>
          </div>
        `;
      }
      
      container.innerHTML = html;
      
      // تحديث شارة الرسائل
      let totalUnread = 0;
      snap.docs.forEach(doc => {
        totalUnread += doc.data()[`unread_${ADMIN_ID}`] || 0;
      });
      document.getElementById('supportBadge').textContent = totalUnread > 0 ? totalUnread : '';
      
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="text-align:center;color:var(--danger);">حدث خطأ</p>';
    }
  }
  
  async function openChat(chatId, otherId) {
    currentChatId = chatId;
    
    try {
      // تحديد كمقروء
      await db.collection('chats').doc(chatId).update({
        [`unread_${ADMIN_ID}`]: 0
      });
      
      // جلب بيانات المستخدم
      let userData = { username: 'مستخدم' };
      const userSnap = await db.collection('users').where('chatId', '==', otherId).limit(1).get();
      if (!userSnap.empty) {
        userData = userSnap.docs[0].data();
      }
      
      const panel = document.getElementById('chatPanel');
      panel.innerHTML = `
        <div class="chat-header">
          <img src="${userData.photoURL || defaultAvatar()}" alt="">
          <div>
            <h4>${escapeHtml(userData.username || 'مستخدم')}</h4>
            <span>ID: ${otherId}</span>
          </div>
        </div>
        <div class="chat-messages" id="messagesContainer"></div>
        <div class="chat-input">
          <input type="text" id="msgInput" placeholder="اكتب ردك..." onkeypress="if(event.key==='Enter')sendMsg('${otherId}')">
          <button class="btn-primary btn-sm" onclick="sendMsg('${otherId}')">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      `;
      
      // تحميل الرسائل
      loadMessages(chatId);
      
    } catch (e) {
      console.error(e);
    }
  }
  
  async function loadMessages(chatId) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    try {
      const snap = await db.collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .get();
      
      container.innerHTML = snap.docs.map(doc => {
        const msg = doc.data();
        const isSent = msg.senderId === ADMIN_ID;
        
        return `
          <div class="msg ${isSent ? 'sent' : 'received'}">
            ${escapeHtml(msg.text)}
          </div>
        `;
      }).join('');
      
      container.scrollTop = container.scrollHeight;
      
    } catch (e) {
      console.error(e);
    }
  }
  
  async function sendMsg(otherId) {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    
    if (!text || !currentChatId) return;
    
    try {
      await db.collection('chats').doc(currentChatId).collection('messages').add({
        text,
        senderId: ADMIN_ID,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('chats').doc(currentChatId).update({
        lastMessage: text,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        [`unread_${otherId}`]: firebase.firestore.FieldValue.increment(1)
      });
      
      input.value = '';
      loadMessages(currentChatId);
      
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // ============================================
  // الإشعارات الجماعية
  // ============================================
  async function sendNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const content = document.getElementById('notifContent').value.trim();
    const target = document.getElementById('notifTarget').value;
    
    if (!title || !content) {
      return toast('يرجى ملء العنوان والمحتوى', 'error');
    }
    
    try {
      let usersSnap;
      
      if (target === 'all') {
        usersSnap = await db.collection('users').get();
      } else {
        const oneHourAgo = new Date(Date.now() - 3600000);
        usersSnap = await db.collection('users').where('lastOnline', '>=', oneHourAgo).get();
      }
      
      const batch = db.batch();
      let count = 0;
      
      usersSnap.forEach(doc => {
        const ref = db.collection('notifications').doc();
        batch.set(ref, {
          userId: doc.id,
          type: 'admin',
          title,
          content,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        count++;
      });
      
      await batch.commit();
      await logAction(`إرسال إشعار إلى ${count} مستخدم`, 'system');
      
      // تنظيف الحقول
      document.getElementById('notifTitle').value = '';
      document.getElementById('notifContent').value = '';
      
      toast(`تم إرسال الإشعار إلى ${count} مستخدم`, 'success');
      
    } catch (e) {
      toast('حدث خطأ', 'error');
    }
  }
  
  // ============================================
  // السجلات
  // ============================================
  async function loadLogs() {
    const container = document.getElementById('logsList');
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
    
    try {
      const snap = await db.collection('adminLogs')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      if (snap.empty) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">لا توجد سجلات</p>';
        return;
      }
      
      container.innerHTML = snap.docs.map(doc => {
        const log = doc.data();
        const iconClass = log.type === 'user' ? 'blue' : log.type === 'content' ? 'orange' : log.type === 'security' ? 'red' : 'green';
        const icon = log.type === 'user' ? 'fa-user' : log.type === 'content' ? 'fa-file' : log.type === 'security' ? 'fa-shield' : 'fa-cog';
        
        return `
          <div class="log-item">
            <div class="log-icon ${iconClass}"><i class="fas ${icon}"></i></div>
            <div class="log-content">
              <p>${escapeHtml(log.action)}</p>
              <span>${formatTime(log.timestamp)} • ${log.adminName || 'النظام'}</span>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (e) {
      container.innerHTML = '<p style="text-align:center;color:var(--danger);">حدث خطأ</p>';
    }
  }
  
  // ============================================
  // دوال مساعدة
  // ============================================
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function formatTime(ts) {
    if (!ts) return '';
    
    let date;
    if (ts.toDate) date = ts.toDate();
    else if (ts.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);
    
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
    
    return date.toLocaleDateString('ar-EG');
  }
  
  async function logAction(action, type = 'system', details = {}) {
    try {
      await db.collection('adminLogs').add({
        adminId: currentUser.uid,
        adminName: adminData?.username,
        action,
        type,
        ...details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('Log error:', e);
    }
  }
  
  function openModal(id) {
    document.getElementById(id)?.classList.add('active');
  }
  
  function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
  }
  
  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    
    setTimeout(() => el.classList.remove('show'), 3000);
  }
  
  function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      auth.signOut();
      window.location.href = 'index.html';
    }
  }
  
  // إغلاق المودال بالنقر خارجه
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });
  
  console.log('🛡️ لوحة الإدارة جاهزة');