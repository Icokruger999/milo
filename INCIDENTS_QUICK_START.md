# Incidents Feature - Quick Start Guide

## 🎯 What is the Incidents Feature?

The Incidents feature is a **complete ticket management system** for tracking and resolving client issues. Think of it like:
- 🎫 Freshservice
- 🔧 ServiceNow
- 📋 Jira Service Management

But integrated directly into your Milo project management system!

## 🚀 Quick Start (3 Steps)

### Step 1: Deploy to Database
```powershell
.\run-sql-on-rds.ps1 -SqlFile "create-incidents-table.sql"
```
⏱️ Takes: 30 seconds

### Step 2: Deploy Backend
```powershell
.\deploy-to-ec2.ps1
```
⏱️ Takes: 2-3 minutes

### Step 3: Deploy Frontend
```powershell
git add .
git commit -m "Add Incidents feature"
git push origin main
```
⏱️ Takes: 2-3 minutes (Amplify auto-deploys)

**Total Time: ~5-6 minutes** ⚡

## 📱 How to Use

### Creating Your First Incident

1. **Open Incidents Page**
   - Navigate to: https://www.codingeverest.com/milo-incidents.html
   - Or click "Incidents" in the navigation menu

2. **Click "Create Incident"**
   - Big blue button in the top right

3. **Fill in the Form**
   ```
   Subject: "User cannot access shared drive"
   Requester: [Select from dropdown]
   Priority: High
   Department: IT
   Description: "User receives 'Access Denied' error..."
   ```

4. **Click "Create"**
   - Incident is created with auto-generated number (INC-001)
   - Appears in the list immediately

### Viewing Incident Details

1. **Click any incident row** in the table
2. **Detail panel slides in** from the right
3. **See all information**:
   - Status and priority
   - Requester and agent
   - Full description
   - Timestamps
   - SLA due dates

### Updating Status

1. **Open incident details**
2. **Click "Change Status"**
3. **Enter new status**: Open, Pending, Resolved, or Closed
4. **Status updates immediately**

### Searching & Filtering

**Search Box**: Type to search by:
- Incident number (INC-001)
- Subject keywords
- Requester name
- Agent name

**Filters**: Use dropdowns to filter by:
- Status (New, Open, Pending, Resolved, Closed)
- Priority (Low, Medium, High, Urgent)

## 🎨 What It Looks Like

### Incidents List
```
┌─────────────────────────────────────────────────────────────┐
│ Incidents                                    [Create Incident]│
├─────────────────────────────────────────────────────────────┤
│ [Search...] [Status ▼] [Priority ▼]                         │
├─────────────────────────────────────────────────────────────┤
│ INCIDENT  │ SUBJECT           │ STATUS │ PRIORITY │ CREATED │
├───────────┼───────────────────┼────────┼──────────┼─────────┤
│ INC-001   │ Email not working │ Open   │ High     │ Jan 11  │
│ INC-002   │ Password reset    │ New    │ Medium   │ Jan 11  │
│ INC-003   │ Printer offline   │ Pending│ Low      │ Jan 10  │
└─────────────────────────────────────────────────────────────┘
```

### Detail Panel
```
┌────────────────────────┐
│ INC-001            [×] │
├────────────────────────┤
│ Email not working      │
│                        │
│ STATUS & PRIORITY      │
│ Status: [Open]         │
│ Priority: [High]       │
│                        │
│ PEOPLE                 │
│ Requester: John Doe    │
│ Agent: Jane Smith      │
│ Department: IT         │
│                        │
│ DESCRIPTION            │
│ User cannot access     │
│ email after password   │
│ reset...               │
│                        │
│ DATES                  │
│ Created: Jan 11, 10:00 │
│ First Response Due:    │
│   Jan 11, 14:00        │
│                        │
│ [Change Status] [Edit] │
└────────────────────────┘
```

## 🎯 Key Features

### ✅ Auto-Generated Incident Numbers
- INC-001, INC-002, INC-003...
- Sequential and unique

### ✅ Status Tracking
- **New**: Just created
- **Open**: Being worked on
- **Pending**: Waiting for something
- **Resolved**: Fixed
- **Closed**: Complete

### ✅ Priority Levels
- **Low**: Can wait
- **Medium**: Normal priority
- **High**: Important
- **Urgent**: Drop everything!

### ✅ SLA Tracking
- **First Response**: 4 hours
- **Resolution**: 2 days
- Automatically calculated

### ✅ Search & Filter
- Search by anything
- Filter by status
- Filter by priority
- Real-time results

## 📊 Sample Data

Want to test with sample data? Here are some example incidents:

```sql
-- Insert sample incidents
INSERT INTO incidents (incident_number, subject, description, requester_id, status, priority, created_at)
VALUES 
('INC-001', 'Cannot access email', 'User unable to login after password reset', 1, 'Open', 'High', NOW()),
('INC-002', 'Printer not working', 'Office printer showing offline error', 1, 'New', 'Medium', NOW()),
('INC-003', 'Software installation request', 'Need Adobe Acrobat installed', 1, 'Pending', 'Low', NOW());
```

## 🔍 Testing Checklist

After deployment, test these:

- [ ] Page loads without errors
- [ ] "Create Incident" button works
- [ ] Can fill in and submit form
- [ ] Incident appears in list
- [ ] Can click to view details
- [ ] Can update status
- [ ] Search box filters results
- [ ] Status dropdown filters
- [ ] Priority dropdown filters
- [ ] No console errors (F12)

## 🆘 Troubleshooting

### "No project selected"
**Fix**: Go to Board page first, select a project, then go to Incidents

### Empty requester dropdown
**Fix**: Make sure you have users in the database

### "Failed to load incidents"
**Fix**: Check that backend is running and database table exists

### Page won't load
**Fix**: Clear browser cache and hard refresh (Ctrl+Shift+R)

## 📞 Support

Need help? Check these docs:
1. **Full Guide**: `INCIDENTS_FEATURE_GUIDE.md`
2. **Deployment**: `DEPLOY_INCIDENTS_FEATURE.md`
3. **Summary**: `INCIDENTS_IMPLEMENTATION_SUMMARY.md`

## 🎉 You're Ready!

That's it! You now have a complete incident management system integrated into Milo.

**Next Steps**:
1. ✅ Deploy following the 3 steps above
2. ✅ Create your first test incident
3. ✅ Train your team
4. ✅ Start tracking real issues
5. ✅ Monitor and improve

---

**Questions?** Check the full documentation in `INCIDENTS_FEATURE_GUIDE.md`

**Ready to deploy?** Follow `DEPLOY_INCIDENTS_FEATURE.md`

**Want details?** Read `INCIDENTS_IMPLEMENTATION_SUMMARY.md`

🚀 **Happy Incident Managing!**
