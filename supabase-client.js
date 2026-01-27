/**
 * Supabase Client Configuration
 * Formulation Pro - Database Integration
 */

(function () {
    // Supabase Configuration
    const SUPABASE_URL = 'https://qhsvwrzosxjxeqzudkdi.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoc3Z3cnpvc3hqeGVxenVka2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjQ3NzUsImV4cCI6MjA4NDY0MDc3NX0.DmSHj2GzjxnwUdK607sZdWFo3l6I9Ttc_jJGvD7Carg';

    // Initialize Supabase client
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /**
     * Helper function to handle Supabase errors
     * @param {Object} error - Supabase error object
     * @param {string} context - Context where error occurred
     */
    function handleSupabaseError(error, context = '') {
        // Silently skip AbortErrors as they are expected during concurrent calls/navigation
        if (error && (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('signal'))) {
            return null;
        }

        console.error(`Supabase Error ${context}:`, error);

        // User-friendly error messages
        const errorMessages = {
            'Invalid login credentials': 'Invalid email or password. Please try again.',
            'User already registered': 'This email is already registered. Please sign in instead.',
            'Email not confirmed': 'Please confirm your email address before signing in.',
            'Invalid email': 'Please enter a valid email address.',
            'Password should be at least 6 characters': 'Password must be at least 6 characters long.'
        };

        const message = errorMessages[error.message] || error.message || 'An unexpected error occurred. Please try again.';
        return message;
    }

    /**
     * Show notification to user
     * @param {string} message - Message to display
     * @param {string} type - Type of notification (success, error, info)
     */
    function showNotification(message, type = 'info') {
        if (!message) return; // Silent if no message (suppressed errors)

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Add animation styles to document
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    let currentUserPromise = null;

    /**
     * Get current user session with transient error retry
     * Caches the promise to prevent concurrent duplicate calls and AbortErrors
     * @returns {Promise<Object|null>} User session or null
     */
    async function getCurrentUser(retries = 2) {
        // If a request is already in progress, return the existing promise
        if (currentUserPromise) return currentUserPromise;

        currentUserPromise = (async () => {
            for (let i = 0; i <= retries; i++) {
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();

                    if (error) {
                        // Log the error but retry if it looks like a network/maintenance issue
                        if (error.status === 503 || error.status === 502 || error.message.includes('fetch')) {
                            SessionDebugger.log(`Heartbeat Warning: Transient Error (Attempt ${i + 1})`, 'warning', error);
                            if (i < retries) {
                                await new Promise(r => setTimeout(r, 1500 * (i + 1)));
                                continue;
                            }
                        }
                        throw error;
                    }

                    return session?.user || null;
                } catch (error) {
                    // Gracefully handle abort errors which happen during rapid navigation/re-loading
                    if (error.name === 'AbortError') {
                        console.warn('Auth check aborted (likely concurrent call or navigation)');
                        return null;
                    }

                    console.error('Error getting current user:', error);
                    if (i === retries) return null;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            return null;
        })();

        try {
            const user = await currentUserPromise;
            return user;
        } finally {
            // Clear the promise after it resolves so subsequent calls refresh if needed
            // But keep it for a short window to debounce very rapid calls
            setTimeout(() => { currentUserPromise = null; }, 500);
        }
    }

    /**
     * Get user profile with role
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User profile or null
     */
    async function getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated, redirect to login if not
     * Includes a safety wait for session recovery
     * @param {string} redirectUrl - URL to redirect to after login
     */
    async function requireAuth(redirectUrl = null) {
        SessionDebugger.log('Security Probe: Validating session...', 'info');

        let user = await getCurrentUser(3); // Be patient during maintenance

        if (!user) {
            // Check if we arguably SHOULD have a session (looking at storage)
            const storageKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
            if (localStorage.getItem(storageKey)) {
                SessionDebugger.log('Session cache found, waiting for database heartbeat...', 'warning');
                await new Promise(r => setTimeout(r, 2500));
                user = await getCurrentUser(1);
            }
        }

        if (!user) {
            SessionDebugger.log('Security Kick: Session invalid or unreachable', 'error');
            const redirect = redirectUrl || window.location.pathname;
            window.location.href = `login.html?redirect=${encodeURIComponent(redirect)}`;
            return false;
        }

        SessionDebugger.log('Security Check: Passed', 'success');
        return true;
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    /**
     * Format timestamp for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted timestamp
     */
    function formatTimestamp(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Session Debugging Utility
     * Stores logs in localStorage to survive auto-logout redirects
     */
    const SessionDebugger = {
        logs: JSON.parse(localStorage.getItem('antigravity_auth_logs') || '[]'),

        log(message, type = 'info', data = null) {
            const entry = {
                timestamp: new Date().toISOString(),
                page: window.location.pathname.split('/').pop() || 'index.html',
                message,
                type,
                data: data ? JSON.parse(JSON.stringify(data)) : null
            };

            console.log(`[AUTH-DEBUG] ${message}`, data || '');
            this.logs.unshift(entry);

            // Keep last 150 logs for deep history
            if (this.logs.length > 150) this.logs.pop();

            localStorage.setItem('antigravity_auth_logs', JSON.stringify(this.logs));

            // Dispatch event for visual update
            window.dispatchEvent(new CustomEvent('auth-debug-update', { detail: entry }));
        },

        getLogs() {
            return this.logs;
        },

        clear() {
            this.logs = [];
            localStorage.removeItem('antigravity_auth_logs');
            window.dispatchEvent(new CustomEvent('auth-debug-update'));
        }
    };

    /**
     * Visual Debug Console UI
     */
    function createAuthDebugConsole() {
        if (document.getElementById('auth-debug-console')) return;

        const container = document.createElement('div');
        container.id = 'auth-debug-console';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 380px;
            max-height: 450px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #ff4444;
            border-radius: 12px;
            color: #00ff00;
            font-family: 'Consolas', monospace;
            font-size: 11px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
            transition: all 0.3s ease;
        `;

        container.innerHTML = `
            <div style="background: #1a1a1a; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; cursor: grab;" id="debug-header">
                <span style="font-weight: 900; color: #ff4444; letter-spacing: 1px;">🛡️ SESSION DEBUGGER</span>
                <div style="display: flex; gap: 8px;">
                    <button id="clear-debug" style="background: #333; border: none; color: #eee; font-size: 10px; padding: 4px 8px; cursor: pointer; border-radius: 4px;">Clear</button>
                    <button id="min-max-debug" style="background: #333; border: none; color: #eee; font-size: 10px; padding: 4px 10px; cursor: pointer; border-radius: 4px;">_</button>
                </div>
            </div>
            <div id="debug-logs" style="padding: 12px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; background: #050505;">
            </div>
            <div style="padding: 8px; background: #111; border-top: 1px solid #222; text-align: center;">
                <span style="color: #666; font-size: 9px;">Tracking auth state changes & redirect loops</span>
            </div>
        `;

        document.body.appendChild(container);

        const logsEl = document.getElementById('debug-logs');
        const clearBtn = document.getElementById('clear-debug');
        const minBtn = document.getElementById('min-max-debug');

        const render = () => {
            const history = SessionDebugger.getLogs();
            logsEl.innerHTML = history.length ? history.map(l => `
                <div style="border-left: 3px solid ${l.type === 'error' ? '#ff4444' : l.type === 'warning' ? '#ffbb00' : l.type === 'success' ? '#00ff00' : '#44bbff'}; padding: 4px 8px; background: rgba(255,255,255,0.02); border-radius: 0 4px 4px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: #44bbff; font-weight: bold;">[${l.page}]</span>
                        <span style="color: #555; white-space: nowrap;">${l.timestamp.split('T')[1].split('.')[0]}</span>
                    </div>
                    <div style="color: ${l.type === 'error' ? '#ff4444' : '#fff'}; font-size: 11px;">${l.message}</div>
                    ${l.data ? `<pre style="margin: 4px 0 0 0; color: #888; font-size: 9px; overflow-x: auto; background: #000; padding: 4px; border-radius: 2px;">${JSON.stringify(l.data, null, 2)}</pre>` : ''}
                </div>
            `).join('') : '<div style="color: #333; text-align: center; margin-top: 20px;">No logs captured yet</div>';
        };

        window.addEventListener('auth-debug-update', render);
        clearBtn.addEventListener('click', () => SessionDebugger.clear());

        let isMinimized = false;
        minBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            logsEl.parentElement.style.height = isMinimized ? '45px' : '450px';
            logsEl.style.display = isMinimized ? 'none' : 'flex';
            container.style.width = isMinimized ? '220px' : '380px';
            minBtn.textContent = isMinimized ? '□' : '_';
        });

        render();
    }

    // Initialize UI on all pages
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createAuthDebugConsole);
    } else {
        createAuthDebugConsole();
    }

    // Auto-log page initialization
    SessionDebugger.log('Session Initialization Started', 'info', {
        url: window.location.href,
        storage: {
            hasToken: !!localStorage.getItem('supabase.auth.token'),
            hasSession: !!localStorage.getItem('sb-qhsvwrzosxjxeqzudkdi-auth-token')
        }
    });

    // Auto-log page load
    SessionDebugger.log('Page Loaded', 'info', {
        url: window.location.href,
        referrer: document.referrer
    });

    // Export for use in other modules
    window.supabaseClient = {
        supabase,
        handleSupabaseError,
        showNotification,
        getCurrentUser,
        getUserProfile,
        requireAuth,
        formatDate,
        formatTimestamp,
        debug: SessionDebugger // Add debugger to public API
    };
})();
