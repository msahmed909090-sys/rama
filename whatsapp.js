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
              
// بعد تحميل userData من Firestore
if (!userData.chatId) {
  // chatId غير موجود (مستخدم قديم أو خطأ) → ننشئ واحداً جديداً
  const chatId = generateChatId();
  await db.collection('users').doc(currentUser.uid).update({ chatId });
  userData.chatId = chatId;
  console.log('تم إنشاء chatId جديد للمستخدم:', chatId);
} else {
  // chatId موجود بالفعل، نستخدمه كما هو
  console.log('chatId موجود:', userData.chatId);
}
              
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
  function generateChatId() {
    const chars = '0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
  
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
   * فتح محادثة
   */
  function openChat(userId, userName, userAvatar) {
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
   * تحميل الرسائل
   */
  function loadMessages(otherUserId) {
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messagesContainer = document.getElementById('chatMessages');
    
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
          
          messagesHtml += createMessageHTML(msg, isSent);
        });
        
        messagesContainer.innerHTML = messagesHtml;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // تحديث حالة القراءة
        markMessagesAsRead(otherUserId);
      });
  }
  
  /**
   * إنشاء HTML للرسالة
   */
  function createMessageHTML(msg, isSent) {
    const time = formatMessageTime(msg.timestamp);
    const messageClass = isSent ? 'sent' : 'received';
    
    let contentHtml = '';
    
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
      <div class="message ${messageClass}">
        ${contentHtml}
        <div class="message-meta">
          <span class="message-time">${time}</span>
          ${isSent ? `<span class="message-status ${msg.read ? 'read' : ''}"><i class="fas fa-check-double"></i></span>` : ''}
        </div>
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
    
    // ملفات الرفع
    initFileUploads();
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
    menu.classList.toggle('active');
  }
  
  /**
   * تهيئة رفع الملفات
   */
/**
 * تهيئة رفع الملفات (محدّثة)
 */
function initFileUploads() {
    // رفع صورة
    document.getElementById('attachImage').addEventListener('click', () => {
        document.getElementById('imageUploadInput').click();
    });
    
    document.getElementById('imageUploadInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && currentChat) {
            await sendMediaMessage(file, 'image');
        }
        e.target.value = ''; // إعادة تعيين
    });
    
    // رفع فيديو
    document.getElementById('attachVideo').addEventListener('click', () => {
        document.getElementById('videoUploadInput').click();
    });
    
    document.getElementById('videoUploadInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && currentChat) {
            await sendMediaMessage(file, 'video');
        }
        e.target.value = ''; // إعادة تعيين
    });
    
    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        const attachMenu = document.getElementById('attachMenu');
        const attachBtn = document.getElementById('attachBtn');
        if (attachMenu && attachBtn && !attachMenu.contains(e.target) && !attachBtn.contains(e.target)) {
            attachMenu.classList.remove('active');
        }
    });
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
      const phone = document.getElementById('memberPhoneInput').value.trim();
      
      if (!phone) {
        showToast('أدخل رقم الهاتف', 'error');
        return;
      }
      
      if (members.includes(phone)) {
        showToast('العضو موجود بالفعل', 'error');
        return;
      }
      
      // البحث عن المستخدم برقم الهاتف
      const userSnapshot = await db.collection('users')
        .where('chatId', '==', phone)
        .limit(1)
        .get();
      
      if (userSnapshot.empty) {
        showToast('لم يتم العثور على المستخدم', 'error');
        return;
      }
      
      const userDoc = userSnapshot.docs[0];
      members.push(userDoc.id);
      
      // إضافة العضو للقائمة
      const memberList = document.getElementById('addedMembersList');
      const userData = userDoc.data();
      
      const tag = document.createElement('div');
      tag.className = 'member-tag';
      tag.innerHTML = `
        <span>${userData.username || phone}</span>
        <button onclick="this.parentElement.remove(); members = members.filter(m => m !== '${userDoc.id}');">×</button>
      `;
      memberList.appendChild(tag);
      
      document.getElementById('memberPhoneInput').value = '';
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
    const phone = prompt('أدخل رقم الهاتف أو ID المستخدم:');
    
    if (phone && phone.trim()) {
      searchUserByPhone(phone.trim());
    }
  });
  
  async function searchUserByPhone(phone) {
    try {
      const userSnapshot = await db.collection('users')
        .where('chatId', '==', phone)
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
class WebRTCManager {
    constructor() {
      this.peerConnection = null;
      this.localStream = null;
      this.remoteStream = null;
      this.isMuted = false;
      this.isSpeaker = false;
      this.currentCallId = null;
      this.callStartTime = null;
      this.timerInterval = null;
      this.callType = 'voice';
      this.otherUserId = null;
      this.iceCandidates = [];
      this.callDoc = null;
      this.callListener = null;
      
      // إعدادات ICE Servers (مجانية)
      this.iceServers = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
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
        // طلب إذن المايكروفون
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        
        // إظهار مودال المكالمة
        this.showCallModal(userName, userAvatar, 'voice');
        
        // إنشاء اتصال PeerConnection
        await this.createPeerConnection();
        
        // إنشاء مستند المكالمة في Firestore
        this.callDoc = db.collection('calls_v2').doc();
        this.currentCallId = this.callDoc.id;
        
        // حفظ بيانات المكالمة
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
        
        // الاستماع للاستجابة
        this.listenForAnswer();
        
        // جمع ICE Candidates
        this.collectIceCandidates();
        
        // إنشاء Offer
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
    // بدء مكالمة فيديو (قريباً)
    // ============================================
    startVideoCall(userId, userName, userAvatar) {
      // عرض رسالة قريباً
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
      
      // إضافة التنسيقات
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
          animation: fadeIn 0.3s ease;
        }
        .coming-soon-content {
          background: var(--bg-secondary);
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          max-width: 350px;
          margin: 20px;
          animation: slideUp 0.3s ease;
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
        .coming-soon-content h3 {
          font-size: 1.5rem;
          margin-bottom: 10px;
        }
        .coming-soon-content p {
          color: var(--text-secondary);
          margin-bottom: 20px;
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
          transition: all 0.2s ease;
        }
        .coming-soon-btn:hover {
          background: var(--secondary-green);
          transform: scale(1.05);
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
      
      // إضافة المسار المحلي
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // استقبال المسار البعيد
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track');
        this.remoteStream = event.streams[0];
        
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
          remoteVideo.srcObject = this.remoteStream;
          if (this.callType === 'video') {
            remoteVideo.classList.add('active');
          }
        }
        
        // تشغيل الصوت
        this.playRemoteAudio();
      };
      
      // مراقبة حالة الاتصال
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
      
      // مراقبة حالة ICE
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE state:', this.peerConnection.iceConnectionState);
        this.updateCallQuality();
      };
    }
  
    // ============================================
    // إنشاء Offer
    // ============================================
    async createOffer() {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // حفظ الـ Offer في Firestore
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
              console.log('Received answer');
              
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
      
      // الاستماع لـ ICE Candidates من الطرف الآخر
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
      
      // إظهار مودال المكالمة الواردة
      this.showIncomingCallModal(callData);
    }
  
    // ============================================
    // قبول المكالمة
    // ============================================
    async acceptCall() {
      try {
        // طلب إذن المايكروفون
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: this.callType === 'video'
        });
        
        // إخفاء مودال الواردة
        document.getElementById('incomingCallModal').style.display = 'none';
        
        // إظهار مودال المكالمة
        const callerName = document.getElementById('incomingCallerName').textContent;
        const callerAvatar = document.getElementById('incomingCallerAvatar').src;
        this.showCallModal(callerName, callerAvatar, this.callType);
        
        // تحديث حالة المكالمة
        await this.callDoc.update({ status: 'answered' });
        
        // إنشاء اتصال
        await this.createPeerConnection();
        
        // جلب الـ Offer
        const offerDoc = await this.callDoc.collection('signals').doc('offer').get();
        if (offerDoc.exists) {
          const offerData = offerDoc.data();
          
          const offer = new RTCSessionDescription({
            type: offerData.type,
            sdp: offerData.sdp
          });
          
          await this.peerConnection.setRemoteDescription(offer);
          
          // إنشاء Answer
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          
          // حفظ الـ Answer
          await this.callDoc.collection('signals').doc('answer').set({
            sdp: answer.sdp,
            type: answer.type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // جمع ICE Candidates
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
      
      // إظهار المؤقت
      document.getElementById('callTimer').style.display = 'block';
      
      // بدء العداد
      this.callStartTime = Date.now();
      this.timerInterval = setInterval(() => {
        const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        document.getElementById('callDuration').textContent = this.formatDuration(duration);
      }, 1000);
      
      showToast('تم الاتصال', 'success');
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
    // تبديل إلى مكبر الصوت
    // ============================================
    async toggleSpeaker() {
      try {
        if (this.remoteStream) {
          const audioTrack = this.remoteStream.getAudioTracks()[0];
          if (audioTrack) {
            // محاولة استخدام Speakerphone API
            if (typeof audioTrack.getCapabilities === 'function') {
              const capabilities = audioTrack.getCapabilities();
              console.log('Audio capabilities:', capabilities);
            }
          }
        }
        
        // تبديل حالة الزر
        const speakerBtn = document.getElementById('speakerBtn');
        const earpieceBtn = document.getElementById('earpieceBtn');
        
        this.isSpeaker = !this.isSpeaker;
        
        if (this.isSpeaker) {
          speakerBtn.classList.add('active');
          earpieceBtn.classList.remove('active');
          
          // محاولة تفعيل مكبر الصوت
          if (this.remoteStream) {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
              // للهواتف التي تدعم هذا
              try {
                await remoteVideo.setSinkId('default');
              } catch (e) {
                console.log('setSinkId not supported');
              }
            }
          }
          
          showToast('تم تفعيل مكبر الصوت', 'info');
        } else {
          speakerBtn.classList.remove('active');
          showToast('تم إلغاء مكبر الصوت', 'info');
        }
        
      } catch (error) {
        console.error('Error toggling speaker:', error);
      }
    }
  
    // ============================================
    // تبديل إلى سماعة الأذن
    // ============================================
    async toggleEarpiece() {
      try {
        const speakerBtn = document.getElementById('speakerBtn');
        const earpieceBtn = document.getElementById('earpieceBtn');
        
        this.isSpeaker = false;
        
        speakerBtn.classList.remove('active');
        earpieceBtn.classList.add('active');
        
        // محاولة استخدام سماعة الأذن
        if (this.remoteStream) {
          const remoteVideo = document.getElementById('remoteVideo');
          if (remoteVideo) {
            // للهواتف التي تدعم هذا
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const earpiece = devices.find(d => d.kind === 'audiooutput' && d.label.includes('earpiece'));
              if (earpiece) {
                await remoteVideo.setSinkId(earpiece.deviceId);
              }
            } catch (e) {
              console.log('Could not switch to earpiece');
            }
          }
        }
        
        showToast('تم تفعيل سماعة الأذن', 'info');
        
      } catch (error) {
        console.error('Error toggling earpiece:', error);
      }
    }
  
    // ============================================
    // تشغيل الصوت البعيد
    // ============================================
    playRemoteAudio() {
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo && this.remoteStream) {
        remoteVideo.srcObject = this.remoteStream;
        remoteVideo.play().catch(e => console.log('Auto-play prevented'));
      }
    }
  
    // ============================================
    // تحديث جودة المكالمة
    // ============================================
    updateCallQuality() {
      const indicator = document.getElementById('callQualityIndicator');
      const text = document.getElementById('callQualityText');
      
      if (!this.peerConnection || !indicator) return;
      
      const state = this.peerConnection.iceConnectionState;
      
      indicator.classList.remove('poor', 'good', 'excellent');
      
      switch (state) {
        case 'connected':
        case 'completed':
          indicator.classList.add('excellent');
          text.textContent = 'جودة الاتصال: ممتازة';
          break;
        case 'checking':
          indicator.classList.add('good');
          text.textContent = 'جاري التحقق...';
          break;
        case 'disconnected':
        case 'failed':
          indicator.classList.add('poor');
          text.textContent = 'جودة الاتصال: ضعيفة';
          break;
        default:
          text.textContent = 'جاري الاتصال...';
      }
    }
  
    // ============================================
    // إنهاء المكالمة
    // ============================================
    async endCall() {
      // حساب مدة المكالمة
      let duration = 0;
      if (this.callStartTime) {
        duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      }
      
      // تحديث حالة المكالمة
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
      
      // إيقاف المؤقت
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
      
      // إغلاق الاتصال
      this.cleanup();
      
      // إخفاء المودال
      document.getElementById('callModal').classList.remove('active');
      document.getElementById('incomingCallModal').style.display = 'none';
      
      showToast('تم إنهاء المكالمة', 'info');
      
      // تسجيل المكالمة
      if (this.otherUserId && duration > 0) {
        await logCallToHistory(this.callType, this.otherUserId, true, duration);
      }
    }
  
    // ============================================
    // تنظيف الموارد
    // ============================================
    cleanup() {
      // إيقاف المسارات المحلية
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // إيقاف المسارات البعيدة
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach(track => track.stop());
        this.remoteStream = null;
      }
      
      // إغلاق PeerConnection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // إلغاء الاستماع
      if (this.callListener) {
        this.callListener();
        this.callListener = null;
      }
      
      // إعادة تعيين المتغيرات
      this.currentCallId = null;
      this.callStartTime = null;
      this.isMuted = false;
      this.isSpeaker = false;
      
      // إعادة تعيين الفيديو
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
      
      // إعادة تعيين الأزرار
      document.getElementById('muteBtn').classList.remove('active');
      document.getElementById('muteBtn').innerHTML = '<i class="fas fa-microphone"></i>';
      document.getElementById('speakerBtn').classList.remove('active');
      document.getElementById('earpieceBtn').classList.remove('active');
      
      // إظهار المودال
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
      
      // تشغيل صوت الرنين
      this.playRingtone();
    }
  
    // ============================================
    // تشغيل صوت الرنين
    // ============================================
    playRingtone() {
      // يمكن إضافة صوت رنين هنا
      const audio = new Audio('data:audio/wav;base64,UklGRl9...');
      audio.loop = true;
      audio.play().catch(e => console.log('Could not play ringtone'));
      
      // إيقاف الصوت بعد 30 ثانية
      setTimeout(() => {
        audio.pause();
      }, 30000);
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

// تصدير الدوال
window.showCommunityInfo = showCommunityInfo;
window.leaveCommunity = leaveCommunity;
window.deleteCommunity = deleteCommunity;
window.openCommunityChat = openCommunityChat;