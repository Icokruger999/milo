// Reports Management
let recipients = [];
let reportData = null;

// Show report management modal
function showReportManagement() {
    const modal = document.getElementById('reportManagementModal');
    if (modal) {
        modal.classList.add('show');
        loadRecipients();
        loadReportPreview();
    }
}

// Close report management modal
function closeReportManagement() {
    const modal = document.getElementById('reportManagementModal');
    if (modal) {
        modal.classList.remove('show');
        hideAddRecipientForm();
    }
}

// Load recipients
async function loadRecipients() {
    try {
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
        const name = document.getElementById('recipientName').value.trim();
        const email = document.getElementById('recipientEmail').value.trim();

        if (!name || !email) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        const data = {
            name,
            email,
            reportType: 'DailyIncidents',
            isActive: true,
            projectId: currentProject?.id || null
        };

        const response = await apiClient.post('/reports/recipients', data);
        if (!response.ok) {
            throw new Error('Failed to add recipient');
        }
        showSuccess('Recipient added successfully');
        await loadRecipients();
        hideAddRecipientForm();
    } catch (error) {
        console.error('Error adding recipient:', error);
        showError('Failed to add recipient');
    }
}

// Delete recipient
async function deleteRecipient(id) {
    if (!confirm('Are you sure you want to remove this recipient?')) {
        return;
    }

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

    try {
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
