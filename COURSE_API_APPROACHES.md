# Course API Implementation: Maximum Flexibility

This implementation provides **two approaches** for fetching course data for editing, giving developers maximum flexibility to choose their preferred pattern.

## Implementation Overview

### Backend Implementation
Both approaches are implemented in `backend/routes/courses.js`:

1. **Query Parameter Approach**: `GET /courses/:id?resolve_names=false`
2. **Dedicated Endpoint Approach**: `GET /courses/:id/edit`

### Frontend Implementation
Both approaches are available in `frontend/src/services/api.ts`:

1. **Query Parameter Method**: `coursesAPI.getCourseForEdit(id)`
2. **Dedicated Endpoint Method**: `coursesAPI.getCourseForEditDedicated(id)`

## API Endpoints

### 1. Query Parameter Approach

**Endpoint**: `GET /courses/:id?resolve_names=false`

```javascript
// Backend route handles resolve_names parameter
const resolveNames = req.query.resolve_names !== 'false';

// Frontend usage
const editableCourse = await coursesAPI.getCourseForEdit('123');
```

**Pros:**
- Single endpoint handles multiple use cases
- Flexible parameter-based configuration
- Fewer endpoints to maintain

**Cons:**
- Parameters may not be obvious to new developers
- Less discoverable in API documentation

### 2. Dedicated Endpoint Approach

**Endpoint**: `GET /courses/:id/edit`

```javascript
// Backend route dedicated for editing
router.get('/:id/edit', async (req, res) => {
  // Returns course with UUIDs intact (no name resolution)
});

// Frontend usage
const editableCourse = await coursesAPI.getCourseForEditDedicated('123');
```

**Pros:**
- Clear, semantic URL structure
- Self-documenting API design
- Follows REST conventions

**Cons:**
- More endpoints to maintain
- Potential code duplication

## Usage Examples

### Display Course Information
```javascript
// Always resolves faculty UUIDs to names for display
const course = await coursesAPI.getCourseById('123');
console.log(course.faculty_details.primary_instructor); // "John Smith"
```

### Edit Course (Query Parameter)
```javascript
// Keeps UUIDs intact for form editing
const editableCourse = await coursesAPI.getCourseForEdit('123');
console.log(editableCourse.faculty_details.primary_instructor); // "uuid-string"
```

### Edit Course (Dedicated Endpoint)
```javascript
// Keeps UUIDs intact for form editing
const editableCourse = await coursesAPI.getCourseForEditDedicated('123');
console.log(editableCourse.faculty_details.primary_instructor); // "uuid-string"
```

## Data Transformation Behavior

### Default Behavior (`resolve_names=true`)
- Faculty UUIDs are resolved to human-readable names
- Perfect for display in UI components
- Used by `getCourseById()` method

### Editing Behavior (`resolve_names=false`)
- Faculty UUIDs remain as UUIDs
- Perfect for form editing with select dropdowns
- Used by both `getCourseForEdit()` and `getCourseForEditDedicated()` methods

## Testing Both Approaches

### Test Query Parameter Approach
```bash
# Resolved names (default)
curl http://localhost:3001/api/courses/123

# UUIDs for editing
curl http://localhost:3001/api/courses/123?resolve_names=false
```

### Test Dedicated Endpoint Approach
```bash
# Resolved names (standard endpoint)
curl http://localhost:3001/api/courses/123

# UUIDs for editing (dedicated endpoint)  
curl http://localhost:3001/api/courses/123/edit
```

## Recommendation

**Choose based on your team's preferences:**

- **Query Parameter**: If you prefer fewer endpoints and flexible configuration
- **Dedicated Endpoint**: If you prefer clear, semantic REST API design

Both approaches provide identical functionality - it's purely a matter of API design philosophy.

## Migration Path

If you want to transition between approaches:

1. **From Query Parameter to Dedicated**: Replace `getCourseForEdit()` calls with `getCourseForEditDedicated()`
2. **From Dedicated to Query Parameter**: Replace `getCourseForEditDedicated()` calls with `getCourseForEdit()`

Both methods will continue to be maintained for maximum flexibility.
