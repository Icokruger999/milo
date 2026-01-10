# Incidents Feature - Complete Guide

## Overview
The Incidents feature provides a comprehensive ticket management system for tracking and resolving client issues. It follows ITSM (IT Service Management) best practices, similar to systems like Freshservice, ServiceNow, and Jira Service Management.

## Features

### 1. Incident Creation
- **Create Button**: Global "Create Incident" button in navigation
- **Required Fields**:
  - Subject (incident title)
  - Requester (user who reported the issue)
- **Optional Fields**:
  - Description
  - Status (New, Open, Pending, Resolved, Closed)
  - Priority (Low, Medium, High, Urgent)
  - Urgency (Low, Medium, High)
  - Impact (Low, Medium, High)
  - Source (Phone, Email, Portal, Chat)
  - Department (IT, HR, Finance, Operations)
  - Agent (assigned support person)
  - Group/Team (assigned team)
  - Category

### 2. Incident List View
- **Table Display**: Shows all incidents in a sortable table
- **Columns**:
  - Incident Number (e.g., INC-001)
  - Subject
  - Status (with color-coded badges)
  - Priority (with color-coded badges)
  - Requester
  - Agent
  - Created Date
- **Click to View**: Click any row to open incident details

### 3. Incident Details Panel
- **Slide-in Panel**: Opens from the right side
- **Comprehensive Information**:
  - Full incident details
  - Status and priority
  - People (requester, agent, group, department)
  - Descriptions and notes
  - Timestamps (created, updated, resolved)
  - SLA information (first response due, resolution due)
  - Resolution notes (when resolved)
- **Quick Actions**:
  - Change Status button
  - Edit Incident button

### 4. Filtering & Search
- **Search Bar**: Search by incident number, subject, requester, or agent
- **Status Filter**: Filter by incident status
- **Priority Filter**: Filter by priority level
- **Real-time Filtering**: Results update as you type/select

### 5. Status Management
- **Status Options**:
  - **New**: Newly created incidents
  - **Open**: Actively being worked on
  - **Pending**: Waiting for external input
  - **Resolved**: Issue has been fixed
  - **Closed**: Incident is closed
- **Status Colors**:
  - New: Green
  - Open: Blue
  - Pending: Yellow
  - Resolved: Green
  - Closed: Gray

### 6. Priority Levels
- **Low**: Minor issues, non-urgent
- **Medium**: Standard priority
- **High**: Important, affects multiple users
- **Urgent**: Critical, immediate attention required

### 7. SLA Tracking
- **Automatic SLA Calculation**: When incident is created/opened:
  - First Response Due: 4 hours from creation
  - Resolution Due: 2 days from creation
- **SLA Tracking**: System tracks first response time
- **Visible in Details**: SLA due dates displayed in incident details

## Backend Implementation

### API Endpoints

#### Get All Incidents
```http
GET /api/incidents
GET /api/incidents?projectId={id}
GET /api/incidents?status={status}
```

#### Get Incident by ID
```http
GET /api/incidents/{id}
```

#### Create Incident
```http
POST /api/incidents
Content-Type: application/json

{
  "subject": "Cannot access email",
  "requesterId": 1,
  "status": "New",
  "priority": "High",
  "urgency": "High",
  "impact": "Medium",
  "source": "Email",
  "department": "IT",
  "description": "User cannot login to email after password reset",
  "category": "Email & Collaboration",
  "projectId": 1
}
```

#### Update Incident
```http
PUT /api/incidents/{id}
Content-Type: application/json

{
  "status": "Resolved",
  "resolution": "Password reset link sent to user's recovery email"
}
```

#### Delete Incident
```http
DELETE /api/incidents/{id}
```

#### Record First Response
```http
POST /api/incidents/{id}/respond
```

### Database Schema

```sql
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    requester_id INTEGER NOT NULL,
    agent_id INTEGER,
    group_id INTEGER,
    department VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    priority VARCHAR(50) NOT NULL DEFAULT 'Low',
    urgency VARCHAR(50),
    impact VARCHAR(50),
    source VARCHAR(50),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    planned_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    planned_effort VARCHAR(50),
    first_response_due TIMESTAMP,
    resolution_due TIMESTAMP,
    first_response_at TIMESTAMP,
    tags VARCHAR(500),
    associated_assets TEXT,
    project_id INTEGER,
    attachments TEXT,
    resolution TEXT,
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES teams(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### Models

**Incident.cs**: Complete incident model with relationships to:
- User (Requester and Agent)
- Team (Group)
- Project

## Frontend Implementation

### Files
- `milo-incidents.html`: Main incidents page
- `js/incidents.js`: Incidents management logic

### Key Functions

#### Load Incidents
```javascript
async function loadIncidents()
```
Fetches all incidents from API and renders them in the table.

#### Create Incident
```javascript
async function createIncident(event)
```
Handles incident creation form submission.

#### Show Incident Details
```javascript
async function showIncidentDetails(incidentId)
```
Loads and displays incident details in the side panel.

#### Filter Incidents
```javascript
function filterIncidents()
```
Filters incidents by search term, status, and priority.

#### Update Status
```javascript
async function updateIncidentStatus()
```
Allows quick status updates from the detail panel.

## Setup Instructions

### 1. Database Setup

Run the SQL script to create the incidents table:

```bash
# Using psql
psql -h your-db-host -U postgres -d MiloDB -f create-incidents-table.sql

# Or using the provided PowerShell script
.\run-sql-on-rds.ps1 -SqlFile "create-incidents-table.sql"
```

### 2. Backend Deployment

The backend includes:
- ✅ `Models/Incident.cs` - Incident model
- ✅ `Controllers/IncidentsController.cs` - API endpoints
- ✅ `Data/MiloDbContext.cs` - Database context (updated)
- ✅ `Migrations/AddIncidents.cs` - Migration file

Deploy the backend as usual:

```powershell
# Deploy to EC2
.\deploy-to-ec2.ps1
```

### 3. Frontend Deployment

The frontend includes:
- ✅ `milo-incidents.html` - Incidents page
- ✅ `js/incidents.js` - Incidents logic

Deploy to Amplify:

```powershell
# Commit and push changes
git add .
git commit -m "Add Incidents feature"
git push origin main

# Amplify will auto-deploy
```

## Usage Examples

### Creating an Incident

1. Click "Create Incident" button in the top navigation
2. Fill in the required fields:
   - Subject: "User cannot access shared drive"
   - Requester: Select from dropdown
3. Fill in optional fields:
   - Priority: "High"
   - Urgency: "High"
   - Impact: "Medium"
   - Department: "IT"
   - Description: "User receives 'Access Denied' error when trying to open shared drive"
4. Click "Create"
5. Incident will be created with auto-generated number (e.g., INC-001)

### Viewing Incident Details

1. Click any incident row in the table
2. Details panel slides in from the right
3. View all incident information
4. Use "Change Status" button to update status
5. Use "Edit Incident" button to modify details (coming soon)

### Filtering Incidents

1. Use search box to search by:
   - Incident number (INC-001)
   - Subject keywords
   - Requester name
   - Agent name
2. Use Status dropdown to filter by status
3. Use Priority dropdown to filter by priority
4. Filters can be combined

## Future Enhancements

### Phase 2
- [ ] Comments/Notes on incidents
- [ ] Activity timeline/history
- [ ] File attachments
- [ ] Email notifications
- [ ] SLA breach warnings
- [ ] Related incidents

### Phase 3
- [ ] Advanced search and filters
- [ ] Custom fields
- [ ] Incident templates
- [ ] Bulk actions
- [ ] Reports and analytics
- [ ] Knowledge base integration

### Phase 4
- [ ] Automation rules
- [ ] Escalation policies
- [ ] Integration with external systems
- [ ] Mobile app support
- [ ] Service catalog

## Troubleshooting

### Incidents Not Loading
1. Check browser console for errors
2. Verify API endpoint is accessible: `https://api.codingeverest.com/api/incidents`
3. Ensure user is authenticated
4. Check if project is selected

### Cannot Create Incident
1. Ensure all required fields are filled
2. Check that requester is selected
3. Verify backend API is running
4. Check database connection

### Database Errors
1. Verify incidents table exists
2. Check foreign key constraints (users, teams, projects tables must exist)
3. Ensure database user has proper permissions

## Integration with Other Features

### Board/Tasks
- Incidents can be linked to tasks
- Tasks can reference incident numbers
- Incident resolution can trigger task completion

### Projects
- Incidents are associated with projects
- Project members can be assigned as agents
- Project filtering applies to incidents

### Teams
- Teams can be assigned to incidents (as Groups)
- Team members can be agents
- Team-based routing (future)

## Best Practices

1. **Use Clear Subjects**: Make incident subjects descriptive
2. **Set Appropriate Priority**: Use priority levels consistently
3. **Update Status Regularly**: Keep incident status current
4. **Add Resolution Notes**: Document how issues were resolved
5. **Track SLAs**: Monitor first response and resolution times
6. **Use Categories**: Categorize incidents for better reporting
7. **Assign Agents**: Ensure incidents are assigned to responsible parties

## Support

For issues or questions about the Incidents feature:
1. Check this documentation
2. Review the API documentation
3. Check the browser console for errors
4. Contact your system administrator

---

**Created**: January 11, 2026
**Version**: 1.0
**Status**: Production Ready
