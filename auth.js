// Authentication system for the hacking simulation

document.addEventListener('DOMContentLoaded', () => {
  // Initialize users array in localStorage if it doesn't exist
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([]));
  }
  
  // Set current user from localStorage if exists
  let currentUser = null;
  try {
    // Try to get the first (and only) user
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (Array.isArray(users) && users.length > 0) {
      currentUser = users[0];
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  } catch (e) {
    console.error('Error loading user data:', e);
    localStorage.removeItem('users');
    localStorage.removeItem('currentUser');
  }

  // Normalize/migrate any legacy localStorage data from older implementations
  function normalizeStorage() {
    try {
      const rawUsers = localStorage.getItem('users');
      let usersParsed;
      try { usersParsed = rawUsers ? JSON.parse(rawUsers) : []; } catch (_) { usersParsed = []; }

      // Case 1: users stored as object map (legacy) => convert to array with the most recent user
      if (usersParsed && !Array.isArray(usersParsed) && typeof usersParsed === 'object') {
        const list = Object.values(usersParsed).filter(u => u && typeof u === 'object');
        // Sort by createdAt if present, else keep order
        list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        const normalized = list.length > 0 ? [list[list.length - 1]] : [];
        localStorage.setItem('users', JSON.stringify(normalized));
      }

      // Refresh references after potential conversion
      const usersArr = JSON.parse(localStorage.getItem('users') || '[]');
      let cur = null;
      try { cur = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (_) { cur = null; }

      // Case 2: currentUser exists but lacks password; try to restore from users[0] if same username
      if (cur && (!cur.password || cur.password === '') && Array.isArray(usersArr) && usersArr.length > 0) {
        const primary = usersArr[0];
        if (primary && primary.username === cur.username && primary.password) {
          cur.password = primary.password;
          localStorage.setItem('currentUser', JSON.stringify(cur));
        }
      }

      // Update in-memory currentUser from normalized storage
      try {
        const refreshedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (Array.isArray(refreshedUsers) && refreshedUsers.length > 0) {
          currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null') || refreshedUsers[0];
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      } catch (_) { /* ignore */ }
    } catch (err) {
      console.warn('normalizeStorage failed', err);
    }
  }

  normalizeStorage();

  // Persist exactly one user (overwrite previous) and update currentUser atomically
  function saveSingleUser(user) {
    try {
      if (!user || typeof user !== 'object') return;
      localStorage.setItem('users', JSON.stringify([user]));
      localStorage.setItem('currentUser', JSON.stringify(user));
      currentUser = user;
    } catch (e) {
      console.error('Failed to save user:', e);
    }
  }
  
  // Elements
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const accountBtn = document.getElementById('accountBtn');
  const authButtons = document.getElementById('authButtons');
  const accountButtonContainer = document.getElementById('accountButtonContainer');
  const accountUsername = document.getElementById('accountUsername');
  // Auth (login/signup) modal
  const accountModal = document.getElementById('accountModal');
  const closeAccount = document.getElementById('closeAccount');
  // Account settings modal (password change + logout)
  const accountSettingsModal = document.getElementById('accountSettingsModal');
  const closeAccountSettings = document.getElementById('closeAccountSettings');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const changePasswordForm = document.getElementById('changePasswordForm');
  // Toggle UI based on login state
  function updateAuthUI() {
    const isLoggedIn = !!currentUser;
    authButtons.style.display = isLoggedIn ? 'none' : 'flex';
    accountButtonContainer.style.display = isLoggedIn ? 'block' : 'none';
    
    if (isLoggedIn) {
      console.log('Logged in as:', currentUser.username);
      if (accountUsername) {
        accountUsername.textContent = currentUser.username || '';
        accountUsername.style.display = 'inline';
      }
    } else {
      if (accountUsername) {
        accountUsername.textContent = '';
        accountUsername.style.display = 'none';
      }
    }
  }
  
  // Show login form in modal
  const showLoginForm = (e) => {
    if (e) e.preventDefault();
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.style.display = 'flex';
      setTimeout(() => {
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        switchTab('login');
      }, 10);
    }
  };
  
  // Show signup form in modal
  const showSignupForm = (e) => {
    if (e) e.preventDefault();
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.style.display = 'flex';
      setTimeout(() => {
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        switchTab('signup');
      }, 10);
    }
  };
  
  // Close modal and restore body scroll
  const closeModal = (e) => {
    if (e) e.preventDefault();
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.remove('show');
      // Wait for the animation to complete before hiding
      setTimeout(() => {
        if (authModal.classList.contains('show') === false) {
          authModal.style.display = 'none';
          document.body.style.overflow = '';
        }
      }, 300);
    }
  };

  // Open/Close Account Settings modal
  const openAccountSettings = () => {
    if (accountSettingsModal) {
      accountSettingsModal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  };
  const closeAccountSettingsModal = () => {
    if (accountSettingsModal) {
      accountSettingsModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  };
  
  // Handle user registration
  const handleSignup = (e) => {
    e.preventDefault();
    
    console.log('Signup form submitted');
    const username = document.getElementById('signupUsername')?.value.trim();
    const password = document.getElementById('signupPassword')?.value.trim();
    
    console.log('Signup attempt with:', { username, password });
    
    // Simple validation
    if (!username || !password) {
      alert('ユーザー名とパスワードを入力してください');
      return;
    }
    
    try {
      // Always create a new users array with just this user
      const newUser = {
        id: 'user_' + Date.now().toString(),
        username,
        password, // In a real app, never store plain text passwords
        createdAt: new Date().toISOString()
      };
      
      // Save only this user (overwrite any existing users) and set as current
      saveSingleUser(newUser);
      console.log('New user created and logged in:', newUser);
      
      // Update UI to reflect logged in state
      updateAuthUI();
      
      // Show success message and update UI
      closeModal();
      alert('登録が完了し、自動的にログインしました！');
      
      // Ensure UI is fully updated
      setTimeout(updateAuthUI, 100);
      
    } catch (error) {
      console.error('Error during signup:', error);
      alert('ユーザー登録中にエラーが発生しました。もう一度お試しください。');
    }
  };
  
  // Handle user login
  const handleLogin = (e) => {
    e.preventDefault();
    
    console.log('Login form submitted');
    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value.trim();
    
    console.log('Login attempt with:', { username, password });
    
    // Simple validation
    if (!username || !password) {
      alert('ユーザー名とパスワードを入力してください');
      return;
    }
    
    try {
      // Get the single user from localStorage
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users[0]; // Only one user exists at a time
      
      if (user && user.username === username && user.password === password) {
        // Login successful: re-save to ensure freshest single-user state
        saveSingleUser(user);
        
        // Update UI
        updateAuthUI();
        
        // Close modal and show success message
        closeModal();
        alert('ログインに成功しました！');
        console.log('開発者用: ハッキングページを開くには、コンソールで「openHack()」と入力してください');
        
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('ユーザー名またはパスワードが正しくありません');
    }
  };
  
  // Handle password change
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      
      if (!currentUser) {
        alert('セッションが切れました。再度ログインしてください。');
        return;
      }
      
      try {
        // Get the single user
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.length === 0) {
          throw new Error('ユーザーが見つかりません');
        }
        
        const user = users[0];
        
        // Verify current password
        if (user.password !== currentPassword) {
          alert('現在のパスワードが正しくありません');
          return;
        }
        
        // Update password for both the user and currentUser
        user.password = newPassword;
        currentUser.password = newPassword;
        
        // Save changes (overwrite to single latest user)
        saveSingleUser(user);
        
        alert('パスワードが変更されました');
        closeAccountSettingsModal();
        changePasswordForm.reset();
        
      } catch (error) {
        console.error('パスワードの変更中にエラーが発生しました:', error);
        alert('パスワードの変更中にエラーが発生しました');
      }
    });
  }
  
  // Add console command
  window.openHack = function() {
    window.open('hack.html', '_blank');
    return 'ハッキングページを開いています...';
  };

  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  
  // Function to switch tabs
  const switchTab = (tabName) => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabButtons = document.querySelectorAll('.tab-button');

    // Update tab buttons
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Show the corresponding form
    if (loginForm && signupForm) {
      if (tabName === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
      }
    }
  };

  // Add click event listeners to tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Show appropriate form based on URL hash or default to login
  if (loginForm && signupForm) {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'signup') {
      switchTab('signup');
    } else {
      switchTab('login');
    }
  }

  // Event Listeners
  if (loginBtn) loginBtn.addEventListener('click', showLoginForm);
  if (signupBtn) signupBtn.addEventListener('click', showSignupForm);
  if (closeAccount) closeAccount.addEventListener('click', closeModal);
  
  // Close button for auth modal
  const closeAuthModal = document.getElementById('closeAuthModal');
  if (closeAuthModal) {
    closeAuthModal.addEventListener('click', closeModal);
  }
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      if (currentUser) {
        openAccountSettings();
      } else {
        showLoginForm();
      }
    });
  }
  if (closeAccountSettings) {
    closeAccountSettings.addEventListener('click', closeAccountSettingsModal);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Clear only the session, keep the single-account record unless user deletes manually
      localStorage.removeItem('currentUser');
      currentUser = null;
      updateAuthUI();
      closeAccountSettingsModal();
      alert('ログアウトしました');
    });
  }
  
  // Form submission handlers with proper event prevention
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin(e);
    });
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSignup(e);
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === accountModal) {
      closeModal();
    }
    if (accountSettingsModal && e.target === accountSettingsModal) {
      closeAccountSettingsModal();
    }
  });
  
  // Close modal with escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (accountModal && accountModal.classList.contains('show')) {
        closeModal();
      }
      if (accountSettingsModal && accountSettingsModal.classList.contains('show')) {
        closeAccountSettingsModal();
      }
    }
  });

  // Initialize UI on first load
  updateAuthUI();

});
