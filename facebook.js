// =============================================
// فيسبوك الإسلامي - Firebase Data Layer (مُحدّث)
// =============================================

// =============================================
// Firebase Configuration
// =============================================
const firebaseConfig = {
    apiKey: "AIzaSyCuZZqke1vA0db_CpVzb12epJaOEzJGZ9E",
    authDomain: "lamet-ramadan-c1740.firebaseapp.com",
    projectId: "lamet-ramadan-c1740",
    storageBucket: "lamet-ramadan-c1740.firebasestorage.app",
    messagingSenderId: "179701807452",
    appId: "1:179701807452:web:d662c22e8d6ae9960da999",
    measurementId: "G-9PCZHJW886"
  };
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  // =============================================
  // Global State
  // =============================================
  let currentUser = null;
  let currentUserPhone = null;
  let currentSection = 'home';
  let previousSection = 'home';
  let currentChatId = null;
  let currentPostId = null;
  let editingPostId = null;
  let selectedAvatar = null;
  let selectedCover = null;
  let lastPostDoc = null;
  const POSTS_PER_LOAD = 10;
  
  // =============================================
  // Firebase Data Layer
  // =============================================
  const FirebaseDB = {
    
    // ==================== Users ====================
    
    getUser: async function(phone) {
      try {
        const snap = await db.collection('fb_users').where('phone', '==', phone).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...doc.data() };
        }
        return null;
      } catch (error) {
        console.error('getUser error:', error);
        return null;
      }
    },
    
    saveUser: async function(phone, userData) {
      try {
        const docRef = await db.collection('fb_users').add({
          ...userData,
          phone: phone,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { id: docRef.id, ...userData };
      } catch (error) {
        console.error('saveUser error:', error);
        throw error;
      }
    },
    
    updateUser: async function(userId, updates) {
      try {
        await db.collection('fb_users').doc(userId).update({
          ...updates,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('updateUser error:', error);
        throw error;
      }
    },
    
    // ==================== Posts ====================
    
    getPosts: async function(limit = 20, lastDoc = null) {
      try {
        let query = db.collection('fb_posts')
          .orderBy('createdAt', 'desc')
          .limit(limit);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snap = await query.get();
        const posts = [];
        snap.forEach(doc => {
          posts.push({ postID: doc.id, ...doc.data() });
        });
        
        return { posts, lastDoc: snap.docs[snap.docs.length - 1] };
      } catch (error) {
        console.error('getPosts error:', error);
        return { posts: [], lastDoc: null };
      }
    },
    
    getUserPosts: async function(phone, limit = 20) {
      try {
        const snap = await db.collection('fb_posts')
          .where('authorID', '==', phone)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();
        
        const posts = [];
        snap.forEach(doc => {
          posts.push({ postID: doc.id, ...doc.data() });
        });
        
        return posts;
      } catch (error) {
        console.error('getUserPosts error:', error);
        return [];
      }
    },
    
    savePost: async function(postData) {
      try {
        const docRef = await db.collection('fb_posts').add({
          ...postData,
          likes: 0,
          likesArray: [],
          commentsCount: 0,
          savedBy: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { postID: docRef.id, ...postData };
      } catch (error) {
        console.error('savePost error:', error);
        throw error;
      }
    },
    
    updatePost: async function(postId, updates) {
      try {
        await db.collection('fb_posts').doc(postId).update(updates);
      } catch (error) {
        console.error('updatePost error:', error);
        throw error;
      }
    },
    
    deletePost: async function(postId) {
      try {
        const commentsSnap = await db.collection('fb_posts').doc(postId).collection('comments').get();
        const batch = db.batch();
        commentsSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        await db.collection('fb_posts').doc(postId).delete();
      } catch (error) {
        console.error('deletePost error:', error);
        throw error;
      }
    },
    
    toggleLike: async function(postId, userPhone) {
      try {
        const postRef = db.collection('fb_posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) return false;
        
        const postData = postDoc.data();
        const likesArray = postData.likesArray || [];
        const isLiked = likesArray.includes(userPhone);
        
        if (isLiked) {
          await postRef.update({
            likes: firebase.firestore.FieldValue.increment(-1),
            likesArray: firebase.firestore.FieldValue.arrayRemove(userPhone)
          });
          return false;
        } else {
          await postRef.update({
            likes: firebase.firestore.FieldValue.increment(1),
            likesArray: firebase.firestore.FieldValue.arrayUnion(userPhone)
          });
          return true;
        }
      } catch (error) {
        console.error('toggleLike error:', error);
        throw error;
      }
    },
    
    toggleSavePost: async function(postId, userPhone) {
      try {
        const postRef = db.collection('fb_posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) return false;
        
        const postData = postDoc.data();
        const savedBy = postData.savedBy || [];
        const isSaved = savedBy.includes(userPhone);
        
        if (isSaved) {
          await postRef.update({
            savedBy: firebase.firestore.FieldValue.arrayRemove(userPhone)
          });
          return false;
        } else {
          await postRef.update({
            savedBy: firebase.firestore.FieldValue.arrayUnion(userPhone)
          });
          return true;
        }
      } catch (error) {
        console.error('toggleSavePost error:', error);
        throw error;
      }
    },
    
    // ==================== Comments ====================
    
    getComments: async function(postId) {
      try {
        const snap = await db.collection('fb_posts').doc(postId).collection('comments')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();
        
        const comments = [];
        snap.forEach(doc => {
          comments.push({ commentID: doc.id, ...doc.data() });
        });
        
        return comments;
      } catch (error) {
        console.error('getComments error:', error);
        return [];
      }
    },
    
    addComment: async function(postId, commentData) {
      try {
        const docRef = await db.collection('fb_posts').doc(postId).collection('comments').add({
          ...commentData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('fb_posts').doc(postId).update({
          commentsCount: firebase.firestore.FieldValue.increment(1)
        });
        
        return { commentID: docRef.id, ...commentData };
      } catch (error) {
        console.error('addComment error:', error);
        throw error;
      }
    },
    
    // ==================== Pages ====================
    
    getPages: async function() {
      try {
        const snap = await db.collection('fb_pages')
          .orderBy('createdAt', 'desc')
          .get();
        
        const pages = [];
        snap.forEach(doc => {
          pages.push({ pageID: doc.id, ...doc.data() });
        });
        
        return pages;
      } catch (error) {
        console.error('getPages error:', error);
        return [];
      }
    },
    
    createPage: async function(pageData) {
      try {
        const docRef = await db.collection('fb_pages').add({
          ...pageData,
          followers: [pageData.ownerID],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { pageID: docRef.id, ...pageData };
      } catch (error) {
        console.error('createPage error:', error);
        throw error;
      }
    },
    
    toggleFollowPage: async function(pageId, userPhone) {
      try {
        const pageRef = db.collection('fb_pages').doc(pageId);
        const pageDoc = await pageRef.get();
        
        if (!pageDoc.exists) return false;
        
        const pageData = pageDoc.data();
        const followers = pageData.followers || [];
        const isFollowing = followers.includes(userPhone);
        
        if (isFollowing) {
          await pageRef.update({
            followers: firebase.firestore.FieldValue.arrayRemove(userPhone)
          });
          return false;
        } else {
          await pageRef.update({
            followers: firebase.firestore.FieldValue.arrayUnion(userPhone)
          });
          return true;
        }
      } catch (error) {
        console.error('toggleFollowPage error:', error);
        throw error;
      }
    },
    
    // ==================== Groups ====================
    
    getGroups: async function() {
      try {
        const snap = await db.collection('fb_groups')
          .orderBy('createdAt', 'desc')
          .get();
        
        const groups = [];
        snap.forEach(doc => {
          groups.push({ groupID: doc.id, ...doc.data() });
        });
        
        return groups;
      } catch (error) {
        console.error('getGroups error:', error);
        return [];
      }
    },
    
    createGroup: async function(groupData) {
      try {
        const docRef = await db.collection('fb_groups').add({
          ...groupData,
          members: [groupData.ownerID],
          admins: [groupData.ownerID],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { groupID: docRef.id, ...groupData };
      } catch (error) {
        console.error('createGroup error:', error);
        throw error;
      }
    },
    
    joinGroup: async function(groupId, userPhone) {
      try {
        await db.collection('fb_groups').doc(groupId).update({
          members: firebase.firestore.FieldValue.arrayUnion(userPhone)
        });
        return true;
      } catch (error) {
        console.error('joinGroup error:', error);
        throw error;
      }
    },
    
    leaveGroup: async function(groupId, userPhone) {
      try {
        await db.collection('fb_groups').doc(groupId).update({
          members: firebase.firestore.FieldValue.arrayRemove(userPhone)
        });
        return true;
      } catch (error) {
        console.error('leaveGroup error:', error);
        throw error;
      }
    },
    
    // ==================== Messages ====================
    
    getChats: async function(userPhone) {
      try {
        const snap = await db.collection('fb_chats')
          .where('participants', 'array-contains', userPhone)
          .orderBy('lastMessageAt', 'desc')
          .get();
        
        const chats = [];
        snap.forEach(doc => {
          chats.push({ chatID: doc.id, ...doc.data() });
        });
        
        return chats;
      } catch (error) {
        console.error('getChats error:', error);
        return [];
      }
    },
    
    getMessages: async function(chatId, limit = 50) {
      try {
        const snap = await db.collection('fb_chats').doc(chatId).collection('messages')
          .orderBy('createdAt', 'asc')
          .limitToLast(limit)
          .get();
        
        const messages = [];
        snap.forEach(doc => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        
        return messages;
      } catch (error) {
        console.error('getMessages error:', error);
        return [];
      }
    },
    
    sendMessage: async function(chatId, messageData, otherPhone) {
      try {
        await db.collection('fb_chats').doc(chatId).collection('messages').add({
          ...messageData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('fb_chats').doc(chatId).set({
          participants: [currentUserPhone, otherPhone],
          lastMessage: messageData.text,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          [`unread_${otherPhone}`]: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
        
      } catch (error) {
        console.error('sendMessage error:', error);
        throw error;
      }
    },
    
    markChatAsRead: async function(chatId, userPhone) {
      try {
        await db.collection('fb_chats').doc(chatId).update({
          [`unread_${userPhone}`]: 0
        });
      } catch (error) {
        console.error('markChatAsRead error:', error);
      }
    },
    
    getChatId: function(phone1, phone2) {
      return [phone1, phone2].sort().join('_');
    },
    
    // ==================== Notifications ====================
    
    getNotifications: async function(userPhone) {
      try {
        const snap = await db.collection('fb_notifications')
          .where('userID', '==', userPhone)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();
        
        const notifications = [];
        snap.forEach(doc => {
          notifications.push({ id: doc.id, ...doc.data() });
        });
        
        return notifications;
      } catch (error) {
        console.error('getNotifications error:', error);
        return [];
      }
    },
    
    addNotification: async function(notificationData) {
      try {
        await db.collection('fb_notifications').add({
          ...notificationData,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('addNotification error:', error);
      }
    },
    
    markAsRead: async function(notificationId) {
      try {
        await db.collection('fb_notifications').doc(notificationId).update({ read: true });
      } catch (error) {
        console.error('markAsRead error:', error);
      }
    },
    
    markAllAsRead: async function(userPhone) {
      try {
        const snap = await db.collection('fb_notifications')
          .where('userID', '==', userPhone)
          .where('read', '==', false)
          .get();
        
        const batch = db.batch();
        snap.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
        await batch.commit();
      } catch (error) {
        console.error('markAllAsRead error:', error);
      }
    },
    
    // ==================== Saved Posts ====================
    
    getSavedPosts: async function(userPhone) {
      try {
        const snap = await db.collection('fb_posts')
          .where('savedBy', 'array-contains', userPhone)
          .orderBy('createdAt', 'desc')
          .get();
        
        const posts = [];
        snap.forEach(doc => {
          posts.push({ postID: doc.id, ...doc.data() });
        });
        
        return posts;
      } catch (error) {
        console.error('getSavedPosts error:', error);
        return [];
      }
    }
  };
  
  // =============================================
  // Authentication Check
  // =============================================
  document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(async function(user) {
      const loading = document.getElementById('loadingScreen');
      
      if (user) {
        currentUser = user;
        
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          
          if (userDoc.exists) {
            const mainUserData = userDoc.data();
            currentUserPhone = mainUserData.chatId || mainUserData.phone || `user_${user.uid.substring(0, 8)}`;
            
// محاولة جلب مستخدم فيسبوك باستخدام currentUserPhone
let fbUser = await FirebaseDB.getUser(currentUserPhone);

if (!fbUser) {
    // لم نجد المستخدم في فيسبوك، قد يكون chatId تغير
    console.warn('لم يتم العثور على مستخدم فيسبوك بالرقم:', currentUserPhone);
    
    // نعيد جلب بيانات المستخدم من users للتأكد من chatId الصحيح
    const userDocRefresh = await db.collection('users').doc(user.uid).get();
    if (userDocRefresh.exists) {
        const refreshedData = userDocRefresh.data();
        const correctPhone = refreshedData.chatId;
        
        // إذا كان الرقم مختلفاً عما لدينا، نستخدم الصحيح ونحاول مجدداً
        if (correctPhone && correctPhone !== currentUserPhone) {
            console.log('تصحيح chatId:', correctPhone);
            currentUserPhone = correctPhone;
            fbUser = await FirebaseDB.getUser(currentUserPhone);
        }
    }
    
    // إذا ما زلنا لم نجد المستخدم، نتحقق إذا كان هناك مستخدم قديم بنفس البريد أو UID
    if (!fbUser) {
        // محاولة البحث عن مستخدم فيسبوك باستخدام UID (إذا كنت قد خزنت UID في fb_users)
        // يمكنك إضافة حقل `authUID` في مستند fb_users لتسهيل البحث
        // لكن حالياً ليس لدينا، لذا سننشئ مستخدم جديد
        console.log('لم يتم العثور على مستخدم فيسبوك حتى بعد التصحيح، سيتم إنشاء جديد');
        fbUser = await FirebaseDB.saveUser(currentUserPhone, {
            name: mainUserData.username || user.displayName || 'مستخدم',
            email: mainUserData.email || user.email || '',
            photoURL: mainUserData.photoURL || user.photoURL || '',
            // ... باقي البيانات
        });
    } else {
        // تم العثور على المستخدم بعد التصحيح
        console.log('تم العثور على المستخدم بعد التصحيح');
    }
} else {
    // المستخدم موجود، نقوم بتحديث بياناته
    await FirebaseDB.updateUser(fbUser.id, {
        name: mainUserData.username || user.displayName || fbUser.name,
        email: mainUserData.email || user.email || fbUser.email,
        photoURL: mainUserData.photoURL || user.photoURL || fbUser.photoURL
    });
}
            
            showApp();
            initializeApp();
          } else {
            showAuthRequired();
          }
        } catch (error) {
          console.error('Auth check error:', error);
          showAuthRequired();
        }
      } else {
        showAuthRequired();
      }
      
      setTimeout(() => loading.classList.add('hidden'), 500);
    });
  });
  
  // =============================================
  // Show/Hide Screens
  // =============================================
  function showAuthRequired() {
    document.getElementById('authRequiredScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }
  
  function showApp() {
    document.getElementById('authRequiredScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
  }
  
  function redirectToMain() {
    window.location.href = 'index.html';
  }
  
  function goToWhatsApp() {
    window.location.href = 'wahtsapp.html';
  }
  
  // =============================================
  // Initialize App
  // =============================================
  let userData = null;
  
  async function initializeApp() {
    userData = await FirebaseDB.getUser(currentUserPhone);
    
    if (!userData) {
      showToast('حدث خطأ في تحميل البيانات', 'error');
      return;
    }
    
    updateUI();
    loadPosts();
    loadFriendRequests();
    loadNotifications();
    loadChats();
    loadPages();
    loadGroups();
    
    applyTheme();
    
    console.log('✅ فيسبوك الإسلامي جاهز');
  }
  
  // =============================================
  // Update UI
  // =============================================
  function updateUI() {
    if (!userData) return;
    
    const avatar = userData.photoURL || getDefaultAvatar();
    const cover = userData.coverPhoto || '';
    
    // Header
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) headerAvatar.src = avatar;
    
    // Sidebar
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarName = document.getElementById('sidebarName');
    const sidebarPhone = document.getElementById('sidebarPhone');
    
    if (sidebarAvatar) sidebarAvatar.src = avatar;
    if (sidebarName) sidebarName.textContent = userData.name || 'مستخدم';
    if (sidebarPhone) sidebarPhone.textContent = userData.phone || '-';
    
    // Post creator
    const postCreatorAvatar = document.getElementById('postCreatorAvatar');
    const postCreatorName = document.getElementById('postCreatorName');
    const modalPostAvatar = document.getElementById('modalPostAvatar');
    const modalPostName = document.getElementById('modalPostName');
    const commentUserAvatar = document.getElementById('commentUserAvatar');
    
    if (postCreatorAvatar) postCreatorAvatar.src = avatar;
    if (postCreatorName) postCreatorName.textContent = userData.name || 'مستخدم';
    if (modalPostAvatar) modalPostAvatar.src = avatar;
    if (modalPostName) modalPostName.textContent = userData.name || 'مستخدم';
    if (commentUserAvatar) commentUserAvatar.src = avatar;
    
    // Profile
    const profileAvatar = document.getElementById('profileAvatar');
    const profileCover = document.getElementById('profileCover');
    const profileName = document.getElementById('profileName');
    const profilePhone = document.getElementById('profilePhone');
    const profilePhoneInfo = document.getElementById('profilePhoneInfo');
    const profileEmail = document.getElementById('profileEmail');
    const profileBio = document.getElementById('profileBio');
    
    if (profileAvatar) profileAvatar.src = avatar;
    if (profileCover) profileCover.src = cover || '';
    if (profileName) profileName.textContent = userData.name || 'مستخدم';
    if (profilePhone) profilePhone.textContent = userData.phone || '-';
    if (profilePhoneInfo) profilePhoneInfo.textContent = userData.phone || '-';
    if (profileEmail) profileEmail.textContent = userData.email || 'غير محدد';
    if (profileBio) profileBio.textContent = userData.bio || 'لا توجد نبذة';
    
    // Stats
    const friendsCount = document.getElementById('friendsCount');
    const totalFriendsCount = document.getElementById('totalFriendsCount');
    const profileFriendsCount = document.getElementById('profileFriendsCount');
    
    const friendsNum = (userData.friends || []).length;
    if (friendsCount) friendsCount.textContent = friendsNum;
    if (totalFriendsCount) totalFriendsCount.textContent = friendsNum;
    if (profileFriendsCount) profileFriendsCount.textContent = friendsNum;
  }
  
  function getDefaultAvatar() {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a2845" width="100" height="100"/><text x="50" y="65" text-anchor="middle" fill="%23e8b931" font-size="40">👤</text></svg>';
  }
  
  // =============================================
  // Theme
  // =============================================
  let darkMode = localStorage.getItem('fb_darkMode') !== 'false';
  
  function applyTheme() {
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
    
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';
  }
  
  function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('fb_darkMode', darkMode);
    applyTheme();
  }
  
  // =============================================
  // Section Navigation - مُحسّن للموبايل
  // =============================================
  function showSection(sectionName) {
    previousSection = currentSection;
    currentSection = sectionName;
    
    // Update back button visibility
    const backBtn = document.getElementById('mobileBackBtn');
    if (backBtn) {
      backBtn.style.display = sectionName === 'home' ? 'none' : 'flex';
    }
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    
    // Show target section
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
      section.classList.add('active');
      section.style.display = 'block';
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (navItem) navItem.classList.add('active');
    
    // Reset chat area for messages
    if (sectionName === 'messages') {
      const messagesMain = document.getElementById('messagesMain');
      if (messagesMain) {
        messagesMain.classList.remove('active');
      }
    }
    
    // Load content
    switch(sectionName) {
      case 'home':
        loadPosts();
        break;
      case 'friends':
        loadFriendRequests();
        loadFriendsList();
        break;
      case 'messages':
        loadChats();
        break;
      case 'notifications':
        loadNotifications();
        break;
      case 'pages':
        loadPages();
        break;
      case 'groups':
        loadGroups();
        break;
      case 'profile':
        loadProfileData();
        break;
      case 'saved':
        loadSavedPosts();
        break;
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
  
  function goBack() {
    if (currentSection === 'messages') {
      const messagesMain = document.getElementById('messagesMain');
      if (messagesMain && messagesMain.classList.contains('active')) {
        // Close chat and show list
        messagesMain.classList.remove('active');
        return;
      }
    }
    
    showSection(previousSection || 'home');
  }
  
  // =============================================
  // Posts
  // =============================================
  async function loadPosts() {
    const container = document.getElementById('postsFeed');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const result = await FirebaseDB.getPosts(POSTS_PER_LOAD);
      lastPostDoc = result.lastDoc;
      
      if (result.posts.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-newspaper"></i>
            <p>لا توجد منشورات</p>
          </div>
        `;
        return;
      }
      
      container.innerHTML = result.posts.map(post => renderPost(post)).join('');
      
      const loadMore = document.getElementById('loadMorePosts');
      if (loadMore) {
        loadMore.style.display = result.posts.length >= POSTS_PER_LOAD ? 'block' : 'none';
      }
      
    } catch (error) {
      console.error('Load posts error:', error);
      container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>حدث خطأ</p></div>';
    }
  }
  
  async function loadMorePosts() {
    if (!lastPostDoc) return;
    
    try {
      const result = await FirebaseDB.getPosts(POSTS_PER_LOAD, lastPostDoc);
      lastPostDoc = result.lastDoc;
      
      const container = document.getElementById('postsFeed');
      result.posts.forEach(post => {
        container.insertAdjacentHTML('beforeend', renderPost(post));
      });
      
      const loadMore = document.getElementById('loadMorePosts');
      if (loadMore) {
        loadMore.style.display = result.posts.length >= POSTS_PER_LOAD ? 'block' : 'none';
      }
      
    } catch (error) {
      console.error('Load more error:', error);
    }
  }
  
  function renderPost(post) {
    if (!post) return '';
    
    const author = post.authorName || 'مستخدم';
    const authorAvatar = post.authorPhoto || getDefaultAvatar();
    const isLiked = (post.likesArray || []).includes(currentUserPhone);
    const isSaved = (post.savedBy || []).includes(currentUserPhone);
    const isOwner = post.authorID === currentUserPhone;
    const time = post.createdAt ? getTimeAgo(post.createdAt) : '';
    const image = post.image ? `<img class="post-image" src="${post.image}" alt="" onclick="openImageViewer('${post.image}')">` : '';
    
    return `
      <div class="post-card" data-post-id="${post.postID}">
        <div class="post-header">
          <img class="post-avatar" src="${authorAvatar}" alt="">
          <div class="post-info">
            <div class="post-author">${escapeHtml(author)}</div>
            <div class="post-meta">${time}</div>
          </div>
          ${isOwner ? `
            <button class="post-menu-btn" onclick="openPostOptions('${post.postID}')">
              <i class="fas fa-ellipsis-h"></i>
            </button>
          ` : ''}
        </div>
        
        <div class="post-content">${escapeHtml(post.content || '')}</div>
        ${image}
        
        <div class="post-stats">
          <span>${post.likes || 0} إعجاب</span>
          <span>${post.commentsCount || 0} تعليق</span>
        </div>
        
        <div class="post-actions">
          <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="handleLike('${post.postID}')">
            <i class="fas fa-thumbs-up"></i>
            <span>${isLiked ? 'أعجبني' : 'إعجاب'}</span>
          </button>
          <button class="post-action-btn" onclick="openComments('${post.postID}')">
            <i class="fas fa-comment"></i>
            <span>تعليق</span>
          </button>
          <button class="post-action-btn ${isSaved ? 'liked' : ''}" onclick="handleSave('${post.postID}')">
            <i class="fas fa-bookmark"></i>
            <span>${isSaved ? 'محفوظ' : 'حفظ'}</span>
          </button>
        </div>
      </div>
    `;
  }
  
  function openPostOptions(postId) {
    currentPostId = postId;
    document.getElementById('postOptionsModal').classList.add('active');
  }
  
  async function editPost() {
    if (!currentPostId) return;
    
    closeModal('postOptionsModal');
    
    try {
      const postDoc = await db.collection('fb_posts').doc(currentPostId).get();
      if (postDoc.exists) {
        const postData = postDoc.data();
        document.getElementById('editPostContent').value = postData.content || '';
        editingPostId = currentPostId;
        document.getElementById('editPostModal').classList.add('active');
      }
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function saveEditedPost() {
    const content = document.getElementById('editPostContent').value.trim();
    
    if (!content || !editingPostId) return;
    
    try {
      await FirebaseDB.updatePost(editingPostId, { content: content });
      closeModal('editPostModal');
      showToast('تم تعديل المنشور', 'success');
      loadPosts();
      editingPostId = null;
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function handleSave(postId) {
    try {
      const isSaved = await FirebaseDB.toggleSavePost(postId, currentUserPhone);
      showToast(isSaved ? 'تم حفظ المنشور' : 'تم إزالة المنشور من المحفوظات', 'success');
      loadPosts();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function savePost() {
    if (!currentPostId) return;
    
    try {
      await FirebaseDB.toggleSavePost(currentPostId, currentUserPhone);
      closeModal('postOptionsModal');
      showToast('تم حفظ المنشور', 'success');
      loadPosts();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function deletePost() {
    if (!currentPostId) return;
    
    if (!confirm('هل تريد حذف هذا المنشور؟')) return;
    
    try {
      await FirebaseDB.deletePost(currentPostId);
      closeModal('postOptionsModal');
      showToast('تم حذف المنشور', 'success');
      loadPosts();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function loadSavedPosts() {
    const container = document.getElementById('savedPosts');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const posts = await FirebaseDB.getSavedPosts(currentUserPhone);
      
      if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bookmark"></i><p>لم تقم بحفظ أي منشورات</p></div>';
        return;
      }
      
      container.innerHTML = posts.map(post => renderPost(post)).join('');
      
    } catch (error) {
      container.innerHTML = '<div class="empty-state">حدث خطأ</div>';
    }
  }
  
  // =============================================
  // Create Post
  // =============================================
  function openCreatePostModal() {
    document.getElementById('createPostModal').classList.add('active');
    document.getElementById('postContent').value = '';
    document.getElementById('postImagePreview').style.display = 'none';
    document.getElementById('postContent').focus();
  }
  
  function handlePostImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('previewImage').src = e.target.result;
      document.getElementById('postImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
  
  function removePostImage() {
    document.getElementById('postImagePreview').style.display = 'none';
    document.getElementById('postImageInput').value = '';
  }
  
  async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const privacy = document.getElementById('postPrivacy').value;
    const imageEl = document.getElementById('postImagePreview');
    const image = imageEl.style.display !== 'none' ? document.getElementById('previewImage').src : null;
    
    if (!content && !image) {
      showToast('اكتب شيئاً أو أضف صورة', 'error');
      return;
    }
    
    try {
      await FirebaseDB.savePost({
        authorID: currentUserPhone,
        authorName: userData.name,
        authorPhoto: userData.photoURL,
        content: content,
        image: image,
        privacy: privacy
      });
      
      closeModal('createPostModal');
      showToast('تم النشر بنجاح', 'success');
      loadPosts();
      
      // Notify friends
      const friends = userData.friends || [];
      friends.forEach(async friendPhone => {
        await FirebaseDB.addNotification({
          userID: friendPhone,
          type: 'post',
          title: 'منشور جديد',
          content: `${userData.name} نشر منشوراً جديداً`,
          referenceID: currentUserPhone
        });
      });
      
    } catch (error) {
      console.error('Create post error:', error);
      showToast('حدث خطأ', 'error');
    }
  }
  
  // =============================================
  // Likes & Comments
  // =============================================
  async function handleLike(postId) {
    try {
      await FirebaseDB.toggleLike(postId, currentUserPhone);
      loadPosts();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  function openComments(postId) {
    currentPostId = postId;
    document.getElementById('commentsModal').classList.add('active');
    loadComments(postId);
  }
  
  async function loadComments(postId) {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const comments = await FirebaseDB.getComments(postId);
      
      if (comments.length === 0) {
        container.innerHTML = '<div class="empty-state-small">لا توجد تعليقات</div>';
        return;
      }
      
      container.innerHTML = comments.map(c => `
        <div class="comment-item">
          <img src="${c.authorPhoto || getDefaultAvatar()}" alt="">
          <div class="comment-content">
            <strong>${c.authorName || 'مستخدم'}</strong>
            <p>${escapeHtml(c.text)}</p>
            <span>${getTimeAgo(c.createdAt)}</span>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      container.innerHTML = '<div class="empty-state-small">حدث خطأ</div>';
    }
  }
  
  async function addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text || !currentPostId) return;
    
    try {
      await FirebaseDB.addComment(currentPostId, {
        authorID: currentUserPhone,
        authorName: userData.name,
        authorPhoto: userData.photoURL,
        text: text
      });
      
      const post = (await db.collection('fb_posts').doc(currentPostId).get()).data();
      if (post && post.authorID !== currentUserPhone) {
        await FirebaseDB.addNotification({
          userID: post.authorID,
          type: 'comment',
          title: 'تعليق جديد',
          content: `${userData.name} علق على منشورك`,
          referenceID: currentPostId
        });
      }
      
      input.value = '';
      loadComments(currentPostId);
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  // =============================================
  // Friends
  // =============================================
  async function loadFriendRequests() {
    const container = document.getElementById('friendRequestsList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const requests = userData.friendRequests || [];
      
      if (requests.length === 0) {
        container.innerHTML = '<p class="empty-state-small">لا توجد طلبات جديدة</p>';
        updateBadges(0, 'friendRequest');
        return;
      }
      
      let html = '';
      for (const phone of requests) {
        const sender = await FirebaseDB.getUser(phone);
        if (sender) {
          html += `
            <div class="friend-request-item">
              <img src="${sender.photoURL || getDefaultAvatar()}" alt="">
              <div class="friend-request-info">
                <h4>${escapeHtml(sender.name)}</h4>
                <span>${phone}</span>
              </div>
              <div class="friend-request-actions">
                <button class="btn-primary btn-sm" onclick="acceptFriend('${phone}')">قبول</button>
                <button class="btn-secondary btn-sm" onclick="rejectFriend('${phone}')">رفض</button>
              </div>
            </div>
          `;
        }
      }
      
      container.innerHTML = html;
      updateBadges(requests.length, 'friendRequest');
      
    } catch (error) {
      container.innerHTML = '<p class="empty-state-small">حدث خطأ</p>';
    }
  }
  
  async function loadFriendsList() {
    const container = document.getElementById('friendsList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const friends = userData.friends || [];
      
      if (friends.length === 0) {
        container.innerHTML = '<p class="empty-state">لم تقم بإضافة أصدقاء بعد</p>';
        return;
      }
      
      let html = '';
      for (const phone of friends) {
        const friend = await FirebaseDB.getUser(phone);
        if (friend) {
          html += `
            <div class="friend-item">
              <img src="${friend.photoURL || getDefaultAvatar()}" alt="">
              <div class="friend-info">
                <h4>${escapeHtml(friend.name)}</h4>
                <span>${phone}</span>
              </div>
              <button class="btn-secondary btn-sm" onclick="openChatWith('${phone}')">
                <i class="fas fa-comment"></i>
              </button>
            </div>
          `;
        }
      }
      
      container.innerHTML = html;
      
    } catch (error) {
      container.innerHTML = '<p class="empty-state">حدث خطأ</p>';
    }
  }
  
  async function sendFriendRequest() {
    let input = document.getElementById('friendPhoneInput');
    let phone = input.value.trim();

    if (!phone) {
      showToast('أدخل رقم الهاتف', 'error');
      return;
    }

    // تنظيف الرقم من المسافات وإزالة الصفر في البداية إذا لزم الأمر
    // ملاحظة: تأكد أن طريقة التخزين في fb_users تتوافق مع هذه الطريقة
    // إذا كانت الأرقام في القاعدة تبدأ بـ +2، تأكد من إضافتها هنا أو العكس
    
    // مثال لتنظيف الرقم (تعديله ليتناسب مع نسق أرقامك في القاعدة)
    // if (!phone.startsWith('+') && phone.startsWith('0')) {
    //    phone = '+2' + phone; // مثال لمصر
    // }

    if (phone === currentUserPhone) {
      showToast('لا يمكنك إضافة نفسك', 'error');
      return;
    }
    

    if (phone === currentUserPhone) {
      showToast('لا يمكنك إضافة نفسك', 'error');
      return;
    }
    
    try {
      const targetUser = await FirebaseDB.getUser(phone);
      
      if (!targetUser) {
        showToast('المستخدم غير موجود', 'error');
        return;
      }
      
      if ((userData.friends || []).includes(phone)) {
        showToast('هذا المستخدم صديق بالفعل', 'info');
        return;
      }
      
      if ((userData.sentRequests || []).includes(phone)) {
        showToast('أرسلت طلباً مسبقاً', 'info');
        return;
      }
      
      await FirebaseDB.updateUser(targetUser.id, {
        friendRequests: firebase.firestore.FieldValue.arrayUnion(currentUserPhone)
      });
      
      await FirebaseDB.updateUser(userData.id, {
        sentRequests: firebase.firestore.FieldValue.arrayUnion(phone)
      });
      
      await FirebaseDB.addNotification({
        userID: phone,
        type: 'friend_request',
        title: 'طلب صداقة',
        content: `${userData.name} يريد أن يصبح صديقك`,
        referenceID: currentUserPhone
      });
      
      if (!userData.sentRequests) userData.sentRequests = [];
      userData.sentRequests.push(phone);
      
      input.value = '';
      showToast('تم إرسال الطلب', 'success');
      
    } catch (error) {
      console.error('Send friend request error:', error);
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function acceptFriend(phone) {
    try {
      await FirebaseDB.updateUser(userData.id, {
        friendRequests: firebase.firestore.FieldValue.arrayRemove(phone),
        friends: firebase.firestore.FieldValue.arrayUnion(phone)
      });
      
      const otherUser = await FirebaseDB.getUser(phone);
      if (otherUser) {
        await FirebaseDB.updateUser(otherUser.id, {
          sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUserPhone),
          friends: firebase.firestore.FieldValue.arrayUnion(currentUserPhone)
        });
      }
      
      userData.friendRequests = (userData.friendRequests || []).filter(p => p !== phone);
      if (!userData.friends) userData.friends = [];
      userData.friends.push(phone);
      
      showToast('تم قبول الطلب', 'success');
      loadFriendRequests();
      loadFriendsList();
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function rejectFriend(phone) {
    try {
      await FirebaseDB.updateUser(userData.id, {
        friendRequests: firebase.firestore.FieldValue.arrayRemove(phone)
      });
      
      const otherUser = await FirebaseDB.getUser(phone);
      if (otherUser) {
        await FirebaseDB.updateUser(otherUser.id, {
          sentRequests: firebase.firestore.FieldValue.arrayRemove(currentUserPhone)
        });
      }
      
      userData.friendRequests = (userData.friendRequests || []).filter(p => p !== phone);
      
      showToast('تم رفض الطلب', 'info');
      loadFriendRequests();
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  // =============================================
  // Messages - مُحسّن للموبايل
  // =============================================
  async function loadChats() {
    const container = document.getElementById('chatsList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const chats = await FirebaseDB.getChats(currentUserPhone);
      
      if (chats.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-comments"></i>
            <p>لا توجد محادثات</p>
          </div>
        `;
        return;
      }
      
      let html = '';
      for (const chat of chats) {
        const otherPhone = chat.participants.find(p => p !== currentUserPhone);
        const otherUser = await FirebaseDB.getUser(otherPhone);
        
        if (otherUser) {
          const unread = chat[`unread_${currentUserPhone}`] || 0;
          
          html += `
            <div class="chat-item" onclick="openChat('${otherPhone}')">
              <img src="${otherUser.photoURL || getDefaultAvatar()}" alt="">
              <div class="chat-item-info">
                <div class="chat-item-name">${escapeHtml(otherUser.name)}</div>
                <div class="chat-item-preview">${chat.lastMessage || ''}</div>
              </div>
              ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
            </div>
          `;
        }
      }
      
      container.innerHTML = html;
      
    } catch (error) {
      container.innerHTML = '<p class="empty-state-small">حدث خطأ</p>';
    }
  }
  
  async function openChat(friendPhone) {
    currentChatId = FirebaseDB.getChatId(currentUserPhone, friendPhone);
    
    const friend = await FirebaseDB.getUser(friendPhone);
    if (!friend) return;
    
    // Mark as read
    await FirebaseDB.markChatAsRead(currentChatId, currentUserPhone);
    
    // Show chat area on mobile
    const messagesMain = document.getElementById('messagesMain');
    if (messagesMain) {
      messagesMain.classList.add('active');
    }
    
    document.getElementById('chatArea').innerHTML = `
      <div class="chat-header">
        <button class="back-btn" onclick="closeChat()">
          <i class="fas fa-arrow-right"></i>
        </button>
        <img src="${friend.photoURL || getDefaultAvatar()}" alt="">
        <div class="chat-header-info">
          <h4>${escapeHtml(friend.name)}</h4>
          <span>${friendPhone}</span>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-area">
        <input type="text" id="messageInput" placeholder="اكتب رسالة..." onkeypress="if(event.key==='Enter')sendMessage('${friendPhone}')">
        <button class="btn-primary" onclick="sendMessage('${friendPhone}')">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    `;
    
    const messages = await FirebaseDB.getMessages(currentChatId);
    const container = document.getElementById('chatMessages');
    
    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-state-small">ابدأ المحادثة</div>';
      return;
    }
    
    container.innerHTML = messages.map(m => `
      <div class="message ${m.senderID === currentUserPhone ? 'sent' : 'received'}">
        ${escapeHtml(m.text)}
        <span class="message-time">${getTimeAgo(m.createdAt)}</span>
      </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
  }
  
  function closeChat() {
    const messagesMain = document.getElementById('messagesMain');
    if (messagesMain) {
      messagesMain.classList.remove('active');
    }
    loadChats();
  }
  
  async function sendMessage(friendPhone) {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
      const chatId = FirebaseDB.getChatId(currentUserPhone, friendPhone);
      
      await FirebaseDB.sendMessage(chatId, {
        text: text,
        senderID: currentUserPhone
      }, friendPhone);
      
      await FirebaseDB.addNotification({
        userID: friendPhone,
        type: 'message',
        title: 'رسالة جديدة',
        content: `${userData.name} أرسل لك رسالة`,
        referenceID: chatId
      });
      
      input.value = '';
      openChat(friendPhone);
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  // =============================================
// استكمال ملف facebook.js
// =============================================

// استكمال دالة فتح محادثة من صفحة الأصدقاء
function openChatWith(phone) {
    showSection('messages');
    setTimeout(() => openChat(phone), 300);
  }
  
  function openNewChatModal() {
    document.getElementById('newChatModal').classList.add('active');
    loadFriendsForChat();
  }
  
  async function loadFriendsForChat() {
    const container = document.getElementById('friendsForChat');
    if (!container) return;
    
    const friends = userData.friends || [];
    
    if (friends.length === 0) {
      container.innerHTML = '<p class="empty-state-small">لا يوجد أصدقاء للمحادثة</p>';
      return;
    }
    
    let html = '';
    for (const phone of friends) {
      const friend = await FirebaseDB.getUser(phone);
      if (friend) {
        html += `
          <div class="friend-item" onclick="startNewChat('${phone}')">
            <img src="${friend.photoURL || getDefaultAvatar()}" alt="">
            <div class="friend-info">
              <h4>${escapeHtml(friend.name)}</h4>
              <span>${phone}</span>
            </div>
          </div>
        `;
      }
    }
    
    container.innerHTML = html;
  }
  
  function startNewChat(phone) {
    closeModal('newChatModal');
    openChat(phone);
  }
  
  // =============================================
  // Notifications
  // =============================================
  async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center p-4"><div class="loader"></div></div>';
    
    try {
      const notifications = await FirebaseDB.getNotifications(currentUserPhone);
      
      if (notifications.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-bell-slash"></i>
            <p>لا توجد إشعارات</p>
          </div>
        `;
        updateBadges(0, 'notification');
        return;
      }
      
      const unread = notifications.filter(n => !n.read).length;
      updateBadges(unread, 'notification');
      
      const icons = {
        friend_request: '👤',
        like: '❤️',
        comment: '💬',
        message: '📩',
        post: '📝'
      };
      
      container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="handleNotification('${n.id}', '${n.type}', '${n.referenceID || ''}')">
          <div class="notification-icon">${icons[n.type] || '🔔'}</div>
          <div class="notification-content">
            <p>${escapeHtml(n.content)}</p>
            <span>${getTimeAgo(n.createdAt)}</span>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      container.innerHTML = '<div class="empty-state">حدث خطأ</div>';
    }
  }
  
  async function handleNotification(notifId, type, refId) {
    await FirebaseDB.markAsRead(notifId);
    
    switch(type) {
      case 'friend_request':
        showSection('friends');
        break;
      case 'message':
        showSection('messages');
        break;
      case 'like':
      case 'comment':
      case 'post':
        showSection('home');
        break;
    }
    
    loadNotifications();
  }
  
  async function markAllAsRead() {
    await FirebaseDB.markAllAsRead(currentUserPhone);
    showToast('تم تحديد الكل كمقروء', 'success');
    loadNotifications();
  }
  
  // =============================================
  // Pages
  // =============================================
  async function loadPages() {
    const myContainer = document.getElementById('myPagesList');
    const followedContainer = document.getElementById('followedPagesList');
    const allContainer = document.getElementById('allPagesList');
    
    if (!allContainer) return;
    
    try {
      const pages = await FirebaseDB.getPages();
      
      const myPages = pages.filter(p => p.ownerID === currentUserPhone);
      const followedPages = pages.filter(p => 
        (p.followers || []).includes(currentUserPhone) && p.ownerID !== currentUserPhone
      );
      
      if (myContainer) {
        myContainer.innerHTML = myPages.length 
          ? myPages.map(p => renderPage(p, true)).join('') 
          : '<p class="empty-state-small">لم تنشئ صفحات</p>';
      }
      
      if (followedContainer) {
        followedContainer.innerHTML = followedPages.length 
          ? followedPages.map(p => renderPage(p)).join('') 
          : '<p class="empty-state-small">لا تتابع صفحات</p>';
      }
      
      allContainer.innerHTML = pages.length 
        ? pages.map(p => renderPage(p)).join('') 
        : '<p class="empty-state-small">لا توجد صفحات</p>';
      
    } catch (error) {
      console.error('Load pages error:', error);
    }
  }
  
  function renderPage(page, isOwner = false) {
    const isFollowing = (page.followers || []).includes(currentUserPhone);
    
    return `
      <div class="page-card">
        <div class="page-cover">
          <img src="${page.coverPhoto || ''}" alt="">
          <img class="page-avatar" src="${page.photoURL || getDefaultAvatar()}" alt="">
        </div>
        <div class="page-info">
          <h4>${escapeHtml(page.name)}</h4>
          <span>${escapeHtml(page.description || '')}</span>
        </div>
        <div class="page-stats">
          <span><strong>${(page.followers || []).length}</strong> متابع</span>
        </div>
        <div class="page-actions">
          ${isOwner ? `
            <button class="btn-secondary btn-sm" onclick="editPage('${page.pageID}')">تعديل</button>
          ` : `
            <button class="btn-primary btn-sm" onclick="toggleFollow('${page.pageID}')">
              ${isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
            </button>
          `}
        </div>
      </div>
    `;
  }
  
  async function createPage() {
    const name = document.getElementById('pageName').value.trim();
    const description = document.getElementById('pageDescription').value.trim();
    const category = document.getElementById('pageCategory').value;
    
    if (!name) {
      showToast('أدخل اسم الصفحة', 'error');
      return;
    }
    
    try {
      await FirebaseDB.createPage({
        ownerID: currentUserPhone,
        name: name,
        description: description,
        category: category,
        photoURL: null,
        coverPhoto: null
      });
      
      closeModal('createPageModal');
      showToast('تم إنشاء الصفحة', 'success');
      loadPages();
      
      document.getElementById('pageName').value = '';
      document.getElementById('pageDescription').value = '';
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function toggleFollow(pageId) {
    try {
      await FirebaseDB.toggleFollowPage(pageId, currentUserPhone);
      loadPages();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  // =============================================
  // Groups
  // =============================================
  async function loadGroups() {
    const myContainer = document.getElementById('myGroupsList');
    const allContainer = document.getElementById('allGroupsList');
    
    if (!allContainer) return;
    
    try {
      const groups = await FirebaseDB.getGroups();
      
      const myGroups = groups.filter(g => (g.members || []).includes(currentUserPhone));
      
      if (myContainer) {
        myContainer.innerHTML = myGroups.length 
          ? myGroups.map(g => renderGroup(g)).join('') 
          : '<p class="empty-state-small">لم تنضم لجروبات</p>';
      }
      
      allContainer.innerHTML = groups.length 
        ? groups.map(g => renderGroup(g)).join('') 
        : '<p class="empty-state-small">لا توجد جروبات</p>';
      
    } catch (error) {
      console.error('Load groups error:', error);
    }
  }
  
  function renderGroup(group) {
    const isMember = (group.members || []).includes(currentUserPhone);
    const isOwner = group.ownerID === currentUserPhone;
    
    return `
      <div class="group-card">
        <div class="group-cover">
          <img src="${group.coverPhoto || ''}" alt="">
          <img class="group-avatar" src="${group.photoURL || getDefaultAvatar()}" alt="">
        </div>
        <div class="group-info">
          <h4>${escapeHtml(group.name)}</h4>
          <span>${escapeHtml(group.description || '')}</span>
        </div>
        <div class="group-stats">
          <span><strong>${(group.members || []).length}</strong> عضو</span>
        </div>
        <div class="group-actions">
          ${isOwner ? `
            <button class="btn-secondary btn-sm">إدارة</button>
          ` : isMember ? `
            <button class="btn-secondary btn-sm" onclick="leaveGroup('${group.groupID}')">مغادرة</button>
          ` : `
            <button class="btn-primary btn-sm" onclick="joinGroup('${group.groupID}')">انضمام</button>
          `}
        </div>
      </div>
    `;
  }
  
  async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const category = document.getElementById('groupCategory').value;
    const privacy = document.getElementById('groupPrivacy').value;
    
    if (!name) {
      showToast('أدخل اسم الجروب', 'error');
      return;
    }
    
    try {
      await FirebaseDB.createGroup({
        ownerID: currentUserPhone,
        name: name,
        description: description,
        category: category,
        privacy: privacy,
        photoURL: null,
        coverPhoto: null
      });
      
      closeModal('createGroupModal');
      showToast('تم إنشاء الجروب', 'success');
      loadGroups();
      
      document.getElementById('groupName').value = '';
      document.getElementById('groupDescription').value = '';
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function joinGroup(groupId) {
    try {
      await FirebaseDB.joinGroup(groupId, currentUserPhone);
      showToast('انضممت للجروب', 'success');
      loadGroups();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  async function leaveGroup(groupId) {
    try {
      await FirebaseDB.leaveGroup(groupId, currentUserPhone);
      showToast('غادرت الجروب', 'info');
      loadGroups();
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  // =============================================
  // Profile
  // =============================================
  async function loadProfileData() {
    if (!userData) return;
    
    const posts = await FirebaseDB.getUserPosts(currentUserPhone);
    const postsCount = document.getElementById('profilePostsCount');
    if (postsCount) postsCount.textContent = posts.length;
    
    const profilePosts = document.getElementById('profilePosts');
    if (profilePosts) {
      if (posts.length === 0) {
        profilePosts.innerHTML = '<p class="empty-state">لا توجد منشورات</p>';
      } else {
        profilePosts.innerHTML = posts.map(p => renderPost(p)).join('');
      }
    }
  }
  
  function openEditProfileModal() {
    document.getElementById('editName').value = userData.name || '';
    document.getElementById('editBio').value = userData.bio || '';
    
    const avatarPreview = document.getElementById('avatarPreview');
    const coverPreview = document.getElementById('coverPreview');
    
    if (avatarPreview && userData.photoURL) {
      avatarPreview.innerHTML = `<img src="${userData.photoURL}" alt="" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">`;
    }
    
    if (coverPreview && userData.coverPhoto) {
      coverPreview.innerHTML = `<img src="${userData.coverPhoto}" alt="" style="width: 100%; height: 80px; border-radius: 8px; object-fit: cover;">`;
    }
    
    selectedAvatar = null;
    selectedCover = null;
    
    document.getElementById('editProfileModal').classList.add('active');
  }
  
  function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      selectedAvatar = e.target.result;
      const preview = document.getElementById('avatarPreview');
      preview.innerHTML = `<img src="${selectedAvatar}" alt="" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">`;
    };
    reader.readAsDataURL(file);
  }
  
  function handleCoverChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      selectedCover = e.target.result;
      const preview = document.getElementById('coverPreview');
      preview.innerHTML = `<img src="${selectedCover}" alt="" style="width: 100%; height: 80px; border-radius: 8px; object-fit: cover;">`;
    };
    reader.readAsDataURL(file);
  }
  
  async function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    
    if (!name) {
      showToast('الاسم مطلوب', 'error');
      return;
    }
    
    try {
      const updates = { name, bio };
      
      if (selectedAvatar) {
        updates.photoURL = selectedAvatar;
      }
      
      if (selectedCover) {
        updates.coverPhoto = selectedCover;
      }
      
      await FirebaseDB.updateUser(userData.id, updates);
      
      userData.name = name;
      userData.bio = bio;
      if (selectedAvatar) userData.photoURL = selectedAvatar;
      if (selectedCover) userData.coverPhoto = selectedCover;
      
      closeModal('editProfileModal');
      showToast('تم الحفظ', 'success');
      updateUI();
      
    } catch (error) {
      showToast('حدث خطأ', 'error');
    }
  }
  
  function changeProfilePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await FirebaseDB.updateUser(userData.id, { photoURL: ev.target.result });
          userData.photoURL = ev.target.result;
          showToast('تم تغيير الصورة', 'success');
          updateUI();
        } catch (error) {
          showToast('حدث خطأ', 'error');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  
  function changeCoverPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await FirebaseDB.updateUser(userData.id, { coverPhoto: ev.target.result });
          userData.coverPhoto = ev.target.result;
          document.getElementById('profileCover').src = ev.target.result;
          showToast('تم تغيير الغلاف', 'success');
        } catch (error) {
          showToast('حدث خطأ', 'error');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  
  // =============================================
  // Utilities
  // =============================================
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
    
    return date.toLocaleDateString('ar-EG');
  }
  
  function updateBadges(count, type) {
    const badgeIds = {
      friendRequest: ['friendRequestBadgeHeader', 'friendRequestBadgeMobile'],
      notification: ['notificationBadgeHeader', 'notificationBadgeMobile'],
      message: ['messageBadgeHeader', 'messageBadgeHeaderDesktop', 'messageBadgeMobile']
    };
    
    (badgeIds[type] || []).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = count > 0 ? count : '';
        el.style.display = count > 0 ? 'flex' : 'none';
      }
    });
  }
  
  function openImageViewer(src) {
    document.getElementById('viewerImage').src = src;
    document.getElementById('imageViewerModal').classList.add('active');
  }
  
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }
  
  function sharePost(postId) {
    if (navigator.share) {
      navigator.share({
        title: 'منشور من فيسبوك الإسلامي',
        url: window.location.href
      });
    } else {
      showToast('تم النسخ', 'success');
    }
  }
  
  // =============================================
  // Toast
  // =============================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // =============================================
  // Event Listeners
  // =============================================
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });
  
  // تحديث دوري
  setInterval(() => {
    loadNotifications();
    loadFriendRequests();
  }, 60000);
  
  console.log('📘 فيسبوك الإسلامي - جاهز للعمل');