/**
 * Authentication Module
 * Formulation Pro - User Authentication & Authorization
 */

async function signUp(email, password, fullName, code) {
    try {
        window.supabaseClient.debug.log('SignUp Attempt', 'info', { email, fullName, code });
        // DERIVE ROLE FROM CODE
        const assignedRole = await window.dbOperations.getRoleByRegistrationCode(code);
        window.supabaseClient.debug.log('Code Validation Result', 'info', { assignedRole });

        if (!assignedRole) {
            throw new Error('Invalid Unique Code. Registration denied.');
        }

        // Create auth user
        const { data: authData, error: authError } = await window.supabaseClient.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: assignedRole
                }
            }
        });

        if (authError) throw authError;

        window.supabaseClient.debug.log('Auth SignUp Success', 'success', { userId: authData.user?.id });
        window.supabaseClient.showNotification('Account created successfully! Please check your email to confirm.', 'success');

        return { success: true, data: authData };
    } catch (error) {
        window.supabaseClient.debug.log('SignUp Error', 'error', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'during sign up');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Sign in user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object with success status and data/error
 */
async function signIn(email, password) {
    try {
        window.supabaseClient.debug.log('SignIn Attempt', 'info', { email });
        const { data, error } = await window.supabaseClient.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        window.supabaseClient.debug.log('Auth SignIn Success', 'success', { userId: data.user?.id });
        window.supabaseClient.showNotification('Signed in successfully!', 'success');

        return { success: true, data };
    } catch (error) {
        window.supabaseClient.debug.log('SignIn Error', 'error', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'during sign in');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Sign in with Google (OAuth)
 * @returns {Promise<Object>} Result object with success status
 */
async function signInWithGoogle() {
    try {
        window.supabaseClient.debug.log('Google Auth Attempt', 'info');
        const { data, error } = await window.supabaseClient.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/login.html`
            }
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        window.supabaseClient.debug.log('Google Auth Error', 'error', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'during Google sign in');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}


let isSigningOut = false;

/**
 * Sign out user
 * @returns {Promise<Object>} Result object with success status
 */
async function signOut() {
    if (isSigningOut) return { success: true };
    isSigningOut = true;

    try {
        window.supabaseClient.debug.log('SignOut: Initiating forced termination', 'warning');

        // 1. Mark logout state to prevent auto-login redirects
        localStorage.setItem('antigravity_logout_pending', 'true');

        // 2. Attempt clean API signout with a fast timeout (3s)
        const signOutPromise = window.supabaseClient.supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Signout API Timeout')), 3000));

        await Promise.race([signOutPromise, timeoutPromise]).catch(err => {
            window.supabaseClient.debug.log('SignOut: API failed or timed out. Proceeding with local purge.', 'warning');
        });

        window.supabaseClient.showNotification('Signed out successfully!', 'success');

    } catch (error) {
        window.supabaseClient.debug.log('SignOut: Execution context error', 'info', error);
    } finally {
        // 3. BRUTE FORCE PURGE: Clear ALL Supabase and Auth tokens
        window.supabaseClient.debug.log('SignOut: Purging localStorage tokens...', 'info');

        Object.keys(localStorage).forEach(key => {
            if (key.includes('auth-token') || key.includes('supabase.auth') || key.includes('sb-')) {
                localStorage.removeItem(key);
            }
        });

        isSigningOut = false;
        window.supabaseClient.debug.log('SignOut: Session destroyed. Redirecting...', 'success');

        // Redirect immediately to break the loop
        window.location.href = 'login.html';

        // Remove the pending flag after a delay to allow login.html to see it
        setTimeout(() => localStorage.removeItem('antigravity_logout_pending'), 2000);

        return { success: true };
    }
}

/**
 * Reset password
 * @param {string} email - User email
 * @returns {Promise<Object>} Result object with success status
 */
async function resetPassword(email) {
    try {
        window.supabaseClient.debug.log('Password Reset Requested', 'info', { email });
        const { error } = await window.supabaseClient.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) throw error;

        window.supabaseClient.showNotification('Password reset email sent! Please check your inbox.', 'success');

        return { success: true };
    } catch (error) {
        window.supabaseClient.debug.log('Password Reset Error', 'error', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'during password reset');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Result object with success status
 */
async function updatePassword(newPassword) {
    try {
        window.supabaseClient.debug.log('Password Update Attempt', 'info');
        const { error } = await window.supabaseClient.supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        window.supabaseClient.debug.log('Password Update Success', 'success');
        window.supabaseClient.showNotification('Password updated successfully!', 'success');

        return { success: true };
    } catch (error) {
        window.supabaseClient.debug.log('Password Update Error', 'error', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'during password update');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Result object with success status
 */
async function updateProfile(userId, updates) {
    try {
        window.supabaseClient.debug.log('Profile Update Attempt', 'info', { userId, updates });
        const { data, error } = await window.supabaseClient.supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        window.supabaseClient.debug.log('Profile Update Success', 'success');
        window.supabaseClient.showNotification('Profile updated successfully!', 'success');

        return { success: true, data };
    } catch (error) {
        window.supabaseClient.debug.log('Profile Update Error', 'error', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'during profile update');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

let handshakePromise = null;

/**
 * Get current user with profile
 * Highly resilient, atomic handshake that caches concurrent attempts
 * @returns {Promise<Object|null>} User with profile or null
 */
async function getCurrentUserWithProfile() {
    if (handshakePromise) return handshakePromise;

    handshakePromise = (async () => {
        try {
            window.supabaseClient.debug.log('Auth Handshake Started', 'info');
            const user = await window.supabaseClient.getCurrentUser(3); // Retry on infrastructure blips

            if (!user) {
                window.supabaseClient.debug.log('Handshake Terminated: No user session', 'warning');
                return null;
            }

            window.supabaseClient.debug.log('Active session found', 'info', { id: user.id });

            let profile = await window.supabaseClient.getUserProfile(user.id);

            // If no profile exists (or race condition), attempt atomic sync
            if (!profile) {
                window.supabaseClient.debug.log('System Profile Missing - Synchronizing...', 'info');
                const metadata = user.user_metadata || {};

                // Always use UPSERT to handle multiple concurrent script initializations
                const { data: syncedProfile, error: syncError } = await window.supabaseClient.supabase
                    .from('profiles')
                    .upsert([{
                        id: user.id,
                        email: user.email,
                        full_name: metadata.full_name || metadata.name || 'New User',
                        role: metadata.role || 'formulator',
                        is_active: false // GOOGLE SECURITY FIX: Default to inactive for new social logins
                    }], { onConflict: 'id' })
                    .select()
                    .single();

                if (syncError) {
                    window.supabaseClient.debug.log('Profile Sync Loop Warning', 'warning', syncError);
                    // Last ditch effort to read it
                    profile = await window.supabaseClient.getUserProfile(user.id);
                } else {
                    window.supabaseClient.debug.log('Profile Synced Successfully', 'success');
                    profile = syncedProfile;
                }
            }

            // SAFETY FALLBACK: Use User Metadata with Restricted Access
            if (!profile) {
                window.supabaseClient.debug.log('Emergency Profile: Restricting access by default', 'warning');
                const meta = user.user_metadata || {};
                profile = {
                    id: user.id,
                    email: user.email,
                    full_name: meta.full_name || meta.name || 'User',
                    role: meta.role || 'formulator',
                    is_active: false // Security fallback
                };
            }

            // Merge metadata for Google Users
            const metadata = user.user_metadata || {};
            const mergedProfile = {
                ...profile,
                is_active: profile.is_active ?? true,
                role: profile.role || metadata.role || 'formulator',
                full_name: profile.full_name || metadata.full_name || metadata.name || 'User',
                avatar_url: profile.avatar_url || metadata.avatar_url || metadata.picture,
                email: profile.email || user.email
            };

            window.supabaseClient.debug.log('Handshake Resolved', 'success', {
                role: mergedProfile.role,
                is_active: mergedProfile.is_active
            });

            // KICK GUARD: Redirect to Inactive Page if Administrative Lock is active
            if (mergedProfile.is_active === false && !window.location.href.includes('inactive.html')) {
                window.supabaseClient.debug.log('SESSION RESTRICTED: Redirecting to Landing Page', 'error');
                window.location.href = 'inactive.html';
                return null;
            }

            return {
                ...user,
                profile: mergedProfile
            };
        } catch (error) {
            window.supabaseClient.debug.log('Handshake Critical Error', 'error', error);
            console.error('Critical auth failure:', error);
            return null;
        }
    })();

    try {
        return await handshakePromise;
    } finally {
        // Shared window for debouncing concurrent callers during init
        setTimeout(() => { handshakePromise = null; }, 2000);
    }
}

/**
 * Check if user has specific role
 * @param {string} requiredRole - Required role (boss or formulator)
 * @returns {Promise<boolean>} True if user has role
 */
async function hasRole(requiredRole) {
    try {
        const user = await window.supabaseClient.getCurrentUser();
        if (!user) return false;

        const profile = await window.supabaseClient.getUserProfile(user.id);
        return profile?.role === requiredRole;
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}

/**
 * Initialize auth state listener
 * Updates UI based on auth state changes
 */
function initAuthListener() {
    window.supabaseClient.supabase.auth.onAuthStateChange((event, session) => {
        window.supabaseClient.debug.log('Supabase Auth Event', 'info', { event });
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN') {
            window.supabaseClient.debug.log('User signed in', 'success', session?.user?.id);
        } else if (event === 'SIGNED_OUT') {
            window.supabaseClient.debug.log('User signed out', 'warning');
        } else if (event === 'TOKEN_REFRESHED') {
            window.supabaseClient.debug.log('Token refreshed', 'info');
        } else if (event === 'USER_UPDATED') {
            window.supabaseClient.debug.log('User updated', 'info');
        }
    });
}

// Initialize auth listener on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthListener);
} else {
    initAuthListener();
}

// Export auth functions
window.auth = {
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    getCurrentUserWithProfile,
    hasRole,
    initAuthListener
};
