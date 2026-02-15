# Jira/Xray Test Orchestrator - Architecture (Electron)

## Overview
Secure desktop application for orchestrating Jira/Xray test workflows with template support.

## Tech Stack
- **Desktop Framework**: Electron 28+
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Zustand
- **Validation**: Zod
- **HTTP Client**: Axios
- **Credential Storage**: keytar (native OS keyring)
- **Build Tool**: Vite

## Architecture Pattern
**Clean Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│  React UI (Renderer Process)                        │
│  - Components (views)                               │
│  - Hooks (business logic)                           │
│  - Store (Zustand state)                            │
│  - Validation (Zod schemas)                         │
└──────────────┬──────────────────────────────────────┘
               │ IPC (contextBridge)
┌──────────────▼──────────────────────────────────────┐
│  Electron Main Process                              │
│  - IPC Handlers (receive commands)                  │
│  - Services (business logic)                        │
│    ├─ CredentialService (keytar)                    │
│    ├─ JiraService (API calls)                       │
│    └─ TemplateService (string interpolation)        │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS + Basic Auth
┌──────────────▼──────────────────────────────────────┐
│  Jira REST API + Xray REST API                      │
└─────────────────────────────────────────────────────┘
```

## Security Model

### 1. Process Isolation
- **Main Process**: Handles all sensitive operations (credentials, API calls)
- **Renderer Process**: UI only, no direct access to Node.js APIs
- **contextBridge**: Exposes only whitelisted IPC channels

### 2. Credential Management
- Stored in OS native keyring (Windows Credential Manager / macOS Keychain / Linux Secret Service)
- Never stored in localStorage, sessionStorage, or files
- Basic Auth token created in Main process only
- Credentials cleared from memory on app close

### 3. Network Security
- All API calls use HTTPS
- Certificate validation enabled
- No certificate pinning (would break in corporate environments)
- Axios timeout: 30 seconds

### 4. Content Security Policy (CSP)
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://*.vodafone.com;
```

### 5. Electron Security Checklist
- ✅ contextIsolation: true
- ✅ nodeIntegration: false
- ✅ sandbox: true
- ✅ webSecurity: true
- ✅ allowRunningInsecureContent: false
- ✅ DevTools disabled in production

## Module Structure

### Main Process (`src/main/`)
```
main/
├── index.ts              # Entry point, BrowserWindow setup
├── preload.ts            # contextBridge API exposure
├── ipc/
│   ├── authHandlers.ts   # Auth IPC handlers
│   ├── testHandlers.ts   # Test creation IPC handlers
│   └── templateHandlers.ts # Template IPC handlers
└── services/
    ├── credentialService.ts # OS keyring integration
    ├── jiraService.ts       # Jira/Xray API client
    └── templateService.ts   # Template interpolation
```

### Renderer Process (`src/renderer/`)
```
renderer/
├── App.tsx               # Root component
├── main.tsx              # React entry point
├── components/           # UI components
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── workflow/
│   │   ├── StoryInput.tsx
│   │   ├── TestForm.tsx
│   │   ├── TestSetForm.tsx
│   │   ├── ExecutionForm.tsx
│   │   └── ReviewStep.tsx
│   ├── templates/
│   │   ├── TemplateSelector.tsx
│   │   └── TemplateEditor.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useWorkflow.ts
│   └── useTemplates.ts
├── store/
│   └── appStore.ts       # Zustand store
├── api/
│   └── electron.ts       # IPC wrapper functions
├── types/
│   ├── jira.ts
│   └── template.ts
└── utils/
    └── validators.ts     # Zod schemas
```

### Shared (`src/shared/`)
```
shared/
├── constants.ts          # Custom field IDs, link types
└── types.ts              # Shared TypeScript types
```

## Jira/Xray API Mappings

### Confirmed Working Endpoints

| Operation | Method | Endpoint | Custom Fields |
|-----------|--------|----------|---------------|
| Create Test | POST | `/rest/api/2/issue` | `customfield_13900` (Test Type) |
| Add Test Step | PUT | `/rest/raven/1.0/api/test/{key}/step` | N/A |
| Create Test Set | POST | `/rest/api/2/issue` | N/A |
| Add Tests to Set | PUT | `/rest/api/2/issue/{setKey}` | `customfield_12412` |
| Create Execution | POST | `/rest/api/2/issue` | `customfield_12425` (Environments) |
| Add Tests to Exec | PUT | `/rest/api/2/issue/{execKey}` | `customfield_12415` |
| Link Issues | POST | `/rest/api/2/issueLink` | N/A |

### Custom Fields (MTD Project)

```typescript
const CUSTOM_FIELDS = {
  TEST_TYPE: 'customfield_13900',           // Manual/Automated
  MANUAL_TEST_STEPS: 'customfield_12404',   // Steps (read-only)
  TEST_ENVIRONMENTS: 'customfield_12425',   // Array of environments
  TESTS_IN_EXECUTION: 'customfield_12415',  // Array of test keys
  TESTS_IN_SET: 'customfield_12412',        // Array of test keys
  TEST_PLANS_LINK: 'customfield_12409',     // Array of plan keys
  PRECONDITIONS: 'customfield_12408',       // Array of precondition keys
};
```

## Template System

### Template Structure
```typescript
interface Template {
  id: string;
  name: string;
  issueType: 'Test' | 'TestSet' | 'TestExecution';
  fields: {
    summary: string;      // "TestSet - E2ETesting - {{name}}"
    description?: string; // "Created for {{feature}} on {{date}}"
    [key: string]: any;   // Other fields
  };
  variables: TemplateVariable[];
}

interface TemplateVariable {
  name: string;           // "name", "feature", etc.
  label: string;          // "Test Name"
  type: 'text' | 'date' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[];     // For select type
}
```

### Built-in Variables
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH:mm)
- `{{datetime}}` - Full timestamp
- `{{user}}` - Current Jira username
- `{{project}}` - Project key

### Template Storage
- Stored in `localStorage` (not sensitive data)
- JSON format
- User can create, edit, delete templates
- Export/import template packs

### Template Application
1. User selects template
2. Form pre-fills with template structure
3. User fills in variable values
4. Template engine interpolates `{{variables}}`
5. Final values sent to Jira API

Example:
```
Template: "TestSet - E2ETesting - {{name}}"
User Input: name = "Login Flow"
Result: "TestSet - E2ETesting - Login Flow"
```

## State Management (Zustand)

```typescript
interface AppStore {
  // Auth
  auth: AuthState;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  
  // Workflow
  currentStory: Story | null;
  tests: TestInput[];
  testSet: TestSetInput | null;
  execution: ExecutionInput | null;
  testPlanKey: string | null;
  
  // Templates
  templates: Template[];
  activeTemplate: Template | null;
  
  // UI State
  currentStep: number;
  isSubmitting: boolean;
}
```

## Error Handling

### Error Types
```typescript
enum ErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  JIRA_API_ERROR = 'JIRA_API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
}
```

### Error Flow
1. **Service Layer** catches errors and converts to AppError
2. **IPC Handler** returns `{ success: false, error: AppError }`
3. **React Hook** catches and displays user-friendly message
4. **UI Component** shows error toast/modal

## Workflow Steps

### Complete User Flow
1. **Login** → Store credentials in OS keyring (optional)
2. **Enter Story Key** → Validate it exists
3. **Create Tests** (one or more):
   - Select template (optional)
   - Fill all fields
   - Add test steps dynamically
   - Click "Add Another Test" for more
4. **Test Set** (optional):
   - Select template
   - Fill fields
   - Auto-link created tests
5. **Test Execution**:
   - Select template
   - Fill fields
   - Auto-link tests
6. **Link to Test Plan** (optional)
7. **Review & Submit**:
   - Preview all data
   - Execute workflow
   - Show success with links to created issues

## Rate Limiting

### Strategy
- Max 5 concurrent requests to Jira
- Implemented with `p-limit` library
- Queue additional requests
- Prevents 429 errors during bulk operations

### Implementation
```typescript
import pLimit from 'p-limit';

const limit = pLimit(5);

const requests = tests.map(test => 
  limit(() => jiraService.createTest(test))
);

await Promise.all(requests);
```

## Build & Distribution

### Development
```bash
npm run dev       # Start with hot reload
npm run lint      # ESLint + TypeScript check
npm run test      # Jest tests
```

### Production
```bash
npm run build     # Build renderer (Vite)
npm run electron:build  # Build and package (electron-builder)
```

### Distribution Files
- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` or `.deb`

### Code Signing
- Required for macOS notarization
- Recommended for Windows (prevents SmartScreen warnings)
- Use `electron-builder` with certificates

## Testing Strategy

### Unit Tests (Jest)
- Template interpolation logic
- Validation schemas
- Utility functions

### Integration Tests
- IPC communication (mock Electron)
- Jira API client (mock Axios)

### Manual Testing Checklist
- [ ] Login with valid/invalid credentials
- [ ] Save credentials to keyring
- [ ] Create single test
- [ ] Create multiple tests
- [ ] Add dynamic test steps
- [ ] Create with templates
- [ ] Complete workflow end-to-end
- [ ] Error handling (network failure)
- [ ] Rate limiting (create 20+ tests)

## Future Enhancements (v2)

- ⏳ Test execution (mark PASS/FAIL)
- ⏳ Evidence upload
- ⏳ Multi-project support
- ⏳ Custom field mapping UI
- ⏳ Bulk CSV import
- ⏳ Export results to Excel
- ⏳ Dark mode
- ⏳ Localization (i18n)

## Performance Considerations

### Bundle Size Optimization
- Tree-shaking (Vite)
- Lazy loading for routes
- Code splitting for large components

### Memory Management
- Clear credentials on logout
- Dispose of event listeners
- Limit stored templates to 100

### Startup Time
- Target: < 3 seconds
- Preload critical modules
- Defer non-essential initialization

## Maintenance Guidelines

### Adding New Issue Type
1. Add type to `src/shared/constants.ts`
2. Create Zod schema in `src/renderer/utils/validators.ts`
3. Add TypeScript interface in `src/renderer/types/jira.ts`
4. Add service method in `src/main/services/jiraService.ts`
5. Create IPC handler in `src/main/ipc/testHandlers.ts`
6. Add API wrapper in `src/renderer/api/electron.ts`
7. Create UI form component
8. Update ARCHITECTURE.md

### Adding Custom Field
1. Add to `CUSTOM_FIELDS` in `src/shared/constants.ts`
2. Update TypeScript interfaces
3. Add to form UI
4. Update Jira API payload in service

### Debugging
- Main process: `console.log` → appears in terminal
- Renderer process: `console.log` → appears in DevTools
- Enable DevTools in production: Set `ELECTRON_ENV=dev`

## Security Audit Checklist

- [ ] No credentials in localStorage
- [ ] No credentials in logs
- [ ] HTTPS only
- [ ] Certificate validation enabled
- [ ] contextIsolation enabled
- [ ] nodeIntegration disabled
- [ ] sandbox enabled
- [ ] CSP configured
- [ ] DevTools disabled in production
- [ ] Dependencies regularly updated
- [ ] Code signed for distribution

## Last Updated
2026-02-08 - Initial Electron architecture