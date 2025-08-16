# Course Edit Validation Rules

## Updated Validation Logic

The `checkCanEdit` endpoint now implements sophisticated validation rules to prevent conflicting edits based on course status and version lifecycle.

### Validation Rules

#### For Active Courses
**Rule**: An active course can only be edited if there are NO newer versions in `draft`, `pending_approval`, or `approved` status.

**Rationale**: Active courses should not be edited when there's already work in progress on newer versions, as this could create conflicts and confusion.

**Blocked Scenarios**:
- Active Course v1 + Draft Course v2 → **Cannot edit v1**
- Active Course v1 + Pending Approval Course v2 → **Cannot edit v1**  
- Active Course v1 + Approved Course v2 → **Cannot edit v1**

**Allowed Scenarios**:
- Active Course v1 + Disabled Course v2 → **Can edit v1**
- Active Course v1 + Archived Course v2 → **Can edit v1**
- Active Course v1 (no newer versions) → **Can edit v1**

#### For Non-Active Courses
**Rule**: Non-active courses follow the original logic - cannot be edited if ANY newer version exists (regardless of status).

**Rationale**: Once a newer version is created, older versions should not be modified to maintain version integrity.

**Blocked Scenarios**:
- Draft Course v1 + Any Course v2 → **Cannot edit v1**
- Approved Course v1 + Any Course v2 → **Cannot edit v1**

### API Response Format

```json
{
  "canEdit": false,
  "reason": "Cannot edit this active course (version 1) because newer version(s) exist with status: draft, approved. Please work with the latest version or wait for the newer version to be processed.",
  "courseStatus": "active",
  "isLatestVersion": false,
  "version": 1,
  "newerVersionsCount": 2,
  "newerVersions": [
    {
      "id": "uuid-v3",
      "version": 3,
      "status": "approved",
      "created_at": "2025-08-14T10:30:00Z"
    },
    {
      "id": "uuid-v2", 
      "version": 2,
      "status": "draft",
      "created_at": "2025-08-14T09:15:00Z"
    }
  ]
}
```

### Frontend Integration

The `checkCanEdit` method in the frontend automatically validates edit permissions before allowing users to modify courses:

```javascript
// Check if course can be edited
const editCheck = await coursesAPI.checkCanEdit(courseId);
if (!editCheck.canEdit) {
  // Show error message with reason
  alert(editCheck.reason);
  return;
}

// Proceed with editing
const editableCourse = await coursesAPI.getCourseForEdit(courseId);
```

### Use Cases Addressed

1. **Prevent Conflicts**: Stops users from editing active courses when newer versions are being worked on
2. **Status Awareness**: Different rules for active vs non-active courses
3. **Clear Messaging**: Specific error messages explaining why editing is blocked
4. **Version Tracking**: Detailed information about existing newer versions

### Benefits

- ✅ Prevents data conflicts
- ✅ Maintains version integrity  
- ✅ Provides clear user guidance
- ✅ Supports concurrent workflow management
- ✅ Status-specific validation logic

This implementation ensures that course editing is controlled appropriately based on the current course status and the existence of newer versions in the system.
