# Dashboard Testing & Debugging Guide

## Current Status
- ✅ Deployment #256 completed successfully
- ❓ Dashboard showing all zeros (0 tasks, 0 in progress, 0 completed, 0%)

## Possible Causes & Solutions

### 1. **No Tasks Created Yet** (Most Likely)
The Dashboard pulls data from the `/tasks` API endpoint. If you haven't created any tasks on the Board yet, it will show zeros.

**Test:**
1. Go to **Board** page
2. Click **"Create"** button (top right, blue button)
3. Create a test task:
   - Title: "Test Task 1"
   - Status: "In Progress"
   - Click Save
4. Go back to **Dashboard**
5. Refresh the page (`Ctrl + F5`)
6. Check if the stats update

---

### 2. **Project Not Selected**
The Dashboard needs a project to be selected to load tasks.

**Check in Browser Console (F12):**
```javascript
// Open browser console (F12) and type:
localStorage.getItem('milo_current_project')
// Should show: {"id":X,"name":"Milo",...}

// If null, go to Board page first, then return to Dashboard
```

---

### 3. **API Connection Issue**
The Dashboard calls `api.codingeverest.com/tasks?projectId=X`

**Check in Browser Console:**
1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Look for:
   - ✅ `✓ Loaded tasks: X tasks` (success)
   - ❌ `Failed to load tasks` (error)
   - ❌ Red errors about network/API

**Check Network Tab:**
1. Press `F12` → **Network** tab
2. Refresh Dashboard page
3. Look for request to `/tasks?projectId=X`
4. Check if it returns:
   - Status 200 (success)
   - Response body with tasks array

---

### 4. **Browser Cache**
You might be seeing the old cached version.

**Solution:**
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or use Incognito/Private mode
3. Clear browser cache completely

---

## Quick Test Steps

### Step 1: Verify Backend API is Working
Open this URL directly in your browser:
```
https://api.codingeverest.com/health
```
**Expected:** Should return `{"status":"Healthy"}` or similar

### Step 2: Check if Tasks Exist
1. Login to Milo
2. Go to **Board** page
3. Do you see any tasks in the columns?
   - **YES** → Dashboard should show them (try hard refresh)
   - **NO** → Create some test tasks first

### Step 3: Test Task Creation
1. On Board page, click **"Create"** button
2. Fill in:
   - Title: "Dashboard Test Task"
   - Description: "Testing dashboard data flow"
   - Status: "In Progress"
   - Priority: Medium
3. Click **Save**
4. Task should appear on Board
5. Go to Dashboard and refresh

### Step 4: Open Browser Console
1. Press `F12`
2. Go to **Console** tab
3. Refresh Dashboard page
4. Look for these messages:
   ```
   ✓ Project loaded: Milo ID: X
   ✓ Loaded tasks: X tasks
   ✓ Stats updated: {total: X, inProgress: X, completed: X}
   ✓ All charts updated
   ```

### Step 5: Check Network Requests
1. Press `F12` → **Network** tab
2. Refresh Dashboard
3. Find the request to: `/tasks?projectId=X`
4. Click on it to see:
   - **Status**: Should be `200 OK`
   - **Response**: Should show array of tasks `[{...}]`

---

## Expected Console Output (Working Dashboard)

When Dashboard loads correctly, you should see in console:
```
Project loaded: Milo ID: 1
Loading dashboard for project: Milo ID: 1
Fetching tasks for project: 1
✓ Loaded tasks: 5 tasks
Dashboard data set: {totalTasks: 5, filteredTasks: 5, sampleTask: {...}}
Applying filters and updating UI...
Applying filters: {assignee: "all", status: "all", timeRange: "all", totalTasks: 5}
Filtered tasks: 5 out of 5
✓ Stats updated: {total: 5, inProgress: 2, completed: 1, rate: "20%"}
Updating all charts...
✓ All charts updated
✓ Dashboard loaded successfully
```

---

## If Still Showing Zeros

### Check These in Order:

1. **Do tasks exist in the database?**
   - Go to Board → Should see tasks
   - If no tasks, create 2-3 test tasks

2. **Is the project selected?**
   - Console: `localStorage.getItem('milo_current_project')`
   - Should not be null

3. **Is the API responding?**
   - Network tab → Check `/tasks?projectId=X` returns 200
   - Response should contain tasks array

4. **Browser cache cleared?**
   - Try incognito mode
   - Or clear cache: `Ctrl + Shift + Delete`

5. **JavaScript errors?**
   - Console tab → Any red errors?
   - If yes, share the error messages

---

## Create Test Data (If No Tasks Exist)

If you have no tasks, create these test tasks on the Board:

### Test Task 1:
- Title: "Setup Development Environment"
- Status: "Done"
- Priority: High
- Assignee: You

### Test Task 2:
- Title: "Implement User Authentication"
- Status: "In Progress"
- Priority: High
- Assignee: You

### Test Task 3:
- Title: "Create Dashboard Charts"
- Status: "In Progress"
- Priority: Medium
- Assignee: You

### Test Task 4:
- Title: "Write Documentation"
- Status: "To Do"
- Priority: Low

### Test Task 5:
- Title: "Code Review"
- Status: "In Review"
- Priority: Medium

After creating these, Dashboard should show:
- **Total Tasks**: 5
- **In Progress**: 2
- **Completed**: 1
- **Completion Rate**: 20%

---

## Debug Commands (Browser Console)

### Check Dashboard Data Object:
```javascript
// In browser console on Dashboard page:
console.log('Dashboard Data:', window.dashboardData);
console.log('Tasks:', window.dashboardData?.tasks);
console.log('Filtered:', window.dashboardData?.filteredTasks);
```

### Force Reload Dashboard:
```javascript
// In browser console:
if (typeof window.loadDashboardData === 'function') {
    window.loadDashboardData();
} else {
    location.reload();
}
```

### Check API Client:
```javascript
// Test API connection directly:
apiClient.get('/tasks?projectId=1').then(r => r.json()).then(console.log);
```

---

## Need More Help?

**Share these details:**
1. Screenshot of Browser Console (F12) when on Dashboard
2. Screenshot of Network tab showing `/tasks` request
3. Do you see any tasks on the Board page?
4. Any red errors in the Console?

