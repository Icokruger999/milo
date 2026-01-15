// Reports Management
let recipients = [];
let reportData = null;

// Toast notification function (if not already defined)
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
        // Create a simple visual toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#DE350B' : type === 'success' ? '#36B37E' : '#0052CC'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}

// Show report management modal
function showReportManagement() {
    try {
        console.log('showReportManagement called');
        const modal = document.getElementById('reportManagementModal');
        if (!modal) {
            console.error('reportManagementModal element not found!');
            return;
        }
        
        console.log('Modal found, showing it');
        // Force display with inline styles that override everything (matching create incident modal pattern)
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('z-index', '9999', 'important');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll when modal is open
        
        // Double check it's visible
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(modal);
            console.log('Modal display after show:', computedStyle.display);
            console.log('Modal visibility:', computedStyle.visibility);
            console.log('Modal z-index:', computedStyle.zIndex);
            if (computedStyle.display === 'none') {
                console.error('Modal still not visible! Forcing again...');
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
            }
        }, 100);
        
        loadRecipients();
        loadReportPreview();
    } catch (error) {
        console.error('Error in showReportManagement:', error);
    }
}

// Close report management modal
function closeReportManagement() {
    const modal = document.getElementById('reportManagementModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        document.body.style.overflow = '';
        hideAddRecipientForm();
    }
}

// Load recipients
async function loadRecipients() {
    try {
        // Get currentProject from projectSelector
        let currentProject = null;
        if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
            currentProject = projectSelector.getCurrentProject();
        } else if (typeof projectSelector !== 'undefined' && projectSelector.currentProject) {
            currentProject = projectSelector.currentProject;
        } else {
            // Fallback to localStorage
            const projectData = localStorage.getItem('currentProject');
            if (projectData) {
                try {
                    currentProject = JSON.parse(projectData);
                } catch (e) {
                    console.error('Failed to parse project data', e);
                }
            }
        }
        
        const projectId = currentProject?.id;
        const endpoint = projectId ? `/reports/recipients?projectId=${projectId}` : '/reports/recipients';
        const response = await apiClient.get(endpoint);
        if (response.ok) {
            recipients = await response.json() || [];
        } else {
            recipients = [];
        }
        renderRecipients();
    } catch (error) {
        console.error('Error loading recipients:', error);
        // Silent fail - just show empty state
        recipients = [];
        renderRecipients();
    }
}

// Render recipients list
function renderRecipients() {
    const container = document.getElementById('recipientsList');
    if (!container) return;

    if (recipients.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #6B778C;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="19" y1="8" x2="19" y2="14"></line>
                    <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
                <p style="font-size: 14px;">No recipients added yet</p>
                <p style="font-size: 12px; margin-top: 4px;">Add recipients to receive daily incident reports</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recipients.map(recipient => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: white; border: 1px solid #DFE1E6; border-radius: 6px; margin-bottom: 8px;">
            <div style="flex: 1;">
                <div style="font-weight: 500; color: #172B4D; font-size: 14px;">${escapeHtml(recipient.name)}</div>
                <div style="font-size: 12px; color: #6B778C; margin-top: 2px;">${escapeHtml(recipient.email)}</div>
                ${recipient.lastSentAt ? `
                    <div style="font-size: 11px; color: #5E6C84; margin-top: 4px;">
                        Last sent: ${formatDate(recipient.lastSentAt)}
                    </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6B778C; cursor: pointer;">
                    <input type="checkbox" ${recipient.isActive ? 'checked' : ''} onchange="toggleRecipientActive(${recipient.id}, this.checked)" style="margin: 0;">
                    Active
                </label>
                <button onclick="deleteRecipient(${recipient.id})" style="background: none; border: none; color: #DE350B; cursor: pointer; padding: 4px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// Show add recipient form
function showAddRecipientForm() {
    const form = document.getElementById('addRecipientForm');
    const preview = document.getElementById('reportPreview');
    if (form && preview) {
        form.style.display = 'block';
        preview.style.display = 'none';
        // Clear form
        document.getElementById('recipientName').value = '';
        document.getElementById('recipientEmail').value = '';
    }
}

// Hide add recipient form
function hideAddRecipientForm() {
    const form = document.getElementById('addRecipientForm');
    const preview = document.getElementById('reportPreview');
    if (form && preview) {
        form.style.display = 'none';
        preview.style.display = 'block';
    }
}

// Add recipient
async function addRecipient() {
    try {
        const nameInput = document.getElementById('recipientName');
        const emailInput = document.getElementById('recipientEmail');
        
        if (!nameInput || !emailInput) {
            console.error('Recipient form fields not found');
            if (typeof showToast === 'function') {
                showToast('Form fields not found. Please refresh the page.', 'error');
            }
            return;
        }
        
        const name = nameInput.value?.trim();
        const email = emailInput.value?.trim();

        if (!name || !email) {
            const errorMsg = 'Please fill in all required fields';
            console.error(errorMsg);
            if (typeof showToast === 'function') {
                showToast(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            return;
        }

        if (!isValidEmail(email)) {
            const errorMsg = 'Please enter a valid email address';
            console.error(errorMsg);
            if (typeof showToast === 'function') {
                showToast(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            return;
        }

        // Get currentProject - try multiple sources
        let currentProject = null;
        
        // Try projectSelector first
        if (typeof projectSelector !== 'undefined') {
            if (projectSelector.getCurrentProject) {
                currentProject = projectSelector.getCurrentProject();
            } else if (projectSelector.currentProject) {
                currentProject = projectSelector.currentProject;
            }
        }
        
        // Fallback to localStorage (check both keys)
        if (!currentProject) {
            const stored = localStorage.getItem('milo_current_project');
            if (stored) {
                try {
                    currentProject = JSON.parse(stored);
                } catch (e) {
                    console.error('Failed to parse stored project:', e);
                }
            }
        }
        
        if (!currentProject) {
            const storedAlt = localStorage.getItem('currentProject');
            if (storedAlt) {
                try {
                    currentProject = JSON.parse(storedAlt);
                } catch (e) {
                    console.error('Failed to parse project data:', e);
                }
            }
        }

        const data = {
            name,
            email,
            reportType: 'DailyIncidents',
            isActive: true,
            projectId: currentProject?.id || null
        };

        console.log('Adding recipient:', data);
        
        // Disable button to prevent double submission
        const addButton = document.querySelector('#addRecipientForm button[onclick*="addRecipient"]');
        if (addButton) {
            addButton.disabled = true;
            addButton.textContent = 'Adding...';
        }
        
        const response = await apiClient.post('/reports/recipients', data);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to add recipient' }));
            console.error('Failed to add recipient:', response.status, errorData);
            
            // Re-enable button
            if (addButton) {
                addButton.disabled = false;
                addButton.textContent = 'Add';
            }
            
            // Show user-friendly error message
            const errorMsg = errorData.message || `Failed to add recipient (${response.status})`;
            if (typeof showToast === 'function') {
                showToast(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            return;
        }
        
        const newRecipient = await response.json();
        console.log('Recipient added successfully:', newRecipient);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast('Recipient added successfully', 'success');
        }
        
        // Reload recipients and hide form
        await loadRecipients();
        hideAddRecipientForm();
        
        // Clear form fields
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        
        // Re-enable button
        if (addButton) {
            addButton.disabled = false;
            addButton.textContent = 'Add';
        }
    } catch (error) {
        console.error('Error adding recipient:', error);
        
        // Re-enable button
        const addButton = document.querySelector('#addRecipientForm button[onclick*="addRecipient"]');
        if (addButton) {
            addButton.disabled = false;
            addButton.textContent = 'Add';
        }
        
        const errorMsg = error.message || 'An error occurred while adding the recipient';
        if (typeof showToast === 'function') {
            showToast(errorMsg, 'error');
        } else {
            alert(errorMsg);
        }
    }
}

// Delete recipient
async function deleteRecipient(id) {
    // Direct delete without confirmation popup
    try {
        await apiClient.delete(`/reports/recipients/${id}`);
        showSuccess('Recipient removed successfully');
        await loadRecipients();
    } catch (error) {
        console.error('Error deleting recipient:', error);
        showError('Failed to remove recipient');
    }
}

// Toggle recipient active status
async function toggleRecipientActive(id, isActive) {
    try {
        await apiClient.put(`/reports/recipients/${id}`, { isActive });
        await loadRecipients();
    } catch (error) {
        console.error('Error updating recipient:', error);
        showError('Failed to update recipient status');
        // Reload to reset checkbox state
        await loadRecipients();
    }
}

// Load report preview
async function loadReportPreview() {
    try {
        // Get currentProject from projectSelector
        let currentProject = null;
        if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
            currentProject = projectSelector.getCurrentProject();
        } else if (typeof projectSelector !== 'undefined' && projectSelector.currentProject) {
            currentProject = projectSelector.currentProject;
        } else {
            // Fallback to localStorage
            const projectData = localStorage.getItem('currentProject');
            if (projectData) {
                try {
                    currentProject = JSON.parse(projectData);
                } catch (e) {
                    console.error('Failed to parse project data', e);
                }
            }
        }
        
        const projectId = currentProject?.id;
        const endpoint = projectId ? `/reports/incidents/daily?projectId=${projectId}` : '/reports/incidents/daily';
        const response = await apiClient.get(endpoint);
        if (response.ok) {
            reportData = await response.json();
            renderReportPreview();
        } else {
            const container = document.getElementById('reportStats');
            if (container) {
                container.innerHTML = '<div style="color: #DE350B; font-size: 14px;">Failed to load report preview</div>';
            }
        }
    } catch (error) {
        console.error('Error loading report preview:', error);
        const container = document.getElementById('reportStats');
        if (container) {
            container.innerHTML = '<div style="color: #DE350B; font-size: 14px;">Failed to load report preview</div>';
        }
    }
}

// Render report preview
function renderReportPreview() {
    const container = document.getElementById('reportStats');
    if (!container || !reportData) return;

    const { statistics, incidents } = reportData;

    container.innerHTML = `
        <h4 style="font-size: 14px; font-weight: 600; color: #172B4D; margin-bottom: 12px;">Today's Statistics</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #DFE1E6;">
                <div style="font-size: 24px; font-weight: 600; color: #0052CC;">${statistics.totalCount}</div>
                <div style="font-size: 12px; color: #6B778C; margin-top: 4px;">Total Incidents</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #DFE1E6;">
                <div style="font-size: 24px; font-weight: 600; color: #36B37E;">${statistics.resolvedCount}</div>
                <div style="font-size: 12px; color: #6B778C; margin-top: 4px;">Resolved</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #DFE1E6;">
                <div style="font-size: 24px; font-weight: 600; color: #FF991F;">${statistics.highPriorityCount}</div>
                <div style="font-size: 12px; color: #6B778C; margin-top: 4px;">High Priority</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 4px; border: 1px solid #DFE1E6;">
                <div style="font-size: 24px; font-weight: 600; color: #6554C0;">${statistics.newCount}</div>
                <div style="font-size: 12px; color: #6B778C; margin-top: 4px;">New</div>
            </div>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #6B778C;">
            Report for ${formatDate(new Date())}
        </div>
    `;
}

// Send daily report
async function sendDailyReport() {
    if (recipients.filter(r => r.isActive).length === 0) {
        console.error('Please add at least one active recipient');
        return;
    }

    try {
        // Get currentProject from projectSelector
        let currentProject = null;
        if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
            currentProject = projectSelector.getCurrentProject();
        } else if (typeof projectSelector !== 'undefined' && projectSelector.currentProject) {
            currentProject = projectSelector.currentProject;
        } else {
            // Fallback to localStorage
            const projectData = localStorage.getItem('currentProject');
            if (projectData) {
                try {
                    currentProject = JSON.parse(projectData);
                } catch (e) {
                    console.error('Failed to parse project data', e);
                }
            }
        }
        
        const projectId = currentProject?.id;
        const endpoint = projectId ? `/reports/incidents/send-daily?projectId=${projectId}` : '/reports/incidents/send-daily';
        const response = await apiClient.post(endpoint);
        
        if (!response.ok) {
            throw new Error('Failed to send report');
        }
        
        const result = await response.json();
        showSuccess(`Report sent to ${result.sent} recipient(s)`);
        await loadRecipients(); // Refresh to show updated lastSentAt
        await loadReportPreview();
    } catch (error) {
        console.error('Error sending report:', error);
        showError('Failed to send report');
    }
}

// Utility functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showSuccess(message) {
    console.log('SUCCESS:', message);
    // Silent success - no popup
}

function showError(message) {
    console.error('ERROR:', message);
    // Silent error - no popup, just log to console
}
