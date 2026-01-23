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
        
        // Fallback to localStorage (check correct key first)
        if (!currentProject) {
            // Try the correct key used by projectSelector
            const stored = localStorage.getItem('milo_current_project');
            if (stored) {
                try {
                    currentProject = JSON.parse(stored);
                    console.log('Found project from milo_current_project:', currentProject);
                } catch (e) {
                    console.error('Failed to parse stored project:', e);
                }
            }
        }
        
        // Also check alternative key for backward compatibility
        if (!currentProject) {
            const storedAlt = localStorage.getItem('currentProject');
            if (storedAlt) {
                try {
                    currentProject = JSON.parse(storedAlt);
                    console.log('Found project from currentProject:', currentProject);
                } catch (e) {
                    console.error('Failed to parse project data:', e);
                }
            }
        }
        
        if (!currentProject) {
            console.warn('No project found. Recipient will be added without project association.');
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
        showError('Please add at least one active recipient');
        return;
    }

    // Prevent multiple clicks
    const button = event?.target?.closest('button');
    if (button && button.disabled) return;
    if (button) {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        const originalText = button.innerHTML;
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px; animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>Sending...';
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
        showSuccess(`Report sent successfully`);
        await loadRecipients(); // Refresh to show updated lastSentAt
        await loadReportPreview();
    } catch (error) {
        console.error('Error sending report:', error);
        showError('Failed to send report. Please try again.');
    } finally {
        // Re-enable button
        if (button) {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>Send Report Now';
        }
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
    // Show simple text message below the button
    const statusDiv = document.getElementById('sendReportStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = '#36B37E';
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function showError(message) {
    console.error('ERROR:', message);
    // Show simple text message below the button
    const statusDiv = document.getElementById('sendReportStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = '#DE350B';
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 8000);
    }
}

// Schedule settings functions
function setupScheduleListeners() {
    const frequencySelect = document.getElementById('reportFrequency');
    if (frequencySelect) {
        frequencySelect.addEventListener('change', function() {
            const weeklyRow = document.getElementById('weeklyDayRow');
            const monthlyRow = document.getElementById('monthlyDayRow');
            
            if (this.value === 'weekly') {
                weeklyRow.style.display = 'block';
                monthlyRow.style.display = 'none';
            } else if (this.value === 'monthly') {
                weeklyRow.style.display = 'none';
                monthlyRow.style.display = 'block';
            } else {
                weeklyRow.style.display = 'none';
                monthlyRow.style.display = 'none';
            }
        });
    }
}

async function loadScheduleSettings() {
    try {
        // Get currentProject
        let currentProject = null;
        if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
            currentProject = projectSelector.getCurrentProject();
        } else if (typeof projectSelector !== 'undefined' && projectSelector.currentProject) {
            currentProject = projectSelector.currentProject;
        }
        
        const projectId = currentProject?.id;
        const endpoint = projectId ? `/reports/schedule?projectId=${projectId}` : '/reports/schedule';
        const response = await apiClient.get(endpoint);
        
        if (response.ok) {
            const settings = await response.json();
            document.getElementById('reportFrequency').value = settings.frequency || 'manual';
            document.getElementById('reportTime').value = settings.time || '09:00';
            document.getElementById('reportWeekday').value = settings.weekday || '1';
            document.getElementById('reportMonthDay').value = settings.monthDay || '1';
            
            // Trigger change event to show/hide conditional fields
            document.getElementById('reportFrequency').dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error('Error loading schedule settings:', error);
    }
}

async function saveScheduleSettings() {
    try {
        const frequency = document.getElementById('reportFrequency').value;
        const time = document.getElementById('reportTime').value;
        const weekday = document.getElementById('reportWeekday').value;
        const monthDay = document.getElementById('reportMonthDay').value;
        
        // Get currentProject
        let currentProject = null;
        if (typeof projectSelector !== 'undefined' && projectSelector.getCurrentProject) {
            currentProject = projectSelector.getCurrentProject();
        } else if (typeof projectSelector !== 'undefined' && projectSelector.currentProject) {
            currentProject = projectSelector.currentProject;
        }
        
        const data = {
            frequency,
            time,
            weekday: frequency === 'weekly' ? parseInt(weekday) : null,
            monthDay: frequency === 'monthly' ? parseInt(monthDay) : null,
            projectId: currentProject?.id || null
        };
        
        const response = await apiClient.post('/reports/schedule', data);
        
        if (response.ok) {
            showSuccess('Schedule settings saved successfully');
        } else {
            showError('Failed to save schedule settings');
        }
    } catch (error) {
        console.error('Error saving schedule settings:', error);
        showError('Failed to save schedule settings');
    }
}

// Initialize schedule listeners when modal opens
const originalShowReportManagement = showReportManagement;
showReportManagement = function() {
    originalShowReportManagement();
    setupScheduleListeners();
    loadScheduleSettings();
};
