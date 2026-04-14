// firebase-config-improved.js
// Firebase setup với cải tiến về bảo mật, error handling và performance
// Version: 2.0 - Improved

const FIREBASE_VERSION = "10.10.0";
const FIREBASE_SCRIPTS = [
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore-compat.js`
];

const firebaseConfig = {
    apiKey: "AIzaSyBqPxR04DI-8uPNReOQgQuZ1crR3FzY8y0",
    authDomain: "access-4-77f18.firebaseapp.com",
    projectId: "access-4-77f18",
    storageBucket: "access-4-77f18.firebasestorage.app",
    messagingSenderId: "615430719324",
    appId: "1:615430719324:web:2fb69452144b364ecba399",
    measurementId: "G-VQP92N12GZ"
};

/**
 * Toast Notification System
 */
class ToastNotification {
    static show(message, type = 'info', duration = 3000) {
        // Remove existing toasts of same type
        document.querySelectorAll(`.toast-${type}`).forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = `firebase-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    static getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
}

/**
 * Data Validator
 */
class DataValidator {
    static validate(storageKey, data) {
        const errors = [];
        
        // Check data type
        if (typeof data !== 'object' || data === null) {
            errors.push('Data must be an object');
        }
        
        // Check size (Firestore limit: 1MB per document)
        try {
            const size = new Blob([JSON.stringify(data)]).size;
            if (size > 1048576) { // 1MB
                errors.push(`Data too large: ${Math.round(size/1024)}KB (max 1MB)`);
            }
        } catch (e) {
            errors.push('Failed to calculate data size');
        }
        
        // Check required fields based on data type
        if (storageKey.includes('listening') || storageKey.includes('reading')) {
            if (!data.answers && !data.draft && !data.data) {
                errors.push('Missing answers, draft, or data field');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    static sanitize(data) {
        // Deep clone
        const sanitized = JSON.parse(JSON.stringify(data));
        
        const sanitizeValue = (val) => {
            if (typeof val === 'string') {
                return val
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .trim();
            }
            return val;
        };
        
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                } else {
                    obj[key] = sanitizeValue(obj[key]);
                }
            }
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }
}

/**
 * Firebase Error Handler
 */
class FirebaseErrorHandler {
    constructor(bridge) {
        this.bridge = bridge;
        this.retryQueue = [];
        this.maxRetries = 3;
        this.isProcessingQueue = false;
    }
    
    classifyError(error) {
        const temporaryErrors = [
            'unavailable',
            'deadline-exceeded',
            'resource-exhausted',
            'cancelled'
        ];
        
        const authErrors = [
            'unauthenticated',
            'permission-denied',
            'auth/user-token-expired',
            'auth/id-token-expired'
        ];
        
        const code = error.code || '';
        
        if (temporaryErrors.includes(code)) {
            return 'TEMPORARY';
        } else if (authErrors.includes(code) || code.startsWith('auth/')) {
            return 'AUTH';
        } else {
            return 'PERMANENT';
        }
    }
    
    async handleError(error, operation, data) {
        const errorType = this.classifyError(error);
        
        console.error('[FirebaseErrorHandler]', errorType, error);
        
        switch (errorType) {
            case 'TEMPORARY':
                this.addToRetryQueue(operation, data);
                ToastNotification.show(
                    'Lỗi kết nối. Sẽ tự động thử lại...', 
                    'warning', 
                    3000
                );
                break;
                
            case 'AUTH':
                ToastNotification.show(
                    'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 
                    'error', 
                    5000
                );
                // Optional: Tự động logout
                // await this.bridge.logout();
                break;
                
            case 'PERMANENT':
                const message = this.getErrorMessage(error);
                ToastNotification.show(message, 'error', 5000);
                break;
        }
    }
    
    getErrorMessage(error) {
        const messages = {
            'permission-denied': 'Không có quyền truy cập dữ liệu.',
            'not-found': 'Không tìm thấy dữ liệu.',
            'already-exists': 'Dữ liệu đã tồn tại.',
            'failed-precondition': 'Điều kiện không thỏa mãn.',
            'quota-exceeded': 'Vượt quá giới hạn lưu trữ.',
            'invalid-argument': 'Dữ liệu không hợp lệ.'
        };
        
        return messages[error.code] || `Lỗi: ${error.message}`;
    }
    
    addToRetryQueue(operation, data) {
        this.retryQueue.push({
            operation,
            data,
            attempts: 0,
            addedAt: Date.now()
        });
        
        if (!this.isProcessingQueue) {
            this.processRetryQueue();
        }
    }
    
    async processRetryQueue() {
        if (this.retryQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        this.isProcessingQueue = true;
        const item = this.retryQueue[0];
        
        if (item.attempts >= this.maxRetries) {
            this.retryQueue.shift();
            ToastNotification.show(
                'Không thể đồng bộ dữ liệu. Vui lòng thử lại sau.', 
                'error', 
                5000
            );
            this.processRetryQueue();
            return;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, item.attempts) * 1000;
        
        setTimeout(async () => {
            try {
                await item.operation(item.data);
                this.retryQueue.shift();
                ToastNotification.show('Đồng bộ thành công!', 'success');
                this.processRetryQueue();
            } catch (error) {
                item.attempts++;
                this.processRetryQueue();
            }
        }, delay);
    }
}

/**
 * Sync Status Indicator
 */
class SyncStatusIndicator {
    constructor() {
        this.element = null;
        this.state = 'synced';
        this.createIndicator();
    }
    
    createIndicator() {
        // Check if already exists
        if (document.getElementById('syncStatusIndicator')) {
            this.element = document.getElementById('syncStatusIndicator');
            return;
        }
        
        this.element = document.createElement('div');
        this.element.id = 'syncStatusIndicator';
        this.element.className = 'sync-status-indicator synced';
        this.element.innerHTML = `
            <span class="sync-icon">✓</span>
            <span class="sync-text">Đã đồng bộ</span>
        `;
        
        // Add to header if exists
        const header = document.querySelector('header .header-inner');
        if (header) {
            header.appendChild(this.element);
        } else {
            document.body.appendChild(this.element);
        }
    }
    
    setState(state, message) {
        if (!this.element) return;
        
        this.state = state;
        this.element.className = `sync-status-indicator ${state}`;
        
        const icons = {
            synced: '✓',
            syncing: '↻',
            error: '⚠',
            offline: '✗'
        };
        
        const defaultMessages = {
            synced: 'Đã đồng bộ',
            syncing: 'Đang đồng bộ...',
            error: 'Lỗi đồng bộ',
            offline: 'Không có mạng'
        };
        
        this.element.querySelector('.sync-icon').textContent = icons[state];
        this.element.querySelector('.sync-text').textContent = message || defaultMessages[state];
    }
}

/**
 * Enhanced FirebaseBridge với improvements
 */
class FirebaseBridge {
    constructor() {
        this.isLoaded = false;
        this.app = null;
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.initPromise = this.injectScripts();
        
        // New features
        this.errorHandler = new FirebaseErrorHandler(this);
        this.syncIndicator = new SyncStatusIndicator();
        this.syncQueue = new Map();
        this.syncTimer = null;
        this.SYNC_DELAY = 2000; // 2 seconds debounce
        this.BATCH_SIZE = 10;
        
        // Network status monitoring
        this.setupNetworkMonitoring();
    }

    async injectScripts() {
        if (window.firebase) {
            this.initializeFirebase();
            return;
        }

        for (const src of FIREBASE_SCRIPTS) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = false;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        this.initializeFirebase();
    }

    initializeFirebase() {
        if (!firebase.apps.length) {
            this.app = firebase.initializeApp(firebaseConfig);
        } else {
            this.app = firebase.app();
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        
        // Listen to auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                console.log(`[FirebaseBridge] ✓ Logged in as ${user.email || 'User'}`);
                this.syncIndicator.setState('synced');
                window.dispatchEvent(new CustomEvent('firebase:authChanged', { detail: { user } }));
            } else {
                console.log('[FirebaseBridge] User signed out');
                this.syncIndicator.setState('offline', 'Chưa đăng nhập');
                window.dispatchEvent(new CustomEvent('firebase:authChanged', { detail: { user: null } }));
            }
        });
        
        this.isLoaded = true;
        console.log('[FirebaseBridge] ✓ Initialized successfully');
        window.dispatchEvent(new Event('firebase:ready'));
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('[FirebaseBridge] ✓ Network online');
            this.syncIndicator.setState('synced');
            this.flushSyncQueue();
        });

        window.addEventListener('offline', () => {
            console.log('[FirebaseBridge] ✗ Network offline');
            this.syncIndicator.setState('offline');
        });
    }

    async loginWithGoogle() {
        await this.initPromise;
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await this.auth.signInWithPopup(provider);
            ToastNotification.show('Đăng nhập thành công!', 'success');
            return result.user;
        } catch (error) {
            console.error("Login failed:", error);
            await this.errorHandler.handleError(error, null, null);
            throw error;
        }
    }

    async loginWithEmail(email, password) {
        await this.initPromise;
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            ToastNotification.show('Đăng nhập thành công!', 'success');
            return result.user;
        } catch (error) {
            console.error("Email login failed:", error);
            await this.errorHandler.handleError(error, null, null);
            throw error;
        }
    }
    
    async registerWithEmail(email, password) {
        await this.initPromise;
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            ToastNotification.show('Đăng ký thành công!', 'success');
            return result.user;
        } catch (error) {
            console.error("Email registration failed:", error);
            await this.errorHandler.handleError(error, null, null);
            throw error;
        }
    }

    async logout() {
        await this.initPromise;
        await this.auth.signOut();
        ToastNotification.show('Đã đăng xuất', 'info');
    }

    /**
     * IMPROVED: Sync với debouncing, validation, và error handling
     */
    syncToCloud(storageKey, data, options = {}) {
        if (!this.currentUser) {
            if (options.showWarning) {
                ToastNotification.show(
                    'Bạn chưa đăng nhập. Dữ liệu chỉ được lưu cục bộ.', 
                    'warning', 
                    3000
                );
            }
            return Promise.resolve({ success: false, reason: 'not_authenticated' });
        }
        
        // Add to queue for debounced sync
        this.syncQueue.set(storageKey, { data, options, timestamp: Date.now() });
        
        // Debounce
        clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.flushSyncQueue();
        }, this.SYNC_DELAY);
        
        return Promise.resolve({ success: true, queued: true });
    }

    /**
     * IMPROVED: Batch sync với progress tracking
     */
    async flushSyncQueue() {
        if (this.syncQueue.size === 0) return;
        if (!this.currentUser) {
            this.syncQueue.clear();
            return;
        }

        this.syncIndicator.setState('syncing');
        
        const batch = this.db.batch();
        const entries = Array.from(this.syncQueue.entries());
        let validCount = 0;
        
        for (const [key, item] of entries) {
            // Validate
            const validation = DataValidator.validate(key, item.data);
            if (!validation.valid) {
                console.error(`[Validation] Failed for ${key}:`, validation.errors);
                continue;
            }
            
            // Sanitize
            const sanitizedData = DataValidator.sanitize(item.data);
            
            const docRef = this.db
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('progress')
                .doc(key);
            
            batch.set(docRef, {
                data: sanitizedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                version: 1
            }, { merge: true });
            
            validCount++;
        }

        try {
            await batch.commit();
            console.log(`[FirebaseBridge] ✅ Batch synced ${validCount} items`);
            this.syncIndicator.setState('synced');
            this.syncQueue.clear();
            return { success: true, count: validCount };
        } catch (e) {
            console.error('[FirebaseBridge] ❌ Batch sync failed', e);
            this.syncIndicator.setState('error');
            
            // Add to retry queue
            for (const [key, item] of entries) {
                this.errorHandler.addToRetryQueue(
                    (data) => this.syncToCloudImmediate(key, data.data),
                    item
                );
            }
            
            await this.errorHandler.handleError(e, null, null);
            return { success: false, error: e };
        }
    }

    /**
     * Immediate sync (bypass queue) - for critical operations
     */
    async syncToCloudImmediate(storageKey, data) {
        if (!this.currentUser) {
            return { success: false, reason: 'not_authenticated' };
        }
        
        await this.initPromise;
        
        // Validate
        const validation = DataValidator.validate(storageKey, data);
        if (!validation.valid) {
            console.error(`[Validation] Failed:`, validation.errors);
            return { success: false, errors: validation.errors };
        }
        
        // Sanitize
        const sanitizedData = DataValidator.sanitize(data);
        
        try {
            const docRef = this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('progress')
                .doc(storageKey);
                
            await docRef.set({
                data: sanitizedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                version: 1
            }, { merge: true });
            
            console.log(`[FirebaseBridge] ✅ Synced ${storageKey}`);
            return { success: true };
        } catch (e) {
            console.error('[FirebaseBridge] ❌ Failed to sync', e);
            await this.errorHandler.handleError(e, 
                () => this.syncToCloudImmediate(storageKey, data),
                { storageKey, data }
            );
            return { success: false, error: e };
        }
    }

    /**
     * IMPROVED: Download với merge strategy và progress callback
     */
    async downloadCloudData(options = { 
        merge: true, 
        onProgress: null,
        category: null 
    }) {
        if (!this.currentUser) {
            ToastNotification.show('Vui lòng đăng nhập để đồng bộ', 'warning');
            return { success: false, reason: 'not_authenticated' };
        }
        
        await this.initPromise;
        this.syncIndicator.setState('syncing', 'Đang tải...');
        
        try {
            let query = this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('progress');
            
            // Optional category filter
            if (options.category) {
                query = query.where('category', '==', options.category);
            }
            
            const snapshot = await query.get();
            
            let syncCount = 0;
            let mergeCount = 0;
            let overwriteCount = 0;
            const total = snapshot.size;
            
            snapshot.forEach((doc, index) => {
                const key = doc.id;
                const cloudValue = doc.data().data;
                const cloudTimestamp = doc.data().updatedAt?.toMillis() || 0;
                
                const localData = localStorage.getItem(key);
                
                if (localData && options.merge) {
                    try {
                        const localValue = JSON.parse(localData);
                        const localTimestamp = localValue.lastModified || 0;
                        
                        if (localTimestamp > cloudTimestamp) {
                            // Local is newer - keep local
                            console.log(`[Sync] ⏩ Skipped ${key} (local is newer)`);
                            mergeCount++;
                            
                            if (options.onProgress) {
                                options.onProgress(index + 1, total);
                            }
                            return;
                        }
                    } catch (e) {
                        // Failed to parse local data - overwrite
                    }
                }
                
                // Cloud data is newer or no local data
                localStorage.setItem(key, JSON.stringify(cloudValue));
                overwriteCount++;
                syncCount++;
                
                if (options.onProgress) {
                    options.onProgress(index + 1, total);
                }
            });
            
            console.log(`[FirebaseBridge] ✅ Downloaded ${syncCount} records (${mergeCount} merged, ${overwriteCount} overwritten)`);
            this.syncIndicator.setState('synced');
            
            ToastNotification.show(
                `Đã đồng bộ ${syncCount} mục thành công!`, 
                'success'
            );
            
            return { 
                success: true, 
                total: syncCount,
                merged: mergeCount,
                overwritten: overwriteCount
            };
        } catch (e) {
            console.error('[FirebaseBridge] ❌ Failed to download', e);
            this.syncIndicator.setState('error');
            await this.errorHandler.handleError(e, null, null);
            return { 
                success: false, 
                error: e.code, 
                message: e.message 
            };
        }
    }
}

// Inject CSS cho Toast và Sync Status
const style = document.createElement('style');
style.textContent = `
/* Toast Notifications */
.firebase-toast {
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 14px 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateX(400px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 14px;
    max-width: 350px;
}

.firebase-toast.show {
    transform: translateX(0);
}

.firebase-toast.toast-success { border-left: 4px solid #10b981; }
.firebase-toast.toast-error { border-left: 4px solid #ef4444; }
.firebase-toast.toast-warning { border-left: 4px solid #f59e0b; }
.firebase-toast.toast-info { border-left: 4px solid #3b82f6; }

.toast-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.toast-icon {
    font-size: 18px;
    font-weight: bold;
}

.toast-success .toast-icon { color: #10b981; }
.toast-error .toast-icon { color: #ef4444; }
.toast-warning .toast-icon { color: #f59e0b; }
.toast-info .toast-icon { color: #3b82f6; }

/* Sync Status Indicator */
.sync-status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.sync-status-indicator.synced {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.sync-status-indicator.syncing {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.sync-status-indicator.syncing .sync-icon {
    animation: spin 1s linear infinite;
}

.sync-status-indicator.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.sync-status-indicator.offline {
    background: rgba(148, 163, 184, 0.1);
    color: #94a3b8;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Dark mode support */
[data-theme="dark"] .firebase-toast {
    background: #1e293b;
    color: #f1f5f9;
}
`;
document.head.appendChild(style);

// Global Export
window.firebaseBridge = new FirebaseBridge();

console.log('[firebase-config-improved.js] ✅ Loaded successfully');
