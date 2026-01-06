# Data Storage - Current vs. Future

## Current Storage: In-Memory (Temporary)

**Where data is saved:** Currently, user accounts are stored in **memory** using a `ConcurrentDictionary` in the backend.

**Location:** `backend/Milo.API/Controllers/AuthController.cs`
```csharp
private static readonly ConcurrentDictionary<string, UserAccount> _users = new();
```

### Limitations:
- ❌ **Data is lost when server restarts**
- ❌ **Not persistent across deployments**
- ❌ **No database backup**
- ❌ **Can't scale across multiple servers**
- ✅ **Works for testing/development**

## Future Storage: RDS Database (Recommended)

For production, you should use **AWS RDS** (Relational Database Service) to store user data permanently.

### Benefits:
- ✅ **Persistent storage** - data survives restarts
- ✅ **Backups** - automatic backups
- ✅ **Scalable** - can handle many users
- ✅ **Secure** - managed by AWS
- ✅ **Multi-server** - can run multiple API instances

### Setup Options:

**Option 1: AWS RDS PostgreSQL (Recommended)**
- Managed PostgreSQL database
- Automatic backups
- High availability
- Easy to set up

**Option 2: AWS RDS MySQL**
- Similar to PostgreSQL
- Good for .NET applications

**Option 3: SQL Server on EC2**
- Run SQL Server on your existing EC2 instance
- More control, but you manage backups

## Current User Data Structure

```csharp
public class UserAccount
{
    public string Email { get; set; }
    public string Name { get; set; }
    public string Password { get; set; }  // Should be hashed!
    public bool RequiresPasswordChange { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}
```

## Migration to Database

When ready to move to RDS:

1. **Create RDS instance** (PostgreSQL or MySQL)
2. **Create database schema** (Users table)
3. **Update backend** to use Entity Framework Core
4. **Migrate existing users** (if any)
5. **Update connection string** in `appsettings.json`

## Quick Answer

**Current:** Data is stored in **memory** (lost on restart)  
**Future:** Should use **AWS RDS** database for permanent storage

The signup flow now:
1. ✅ Generates temporary password
2. ✅ Emails it to user
3. ✅ Requires password change on first login
4. ⚠️ Data stored in memory (will be lost on restart)

For production, set up RDS to make data persistent!

