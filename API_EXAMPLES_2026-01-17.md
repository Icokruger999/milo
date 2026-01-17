# API Examples - SubProjects and Departments

## Departments API

### Get All Departments for a Project
```bash
GET /api/departments?projectId=1
```

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "IT Department",
    "description": "Information Technology",
    "projectId": 1,
    "color": "#0052CC",
    "createdAt": "2026-01-17T10:00:00Z",
    "updatedAt": null,
    "subProjects": [
      {
        "id": 1,
        "name": "Fabric Migration",
        "projectId": 1,
        "departmentId": 1,
        "color": "#0052CC"
      }
    ]
  },
  {
    "id": 2,
    "name": "BI Department",
    "description": "Business Intelligence",
    "projectId": 1,
    "color": "#36B37E",
    "createdAt": "2026-01-17T10:00:00Z",
    "updatedAt": null,
    "subProjects": []
  }
]
```

### Get Specific Department
```bash
GET /api/departments/1
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "name": "IT Department",
  "description": "Information Technology",
  "projectId": 1,
  "color": "#0052CC",
  "createdAt": "2026-01-17T10:00:00Z",
  "updatedAt": null,
  "subProjects": [
    {
      "id": 1,
      "name": "Fabric Migration",
      "projectId": 1,
      "departmentId": 1,
      "color": "#0052CC",
      "startDate": "2024-02-01T00:00:00Z",
      "endDate": "2024-05-31T00:00:00Z"
    }
  ]
}
```

### Create Department
```bash
POST /api/departments
Content-Type: application/json

{
  "name": "Marketing Department",
  "description": "Marketing and Communications",
  "projectId": 1,
  "color": "#FFAB00"
}
```

**Response (201 Created)**:
```json
{
  "id": 3,
  "name": "Marketing Department",
  "description": "Marketing and Communications",
  "projectId": 1,
  "color": "#FFAB00",
  "createdAt": "2026-01-17T10:30:00Z",
  "updatedAt": null,
  "subProjects": []
}
```

### Update Department
```bash
PUT /api/departments/1
Content-Type: application/json

{
  "name": "IT Operations",
  "description": "IT Operations and Support",
  "color": "#0052CC"
}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "name": "IT Operations",
  "description": "IT Operations and Support",
  "projectId": 1,
  "color": "#0052CC",
  "createdAt": "2026-01-17T10:00:00Z",
  "updatedAt": "2026-01-17T10:35:00Z",
  "subProjects": []
}
```

### Delete Department
```bash
DELETE /api/departments/1
```

**Response (204 No Content)**

---

## SubProjects API

### Get All SubProjects for a Project
```bash
GET /api/subprojects?projectId=1
```

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Fabric Migration",
    "description": "Migrate to new fabric infrastructure",
    "projectId": 1,
    "departmentId": 1,
    "color": "#0052CC",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-05-31T00:00:00Z",
    "timelineStartDate": null,
    "timelineEndDate": null,
    "timelineX": null,
    "timelineY": null,
    "timelineWidth": null,
    "timelineHeight": null,
    "onTimeline": false,
    "duration": null,
    "customText": null,
    "createdAt": "2026-01-17T10:00:00Z",
    "updatedAt": null
  },
  {
    "id": 2,
    "name": "Server Migration",
    "description": "Migrate to new servers",
    "projectId": 1,
    "departmentId": 1,
    "color": "#36B37E",
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-07-31T00:00:00Z",
    "timelineStartDate": null,
    "timelineEndDate": null,
    "timelineX": null,
    "timelineY": null,
    "timelineWidth": null,
    "timelineHeight": null,
    "onTimeline": false,
    "duration": null,
    "customText": null,
    "createdAt": "2026-01-17T10:00:00Z",
    "updatedAt": null
  }
]
```

### Get Specific SubProject
```bash
GET /api/subprojects/1
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "name": "Fabric Migration",
  "description": "Migrate to new fabric infrastructure",
  "projectId": 1,
  "departmentId": 1,
  "color": "#0052CC",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-05-31T00:00:00Z",
  "timelineStartDate": null,
  "timelineEndDate": null,
  "timelineX": null,
  "timelineY": null,
  "timelineWidth": null,
  "timelineHeight": null,
  "onTimeline": false,
  "duration": null,
  "customText": null,
  "createdAt": "2026-01-17T10:00:00Z",
  "updatedAt": null,
  "tasks": []
}
```

### Create SubProject
```bash
POST /api/subprojects
Content-Type: application/json

{
  "name": "UX Experience Redesign",
  "description": "Redesign user experience",
  "projectId": 1,
  "departmentId": 2,
  "color": "#FFAB00",
  "startDate": "2024-04-01T00:00:00Z",
  "endDate": "2024-08-31T00:00:00Z"
}
```

**Response (201 Created)**:
```json
{
  "id": 3,
  "name": "UX Experience Redesign",
  "description": "Redesign user experience",
  "projectId": 1,
  "departmentId": 2,
  "color": "#FFAB00",
  "startDate": "2024-04-01T00:00:00Z",
  "endDate": "2024-08-31T00:00:00Z",
  "timelineStartDate": null,
  "timelineEndDate": null,
  "timelineX": null,
  "timelineY": null,
  "timelineWidth": null,
  "timelineHeight": null,
  "onTimeline": false,
  "duration": null,
  "customText": null,
  "createdAt": "2026-01-17T10:45:00Z",
  "updatedAt": null
}
```

### Update SubProject (with Timeline Position)
```bash
PUT /api/subprojects/1
Content-Type: application/json

{
  "name": "Fabric Migration - Phase 1",
  "description": "Migrate to new fabric infrastructure - Phase 1",
  "timelineStartDate": "2024-02-01T00:00:00Z",
  "timelineEndDate": "2024-05-31T00:00:00Z",
  "timelineX": 150,
  "timelineY": 50,
  "timelineWidth": 300,
  "timelineHeight": 40,
  "onTimeline": true,
  "duration": 90,
  "customText": "Phase 1"
}
```

**Response (200 OK)**:
```json
{
  "id": 1,
  "name": "Fabric Migration - Phase 1",
  "description": "Migrate to new fabric infrastructure - Phase 1",
  "projectId": 1,
  "departmentId": 1,
  "color": "#0052CC",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-05-31T00:00:00Z",
  "timelineStartDate": "2024-02-01T00:00:00Z",
  "timelineEndDate": "2024-05-31T00:00:00Z",
  "timelineX": 150,
  "timelineY": 50,
  "timelineWidth": 300,
  "timelineHeight": 40,
  "onTimeline": true,
  "duration": 90,
  "customText": "Phase 1",
  "createdAt": "2026-01-17T10:00:00Z",
  "updatedAt": "2026-01-17T11:00:00Z"
}
```

### Delete SubProject
```bash
DELETE /api/subprojects/1
```

**Response (204 No Content)**

### Get SubProjects by Department
```bash
GET /api/subprojects/by-department?projectId=1&departmentId=1
```

**Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Fabric Migration",
    "projectId": 1,
    "departmentId": 1,
    "color": "#0052CC",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-05-31T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Server Migration",
    "projectId": 1,
    "departmentId": 1,
    "color": "#36B37E",
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-07-31T00:00:00Z"
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Sub-project name is required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred while processing your request"
}
```

---

## Frontend Usage Examples

### Load Departments
```javascript
const response = await apiClient.get(`/api/departments?projectId=${projectId}`);
if (response.ok) {
  const departments = await response.json();
  console.log('Departments:', departments);
}
```

### Create SubProject
```javascript
const response = await apiClient.post('/api/subprojects', {
  name: 'New Sub-Project',
  projectId: 1,
  departmentId: 1,
  color: '#0052CC',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
});

if (response.ok) {
  const subProject = await response.json();
  console.log('Created:', subProject);
}
```

### Update SubProject Position
```javascript
const response = await apiClient.put(`/api/subprojects/${subProjectId}`, {
  timelineX: 150,
  timelineY: 50,
  timelineWidth: 300,
  timelineHeight: 40,
  onTimeline: true
});

if (response.ok) {
  const updated = await response.json();
  console.log('Updated:', updated);
}
```

### Delete SubProject
```javascript
const response = await apiClient.delete(`/api/subprojects/${subProjectId}`);
if (response.ok) {
  console.log('Deleted successfully');
}
```

---

## Testing with cURL

### Get Departments
```bash
curl -X GET "http://localhost:8080/api/departments?projectId=1" \
  -H "Content-Type: application/json"
```

### Create Department
```bash
curl -X POST "http://localhost:8080/api/departments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Department",
    "projectId": 1,
    "color": "#0052CC"
  }'
```

### Get SubProjects
```bash
curl -X GET "http://localhost:8080/api/subprojects?projectId=1" \
  -H "Content-Type: application/json"
```

### Create SubProject
```bash
curl -X POST "http://localhost:8080/api/subprojects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Sub-Project",
    "projectId": 1,
    "departmentId": 1,
    "color": "#0052CC",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-05-31T00:00:00Z"
  }'
```

### Delete SubProject
```bash
curl -X DELETE "http://localhost:8080/api/subprojects/1" \
  -H "Content-Type: application/json"
```
