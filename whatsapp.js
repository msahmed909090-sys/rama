/**
 * ============================================
 * واتساب الإسلامي - الملف الرئيسي
 * مرتبط بنظام المصادقة في index.html
 * ============================================
 */

// ============================================
// إعدادات Firebase (نفس إعدادات index.html)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCuZZqke1vA0db_CpVzb12epJaOEzJGZ9E",
    authDomain: "lamet-ramadan-c1740.firebaseapp.com",
    projectId: "lamet-ramadan-c1740",
    storageBucket: "lamet-ramadan-c1740.firebasestorage.app",
    messagingSenderId: "179701807452",
    appId: "1:179701807452:web:d662c22e8d6ae9960da999"
  };
  
  // تهيئة Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  // ============================================
  // المتغيرات العامة
  // ============================================
  let currentUser = null;
  let userData = null;
  let currentChat = null;
  let messagesListener = null;
  let callsListener = null;
  
  // ============================================
  // دوال مساعدة
  // ============================================
  
  /**
   * عرض رسالة Toast
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  /**
   * تنسيق الوقت
   */
/**
 * تنسيق الوقت
 */
function formatTime(timestamp) {
    if (!timestamp) return 'غير معروف';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = (now - date) / 1000;
  
      if (diff < 60) return 'الآن';
      if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
      if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
      if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
  
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }
  
  /**
   * تنسيق وقت الرسالة
   */
  function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }
  
  /**
   * تنسيق مدة المكالمة
   */
  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  /**
   * تهريب HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * توليد معرف المحادثة
   */
  function getChatId(id1, id2) {
    return [id1, id2].sort().join('_');
  }
  
  /**
   * تحويل الصورة إلى Base64
   */
  function imageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  // ============================================
  // التحقق من المصادقة
  // ============================================
  
  /**
   * التحقق من حالة المستخدم عند تحميل الصفحة
   */
  function checkAuthentication() {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        
        if (user) {
          currentUser = user;
          
          // جلب بيانات المستخدم من Firestore
          try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
              userData = userDoc.data();
              

              
              resolve(true);
            } else {
              resolve(false);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    });
  }
  
  /**
   * توليد معرف محادثة عشوائي
   */

  
  // ============================================
  // تهيئة التطبيق
  // ============================================
  
  /**
   * تهيئة التطبيق بعد التحقق
   */
  async function initializeApp() {
    // تحديث واجهة المستخدم
    updateUserInfo();
    
    // تهيئة الأقسام
    initChatsSection();
    initStatusSection();
    initCommunitiesSection();
    initCallsSection();
    
    // تهيئة التنقل
    initNavigation();
    
    // تهيئة المحادثة
    initChatView();
    
    // تهيئة المودالات
    initModals();
    // إضافة داخل دالة initializeApp بعد loadCallHistory();

// الاستماع للمكالمات الواردة
listenForIncomingCalls();
// تهيئة نظام البروفايل
initAfterAuth();
    // إظهار التطبيق
    document.getElementById('authCheckScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
  }
  
  /**
   * تحديث معلومات المستخدم في الواجهة
   */
  function updateUserInfo() {
    // تحديث الصورة الشخصية في الهيدر
    const headerAvatar = document.getElementById('headerUserAvatar');
    if (headerAvatar && userData) {
      headerAvatar.src = userData.photoURL || 
        `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(userData.username || 'م')[0]}</text></svg>`;
    }
    
    // تحديث صورة الحالة
    const statusAvatar = document.getElementById('myStatusAvatar');
    if (statusAvatar && userData) {
      statusAvatar.src = userData.photoURL || headerAvatar.src;
    }
    
    // تحديث نص الحالة
    const statusText = document.getElementById('myStatusText');
    if (statusText && userData && userData.statusText) {
      statusText.textContent = userData.statusText;
    }
  }
  
  // ============================================
  // قسم المحادثات
  // ============================================
  
  /**
   * تهيئة قسم المحادثات
   */
  function initChatsSection() {
    loadChats();
    
    // البحث في المحادثات
    const searchInput = document.getElementById('chatSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterChats(e.target.value);
      });
    }
  }
  
  /**
   * تحميل المحادثات
   */
  async function loadChats() {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList || !currentUser) return;
    
    chatsList.innerHTML = `
      <div class="loading-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <div class="loader" style="margin: 0 auto 16px;"></div>
        <p>جاري تحميل المحادثات...</p>
      </div>
    `;
    
    try {
      // جلب المحادثات من Firestore
      const chatsSnapshot = await db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('lastMessageAt', 'desc')
        .limit(50)
        .get();
      
      if (chatsSnapshot.empty) {
        chatsList.innerHTML = `
          <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
            <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
            <p>لا توجد محادثات بعد</p>
            <p style="font-size: 0.85rem; margin-top: 8px;">ابحث عن مستخدمين للبدء</p>
          </div>
        `;
        return;
      }
      
      let chatsHtml = '';
      
      for (const doc of chatsSnapshot.docs) {
        const chat = doc.data();
        const otherUserId = chat.participants.find(p => p !== currentUser.uid);
        
        // جلب بيانات المستخدم الآخر
        const userDoc = await db.collection('users').doc(otherUserId).get();
        const otherUser = userDoc.exists ? userDoc.data() : {};
        
        // التحقق من الاتصال
        const isOnline = otherUser.lastOnline && 
          (Date.now() - otherUser.lastOnline.toDate() < 300000);
        
        // عدد الرسائل غير المقروءة
        const unreadCount = chat.unreadCount && chat.unreadCount[currentUser.uid] || 0;
        
        chatsHtml += createChatItemHTML(doc.id, chat, otherUser, isOnline, unreadCount, otherUserId);
      }
      
      chatsList.innerHTML = chatsHtml;
      
      // إضافة أحداث النقر
      chatsList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
          const userId = item.dataset.userId;
          const userName = item.dataset.userName;
          const userAvatar = item.dataset.userAvatar;
          openChat(userId, userName, userAvatar);
        });
      });
      
    } catch (error) {
      console.error('Error loading chats:', error);
      chatsList.innerHTML = `
        <div class="error-state" style="padding: 40px; text-align: center; color: var(--danger);">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 16px;"></i>
          <p>حدث خطأ في تحميل المحادثات</p>
          <button onclick="loadChats()" style="margin-top: 16px; padding: 8px 20px; background: var(--bg-tertiary); border: none; border-radius: 8px; color: var(--text-primary); cursor: pointer;">إعادة المحاولة</button>
        </div>
      `;
    }
  }
  
  /**
   * إنشاء HTML لعنصر المحادثة
   */
  function createChatItemHTML(chatId, chat, otherUser, isOnline, unreadCount, otherUserId) {
    const avatar = otherUser.photoURL || 
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(otherUser.username || 'م')[0]}</text></svg>`;
    
    const lastMessage = chat.lastMessage || '';
    const time = formatTime(chat.lastMessageAt);
    const isSent = chat.lastMessageSenderId === currentUser.uid;
    
    return `
      <div class="chat-item" data-user-id="${otherUserId}" data-user-name="${otherUser.username || 'مستخدم'}" data-user-avatar="${avatar}">
        <div class="chat-avatar">
          <img src="${avatar}" alt="">
          ${isOnline ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="chat-info">
          <div class="chat-top">
            <span class="chat-name">${otherUser.username || 'مستخدم'}</span>
            <span class="chat-time">${time}</span>
          </div>
          <div class="chat-preview">
            ${isSent ? '<i class="fas fa-check-double read-status"></i>' : ''}
            <span class="chat-preview-text">${lastMessage.substring(0, 40)}${lastMessage.length > 40 ? '...' : ''}</span>
          </div>
        </div>
        ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * فلترة المحادثات
   */
  function filterChats(query) {
    const chatItems = document.querySelectorAll('.chat-item');
    const lowerQuery = query.toLowerCase();
    
    chatItems.forEach(item => {
      const name = item.dataset.userName.toLowerCase();
      if (name.includes(lowerQuery)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }
  
/**
 * فتح محادثة (معدلة لدعم الحظر)
 */
function openChat(userId, userName, userAvatar) {
  // التحقق من الحظر
  if (isUserBlocked(userId)) {
      currentBlockUserId = userId;
      document.getElementById('blockedAlertAvatar').src = userAvatar;
      document.getElementById('blockedAlertName').textContent = userName;
      document.getElementById('blockedUserAlertModal').classList.add('active');
      return;
  }
  
  currentChat = {
      id: userId,
      name: userName,
      avatar: userAvatar
  };
  
  // تحديث واجهة المحادثة
  document.getElementById('chatUserName').textContent = userName;
  document.getElementById('chatUserAvatar').src = userAvatar;
  document.getElementById('chatUserStatus').textContent = 'جاري التحميل...';
  
  // إظهار واجهة المحادثة
  const chatView = document.getElementById('chatView');
  chatView.classList.add('active');
  
  // تحميل الرسائل
  loadMessages(userId);
  
  // التحقق من حالة الاتصال
  checkUserOnlineStatus(userId);
  
  // إخفاء شارة الرسائل غير المقروءة
  clearUnreadBadge(userId);
}

/**
* تحميل الرسائل (معدلة لإظهار حالة الحظر)
*/
async function loadMessages(otherUserId) {
  const chatId = getChatId(currentUser.uid, otherUserId);
  const messagesContainer = document.getElementById('chatMessages');
  
  // التحقق مما إذا كان الطرف الآخر قد حظرني
  const iAmBlocked = await checkIfIAmBlocked(otherUserId);
  
  if (iAmBlocked) {
      const statusEl = document.getElementById('chatUserStatus');
      if (statusEl) {
          statusEl.innerHTML = 'غير متصل <span class="blocked-badge"><i class="fas fa-ban"></i> حظرك</span>';
      }
  }
  
  // إلغاء الاستماع السابق
  if (messagesListener) {
      messagesListener();
  }
  
  // الاستماع للرسائل في الوقت الحقيقي
  messagesListener = db.collection('chats').doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limitToLast(100)
      .onSnapshot(snapshot => {
          let messagesHtml = '';
          
          snapshot.forEach(doc => {
              const msg = doc.data();
              const isSent = msg.senderId === currentUser.uid;
              
              messagesHtml += createMessageHTML(msg, isSent, doc.id);
          });
          
          messagesContainer.innerHTML = messagesHtml;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          
          // تحديث حالة القراءة
          markMessagesAsRead(otherUserId);
      });
}

/**
* إنشاء HTML للرسالة (معدلة لإضافة messageId)
*/
/**
 * إنشاء HTML للرسالة (محدثة لدعم الوسائط)
 */
function createMessageHTML(msg, isSent, messageId = '') {
  const time = formatMessageTime(msg.timestamp);
  const messageClass = isSent ? 'sent' : 'received';
  const senderId = msg.senderId || '';
  
  let contentHtml = '';
  
  if (msg.type === 'image') {
      contentHtml = `
          <div class="message-media">
              <img src="${msg.mediaUrl}" alt="صورة" onclick="viewImage('${msg.mediaUrl}')" loading="lazy">
          </div>
      `;
  } else if (msg.type === 'video') {
      contentHtml = `
          <div class="message-media">
              <video src="${msg.mediaUrl}" controls preload="metadata"></video>
          </div>
      `;
  } else if (msg.type === 'audio') {
      contentHtml = `
          <div class="message-audio">
              <button class="audio-play-btn" onclick="toggleAudio(this, '${msg.mediaUrl}')">
                  <i class="fas fa-play"></i>
              </button>
              <div class="audio-info">
                  <div class="audio-name">${escapeHtml(msg.fileName || 'ملف صوتي')}</div>
                  <div class="audio-duration">${formatFileSize(msg.fileSize)}</div>
                  <div class="audio-progress">
                      <div class="audio-progress-bar"></div>
                  </div>
              </div>
          </div>
      `;
  }
  
  contentHtml += `<div class="message-text">${escapeHtml(msg.text)}</div>`;
  
  return `
    <div class="message ${messageClass}" data-message-id="${messageId}" data-sender-id="${senderId}">
      ${contentHtml}
      <div class="message-meta">
        <span class="message-time">${time}</span>
        ${isSent ? `<span class="message-status ${msg.read ? 'read' : ''}"><i class="fas fa-check-double"></i></span>` : ''}
      </div>
    </div>
  `;
}

/**
* تنسيق حجم الملف
*/
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
* تشغيل/إيقاف الصوت
*/
function toggleAudio(btn, url) {
  const icon = btn.querySelector('i');
  const progressBar = btn.parentElement.querySelector('.audio-progress-bar');
  
  // إيقاف أي صوت آخر قيد التشغيل
  document.querySelectorAll('.audio-play-btn').forEach(otherBtn => {
      if (otherBtn !== btn) {
          otherBtn.querySelector('i').className = 'fas fa-play';
      }
  });
  
  // إنشاء عنصر صوت
  if (!btn.audioElement) {
      btn.audioElement = new Audio(url);
      
      btn.audioElement.addEventListener('timeupdate', () => {
          const progress = (btn.audioElement.currentTime / btn.audioElement.duration) * 100;
          progressBar.style.width = progress + '%';
      });
      
      btn.audioElement.addEventListener('ended', () => {
          icon.className = 'fas fa-play';
          progressBar.style.width = '0%';
      });
  }
  
  if (btn.audioElement.paused) {
      btn.audioElement.play();
      icon.className = 'fas fa-pause';
  } else {
      btn.audioElement.pause();
      icon.className = 'fas fa-play';
  }
}

/**
* إنشاء HTML لعنصر المحادثة (معدلة لدعم الحظر)
*/
function createChatItemHTML(chatId, chat, otherUser, isOnline, unreadCount, otherUserId) {
  const avatar = otherUser.photoURL || 
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(otherUser.username || 'م')[0]}</text></svg>`;
  
  const lastMessage = chat.lastMessage || '';
  const time = formatTime(chat.lastMessageAt);
  const isSent = chat.lastMessageSenderId === currentUser.uid;
  
  // التحقق من الحظر
  const isBlocked = isUserBlocked(otherUserId);
  const blockedClass = isBlocked ? 'blocked' : '';
  
  return `
    <div class="chat-item ${blockedClass}" data-user-id="${otherUserId}" data-user-name="${otherUser.username || 'مستخدم'}" data-user-avatar="${avatar}">
      <div class="chat-avatar">
        <img src="${avatar}" alt="">
        ${isOnline ? '<div class="online-dot"></div>' : ''}
      </div>
      <div class="chat-info">
        <div class="chat-top">
          <span class="chat-name">${otherUser.username || 'مستخدم'}</span>
          <span class="chat-time">${time}</span>
        </div>
        <div class="chat-preview">
          ${isSent ? '<i class="fas fa-check-double read-status"></i>' : ''}
          <span class="chat-preview-text">${lastMessage.substring(0, 40)}${lastMessage.length > 40 ? '...' : ''}</span>
        </div>
      </div>
      ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
    </div>
  `;
}
  
  /**
   * تحديث حالة القراءة
   */
  async function markMessagesAsRead(otherUserId) {
    const chatId = getChatId(currentUser.uid, otherUserId);
    
    try {
      await db.collection('chats').doc(chatId).update({
        [`unreadCount.${currentUser.uid}`]: 0
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }
  
  /**
   * مسح شارة الرسائل غير المقروءة
   */
  function clearUnreadBadge(userId) {
    // يتم ذلك تلقائياً من خلال تحديث المحادثات
  }
  
  /**
   * التحقق من حالة الاتصال
   */
  function checkUserOnlineStatus(userId) {
    db.collection('users').doc(userId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        const isOnline = data.lastOnline && 
          (Date.now() - data.lastOnline.toDate() < 300000);
        
        document.getElementById('chatUserStatus').textContent = 
          isOnline ? 'متصل الآن' : 'غير متصل';
      }
    });
  }
  
// ============================================
// تهيئة واجهة المحادثة
// ============================================

function initChatView() {
  console.log('🔍 تهيئة واجهة المحادثة...');
  
  // زر الرجوع
  document.getElementById('backFromChat').addEventListener('click', closeChatView);
  
  // إرسال الرسالة
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
      }
  });
  
  // إرفاق ملفات
  document.getElementById('attachBtn').addEventListener('click', toggleAttachMenu);
  
  // مكالمة صوتية
  document.getElementById('voiceCallBtn').addEventListener('click', () => startCall('voice'));
  
  // مكالمة فيديو
  document.getElementById('videoCallBtn').addEventListener('click', () => startCall('video'));
  
  // زر المايكروفون - تسجيل صوتي
  document.getElementById('micBtn').addEventListener('click', startVoiceRecording);
  
  // تهيئة رفع الملفات
  initFileUploads();
  
  // تهيئة بروفايل المستخدم في الشات
  initChatUserProfile();
  
  console.log('✅ تم تهيئة واجهة المحادثة');
}
  
  /**
   * إغلاق واجهة المحادثة
   */
/**
 * إغلاق واجهة المحادثة (محدّثة)
 */
function closeChatView() {
    const chatView = document.getElementById('chatView');
    chatView.classList.remove('active');
    
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
    
    // إزالة زر معلومات المجتمع
    const infoBtn = document.getElementById('communityInfoBtn');
    if (infoBtn) infoBtn.remove();
    
    currentChat = null;
}
  
  /**
   * إرسال رسالة
   */
  async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChat || !currentUser) return;
    
    const chatId = getChatId(currentUser.uid, currentChat.id);
    
    try {
      // إضافة الرسالة
      await db.collection('chats').doc(chatId).collection('messages').add({
        text: text,
        type: 'text',
        senderId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      
      // تحديث بيانات المحادثة
      await db.collection('chats').doc(chatId).set({
        participants: [currentUser.uid, currentChat.id],
        lastMessage: text,
        lastMessageSenderId: currentUser.uid,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        [`unreadCount.${currentChat.id}`]: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
      
      input.value = '';
      
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('حدث خطأ في إرسال الرسالة', 'error');
    }
  }
  
/**
 * تبديل قائمة الإرفاق
 */
function toggleAttachMenu() {
  const menu = document.getElementById('attachMenu');
  if (menu) {
      menu.classList.toggle('active');
      console.log('📎 قائمة الإرفاق:', menu.classList.contains('active') ? 'مفتوحة' : 'مغلقة');
  } else {
      console.error('❌ لم يتم العثور على قائمة الإرفاق');
  }
}
  
  /**
   * تهيئة رفع الملفات
   */
/**
 * تهيئة رفع الملفات (محدّثة)
 */
// ============================================
// تهيئة رفع الملفات (محدثة مع Storage)
// ============================================

let uploadTask = null;
let isUploading = false;

function initFileUploads() {
  // رفع صورة
  document.getElementById('attachImage').addEventListener('click', () => {
      document.getElementById('imageUploadInput').click();
      document.getElementById('attachMenu').classList.remove('active');
  });
  
  document.getElementById('imageUploadInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && currentChat) {
          await uploadAndSendMedia(file, 'image');
      }
      e.target.value = '';
  });
  
  // رفع فيديو (مع تحذير الحجم)
  document.getElementById('attachVideo').addEventListener('click', () => {
      document.getElementById('videoUploadInput').click();
      document.getElementById('attachMenu').classList.remove('active');
  });
  
  document.getElementById('videoUploadInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && currentChat) {
          // تحذير: الفيديو لازم يكون صغير جداً (أقل من 1MB)
          if (file.size > 950 * 1024) {
              showToast('الفيديو كبير جداً! الحد الأقصى 1MB', 'error');
              e.target.value = '';
              return;
          }
          await uploadAndSendMedia(file, 'video');
      }
      e.target.value = '';
  });
  
  // رفع صوت
  document.getElementById('attachAudio').addEventListener('click', () => {
      document.getElementById('audioUploadInput').click();
      document.getElementById('attachMenu').classList.remove('active');
  });
  
  document.getElementById('audioUploadInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && currentChat) {
          if (file.size > 950 * 1024) {
              showToast('الملف الصوتي كبير جداً! الحد الأقصى 1MB', 'error');
              e.target.value = '';
              return;
          }
          await uploadAndSendMedia(file, 'audio');
      }
      e.target.value = '';
  });
  
  // زر إلغاء الرفع
  document.getElementById('cancelUploadBtn').addEventListener('click', cancelUpload);
  
  // إغلاق القائمة عند النقر خارجها
  document.addEventListener('click', (e) => {
      const attachMenu = document.getElementById('attachMenu');
      const attachBtn = document.getElementById('attachBtn');
      if (attachMenu && attachBtn && !attachMenu.contains(e.target) && !attachBtn.contains(e.target)) {
          attachMenu.classList.remove('active');
      }
  });
}
// ============================================
// رفع الملفات إلى Firebase Storage
// ============================================

// ============================================
// رفع الملفات (مجاني - بدون Storage)
// ============================================

/**
 * رفع الملف وإرساله كرسالة (مضغوط - مجاني)
 */
async function uploadAndSendMedia(file, type) {
  if (!currentChat || !currentUser) return;
  
  const chatId = currentChat.type === 'community' 
      ? currentChat.id 
      : getChatId(currentUser.uid, currentChat.id);
  
  // إظهار مودال التحميل
  showUploadModal(file.name);
  
  try {
      let mediaUrl = '';
      let compressedFile = file;
      
      // ضغط الصور لتقليل الحجم
      if (type === 'image') {
          updateProgress(30);
          compressedFile = await compressImage(file, 800, 0.7); // ضغط للحد الأقصى 800px
          updateProgress(60);
          
          // التحقق من الحجم (أقل من 900KB آمن)
          if (compressedFile.size > 900 * 1024) {
              // ضغط أكبر لو لسه كبير
              compressedFile = await compressImage(file, 600, 0.5);
          }
      }
      
      // التحقق من الحجم النهائي
      if (compressedFile.size > 950 * 1024) { // أقل من 1MB
          hideUploadModal();
          showToast('الملف كبير جداً! الحد الأقصى 1MB', 'error');
          return;
      }
      
      updateProgress(80);
      
      // تحويل إلى Base64
      mediaUrl = await imageToBase64(compressedFile);
      
      updateProgress(100);
      
      // إرسال الرسالة
      await sendMediaMessageWithURL(mediaUrl, file.name, type, compressedFile.size);
      
      hideUploadModal();
      showToast('تم إرسال الملف', 'success');
      
  } catch (error) {
      console.error('Error uploading file:', error);
      hideUploadModal();
      
      if (error.message && error.message.includes('size')) {
          showToast('الملف كبير جداً! الحد الأقصى 1MB', 'error');
      } else {
          showToast('حدث خطأ أثناء المعالجة', 'error');
      }
  }
}

/**
* ضغط الصور
*/
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              
              // تغيير الحجم لو ضروري
              if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
              }
              
              canvas.width = width;
              canvas.height = height;
              
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              // تحويل إلى Blob
              canvas.toBlob((blob) => {
                  if (blob) {
                      resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                  } else {
                      reject(new Error('فشل ضغط الصورة'));
                  }
              }, 'image/jpeg', quality);
          };
          img.onerror = () => reject(new Error('فشل تحميل الصورة'));
          img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
  });
}

/**
* إرسال رسالة وسائط مع رابط
*/
async function sendMediaMessageWithURL(mediaUrl, fileName, type, fileSize) {
  if (!currentChat || !currentUser) return;
  
  const chatId = currentChat.type === 'community' 
      ? currentChat.id 
      : getChatId(currentUser.uid, currentChat.id);
  
  let messageText = '';
  switch (type) {
      case 'image': messageText = '📷 صورة'; break;
      case 'video': messageText = '🎬 فيديو'; break;
      case 'audio': messageText = '🎵 ملف صوتي'; break;
      default: messageText = '📄 ملف';
  }
  
  const messageData = {
      text: messageText,
      type: type,
      mediaUrl: mediaUrl,
      fileName: fileName,
      fileSize: fileSize,
      senderId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
  };
  
  // إضافة اسم المرسل للمجتمعات
  if (currentChat.type === 'community') {
      messageData.senderName = userData.username || 'مستخدم';
      messageData.senderAvatar = userData.photoURL || null;
  }
  
  try {
      // إضافة الرسالة
      await db.collection(currentChat.type === 'community' ? 'communities' : 'chats')
          .doc(chatId)
          .collection('messages')
          .add(messageData);
      
      // تحديث بيانات المحادثة
      const updateData = {
          lastMessage: messageText,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      if (currentChat.type === 'community') {
          updateData.lastMessageSenderName = userData.username || 'مستخدم';
      } else {
          updateData.lastMessageSenderId = currentUser.uid;
          updateData[`unreadCount.${currentChat.id}`] = firebase.firestore.FieldValue.increment(1);
      }
      
      await db.collection(currentChat.type === 'community' ? 'communities' : 'chats')
          .doc(chatId)
          .set(updateData, { merge: true });
          
  } catch (error) {
      console.error('Error sending media message:', error);
      throw error;
  }
}

/**
* إلغاء الرفع
*/
function cancelUpload() {
  if (uploadTask) {
      uploadTask.cancel();
      uploadTask = null;
  }
  hideUploadModal();
  showToast('تم إلغاء الرفع', 'info');
}

/**
* إظهار مودال الرفع
*/
function showUploadModal(fileName) {
  isUploading = true;
  document.getElementById('uploadFilename').textContent = fileName;
  document.getElementById('progressPercent').textContent = '0%';
  
  // إعادة تعيين الدائرة
  const circle = document.getElementById('progressCircle');
  circle.style.strokeDashoffset = '326.73';
  
  document.getElementById('uploadModal').classList.add('active');
}

/**
* تحديث التقدم
*/
function updateProgress(percent) {
  const circumference = 326.73;
  const offset = circumference - (percent / 100) * circumference;
  
  document.getElementById('progressCircle').style.strokeDashoffset = offset;
  document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
}

/**
* إخفاء مودال الرفع
*/
function hideUploadModal() {
  isUploading = false;
  document.getElementById('uploadModal').classList.remove('active');
}
  /**
   * إرسال رسالة وسائط
   */
  async function sendMediaMessage(file, type) {
    if (!currentChat || !currentUser) return;
    
    try {
      showToast('جاري الرفع...', 'info');
      
      // تحويل الصورة إلى Base64
      const base64 = await imageToBase64(file);
      
      const chatId = getChatId(currentUser.uid, currentChat.id);
      
      // إضافة الرسالة
      await db.collection('chats').doc(chatId).collection('messages').add({
        text: type === 'image' ? '📷 صورة' : '🎬 فيديو',
        type: type,
        mediaUrl: base64,
        senderId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      
      // تحديث بيانات المحادثة
      await db.collection('chats').doc(chatId).set({
        participants: [currentUser.uid, currentChat.id],
        lastMessage: type === 'image' ? '📷 صورة' : '🎬 فيديو',
        lastMessageSenderId: currentUser.uid,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        [`unreadCount.${currentChat.id}`]: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
      
      // إغلاق قائمة الإرفاق
      document.getElementById('attachMenu').classList.remove('active');
      
      showToast('تم الإرسال', 'success');
      
    } catch (error) {
      console.error('Error sending media:', error);
      showToast('حدث خطأ في الإرسال', 'error');
    }
  }
  
  // ============================================
  // قسم الحالات (التحديثات)
  // ============================================
  
  function initStatusSection() {
    // فتح مودال إضافة حالة
    document.getElementById('addStatusCardBtn').addEventListener('click', () => {
      document.getElementById('addStatusModal').classList.add('active');
    });

    // عرض حالتي إذا وجدت
    renderMyStatus();

    // تحميل حالات الأصدقاء
    loadStatusList();
}
  /**
 * عرض حالة المستخدم الحالي في دائرة منفصلة
 */
function renderMyStatus() {
    const wrapper = document.getElementById('myStatusWrapper');
    const avatarImg = document.getElementById('myStatusViewAvatar');
    const timeText = document.getElementById('myStatusViewTime');
    const statusItem = document.getElementById('myStatusViewItem');
    const deleteBtn = document.getElementById('deleteMyStatusBtn');
    
    // التحقق من وجود حالات
    if (userData && userData.statuses && userData.statuses.length > 0) {
        wrapper.style.display = 'block';
        
        const lastStatus = userData.statuses[userData.statuses.length - 1];
        
        // تعيين الصورة
        avatarImg.src = userData.photoURL || 
          `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(userData.username || 'م')[0]}</text></svg>`;
        
        // تعيين الوقت
        timeText.textContent = formatTime(lastStatus.timestamp);

        // حدث الضغط للعرض
        statusItem.onclick = (e) => {
            // تجاهل الضغط إذا كان على زر الحذف
            if(e.target.closest('.delete-status-btn')) return;
            viewStatus(currentUser.uid, userData.username || 'أنا');
        };
        
        // حدث الحذف
        deleteBtn.onclick = async (e) => {
            e.stopPropagation(); // منع فتح الحالة
            if(confirm('هل تريد حذف جميع حالاتك؟')) {
                 await deleteMyStatus();
            }
        };
    } else {
        wrapper.style.display = 'none';
    }
}

/**
 * حذف حالة المستخدم
 */
async function deleteMyStatus() {
    try {
        await db.collection('users').doc(currentUser.uid).update({
            statuses: []
        });
        userData.statuses = []; // تحديث محلي
        renderMyStatus(); // تحديث الواجهة
        showToast('تم حذف الحالة', 'success');
    } catch (error) {
        console.error('Error deleting status:', error);
        showToast('حدث خطأ أثناء الحذف', 'error');
    }
}
  /**
   * تحميل قائمة الحالات
   */
  async function loadStatusList() {
    const statusList = document.getElementById('statusList');
    if (!statusList) return;
    
    try {
      // جلب الحالات من المستخدمين الآخرين
      const usersSnapshot = await db.collection('users')
        .where('statuses', '>', [])
        .limit(20)
        .get();
      
      let html = '';
      
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (doc.id !== currentUser.uid && user.statuses && user.statuses.length > 0) {
          const avatar = user.photoURL || 
            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(user.username || 'م')[0]}</text></svg>`;
          
          html += `
            <div class="status-item" data-user-id="${doc.id}" data-user-name="${user.username}">
              <div class="status-avatar-ring">
                <img src="${avatar}" alt="">
              </div>
              <div class="status-info">
                <h4>${user.username || 'مستخدم'}</h4>
                <p>${formatTime(user.statuses[0].timestamp)}</p>
              </div>
            </div>
          `;
        }
      });
      
      statusList.innerHTML = html || '<p style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد تحديثات</p>';
      
      // إضافة أحداث النقر
      statusList.querySelectorAll('.status-item').forEach(item => {
        item.addEventListener('click', () => viewStatus(item.dataset.userId, item.dataset.userName));
      });
      
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }
  
  /**
   * عرض حالة
   */
  async function viewStatus(userId, userName) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return;
      
      const user = userDoc.data();
      const statuses = user.statuses || [];
      
      if (statuses.length === 0) return;
      
      const latestStatus = statuses[statuses.length - 1];
      
      // تحديث مودال الحالة
      document.getElementById('statusViewUserName').textContent = userName;
      document.getElementById('statusViewTime').textContent = formatTime(latestStatus.timestamp);
      document.getElementById('statusViewAvatar').src = user.photoURL || 
        `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(userName || 'م')[0]}</text></svg>`;
      
      const statusBody = document.getElementById('statusViewBody');
      
      if (latestStatus.type === 'image') {
        statusBody.innerHTML = `<img src="${latestStatus.mediaUrl}" alt="">`;
      } else if (latestStatus.type === 'video') {
        statusBody.innerHTML = `<video src="${latestStatus.mediaUrl}" autoplay></video>`;
      } else {
        statusBody.innerHTML = `
          <div class="status-text" style="background: ${latestStatus.bgColor || '#075e54'}; color: white;">
            ${escapeHtml(latestStatus.text)}
          </div>
        `;
      }
      
      // إظهار المودال
      document.getElementById('statusViewModal').classList.add('active');
      
      // إغلاق تلقائي بعد 10 ثوان
      setTimeout(() => {
        closeStatusView();
      }, 10000);
      
    } catch (error) {
      console.error('Error viewing status:', error);
    }
  }
  
  /**
   * إغلاق عرض الحالة
   */
  function closeStatusView() {
    document.getElementById('statusViewModal').classList.remove('active');
  }
  
  // ============================================
  // قسم المجتمعات
  // ============================================
  
  function initCommunitiesSection() {
    // فتح مودال إنشاء مجتمع
    document.getElementById('createCommunityBtn').addEventListener('click', () => {
      document.getElementById('createCommunityModal').classList.add('active');
    });
    
    // تحميل المجتمعات
    loadCommunities();
  }
  
  /**
   * تحميل المجتمعات
   */
  async function loadCommunities() {
    const communitiesList = document.getElementById('communitiesList');
    if (!communitiesList) return;
    
    try {
      const communitiesSnapshot = await db.collection('communities')
        .where('members', 'array-contains', currentUser.uid)
        .get();
      
      let html = '';
      
      communitiesSnapshot.forEach(doc => {
        const community = doc.data();
        
        html += `
          <div class="community-item" data-id="${doc.id}">
            <div class="community-avatar">
              ${community.photoURL ? `<img src="${community.photoURL}" alt="">` : '<i class="fas fa-users"></i>'}
            </div>
            <div class="community-info">
              <h4>${community.name}</h4>
              <p>${community.members.length} عضو</p>
            </div>
          </div>
        `;
      });
      
      communitiesList.innerHTML = html || '<p style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد مجتمعات</p>';
      
    } catch (error) {
      console.error('Error loading communities:', error);
    }
  }
  
  // ============================================
  // قسم المكالمات
  // ============================================
  
  function initCallsSection() {
    // زر مسح السجل
    document.getElementById('clearCallsBtn').addEventListener('click', clearCallHistory);
    
    // تحميل سجل المكالمات
    loadCallHistory();
  }
  
  /**
   * تحميل سجل المكالمات
   */
  async function loadCallHistory() {
    const callsList = document.getElementById('callsList');
    if (!callsList) return;
    
    try {
      const callsSnapshot = await db.collection('calls')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      
      let html = '';
      
      for (const doc of callsSnapshot.docs) {
        const call = doc.data();
        const otherUserId = call.participants.find(p => p !== currentUser.uid);
        
        const userDoc = await db.collection('users').doc(otherUserId).get();
        const otherUser = userDoc.exists ? userDoc.data() : {};
        
        const avatar = otherUser.photoURL || 
          `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(otherUser.username || 'م')[0]}</text></svg>`;
        
        const isIncoming = call.receiverId === currentUser.uid;
        const isMissed = call.status === 'missed';
        
        let statusClass = isIncoming ? 'incoming' : 'outgoing';
        if (isMissed) statusClass = 'missed';
        
        let statusIcon = isIncoming ? 
          '<i class="fas fa-phone-alt"></i> واردة' : 
          '<i class="fas fa-phone-alt"></i> صادرة';
        if (isMissed) statusIcon = '<i class="fas fa-phone-slash"></i> لم يرد';
        
        const typeIcon = call.type === 'video' ? '<i class="fas fa-video"></i>' : '<i class="fas fa-phone"></i>';
        
        html += `
          <div class="call-item" data-user-id="${otherUserId}" data-user-name="${otherUser.username}" data-user-avatar="${avatar}">
            <div class="call-avatar">
              <img src="${avatar}" alt="">
            </div>
            <div class="call-info">
              <h4>${otherUser.username || 'مستخدم'}</h4>
              <p class="${statusClass}">
                ${statusIcon}
              </p>
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                ${formatTime(call.timestamp)}
                ${call.duration ? ` · ${formatDuration(call.duration)}` : ''}
              </span>
            </div>
            <button class="call-action" onclick="startCall('${call.type}', '${otherUserId}', '${otherUser.username}', '${avatar}')">
              ${typeIcon}
            </button>
          </div>
        `;
      }
      
      callsList.innerHTML = html || '<p style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد مكالمات</p>';
      
    } catch (error) {
      console.error('Error loading calls:', error);
    }
  }
  
  /**
   * مسح سجل المكالمات
   */
  async function clearCallHistory() {
    if (!confirm('هل أنت متأكد من مسح سجل المكالمات؟')) return;
    
    try {
      const callsSnapshot = await db.collection('calls')
        .where('participants', 'array-contains', currentUser.uid)
        .get();
      
      const batch = db.batch();
      callsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      loadCallHistory();
      showToast('تم مسح سجل المكالمات', 'success');
      
    } catch (error) {
      console.error('Error clearing call history:', error);
      showToast('حدث خطأ', 'error');
    }
  }
  
  /**
   * بدء مكالمة
   */
  function startCall(type, userId, userName, userAvatar) {
    if (!userId && currentChat) {
      userId = currentChat.id;
      userName = currentChat.name;
      userAvatar = currentChat.avatar;
    }
    
    // تحديث مودال المكالمة
    document.getElementById('callUserName').textContent = userName;
    document.getElementById('callUserAvatar').src = userAvatar;
    document.getElementById('callTypeText').textContent = type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية';
    document.getElementById('callTypeIcon').innerHTML = type === 'video' ? '<i class="fas fa-video"></i>' : '<i class="fas fa-phone"></i>';
    document.getElementById('callStatus').textContent = 'جاري الاتصال...';
    document.getElementById('callTimer').style.display = 'none';
    
    // إظهار زر الفيديو للمكالمات الفيديو
    document.getElementById('toggleVideoBtn').style.display = type === 'video' ? 'flex' : 'none';
    
    // إظهار المودال
    document.getElementById('callModal').classList.add('active');
    
    // محاكاة اتصال
    simulateCall(type, userId, userName, userAvatar);
  }
  
  /**
   * محاكاة مكالمة
   */
  function simulateCall(type, userId, userName, userAvatar) {
    let answered = false;
    let duration = 0;
    let timerInterval = null;
    
    // محاكاة الرد بعد 3-8 ثوان
    const answerDelay = 3000 + Math.random() * 5000;
    
    setTimeout(() => {
      if (!answered) {
        // الرد على المكالمة
        answered = true;
        document.getElementById('callStatus').textContent = 'متصل';
        document.getElementById('callTimer').style.display = 'block';
        
        // بدء العداد
        timerInterval = setInterval(() => {
          duration++;
          document.getElementById('callDuration').textContent = formatDuration(duration);
        }, 1000);
      }
    }, answerDelay);
    
    // زر إنهاء المكالمة
    document.getElementById('endCallBtn').onclick = async () => {
      if (timerInterval) clearInterval(timerInterval);
      
      // تسجيل المكالمة
      await logCall(type, userId, answered, duration);
      
      // إغلاق المودال
      document.getElementById('callModal').classList.remove('active');
      
      showToast('تم إنهاء المكالمة', 'info');
    };
    
    // زر كتم الصوت
    document.getElementById('muteBtn').onclick = function() {
      this.classList.toggle('active');
      this.style.background = this.classList.contains('active') ? 'var(--danger)' : 'rgba(255,255,255,0.1)';
    };
    
    // زر السماعة
    document.getElementById('speakerBtn').onclick = function() {
      this.classList.toggle('active');
      this.style.background = this.classList.contains('active') ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)';
    };
  }
  
  /**
   * تسجيل المكالمة
   */
  async function logCall(type, otherUserId, answered, duration) {
    try {
      await db.collection('calls').add({
        type: type,
        participants: [currentUser.uid, otherUserId],
        callerId: currentUser.uid,
        receiverId: otherUserId,
        status: answered ? 'answered' : 'missed',
        duration: duration,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      loadCallHistory();
      
    } catch (error) {
      console.error('Error logging call:', error);
    }
  }
  
  // ============================================
  // التنقل بين الأقسام
  // ============================================
  
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        // تحديث التنقل
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        // تحديث الأقسام
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}Section`).classList.add('active');
      });
    });
  }
  
  // ============================================
  // المودالات
  // ============================================
  
  function initModals() {
    // مودال إضافة حالة
    initStatusModal();
    
    // مودال إنشاء مجتمع
    initCommunityModal();
    
    // إغلاق المودالات
    document.querySelectorAll('.close-modal-btn, .cancel-btn').forEach(btn => {
      btn.addEventListener('click', closeActiveModal);
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', closeActiveModal);
    });
    
    // إغلاق عرض الحالة
    document.getElementById('closeStatusBtn').addEventListener('click', closeStatusView);
  }
  
  /**
   * تهيئة مودال الحالة
   */
  function initStatusModal() {
    let selectedType = 'text';
    let selectedColor = '#075e54';
    let mediaFile = null;
    
    // تبديل نوع الحالة
    document.querySelectorAll('#addStatusModal .type-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#addStatusModal .type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        selectedType = tab.dataset.type;
        
        // إظهار/إخفاء الحقول
        document.getElementById('statusTextInput').style.display = selectedType === 'text' ? 'block' : 'none';
        document.querySelector('.bg-colors').style.display = selectedType === 'text' ? 'block' : 'none';
        
        if (selectedType === 'image') {
          document.getElementById('statusImageInput').click();
        } else if (selectedType === 'video') {
          document.getElementById('statusVideoInput').click();
        }
      });
    });
    
    // اختيار لون الخلفية
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        selectedColor = option.dataset.color;
      });
    });
    
    // رفع صورة للحالة
    document.getElementById('statusImageInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        mediaFile = file;
        const preview = document.getElementById('statusMediaPreview');
        preview.style.display = 'block';
        preview.innerHTML = `<img src="${await imageToBase64(file)}" alt="">`;
      }
    });
    
    // رفع فيديو للحالة
    document.getElementById('statusVideoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        mediaFile = file;
        const preview = document.getElementById('statusMediaPreview');
        preview.style.display = 'block';
        preview.innerHTML = `<video src="${await imageToBase64(file)}" controls></video>`;
      }
    });
    
    // نشر الحالة
    document.getElementById('submitStatusBtn').addEventListener('click', async () => {
      const text = document.getElementById('statusTextInput').value.trim();
      
      if (selectedType === 'text' && !text) {
        showToast('أدخل نص الحالة', 'error');
        return;
      }
      
      if (selectedType !== 'text' && !mediaFile) {
        showToast('اختر صورة أو فيديو', 'error');
        return;
      }
      
// داخل حدث submitStatusBtn
try {
    // ✅ استخدام Timestamp.now() بدلاً من serverTimestamp()
    let statusData = {
      type: selectedType,
      text: text,
      bgColor: selectedColor,
      timestamp: firebase.firestore.Timestamp.now()
    };

    if (mediaFile) {
      statusData.mediaUrl = await imageToBase64(mediaFile);
    }

    // إضافة الحالة للمستخدم في Firestore
    await db.collection('users').doc(currentUser.uid).update({
      statuses: firebase.firestore.FieldValue.arrayUnion(statusData)
    });

    // ✅ تحديث البيانات المحلية فوراً
    if (!userData.statuses) userData.statuses = [];
    userData.statuses.push(statusData);

    // ✅ تحديث الواجهة لإظهار الدائرة الجديدة
    renderMyStatus();

    closeActiveModal();
    showToast('تم نشر الحالة', 'success');

    // إعادة تعيين الحقول
    document.getElementById('statusTextInput').value = '';
    document.getElementById('statusMediaPreview').style.display = 'none';
    mediaFile = null;

}catch (error) {
        console.error('Error posting status:', error);
        showToast('حدث خطأ', 'error');
      }
    });
  }
  
  /**
   * تهيئة مودال المجتمع
   */
  function initCommunityModal() {
    let members = [];
    let communityAvatar = null;
    
    // إضافة عضو
document.getElementById('addMemberBtn').addEventListener('click', async () => {
  const email = document.getElementById('memberEmailInput').value.trim();
  
  if (!email) {
    showToast('أدخل البريد الإلكتروني', 'error');
    return;
  }
  
  if (members.includes(email)) {
    showToast('العضو موجود بالفعل', 'error');
    return;
  }
  
  // البحث عن المستخدم بالبريد الإلكتروني
  const userSnapshot = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (userSnapshot.empty) {
    showToast('لم يتم العثور على المستخدم', 'error');
    return;
  }
  
  const userDoc = userSnapshot.docs[0];
  const foundUserData = userDoc.data();
  members.push(userDoc.id);
  
  // إضافة العضو للقائمة
  const memberList = document.getElementById('addedMembersList');
  
  const tag = document.createElement('div');
  tag.className = 'member-tag';
  tag.innerHTML = `
    <span>${foundUserData.username || email}</span>
    <button onclick="this.parentElement.remove(); members = members.filter(m => m !== '${userDoc.id}');">×</button>
  `;
  memberList.appendChild(tag);
  
  document.getElementById('memberEmailInput').value = '';
});
    
    // رفع صورة المجتمع
    document.getElementById('communityAvatarUpload').addEventListener('click', () => {
      document.getElementById('communityAvatarInput').click();
    });
    
    document.getElementById('communityAvatarInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        communityAvatar = await imageToBase64(file);
        const upload = document.getElementById('communityAvatarUpload');
        upload.innerHTML = `<img src="${communityAvatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
      }
    });
    
    // إنشاء المجتمع
    document.getElementById('createCommunitySubmitBtn').addEventListener('click', async () => {
      const name = document.getElementById('communityNameInput').value.trim();
      const desc = document.getElementById('communityDescInput').value.trim();
      
      if (!name) {
        showToast('أدخل اسم المجتمع', 'error');
        return;
      }
      
      if (members.length === 0) {
        showToast('أضف عضواً واحداً على الأقل', 'error');
        return;
      }
      
      try {
        await db.collection('communities').add({
          name: name,
          description: desc,
          photoURL: communityAvatar,
          createdBy: currentUser.uid,
          members: [currentUser.uid, ...members],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeActiveModal();
        loadCommunities();
        showToast('تم إنشاء المجتمع', 'success');
        
        // إعادة تعيين
        document.getElementById('communityNameInput').value = '';
        document.getElementById('communityDescInput').value = '';
        document.getElementById('addedMembersList').innerHTML = '';
        members = [];
        communityAvatar = null;
        
      } catch (error) {
        console.error('Error creating community:', error);
        showToast('حدث خطأ', 'error');
      }
    });
  }
  
  /**
   * إغلاق المودال النشط
   */
  function closeActiveModal() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
  }
  
  // ============================================
  // البحث عن مستخدمين
  // ============================================
  
document.getElementById('searchBtn').addEventListener('click', () => {
  const email = prompt('أدخل البريد الإلكتروني للمستخدم:');
  
  if (email && email.trim()) {
    searchUserByEmail(email.trim());
  }
});
  
async function searchUserByEmail(email) {
  try {
    const userSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      showToast('لم يتم العثور على المستخدم', 'error');
      return;
    }
    
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    
    // فتح محادثة مع المستخدم
    const avatar = userData.photoURL || 
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(userData.username || 'م')[0]}</text></svg>`;
    
    openChat(userDoc.id, userData.username, avatar);
    
  } catch (error) {
    console.error('Error searching user:', error);
    showToast('حدث خطأ في البحث', 'error');
  }
}
  
  // ============================================
  // بدء التطبيق
  // ============================================
  
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('واتساب الإسلامي - جاري التحميل...');
    
    // التحقق من المصادقة
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // تهيئة التطبيق
      await initializeApp();
      console.log('مرحباً، ' + (userData.username || 'المستخدم'));
    } else {
      // إظهار شاشة عدم التسجيل
      document.getElementById('authCheckScreen').style.display = 'none';
      document.getElementById('notRegisteredScreen').style.display = 'flex';
    }
  });
  
  // تحديث حالة الاتصال
  window.addEventListener('beforeunload', async () => {
    if (currentUser) {
      await db.collection('users').doc(currentUser.uid).update({
        lastOnline: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  
  // تصدير الدوال للاستخدام العام
  window.startCall = startCall;
  window.viewImage = (url) => window.open(url, '_blank');
/**
 * ============================================
 * نظام المكالمات الحقيقية باستخدام WebRTC
 * ============================================
 */

// ============================================
// متغيرات WebRTC
// ============================================
// ============================================
// نظام المكالمات الحقيقية باستخدام WebRTC
// ============================================

class WebRTCManager {
  constructor() {
      this.peerConnection = null;
      this.localStream = null;
      this.remoteStream = null;
      this.isMuted = false;
      this.isSpeaker = false;
      this.isEarpiece = true;
      this.audioElement = null;
      this.currentCallId = null;
      this.callStartTime = null;
      this.timerInterval = null;
      this.callType = 'voice';
      this.otherUserId = null;
      this.callDoc = null;
      this.callListener = null;
      
      this.iceServers = {
          iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
          ]
      };
  }

  // ============================================
  // بدء مكالمة صوتية
  // ============================================
  async startVoiceCall(userId, userName, userAvatar) {
      this.callType = 'voice';
      this.otherUserId = userId;
      
      try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
              },
              video: false
          });
          
          this.showCallModal(userName, userAvatar, 'voice');
          await this.createPeerConnection();
          
          this.callDoc = db.collection('calls_v2').doc();
          this.currentCallId = this.callDoc.id;
          
          await this.callDoc.set({
              type: 'voice',
              callerId: currentUser.uid,
              callerName: userData.username,
              callerAvatar: userData.photoURL,
              receiverId: userId,
              status: 'calling',
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              participants: [currentUser.uid, userId]
          });
          
          this.listenForAnswer();
          this.collectIceCandidates();
          await this.createOffer();
          
          showToast('جاري الاتصال...', 'info');
          
      } catch (error) {
          console.error('Error starting call:', error);
          
          if (error.name === 'NotAllowedError') {
              showToast('يرجى السماح بالوصول للميكروفون', 'error');
          } else if (error.name === 'NotFoundError') {
              showToast('لم يتم العثور على ميكروفون', 'error');
          } else {
              showToast('حدث خطأ في الاتصال', 'error');
          }
          
          this.endCall();
      }
  }

  // ============================================
  // بدء مكالمة فيديو
  // ============================================
  startVideoCall(userId, userName, userAvatar) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'coming-soon-alert';
      alertDiv.innerHTML = `
          <div class="coming-soon-content">
              <div class="coming-soon-icon">
                  <i class="fas fa-video"></i>
              </div>
              <h3>مكالمة الفيديو</h3>
              <p>هذه الميزة قيد التطوير وستكون متاحة قريباً!</p>
              <button class="coming-soon-btn" onclick="this.parentElement.parentElement.remove()">
                  حسناً
              </button>
          </div>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
          .coming-soon-alert {
              position: fixed;
              inset: 0;
              z-index: 9999;
              background: rgba(0,0,0,0.8);
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .coming-soon-content {
              background: var(--bg-secondary);
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              max-width: 350px;
              margin: 20px;
          }
          .coming-soon-icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, var(--accent-green), var(--secondary-green));
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              font-size: 2rem;
              color: white;
          }
          .coming-soon-btn {
              padding: 12px 40px;
              background: var(--accent-green);
              border: none;
              border-radius: 25px;
              color: white;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
          }
      `;
      document.head.appendChild(style);
      document.body.appendChild(alertDiv);
  }

  // ============================================
  // إنشاء PeerConnection
  // ============================================
  async createPeerConnection() {
      this.peerConnection = new RTCPeerConnection(this.iceServers);
      
      if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
              this.peerConnection.addTrack(track, this.localStream);
          });
      }
      
      this.peerConnection.ontrack = (event) => {
          console.log('Received remote track');
          this.remoteStream = event.streams[0];
          this.playRemoteAudio();
      };
      
      this.peerConnection.onconnectionstatechange = () => {
          console.log('Connection state:', this.peerConnection.connectionState);
          switch (this.peerConnection.connectionState) {
              case 'connected':
                  this.onCallConnected();
                  break;
              case 'disconnected':
              case 'failed':
                  this.endCall();
                  break;
          }
      };
  }

  // ============================================
  // إنشاء Offer
  // ============================================
  async createOffer() {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      await this.callDoc.collection('signals').doc('offer').set({
          sdp: offer.sdp,
          type: offer.type,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
  }

  // ============================================
  // الاستماع للإجابة
  // ============================================
  listenForAnswer() {
      this.callListener = this.callDoc.collection('signals').doc('answer')
          .onSnapshot(async (snapshot) => {
              if (snapshot.exists) {
                  const data = snapshot.data();
                  if (data && data.sdp && !this.peerConnection.currentRemoteDescription) {
                      const answer = new RTCSessionDescription({
                          type: data.type,
                          sdp: data.sdp
                      });
                      await this.peerConnection.setRemoteDescription(answer);
                  }
              }
          });
  }

  // ============================================
  // جمع ICE Candidates
  // ============================================
  collectIceCandidates() {
      this.peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
              await this.callDoc.collection('iceCandidates').add({
                  ...event.candidate.toJSON(),
                  userId: currentUser.uid,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
          }
      };
      
      this.callDoc.collection('iceCandidates')
          .where('userId', '!=', currentUser.uid)
          .onSnapshot((snapshot) => {
              snapshot.docChanges().forEach(async (change) => {
                  if (change.type === 'added') {
                      const data = change.doc.data();
                      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                  }
              });
          });
  }

  // ============================================
  // استقبال مكالمة
  // ============================================
  async receiveCall(callData, callId) {
      this.callType = callData.type;
      this.otherUserId = callData.callerId;
      this.currentCallId = callId;
      this.callDoc = db.collection('calls_v2').doc(callId);
      this.showIncomingCallModal(callData);
  }

  // ============================================
  // قبول المكالمة
  // ============================================
  async acceptCall() {
      try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
              },
              video: this.callType === 'video'
          });
          
          document.getElementById('incomingCallModal').style.display = 'none';
          
          const callerName = document.getElementById('incomingCallerName').textContent;
          const callerAvatar = document.getElementById('incomingCallerAvatar').src;
          this.showCallModal(callerName, callerAvatar, this.callType);
          
          await this.callDoc.update({ status: 'answered' });
          await this.createPeerConnection();
          
          const offerDoc = await this.callDoc.collection('signals').doc('offer').get();
          if (offerDoc.exists) {
              const offerData = offerDoc.data();
              const offer = new RTCSessionDescription({
                  type: offerData.type,
                  sdp: offerData.sdp
              });
              
              await this.peerConnection.setRemoteDescription(offer);
              const answer = await this.peerConnection.createAnswer();
              await this.peerConnection.setLocalDescription(answer);
              
              await this.callDoc.collection('signals').doc('answer').set({
                  sdp: answer.sdp,
                  type: answer.type,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
              
              this.collectIceCandidates();
          }
          
      } catch (error) {
          console.error('Error accepting call:', error);
          showToast('حدث خطأ في قبول المكالمة', 'error');
          this.endCall();
      }
  }

  // ============================================
  // رفض المكالمة
  // ============================================
  async rejectCall() {
      if (this.callDoc) {
          await this.callDoc.update({ status: 'rejected' });
      }
      document.getElementById('incomingCallModal').style.display = 'none';
      this.cleanup();
  }

  // ============================================
  // عند اتصال المكالمة
  // ============================================
  onCallConnected() {
      document.getElementById('callStatus').textContent = 'متصل';
      document.getElementById('callStatus').classList.remove('call-status-connecting');
      document.getElementById('callTimer').style.display = 'block';
      
      this.callStartTime = Date.now();
      this.timerInterval = setInterval(() => {
          const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
          document.getElementById('callDuration').textContent = this.formatDuration(duration);
      }, 1000);
      
      showToast('تم الاتصال', 'success');
  }

  // ============================================
  // تشغيل الصوت البعيد (سماعة الأذن افتراضياً)
  // ============================================
  async playRemoteAudio() {
      this.audioElement = document.getElementById('callAudioElement');
      
      if (!this.audioElement || !this.remoteStream) return;
      
      this.audioElement.srcObject = this.remoteStream;
      
      try {
          await this.audioElement.play();
          console.log('✅ Audio playing');
      } catch (e) {
          console.error('Could not play audio:', e);
      }
      
      // افتراضياً: سماعة الأذن = صوت منخفض (15%)
      this.audioElement.volume = 0.15;
      this.isSpeaker = false;
      this.isEarpiece = true;
      
      const earpieceBtn = document.getElementById('earpieceBtn');
      const speakerBtn = document.getElementById('speakerBtn');
      if (earpieceBtn) earpieceBtn.classList.add('active');
      if (speakerBtn) speakerBtn.classList.remove('active');
  }

  // ============================================
  // كتم/إلغاء كتم المايكروفون
  // ============================================
  toggleMute() {
      if (this.localStream) {
          const audioTrack = this.localStream.getAudioTracks()[0];
          if (audioTrack) {
              this.isMuted = !this.isMuted;
              audioTrack.enabled = !this.isMuted;
              
              const muteBtn = document.getElementById('muteBtn');
              if (this.isMuted) {
                  muteBtn.classList.add('active');
                  muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                  showToast('تم كتم المايكروفون', 'info');
              } else {
                  muteBtn.classList.remove('active');
                  muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                  showToast('تم إلغاء كتم المايكروفون', 'info');
              }
          }
      }
  }

  // ============================================
  // تبديل إلى مكبر الصوت (صوت عالي 100%)
  // ============================================
  async toggleSpeaker() {
      const speakerBtn = document.getElementById('speakerBtn');
      const earpieceBtn = document.getElementById('earpieceBtn');
      
      this.isSpeaker = true;
      this.isEarpiece = false;
      
      if (speakerBtn) speakerBtn.classList.add('active');
      if (earpieceBtn) earpieceBtn.classList.remove('active');
      
      // رفع الصوت للحد الأقصى
      if (this.audioElement) {
          this.audioElement.volume = 1.0;
      }
      
      showToast('🔊 تم تفعيل مكبر الصوت', 'info');
  }

  // ============================================
  // تبديل إلى سماعة الأذن (صوت منخفض 15%)
  // ============================================
  async toggleEarpiece() {
      const speakerBtn = document.getElementById('speakerBtn');
      const earpieceBtn = document.getElementById('earpieceBtn');
      
      this.isSpeaker = false;
      this.isEarpiece = true;
      
      if (speakerBtn) speakerBtn.classList.remove('active');
      if (earpieceBtn) earpieceBtn.classList.add('active');
      
      // تخفيض الصوت
      if (this.audioElement) {
          this.audioElement.volume = 0.15;
      }
      
      showToast('🎧 سماعة الأذن', 'info');
  }

  // ============================================
  // إنهاء المكالمة
  // ============================================
  async endCall() {
      let duration = 0;
      if (this.callStartTime) {
          duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      }
      
      if (this.callDoc) {
          try {
              await this.callDoc.update({
                  status: 'ended',
                  duration: duration
              });
          } catch (e) {
              console.log('Could not update call status');
          }
      }
      
      if (this.timerInterval) {
          clearInterval(this.timerInterval);
      }
      
      this.cleanup();
      
      document.getElementById('callModal').classList.remove('active');
      document.getElementById('incomingCallModal').style.display = 'none';
      
      showToast('تم إنهاء المكالمة', 'info');
      
      if (this.otherUserId && duration > 0) {
          await logCallToHistory(this.callType, this.otherUserId, true, duration);
      }
  }

  // ============================================
  // تنظيف الموارد
  // ============================================
  cleanup() {
      if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
      }
      
      if (this.remoteStream) {
          this.remoteStream.getTracks().forEach(track => track.stop());
          this.remoteStream = null;
      }
      
      if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
      }
      
      if (this.callListener) {
          this.callListener();
          this.callListener = null;
      }
      
      this.currentCallId = null;
      this.callStartTime = null;
      this.isMuted = false;
      this.isSpeaker = false;
      this.isEarpiece = true;
      
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo) {
          remoteVideo.srcObject = null;
          remoteVideo.classList.remove('active');
      }
  }

  // ============================================
  // إظهار مودال المكالمة
  // ============================================
  showCallModal(userName, userAvatar, type) {
      document.getElementById('callUserName').textContent = userName;
      document.getElementById('callUserAvatar').src = userAvatar;
      document.getElementById('callTypeText').textContent = type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية';
      document.getElementById('callTypeIcon').innerHTML = type === 'video' ? '<i class="fas fa-video"></i>' : '<i class="fas fa-phone"></i>';
      document.getElementById('callStatus').textContent = 'جاري الاتصال...';
      document.getElementById('callStatus').classList.add('call-status-connecting');
      document.getElementById('callTimer').style.display = 'none';
      document.getElementById('callDuration').textContent = '00:00';
      
      // إعادة تعيين الأزرار - سماعة الأذن افتراضية
      const muteBtn = document.getElementById('muteBtn');
      const speakerBtn = document.getElementById('speakerBtn');
      const earpieceBtn = document.getElementById('earpieceBtn');
      
      if (muteBtn) {
          muteBtn.classList.remove('active');
          muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
      if (speakerBtn) speakerBtn.classList.remove('active');
      if (earpieceBtn) earpieceBtn.classList.add('active');
      
      document.getElementById('callModal').classList.add('active');
  }

  // ============================================
  // إظهار مودال المكالمة الواردة
  // ============================================
  showIncomingCallModal(callData) {
      document.getElementById('incomingCallerName').textContent = callData.callerName || 'مستخدم';
      document.getElementById('incomingCallerAvatar').src = callData.callerAvatar || 
          `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(callData.callerName || 'م')[0]}</text></svg>`;
      document.getElementById('incomingCallType').textContent = 
          callData.type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية';
      
      document.getElementById('incomingCallModal').style.display = 'flex';
  }

  // ============================================
  // تنسيق المدة
  // ============================================
  formatDuration(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// إنشاء مثيل من مدير المكالمات
const webrtcManager = new WebRTCManager();
  
  // ============================================
  // الاستماع للمكالمات الواردة
  // ============================================
  function listenForIncomingCalls() {
    if (!currentUser) return;
    
    db.collection('calls_v2')
      .where('receiverId', '==', currentUser.uid)
      .where('status', '==', 'calling')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const callData = change.doc.data();
            webrtcManager.receiveCall(callData, change.doc.id);
          }
          
          // إذا تم إلغاء المكالمة
          if (change.type === 'modified') {
            const data = change.doc.data();
            if (data.status === 'ended' || data.status === 'rejected') {
              webrtcManager.cleanup();
              document.getElementById('incomingCallModal').style.display = 'none';
              document.getElementById('callModal').classList.remove('active');
            }
          }
        });
      });
  }
  
  // ============================================
  // تسجيل المكالمة في السجل
  // ============================================
  async function logCallToHistory(type, otherUserId, answered, duration) {
    try {
      await db.collection('calls').add({
        type: type,
        participants: [currentUser.uid, otherUserId],
        callerId: currentUser.uid,
        receiverId: otherUserId,
        status: answered ? 'answered' : 'missed',
        duration: duration,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      loadCallHistory();
      
    } catch (error) {
      console.error('Error logging call:', error);
    }
  }
  
  // ============================================
  // تحديث أحداث الأزرار
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    // زر كتم المايك
    document.getElementById('muteBtn').addEventListener('click', () => {
      webrtcManager.toggleMute();
    });
    
    // زر مكبر الصوت
    document.getElementById('speakerBtn').addEventListener('click', () => {
      webrtcManager.toggleSpeaker();
    });
    
    // زر سماعة الأذن
    document.getElementById('earpieceBtn').addEventListener('click', () => {
      webrtcManager.toggleEarpiece();
    });
    
    // زر إنهاء المكالمة
    document.getElementById('endCallBtn').addEventListener('click', () => {
      webrtcManager.endCall();
    });
    
    // أزرار المكالمة الواردة
    document.getElementById('acceptCallBtn').addEventListener('click', () => {
      webrtcManager.acceptCall();
    });
    
    document.getElementById('rejectCallBtn').addEventListener('click', () => {
      webrtcManager.rejectCall();
    });
  });
  
  // ============================================
  // تحديث دالة startCall
  // ============================================
  function startCall(type, userId, userName, userAvatar) {
    if (!userId && currentChat) {
      userId = currentChat.id;
      userName = currentChat.name;
      userAvatar = currentChat.avatar;
    }
    
    if (type === 'video') {
      webrtcManager.startVideoCall(userId, userName, userAvatar);
    } else {
      webrtcManager.startVoiceCall(userId, userName, userAvatar);
    }
  }
  // ============================================
// تسجيل الرسائل الصوتية
// ============================================

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;

/**
 * بدء تسجيل صوتي
 */
async function startVoiceRecording() {
    if (isRecording) {
        stopVoiceRecording();
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // إنشاء ملف من الـ Blob
            const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
                type: 'audio/webm'
            });
            
            // رفع وإرسال
            await uploadAndSendMedia(audioFile, 'audio');
            
            // إيقاف الـ stream
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingSeconds = 0;
        
        // تحديث شكل الزر
        const micBtn = document.getElementById('micBtn');
        micBtn.innerHTML = '<i class="fas fa-stop"></i>';
        micBtn.style.background = '#ea4335';
        micBtn.style.color = 'white';
        
        // بدء العداد
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            const mins = Math.floor(recordingSeconds / 60);
            const secs = recordingSeconds % 60;
            micBtn.innerHTML = `<span style="font-size: 0.7rem;">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>`;
        }, 1000);
        
        showToast('🎤 جاري التسجيل...', 'info');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showToast('يرجى السماح بالوصول للميكروفون', 'error');
    }
}

/**
 * إيقاف التسجيل الصوتي
 */
function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // إيقاف العداد
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        // إعادة شكل الزر
        const micBtn = document.getElementById('micBtn');
        micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        micBtn.style.background = '';
        micBtn.style.color = '';
        
        showToast('⏹️ تم إيقاف التسجيل', 'info');
    }
}
  // تصدير الدوال
  window.startCall = startCall;
  window.listenForIncomingCalls = listenForIncomingCalls;
  // ============================================
// تحديث قسم المجتمعات
// ============================================

/**
 * تهيئة قسم المجتمعات
 */
function initCommunitiesSection() {
    // فتح مودال إنشاء مجتمع
    document.getElementById('createCommunityBtn').addEventListener('click', () => {
        document.getElementById('createCommunityModal').classList.add('active');
    });
    
    // تحميل المجتمعات
    loadCommunities();
}

/**
 * تحميل المجتمعات
 */
async function loadCommunities() {
    const communitiesList = document.getElementById('communitiesList');
    if (!communitiesList) return;
    
    try {
        communitiesList.innerHTML = `
            <div class="loading-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                <div class="loader" style="margin: 0 auto 16px;"></div>
                <p>جاري تحميل المجتمعات...</p>
            </div>
        `;
        
        const communitiesSnapshot = await db.collection('communities')
            .where('members', 'array-contains', currentUser.uid)
            .get();
        
        if (communitiesSnapshot.empty) {
            communitiesList.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>لا توجد مجتمعات</p>
                    <p style="font-size: 0.85rem; margin-top: 8px;">أنشئ مجتمعاً للبدء</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        for (const doc of communitiesSnapshot.docs) {
            const community = doc.data();
            const lastMessage = community.lastMessage || '';
            const lastMessageTime = community.lastMessageAt;
            const lastMessageSender = community.lastMessageSenderName || '';
            
            // تحديد صورة المجتمع
            let avatarHtml = '';
            if (community.photoURL) {
                avatarHtml = `<img src="${community.photoURL}" alt="">`;
            } else {
                avatarHtml = `<div class="community-default-icon"><i class="fas fa-users"></i></div>`;
            }
            
            html += `
                <div class="community-item" data-id="${doc.id}" data-name="${community.name}" data-avatar="${community.photoURL || ''}">
                    <div class="community-avatar">
                        ${avatarHtml}
                    </div>
                    <div class="community-info">
                        <h4>${community.name}</h4>
                        <p class="members-count-badge">
                            <i class="fas fa-user"></i>
                            ${community.members.length} عضو
                        </p>
                        ${lastMessage ? `
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${lastMessageSender ? `<span style="color: var(--accent-green);">${lastMessageSender}:</span> ` : ''}
                                ${lastMessage.substring(0, 35)}${lastMessage.length > 35 ? '...' : ''}
                            </p>
                        ` : ''}
                    </div>
                    ${lastMessageTime ? `<span style="font-size: 0.7rem; color: var(--text-muted);">${formatTime(lastMessageTime)}</span>` : ''}
                </div>
            `;
        }
        
        communitiesList.innerHTML = html;
        
        // إضافة أحداث النقر للمجتمعات
        communitiesList.querySelectorAll('.community-item').forEach(item => {
            item.addEventListener('click', () => {
                const communityId = item.dataset.id;
                const communityName = item.dataset.name;
                const communityAvatar = item.dataset.avatar;
                openCommunityChat(communityId, communityName, communityAvatar);
            });
        });
        
    } catch (error) {
        console.error('Error loading communities:', error);
        communitiesList.innerHTML = `
            <div class="error-state" style="padding: 40px; text-align: center; color: var(--danger);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 16px;"></i>
                <p>حدث خطأ في تحميل المجتمعات</p>
            </div>
        `;
    }
}

/**
 * فتح محادثة المجتمع
 */
function openCommunityChat(communityId, communityName, communityAvatar) {
    currentChat = {
        id: communityId,
        name: communityName,
        avatar: communityAvatar,
        type: 'community'
    };
    
    // تحديث واجهة المحادثة
    document.getElementById('chatUserName').textContent = communityName;
    
    // تعيين صورة المجتمع
    const avatarImg = document.getElementById('chatUserAvatar');
    if (communityAvatar) {
        avatarImg.src = communityAvatar;
    } else {
        avatarImg.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="35">👥</text></svg>`;
    }
    
    document.getElementById('chatUserStatus').textContent = 'مجتمع';
    
    // إضافة زر معلومات المجتمع
    const chatActions = document.querySelector('.chat-actions');
    if (!document.getElementById('communityInfoBtn')) {
        const infoBtn = document.createElement('button');
        infoBtn.className = 'action-btn';
        infoBtn.id = 'communityInfoBtn';
        infoBtn.title = 'معلومات المجتمع';
        infoBtn.innerHTML = '<i class="fas fa-info-circle"></i>';
        infoBtn.onclick = () => showCommunityInfo(communityId);
        chatActions.insertBefore(infoBtn, chatActions.firstChild);
    }
    
    // إظهار واجهة المحادثة
    const chatView = document.getElementById('chatView');
    chatView.classList.add('active');
    
    // تحميل رسائل المجتمع
    loadCommunityMessages(communityId);
}

/**
 * تحميل رسائل المجتمع
 */
function loadCommunityMessages(communityId) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // إلغاء الاستماع السابق
    if (messagesListener) {
        messagesListener();
    }
    
    // الاستماع للرسائل في الوقت الحقيقي
    messagesListener = db.collection('communities').doc(communityId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limitToLast(100)
        .onSnapshot(snapshot => {
            let messagesHtml = '';
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isSent = msg.senderId === currentUser.uid;
                
                messagesHtml += createGroupMessageHTML(msg, isSent);
            });
            
            messagesContainer.innerHTML = messagesHtml;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

/**
 * إنشاء HTML لرسالة المجتمع
 */
function createGroupMessageHTML(msg, isSent) {
    const time = formatMessageTime(msg.timestamp);
    const messageClass = isSent ? 'sent' : 'received';
    
    // تحديد لون الاسم بناءً على معرف المرسل
    const colorIndex = msg.senderId ? msg.senderId.charCodeAt(0) % 10 : 0;
    
    let contentHtml = '';
    
    // رأس الرسالة (صورة واسم المرسل) - فقط للرسائل المستلمة
    let senderHeaderHtml = '';
    if (!isSent) {
        const senderAvatar = msg.senderAvatar || 
            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(msg.senderName || 'م')[0]}</text></svg>`;
        
        senderHeaderHtml = `
            <div class="message-group-header">
                <img src="${senderAvatar}" alt="" class="message-group-avatar">
                <span class="message-sender-name name-color-${colorIndex}">${escapeHtml(msg.senderName || 'مستخدم')}</span>
            </div>
        `;
    }
    
    // محتوى الرسالة
    if (msg.type === 'image') {
        contentHtml = `
            <div class="message-media">
                <img src="${msg.mediaUrl}" alt="صورة" onclick="viewImage('${msg.mediaUrl}')">
            </div>
        `;
    } else if (msg.type === 'video') {
        contentHtml = `
            <div class="message-media">
                <video src="${msg.mediaUrl}" controls></video>
            </div>
        `;
    }
    
    contentHtml += `<div class="message-text">${escapeHtml(msg.text)}</div>`;
    
    return `
        <div class="message ${messageClass} group-message">
            ${senderHeaderHtml}
            ${contentHtml}
            <div class="message-meta">
                <span class="message-time">${time}</span>
                ${isSent ? `<span class="message-status ${msg.read ? 'read' : ''}"><i class="fas fa-check-double"></i></span>` : ''}
            </div>
        </div>
    `;
}

/**
 * إرسال رسالة للمجتمع
 */
async function sendCommunityMessage(communityId, text, type = 'text', mediaUrl = null) {
    try {
        const messageData = {
            text: text,
            type: type,
            senderId: currentUser.uid,
            senderName: userData.username || 'مستخدم',
            senderAvatar: userData.photoURL || null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        };
        
        if (mediaUrl) {
            messageData.mediaUrl = mediaUrl;
        }
        
        // إضافة الرسالة
        await db.collection('communities').doc(communityId)
            .collection('messages').add(messageData);
        
        // تحديث بيانات المجتمع
        await db.collection('communities').doc(communityId).update({
            lastMessage: text,
            lastMessageSenderName: userData.username || 'مستخدم',
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error sending community message:', error);
        showToast('حدث خطأ في إرسال الرسالة', 'error');
    }
}

/**
 * إرسال رسالة (محدّثة لتدعم المجتمعات)
 */
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChat || !currentUser) return;
    
    input.value = '';
    
    // التحقق من نوع المحادثة
    if (currentChat.type === 'community') {
        await sendCommunityMessage(currentChat.id, text);
    } else {
        // محادثة خاصة (الكود القديم)
        const chatId = getChatId(currentUser.uid, currentChat.id);
        
        try {
            await db.collection('chats').doc(chatId).collection('messages').add({
                text: text,
                type: 'text',
                senderId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            
            await db.collection('chats').doc(chatId).set({
                participants: [currentUser.uid, currentChat.id],
                lastMessage: text,
                lastMessageSenderId: currentUser.uid,
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${currentChat.id}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
            
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('حدث خطأ في إرسال الرسالة', 'error');
        }
    }
}

/**
 * إرسال رسالة وسائط للمجتمع
 */
async function sendCommunityMediaMessage(communityId, file, type) {
    try {
        showToast('جاري الرفع...', 'info');
        
        const base64 = await imageToBase64(file);
        
        await sendCommunityMessage(
            communityId, 
            type === 'image' ? '📷 صورة' : '🎬 فيديو',
            type,
            base64
        );
        
        showToast('تم الإرسال', 'success');
        
    } catch (error) {
        console.error('Error sending community media:', error);
        showToast('حدث خطأ في الإرسال', 'error');
    }
}

/**
 * إرسال رسالة وسائط (محدّثة)
 */
async function sendMediaMessage(file, type) {
    if (!currentChat || !currentUser) return;
    
    try {
        showToast('جاري الرفع...', 'info');
        
        const base64 = await imageToBase64(file);
        
        if (currentChat.type === 'community') {
            await sendCommunityMediaMessage(currentChat.id, file, type);
        } else {
            // محادثة خاصة
            const chatId = getChatId(currentUser.uid, currentChat.id);
            
            await db.collection('chats').doc(chatId).collection('messages').add({
                text: type === 'image' ? '📷 صورة' : '🎬 فيديو',
                type: type,
                mediaUrl: base64,
                senderId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            
            await db.collection('chats').doc(chatId).set({
                participants: [currentUser.uid, currentChat.id],
                lastMessage: type === 'image' ? '📷 صورة' : '🎬 فيديو',
                lastMessageSenderId: currentUser.uid,
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${currentChat.id}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
            
            showToast('تم الإرسال', 'success');
        }
        
        // إغلاق قائمة الإرفاق
        document.getElementById('attachMenu').classList.remove('active');
        
    } catch (error) {
        console.error('Error sending media:', error);
        showToast('حدث خطأ في الإرسال', 'error');
    }
}

/**
 * إظهار معلومات المجتمع
 */
async function showCommunityInfo(communityId) {
    try {
        const communityDoc = await db.collection('communities').doc(communityId).get();
        
        if (!communityDoc.exists) return;
        
        const community = communityDoc.data();
        
        // إنشاء مودال المعلومات
        let modalHtml = `
            <div class="modal active" id="communityInfoModal">
                <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>معلومات المجتمع</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="text-align: center; margin-bottom: 20px;">
                            ${community.photoURL ? 
                                `<img src="${community.photoURL}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">` :
                                `<div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-green), var(--secondary-green)); display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 2.5rem; color: white;"><i class="fas fa-users"></i></div>`
                            }
                            <h3 style="margin-top: 12px;">${community.name}</h3>
                            <p style="color: var(--text-muted); font-size: 0.9rem;">${community.description || 'لا يوجد وصف'}</p>
                        </div>
                        
                        <div class="section-divider">
                            <span>${community.members.length} عضو</span>
                        </div>
                        
                        <div class="members-list" style="max-height: 300px; overflow-y: auto;">
        `;
        
        // جلب بيانات الأعضاء
        for (const memberId of community.members) {
            const userDoc = await db.collection('users').doc(memberId).get();
            const user = userDoc.exists ? userDoc.data() : {};
            
            const avatar = user.photoURL || 
                `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(user.username || 'م')[0]}</text></svg>`;
            
            const isAdmin = community.createdBy === memberId;
            
            modalHtml += `
                <div class="member-item">
                    <img src="${avatar}" alt="">
                    <div class="info">
                        <h5>${user.username || 'مستخدم'}</h5>
                        <span>${user.phone || ''}</span>
                    </div>
                    ${isAdmin ? '<span class="admin-badge">مدير</span>' : ''}
                </div>
            `;
        }
        
        modalHtml += `
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel-btn" onclick="this.closest('.modal').remove()">إغلاق</button>
                        ${community.createdBy === currentUser.uid ? 
                            `<button class="submit-btn" style="background: var(--danger);" onclick="deleteCommunity('${communityId}')">حذف المجتمع</button>` : 
                            `<button class="submit-btn" style="background: var(--warning);" onclick="leaveCommunity('${communityId}')">مغادرة</button>`
                        }
                    </div>
                </div>
            </div>
        `;
        
        // إزالة المودال القديم إن وجد
        const oldModal = document.getElementById('communityInfoModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (error) {
        console.error('Error showing community info:', error);
        showToast('حدث خطأ', 'error');
    }
}

/**
 * مغادرة المجتمع
 */
async function leaveCommunity(communityId) {
    if (!confirm('هل أنت متأكد من مغادرة هذا المجتمع؟')) return;
    
    try {
        await db.collection('communities').doc(communityId).update({
            members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
        
        // إضافة رسالة نظام
        await db.collection('communities').doc(communityId).collection('messages').add({
            text: `${userData.username} غادر المجتمع`,
            type: 'system',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إغلاق المودال والمحادثة
        document.getElementById('communityInfoModal').remove();
        closeChatView();
        loadCommunities();
        
        showToast('غادرت المجتمع', 'info');
        
    } catch (error) {
        console.error('Error leaving community:', error);
        showToast('حدث خطأ', 'error');
    }
}

/**
 * حذف المجتمع (للمدير فقط)
 */
async function deleteCommunity(communityId) {
    if (!confirm('هل أنت متأكد من حذف هذا المجتمع؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    
    try {
        // حذف جميع الرسائل
        const messagesSnapshot = await db.collection('communities').doc(communityId)
            .collection('messages').get();
        
        const batch = db.batch();
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // حذف المستند الرئيسي
        await db.collection('communities').doc(communityId).delete();
        
        // إغلاق المودال والمحادثة
        document.getElementById('communityInfoModal')?.remove();
        closeChatView();
        loadCommunities();
        
        showToast('تم حذف المجتمع', 'success');
        
    } catch (error) {
        console.error('Error deleting community:', error);
        showToast('حدث خطأ', 'error');
    }
}
// ============================================
// نظام البروفايل والحظر
// ============================================

// متغيرات النظام
let blockedUsers = [];
let selectedMessages = new Set();
let isSelectingMessages = false;
let currentBlockUserId = null;

// ============================================
// تهيئة نظام البروفايل
// ============================================

function initProfileSystem() {
    // فتح البروفايل عند الضغط على الصورة
    document.getElementById('userProfileBtn').addEventListener('click', openProfile);
    
    // قائمة البروفايل المنسدلة
    document.getElementById('profileMenuBtn').addEventListener('click', toggleProfileDropdown);
    
    // حفظ الوصف
    document.getElementById('saveBioBtn').addEventListener('click', saveBio);
    
    // عداد الأحرف
    document.getElementById('profileBioInput').addEventListener('input', updateBioCharCount);
    
    // المستخدمون المحظورون
    document.getElementById('viewBlockedUsersBtn').addEventListener('click', openBlockedUsersModal);
    
    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    
    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('profileDropdownMenu');
        const menuBtn = document.getElementById('profileMenuBtn');
        if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // تحميل قائمة المحظورين
    loadBlockedUsers();
    
    // تهيئة قائمة خيارات الشات
    initChatOptionsMenu();
}

// ============================================
// فتح البروفايل
// ============================================

function openProfile() {
    // تعبئة البيانات من قاعدة البيانات
    document.getElementById('profileModalAvatar').src = userData.photoURL || 
        `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(userData.username || 'م')[0]}</text></svg>`;
    
    document.getElementById('profileModalName').textContent = userData.username || 'مستخدم';
    document.getElementById('profileModalEmail').textContent = currentUser.email || '';
    document.getElementById('profileBioInput').value = userData.bio || '';
    updateBioCharCount();
    
    document.getElementById('profileModal').classList.add('active');
}

// ============================================
// تحديث عداد الأحرف
// ============================================

function updateBioCharCount() {
    const bio = document.getElementById('profileBioInput').value;
    document.getElementById('bioCharCount').textContent = bio.length;
}

// ============================================
// حفظ الوصف
// ============================================

async function saveBio() {
    const bio = document.getElementById('profileBioInput').value.trim();
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            bio: bio
        });
        
        userData.bio = bio;
        showToast('تم حفظ الوصف', 'success');
    } catch (error) {
        console.error('Error saving bio:', error);
        showToast('حدث خطأ', 'error');
    }
}

// ============================================
// قائمة البروفايل المنسدلة
// ============================================

function toggleProfileDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('profileDropdownMenu');
    
    // تحديد موقع القائمة
    const btn = document.getElementById('profileMenuBtn');
    const rect = btn.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 10}px`;
    dropdown.style.left = `${rect.left}px`;
    
    dropdown.classList.toggle('active');
}

// ============================================
// تحميل قائمة المحظورين
// ============================================

async function loadBlockedUsers() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            blockedUsers = userDoc.data().blockedUsers || [];
        }
    } catch (error) {
        console.error('Error loading blocked users:', error);
    }
}

// ============================================
// التحقق من حظر مستخدم
// ============================================

function isUserBlocked(userId) {
    return blockedUsers.includes(userId);
}

// ============================================
// فتح مودال المستخدمين المحظورين
// ============================================

async function openBlockedUsersModal() {
    document.getElementById('profileDropdownMenu').classList.remove('active');
    document.getElementById('profileModal').classList.remove('active');
    
    const list = document.getElementById('blockedUsersList');
    
    if (blockedUsers.length === 0) {
        list.innerHTML = `
            <div class="empty-blocked">
                <i class="fas fa-user-slash"></i>
                <p>لا يوجد مستخدمون محظورون</p>
            </div>
        `;
    } else {
        list.innerHTML = '';
        
        for (const userId of blockedUsers) {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const user = userDoc.data();
                const avatar = user.photoURL || 
                    `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23075e54" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">${(user.username || 'م')[0]}</text></svg>`;
                
                list.innerHTML += `
                    <div class="blocked-user-item">
                        <img src="${avatar}" alt="">
                        <div class="blocked-user-info">
                            <h4>${user.username || 'مستخدم'}</h4>
                            <p>محظور منذ فترة</p>
                        </div>
                        <button class="unblock-btn-small" onclick="unblockUser('${userId}')">
                            إلغاء الحظر
                        </button>
                    </div>
                `;
            }
        }
    }
    
    document.getElementById('blockedUsersModal').classList.add('active');
}

// ============================================
// حظر مستخدم
// ============================================

function showBlockConfirmModal(userId, userName, userAvatar) {
    currentBlockUserId = userId;
    
    document.getElementById('blockUserAvatar').src = userAvatar;
    document.getElementById('blockUserName').textContent = userName;
    
    document.getElementById('blockConfirmModal').classList.add('active');
}

async function blockUser(userId) {
    try {
        // إضافة للمحظورين
        await db.collection('users').doc(currentUser.uid).update({
            blockedUsers: firebase.firestore.FieldValue.arrayUnion(userId)
        });
        
        blockedUsers.push(userId);
        
        // إغلاق المودالات
        document.getElementById('blockConfirmModal').classList.remove('active');
        document.getElementById('chatOptionsMenu').classList.remove('active');
        
        // إغلاق الشات
        closeChatView();
        
        showToast('تم حظر المستخدم', 'success');
        
        // تحديث قائمة المحادثات
        loadChats();
        
    } catch (error) {
        console.error('Error blocking user:', error);
        showToast('حدث خطأ', 'error');
    }
}

// ============================================
// إلغاء حظر مستخدم
// ============================================

async function unblockUser(userId) {
    try {
        await db.collection('users').doc(currentUser.uid).update({
            blockedUsers: firebase.firestore.FieldValue.arrayRemove(userId)
        });
        
        blockedUsers = blockedUsers.filter(id => id !== userId);
        
        showToast('تم إلغاء الحظر', 'success');
        
        // تحديث القائمة
        openBlockedUsersModal();
        
    } catch (error) {
        console.error('Error unblocking user:', error);
        showToast('حدث خطأ', 'error');
    }
}

// ============================================
// تسجيل الخروج
// ============================================

async function logoutUser() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('حدث خطأ', 'error');
    }
}

// ============================================
// قائمة خيارات الشات
// ============================================

function initChatOptionsMenu() {
    // زر القائمة في الشات
    document.getElementById('chatMenuBtn').addEventListener('click', toggleChatOptionsMenu);
    
    // خيار حذف الرسائل
    document.getElementById('deleteMessagesOption').addEventListener('click', startMessageSelection);
    
    // خيار حذف الدردشة
    document.getElementById('deleteChatOption').addEventListener('click', confirmDeleteChat);
    
    // خيار حظر المستخدم
    document.getElementById('blockUserOption').addEventListener('click', showBlockFromChat);
    
    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('chatOptionsMenu');
        const menuBtn = document.getElementById('chatMenuBtn');
        if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
    
    // أزرار تحديد الرسائل
    document.getElementById('cancelSelectionBtn').addEventListener('click', cancelMessageSelection);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedMessages);
    
    // أزرار الحظر
    document.getElementById('confirmBlockBtn').addEventListener('click', () => {
        if (currentBlockUserId) {
            blockUser(currentBlockUserId);
        }
    });
    
    document.getElementById('cancelBlockBtn').addEventListener('click', () => {
        document.getElementById('blockConfirmModal').classList.remove('active');
    });
    
    // مودال إلغاء الحظر
    document.getElementById('unblockUserBtn').addEventListener('click', () => {
        if (currentBlockUserId) {
            unblockUser(currentBlockUserId);
            document.getElementById('unblockModal').classList.remove('active');
        }
    });
    
    document.getElementById('closeUnblockModalBtn').addEventListener('click', () => {
        document.getElementById('unblockModal').classList.remove('active');
    });
    
    // مودال التنبيه
    document.getElementById('closeBlockedAlertBtn').addEventListener('click', () => {
        document.getElementById('blockedUserAlertModal').classList.remove('active');
    });
    
    document.getElementById('unblockFromAlertBtn').addEventListener('click', () => {
        if (currentBlockUserId) {
            unblockUser(currentBlockUserId);
            document.getElementById('blockedUserAlertModal').classList.remove('active');
        }
    });
}

// ============================================
// تبديل قائمة خيارات الشات
// ============================================

function toggleChatOptionsMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('chatOptionsMenu');
    menu.classList.toggle('active');
}

// ============================================
// بدء تحديد الرسائل للحذف
// ============================================

// ============================================
// بدء تحديد الرسائل للحذف
// ============================================

function startMessageSelection() {
  isSelectingMessages = true;
  selectedMessages.clear();
  
  document.getElementById('chatOptionsMenu').classList.remove('active');
  document.getElementById('messageSelectionBar').style.display = 'flex';
  
  // إضافة checkboxes للرسائل المرسلة فقط (ليس المستلمة)
  document.querySelectorAll('.message').forEach(msg => {
      const senderId = msg.dataset.senderId;
      
      // فقط الرسائل التي أرسلها المستخدم يمكن تحديدها
      if (senderId === currentUser.uid) {
          msg.classList.add('selectable');
          msg.addEventListener('click', toggleMessageSelection);
      } else {
          // الرسائل المستلمة لا يمكن تحديدها
          msg.classList.add('not-selectable');
      }
  });
  
  showToast('اضغط على رسائلك لتحديدها', 'info');
}

// ============================================
// تبديل تحديد رسالة
// ============================================

function toggleMessageSelection(e) {
  if (!isSelectingMessages) return;
  
  const messageEl = e.currentTarget;
  const senderId = messageEl.dataset.senderId;
  
  // التحقق مرة أخرى أن الرسالة مرسلة من المستخدم
  if (senderId !== currentUser.uid) {
      showToast('يمكنك حذف رسائلك فقط', 'error');
      return;
  }
  
  const messageId = messageEl.dataset.messageId;
  
  if (selectedMessages.has(messageId)) {
      selectedMessages.delete(messageId);
      messageEl.classList.remove('selected');
  } else {
      selectedMessages.add(messageId);
      messageEl.classList.add('selected');
  }
  
  document.getElementById('selectedCount').textContent = selectedMessages.size;
}

// ============================================
// إلغاء تحديد الرسائل
// ============================================

function cancelMessageSelection() {
  isSelectingMessages = false;
  selectedMessages.clear();
  
  document.getElementById('messageSelectionBar').style.display = 'none';
  
  document.querySelectorAll('.message').forEach(msg => {
      msg.classList.remove('selected', 'selectable', 'not-selectable');
      msg.removeEventListener('click', toggleMessageSelection);
  });
}

// ============================================
// بروفايل المستخدم في الشات
// ============================================

/**
 * تهيئة أحداث بروفايل المستخدم في الشات
 */
function initChatUserProfile() {
  // الضغط على معلومات المستخدم في الشات
  const chatUserInfo = document.querySelector('.chat-user-info');
  if (chatUserInfo) {
      chatUserInfo.addEventListener('click', openChatUserProfile);
  }
  
  // زر حظر المستخدم من البروفايل
  document.getElementById('blockUserFromProfileBtn').addEventListener('click', () => {
      if (currentChat) {
          showBlockConfirmModal(currentChat.id, currentChat.name, currentChat.avatar);
      }
  });
  
  // زر حذف المحادثة من البروفايل
  document.getElementById('deleteChatFromProfileBtn').addEventListener('click', () => {
      confirmDeleteChat();
      document.getElementById('chatUserProfileModal').classList.remove('active');
  });
}

/**
* فتح بروفايل المستخدم في الشات
*/
async function openChatUserProfile() {
  if (!currentChat) return;
  
  // تعبئة البيانات
  document.getElementById('chatProfileAvatar').src = currentChat.avatar;
  document.getElementById('chatProfileName').textContent = currentChat.name;
  
  // جلب الوصف من قاعدة البيانات
  try {
      const userDoc = await db.collection('users').doc(currentChat.id).get();
      if (userDoc.exists) {
          const data = userDoc.data();
          document.getElementById('chatProfileBio').textContent = data.bio || 'لا يوجد وصف';
          
          // حالة الاتصال
          const isOnline = data.lastOnline && 
              (Date.now() - data.lastOnline.toDate() < 300000);
          
          const statusEl = document.getElementById('chatProfileStatus');
          if (isOnline) {
              statusEl.innerHTML = '<span class="online-indicator">متصل الآن</span>';
          } else {
              statusEl.textContent = 'غير متصل';
          }
      }
  } catch (error) {
      console.error('Error fetching user profile:', error);
      document.getElementById('chatProfileBio').textContent = 'لا يوجد وصف';
      document.getElementById('chatProfileStatus').textContent = 'غير متصل';
  }
  
  // تحديث زر الحظر حسب الحالة
  const blockBtn = document.getElementById('blockUserFromProfileBtn');
  if (isUserBlocked(currentChat.id)) {
      blockBtn.innerHTML = '<i class="fas fa-unlock"></i> إلغاء الحظر';
      blockBtn.classList.remove('danger');
      blockBtn.classList.add('success');
      blockBtn.onclick = () => {
          unblockUser(currentChat.id);
          // تحديث الزر
          blockBtn.innerHTML = '<i class="fas fa-ban"></i> حظر المستخدم';
          blockBtn.classList.remove('success');
          blockBtn.classList.add('danger');
      };
  } else {
      blockBtn.innerHTML = '<i class="fas fa-ban"></i> حظر المستخدم';
      blockBtn.classList.remove('success');
      blockBtn.classList.add('danger');
      blockBtn.onclick = () => {
          showBlockConfirmModal(currentChat.id, currentChat.name, currentChat.avatar);
      };
  }
  
  // إظهار المودال
  document.getElementById('chatUserProfileModal').classList.add('active');
}
// ============================================
// حذف الرسائل المحددة
// ============================================

async function deleteSelectedMessages() {
  if (selectedMessages.size === 0) {
      showToast('لم تحدد أي رسالة', 'error');
      return;
  }
  
  if (!confirm(`هل تريد حذف ${selectedMessages.size} رسالة؟`)) return;
  
  try {
      const chatId = getChatId(currentUser.uid, currentChat.id);
      const batch = db.batch();
      
      selectedMessages.forEach(messageId => {
          // التحقق من أن الرسالة موجودة وأنها مرسلة من المستخدم
          const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
          if (messageEl && messageEl.dataset.senderId === currentUser.uid) {
              const ref = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
              batch.delete(ref);
          }
      });
      
      await batch.commit();
      
      cancelMessageSelection();
      showToast('تم حذف الرسائل', 'success');
      
  } catch (error) {
      console.error('Error deleting messages:', error);
      showToast('حدث خطأ', 'error');
  }
}

// ============================================
// تأكيد حذف الدردشة
// ============================================

function confirmDeleteChat() {
    document.getElementById('chatOptionsMenu').classList.remove('active');
    document.getElementById('chatUserProfileModal').classList.remove('active');
    if (!confirm('هل تريد حذف هذه الدردشة بالكامل؟')) return;
    
    deleteEntireChat();
}

// ============================================
// حذف الدردشة بالكامل
// ============================================

async function deleteEntireChat() {
    try {
        const chatId = getChatId(currentUser.uid, currentChat.id);
        
        // حذف جميع الرسائل
        const messagesSnapshot = await db.collection('chats').doc(chatId)
            .collection('messages').get();
        
        const batch = db.batch();
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // حذف مستند المحادثة
        await db.collection('chats').doc(chatId).delete();
        
        closeChatView();
        loadChats();
        
        showToast('تم حذف الدردشة', 'success');
        
    } catch (error) {
        console.error('Error deleting chat:', error);
        showToast('حدث خطأ', 'error');
    }
}

// ============================================
// عرض الحظر من الشات
// ============================================

function showBlockFromChat() {
    document.getElementById('chatOptionsMenu').classList.remove('active');
    
    if (!currentChat) return;
    
    currentBlockUserId = currentChat.id;
    
    document.getElementById('blockUserAvatar').src = currentChat.avatar;
    document.getElementById('blockUserName').textContent = currentChat.name;
    
    document.getElementById('blockConfirmModal').classList.add('active');
}

// ============================================
// تعديل دالة openChat لدعم الحظر
// ============================================



// ============================================
// تعديل دالة createMessageHTML لإضافة messageId
// ============================================



// ============================================
// التحقق مما إذا كان المستخدم الحالي محظوراً
// ============================================

/**
 * التحقق مما إذا كان المستخدم الحالي محظوراً
 */
async function checkIfIAmBlocked(otherUserId) {
  try {
      const userDoc = await db.collection('users').doc(otherUserId).get();
      if (userDoc.exists) {
          const otherUserBlocked = userDoc.data().blockedUsers || [];
          return otherUserBlocked.includes(currentUser.uid);
      }
  } catch (error) {
      console.error('Error checking block status:', error);
  }
  return false;
}

// ============================================
// تعديل دالة loadMessages لإظهار حالة الحظر
// ============================================



// ============================================
// تعديل createChatItemHTML لدعم الحظر
// ============================================



// ============================================
// تهيئة النظام عند تحميل الصفحة
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // سيتم تهيئة النظام بعد التحقق من المصادقة
});

// تهيئة بعد التحقق من المصادقة
function initAfterAuth() {
    initProfileSystem();
}

// تصدير الدوال
window.openProfile = openProfile;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
window.isUserBlocked = isUserBlocked;
