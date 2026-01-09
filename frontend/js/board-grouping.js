// Board Grouping by Assignee Functionality
// This extends board.js with collapsible assignee groups

// Track collapsed state
let collapsedGroups = JSON.parse(localStorage.getItem('collapsedAssigneeGroups') || '{}');

// Group tasks by assignee
function groupTasksByAssignee(taskList) {
    const groups = {};
    
    taskList.forEach(task => {
        const assigneeName = task.assignee ? task.assignee.name : 'Unassigned';
        const assigneeId = task.assignee ? task.assignee.id : 'unassigned';
        
        if (!groups[assigneeId]) {
            groups[assigneeId] = {
                id: assigneeId,
                name: assigneeName,
                tasks: []
            };
        }
        groups[assigneeId].tasks.push(task);
    });
    
    // Convert to array and sort alphabetically
    const groupArray = Object.values(groups);
    groupArray.sort((a, b) => {
        // Unassigned always last
        if (a.id === 'unassigned') return 1;
        if (b.id === 'unassigned') return -1;
        return a.name.localeCompare(b.name);
    });
    
    return groupArray;
}

// Toggle group collapse
function toggleAssigneeGroup(columnId, assigneeId) {
    const key = `${columnId}-${assigneeId}`;
    collapsedGroups[key] = !collapsedGroups[key];
    localStorage.setItem('collapsedAssigneeGroups', JSON.stringify(collapsedGroups));
    renderBoard();
}

// Check if group is collapsed
function isGroupCollapsed(columnId, assigneeId) {
    const key = `${columnId}-${assigneeId}`;
    return collapsedGroups[key] || false;
}

// Render column with assignee grouping
function renderColumnWithGrouping(columnId, taskList) {
    const container = document.getElementById(`${columnId}Items`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (taskList.length === 0) {
        container.innerHTML = '<div class="empty-column-state">No tasks</div>';
        return;
    }
    
    // Group tasks
    const groups = groupTasksByAssignee(taskList);
    
    // Render each group
    groups.forEach(group => {
        const isCollapsed = isGroupCollapsed(columnId, group.id);
        const assigneeColors = getAssigneeColor(group.id === 'unassigned' ? null : group.id, group.name);
        
        // Create group header
        const groupHeader = document.createElement('div');
        groupHeader.className = 'assignee-group-header';
        groupHeader.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin: 4px 8px 8px 8px;
            background: #F4F5F7;
            border-radius: 3px;
            cursor: pointer;
            user-select: none;
            transition: background 0.15s;
        `;
        
        groupHeader.onmouseover = () => groupHeader.style.background = '#EBECF0';
        groupHeader.onmouseout = () => groupHeader.style.background = '#F4F5F7';
        
        groupHeader.innerHTML = `
            <span style="margin-right: 8px; font-size: 12px; transition: transform 0.15s; display: inline-block; ${isCollapsed ? '' : 'transform: rotate(90deg);'}">
                ▶
            </span>
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${assigneeColors.bg}; color: ${assigneeColors.text}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; margin-right: 8px;">
                ${group.name.substring(0, 2).toUpperCase()}
            </div>
            <span style="flex: 1; font-size: 14px; font-weight: 600; color: #172B4D;">
                ${group.name}
            </span>
            <span style="font-size: 12px; color: #6B778C; background: white; padding: 2px 8px; border-radius: 3px;">
                ${group.tasks.length}
            </span>
        `;
        
        groupHeader.onclick = () => toggleAssigneeGroup(columnId, group.id);
        
        container.appendChild(groupHeader);
        
        // Create group content (collapsible)
        if (!isCollapsed) {
            const groupContent = document.createElement('div');
            groupContent.className = 'assignee-group-content';
            groupContent.style.cssText = `
                padding: 0 8px 8px 8px;
            `;
            
            group.tasks.forEach(task => {
                // Use window.createTaskCard to access the function from board.js
                const card = window.createTaskCard ? window.createTaskCard(task) : createTaskCardFallback(task);
                groupContent.appendChild(card);
            });
            
            container.appendChild(groupContent);
        }
    });
    
    // Update counter
    const counterEl = document.getElementById(`${columnId}-count`);
    if (counterEl) {
        counterEl.textContent = taskList.length;
    }
}

// Fallback card creator if main one isn't available
function createTaskCardFallback(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `<div class="task-title">${task.title || 'Untitled'}</div>`;
    return card;
}

// Override the original renderColumn function
const originalRenderColumn = window.renderColumn;
window.renderColumn = function(columnId, taskList) {
    renderColumnWithGrouping(columnId, taskList);
};

