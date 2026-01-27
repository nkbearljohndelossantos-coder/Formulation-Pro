/**
 * Database Operations Module
 * Formulation Pro - CRUD Operations for Formulations and Requests
 */

/**
 * Toggle user account activation status
 * @param {string} userId - User ID
 * @param {boolean} isActive - New activation status
 * @returns {Promise<Object>} Result with success status
 */
async function toggleUserProfileActivation(userId, isActive) {
    try {
        const { data, error } = await window.supabaseClient.supabase
            .from('profiles')
            .update({ is_active: isActive })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        const status = isActive ? 'activated' : 'deactivated';
        window.supabaseClient.showNotification(`User account ${status} successfully!`, 'success');
        return { success: true, data };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'updating activation status');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

// =====================================================
// SYSTEM SETTINGS
// =====================================================

// =====================================================
// FORMULATION OPERATIONS
// =====================================================

/**
 * Create new formulation
 * @param {Object} formulation - Formulation data
 * @param {Array} ingredients - Array of ingredients
 * @param {Array} existingIngredients - Array of existing ingredients (optional)
 * @returns {Promise<Object>} Result with success status and data/error
 */
async function createFormulation(formulation, ingredients, existingIngredients = []) {
    try {
        const user = await window.supabaseClient.getCurrentUser();
        console.log('Current user status:', user);
        if (!user) throw new Error('User not authenticated - Please Sign In first');

        // Insert formulation
        const { data: formulationData, error: formulationError } = await window.supabaseClient.supabase
            .from('formulations')
            .insert([{
                user_id: user.id,
                type: formulation.type,
                lot_number: formulation.lot_number,
                customer: formulation.customer,
                product_name: formulation.product_name,
                total_weight: formulation.total_weight,
                bottle_type: formulation.bottle_type,
                bottle_qty: formulation.bottle_qty,
                status: formulation.status || 'draft',
                version: formulation.version || 'V1.0',
                notes: formulation.notes
            }])
            .select()
            .single();

        if (formulationError) throw formulationError;

        // Insert ingredients
        if (ingredients && ingredients.length > 0) {
            const ingredientsToInsert = ingredients.map((ing, index) => ({
                formulation_id: formulationData.id,
                ingredient_name: ing.ingredient_name || '',
                percentage: ing.percentage || 0,
                calculated_weight: ing.calculated_weight || 0,
                phase: ing.phase || null,
                is_label: ing.is_label || false,
                label_text: ing.label_text || null,
                decimal_places: ing.decimal_places || 2,
                rounding_mode: ing.rounding_mode || 'round',
                sort_order: index
            }));

            const { error: ingredientsError } = await window.supabaseClient.supabase
                .from('formulation_ingredients')
                .insert(ingredientsToInsert);

            if (ingredientsError) throw ingredientsError;
        }

        // Insert existing ingredients if any
        if (existingIngredients && existingIngredients.length > 0) {
            const existingToInsert = existingIngredients.map(ing => ({
                formulation_id: formulationData.id,
                ingredient_name: ing.ingredient_name,
                existing_weight: ing.existing_weight
            }));

            const { error: existingError } = await window.supabaseClient.supabase
                .from('existing_ingredients')
                .insert(existingToInsert);

            if (existingError) throw existingError;
        }

        window.supabaseClient.showNotification('Formulation submitted successfully!', 'success');
        return { success: true, data: formulationData };
    } catch (error) {
        console.error('FULL DATABASE ERROR:', error);
        const message = window.supabaseClient.handleSupabaseError(error, 'creating formulation');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Get formulation by ID with ingredients
 * @param {string} formulationId - Formulation ID
 * @returns {Promise<Object|null>} Formulation with ingredients or null
 */
async function getFormulation(formulationId) {
    try {
        // Get formulation
        const { data: formulation, error: formulationError } = await window.supabaseClient.supabase
            .from('formulations')
            .select('*')
            .eq('id', formulationId)
            .single();

        if (formulationError) throw formulationError;

        // Get ingredients
        const { data: ingredients, error: ingredientsError } = await window.supabaseClient.supabase
            .from('formulation_ingredients')
            .select('*')
            .eq('formulation_id', formulationId)
            .order('sort_order');

        if (ingredientsError) throw ingredientsError;

        // Get existing ingredients
        const { data: existingIngredients, error: existingError } = await window.supabaseClient.supabase
            .from('existing_ingredients')
            .select('*')
            .eq('formulation_id', formulationId);

        if (existingError) throw existingError;

        return {
            ...formulation,
            ingredients,
            existing_ingredients: existingIngredients
        };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'getting formulation');
        if (message) window.supabaseClient.showNotification(message, 'error');
        return null;
    }
}

// Cache to prevent duplicate concurrent requests
const listFormulationsPromises = new Map();

/**
 * List formulations with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of formulations
 */
async function listFormulations(filters = {}) {
    const filterKey = JSON.stringify(filters);

    if (listFormulationsPromises.has(filterKey)) {
        return listFormulationsPromises.get(filterKey);
    }

    const fetchPromise = (async () => {
        try {
            let query = window.supabaseClient.supabase
                .from('formulations')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.user_id) {
                query = query.eq('user_id', filters.user_id);
            }
            if (filters.search) {
                query = query.or(`lot_number.ilike.%${filters.search}%,customer.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            const message = window.supabaseClient.handleSupabaseError(error, 'listing formulations');
            if (message) window.supabaseClient.showNotification(message, 'error');
            return [];
        } finally {
            // Clear cache after a short window to prevent stale data while debouncing
            setTimeout(() => listFormulationsPromises.delete(filterKey), 1000);
        }
    })();

    listFormulationsPromises.set(filterKey, fetchPromise);
    return fetchPromise;
}

/**
 * Update formulation
 * @param {string} formulationId - Formulation ID
 * @param {Object} updates - Updates to apply
 * @param {Array} ingredients - Updated ingredients (optional)
 * @returns {Promise<Object>} Result with success status
 */
async function updateFormulation(formulationId, updates, ingredients = null) {
    try {
        // Update formulation
        const { data, error: updateError } = await window.supabaseClient.supabase
            .from('formulations')
            .update(updates)
            .eq('id', formulationId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Update ingredients if provided
        if (ingredients !== null) {
            // Delete existing ingredients
            const { error: deleteError } = await window.supabaseClient.supabase
                .from('formulation_ingredients')
                .delete()
                .eq('formulation_id', formulationId);

            if (deleteError) throw deleteError;

            // Insert new ingredients
            if (ingredients.length > 0) {
                const ingredientsToInsert = ingredients.map((ing, index) => ({
                    formulation_id: formulationId,
                    ingredient_name: ing.ingredient_name || '',
                    percentage: ing.percentage || 0,
                    calculated_weight: ing.calculated_weight || 0,
                    phase: ing.phase || null,
                    is_label: ing.is_label || false,
                    label_text: ing.label_text || null,
                    decimal_places: ing.decimal_places || 2,
                    rounding_mode: ing.rounding_mode || 'round',
                    sort_order: index
                }));

                const { error: insertError } = await window.supabaseClient.supabase
                    .from('formulation_ingredients')
                    .insert(ingredientsToInsert);

                if (insertError) throw insertError;
            }
        }

        window.supabaseClient.showNotification('Formulation updated and submitted successfully!', 'success');
        return { success: true, data };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'updating formulation');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Complete production task (Compounding)
 * @param {string} formulationId - Formulation ID
 * @returns {Promise<Object>} Result with success status
 */
async function completeProductionTask(formulationId) {
    try {
        const { data, error } = await window.supabaseClient.supabase
            .from('formulations')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', formulationId)
            .select()
            .single();

        if (error) throw error;

        window.supabaseClient.showNotification('Production task completed and timestamped!', 'success');
        return { success: true, data };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'completing production task');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Delete formulation
 * @param {string} formulationId - Formulation ID
 * @returns {Promise<Object>} Result with success status
 */
async function deleteFormulation(formulationId) {
    try {
        const { error } = await window.supabaseClient.supabase
            .from('formulations')
            .delete()
            .eq('id', formulationId);

        if (error) throw error;

        window.supabaseClient.showNotification('Formulation deleted successfully!', 'success');
        return { success: true };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'deleting formulation');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

// =====================================================
// BOSS REQUEST OPERATIONS
// =====================================================

/**
 * Create boss request
 * @param {Object} request - Request data
 * @returns {Promise<Object>} Result with success status
 */
async function createBossRequest(request) {
    try {
        const user = await window.supabaseClient.getCurrentUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await window.supabaseClient.supabase
            .from('boss_requests')
            .insert([{
                boss_id: user.id,
                type: request.type,
                product_name: request.product_name,
                customer: request.customer,
                target_weight: request.target_weight,
                priority: request.priority || 'medium',
                deadline: request.deadline,
                specifications: request.specifications,
                formulator_id: request.formulator_id || null,
                attachments: request.attachments || []
            }])
            .select()
            .single();

        if (error) throw error;

        window.supabaseClient.showNotification('Request submitted successfully!', 'success');
        return { success: true, data };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'creating request');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * List boss requests
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of requests
 */
async function listBossRequests(filters = {}) {
    try {
        let query = window.supabaseClient.supabase
            .from('boss_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.boss_id) {
            query = query.eq('boss_id', filters.boss_id);
        }
        if (filters.formulator_id) {
            query = query.eq('formulator_id', filters.formulator_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error listing boss requests:', error);
        return [];
    }
}

/**
 * Update boss request status
 * @param {string} requestId - Request ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Result with success status
 */
async function updateBossRequestStatus(requestId, status) {
    try {
        const { data, error } = await window.supabaseClient.supabase
            .from('boss_requests')
            .update({ status })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;

        window.supabaseClient.showNotification('Request status updated!', 'success');
        return { success: true, data };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'updating request');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

// =====================================================
// STATISTICS & DASHBOARD
// =====================================================

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getDashboardStats() {
    try {
        // Get formulation counts
        const { data: formulations, error: formError } = await window.supabaseClient.supabase
            .from('formulations')
            .select('status');

        if (formError) throw formError;

        const stats = {
            total: formulations.length,
            approved: formulations.filter(f => f.status === 'approved').length,
            draft: formulations.filter(f => f.status === 'draft').length,
            pending: formulations.filter(f => f.status === 'pending').length,
            obsolete: formulations.filter(f => f.status === 'obsolete').length
        };

        return stats;
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return { total: 0, approved: 0, draft: 0, pending: 0, obsolete: 0 };
    }
}

// =====================================================
// PROFILE & USER MANAGEMENT
// =====================================================

/**
 * List all user profiles (Admin only)
 * @returns {Promise<Array>} Array of user profiles
 */
async function listAllProfiles() {
    try {
        const { data, error } = await window.supabaseClient.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error listing profiles:', error);
        return [];
    }
}

/**
 * Update user profile role
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Promise<Object>} Result with success status
 */
async function updateUserProfileRole(userId, role) {
    try {
        const { data, error } = await window.supabaseClient.supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        window.supabaseClient.showNotification('User role updated successfully!', 'success');
        return { success: true, data };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'updating user role');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}

/**
 * Get registration codes for all roles
 * @returns {Promise<Object>} Map of role to code
 */
async function getAllRegistrationCodes() {
    try {
        const { data, error } = await window.supabaseClient.supabase
            .from('system_settings')
            .select('key, value')
            .like('key', 'reg_code_%');

        if (error) throw error;

        const codes = {};
        data.forEach(item => {
            const role = item.key.replace('reg_code_', '');
            codes[role] = item.value;
        });
        return codes;
    } catch (error) {
        console.error('Error getting registration codes:', error);
        return {};
    }
}

/**
 * Find which role matches the provided code (Secure RPC)
 * @param {string} code - The code to check
 * @returns {Promise<string|null>} Role name or null if invalid
 */
async function getRoleByRegistrationCode(code) {
    try {
        // Use RPC to bypass RLS for unauthenticated users during signup
        const { data, error } = await window.supabaseClient.supabase
            .rpc('validate_registration_code', { input_code: code });

        if (error) {
            console.error('RPC Error checking registration code:', error);
            return null;
        }

        return data; // Returns role string or null
    } catch (error) {
        console.error('Catch error checking registration code:', error);
        return null;
    }
}

/**
 * Update the registration code for a specific role
 * @param {string} role - Role name
 * @param {string} newCode - New code
 * @returns {Promise<Object>} Success status
 */
async function updateRoleRegistrationCode(role, newCode) {
    try {
        const { error } = await window.supabaseClient.supabase
            .from('system_settings')
            .upsert({
                key: `reg_code_${role}`,
                value: newCode,
                updated_at: new Object().toISOString ? new Date().toISOString() : new Date()
            });

        if (error) throw error;
        window.supabaseClient.showNotification(`${role.toUpperCase()} code updated!`, 'success');
        return { success: true };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'updating role code');
        window.supabaseClient.showNotification(message, 'error');
        return { success: false, error: message };
    }
}



/**
 * Upload multiple files to window.supabaseClient.supabase Storage
 * @param {FileList|Array} files - Files to upload
 * @param {string} bucket - Bucket name
 * @param {string} folder - Folder path (e.g., 'requests/ID')
 * @returns {Promise<Array>} Array of public URLs
 */
async function uploadFiles(files, bucket = 'attachments', folder = '') {
    if (!files || files.length === 0) return [];

    const uploadPromises = Array.from(files).map(async (file) => {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        const { data, error } = await window.supabaseClient.supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) {
            console.error('Error uploading file:', file.name, error);
            throw error;
        }

        const { data: { publicUrl } } = window.supabaseClient.supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    });

    return Promise.all(uploadPromises);
}

/**
 * Export data to CSV and trigger download
 * @param {string} filename - Output filename
 * @param {Array} rows - Array of objects or arrays
 * @param {Array} headers - Optional column headers
 */
function exportToCSV(filename, rows, headers = null) {
    let csvContent = "data:text/csv;charset=utf-8,";

    if (headers) {
        csvContent += headers.join(",") + "\r\n";
    }

    rows.forEach(row => {
        const values = Array.isArray(row) ? row : Object.values(row);
        const escapedValues = values.map(v => {
            const str = String(v).replace(/"/g, '""');
            return `"${str}"`;
        });
        csvContent += escapedValues.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =====================================================
// NOTIFICATION OPERATIONS
// =====================================================

/**
 * List user notifications
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of notifications
 */
async function listNotifications(limit = 20) {
    try {
        const user = await window.supabaseClient.getCurrentUser();
        if (!user) return [];

        const { data, error } = await window.supabaseClient.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'listing notifications');
        if (message) window.supabaseClient.showNotification(message, 'error');
        return [];
    }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Success status
 */
async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await window.supabaseClient.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'marking notification as read');
        if (message) window.supabaseClient.showNotification(message, 'error');
        return { success: false, error };
    }
}

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Success status
 */
async function markAllNotificationsAsRead() {
    try {
        const user = await window.supabaseClient.getCurrentUser();
        if (!user) return { success: false };

        const { error } = await window.supabaseClient.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'marking all notifications as read');
        if (message) window.supabaseClient.showNotification(message, 'error');
        return { success: false, error };
    }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Success status
 */
async function deleteNotification(notificationId) {
    try {
        const { error } = await window.supabaseClient.supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        const message = window.supabaseClient.handleSupabaseError(error, 'deleting notification');
        if (message) window.supabaseClient.showNotification(message, 'error');
        return { success: false, error };
    }
}

// Export database operations
window.dbOperations = {
    // Formulations
    createFormulation,
    getFormulation,
    listFormulations,
    updateFormulation,
    deleteFormulation,

    // Boss Requests
    createBossRequest,
    listBossRequests,
    updateBossRequestStatus,

    // File & Export
    uploadFiles,
    exportToCSV,

    // Profiles
    listAllProfiles,
    updateUserProfileRole,
    toggleUserProfileActivation,

    // System Settings
    getAllRegistrationCodes,
    getRoleByRegistrationCode,
    updateRoleRegistrationCode,

    // Statistics
    getDashboardStats,

    // Compounding
    completeProductionTask,

    // Notifications
    listNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
};
