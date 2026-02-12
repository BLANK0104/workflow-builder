# Prompts Used for App Development

This document records the key prompts used during the development of the Workflow Builder Lite application.

## Initial Setup Prompts

### 1. Project Creation
```
Create a Next.js application called "workflow-builder" with TypeScript, Tailwind CSS, and App Router
```

### 2. Project Requirements
```
Build a Workflow Builder Lite app in Next.js with the following features:
- Create workflows with 2-4 steps (clean text, summarize, extract key points, categorize)
- Run workflows on input text
- Display output of each step
- Show run history (last 5 runs)
- Include a status page for backend, database, and LLM health
- Handle empty/wrong input
- Create README, AI_NOTES, ABOUTME, and PROMPTS_USED documentation files

Use MongoDB for database and Groq for AI processing.
```

### 3. Feature Enhancement Request
```
Add the following improvements:
- Loading animation when workflow is running
- Show all outputs in a popup with tabs for each step
- Add more step types (8 additional beyond the original 4)
- Allow custom steps with natural language prompts
- Add file upload support (PDF, Word, CSV, etc.)
- Implement error handling for empty files
- Save all past results (not just last 5)
- Add a separate history page
- Add file size limits based on Groq Llama 3.1 70B limits
- Clear error messages for all failure scenarios
```

## Database Setup Prompts

### 4. MongoDB Connection
```
Create a MongoDB connection utility for Next.js 15 that:
- Uses the MONGODB_URI environment variable
- Implements connection pooling
- Works in both development and production
- Exports a getDatabase function
```

### 5. Database Schema
```
Define TypeScript types for:
- Workflow (with name, description, steps array)
- WorkflowStep (with id, type, name, order, customPrompt)
- WorkflowRun (with workflow reference, input, inputType, fileName, results, duration, status)
- StepResult (with step info, input/output, duration, status, error)
- Support for 12 different step types including custom
```

## AI Integration Prompts

### 6. Groq Integration
```
Create a Groq AI wrapper that:
- Uses Groq Llama 3.1 70B Versatile model
- Supports multiple step types (clean, summarize, extract, categorize, translate, sentiment, keywords, questions, expand, simplify, bullet-points, custom)
- Handles custom user-defined prompts
- Includes proper error handling
- Exports token limit constants (128K input tokens, ~512KB chars)
- Has connection health check functionality
```

## Component Development Prompts

### 7. Result Modal Component
```
Create a ResultModal component that:
- Displays workflow results in a modal/popup
- Has tabs for Input and each step output
- Shows step status (success/error)
- Displays duration for each step
- Handles error messages clearly
- Shows file information if input was a file
- Has responsive design and dark mode support
```

### 8. Loading Spinner Component
```
Create a LoadingSpinner component that:
- Shows a full-screen overlay with animation
- Displays "Processing Workflow..." message
- Has a spinning animation with indigo theme
- Works with dark mode
```

### 9. File Upload Utilities
```
Create file utility functions for:
- Extracting text from various file types (TXT, MD, CSV, JSON)
- Validating file size (max 10MB)
- Checking for empty files
- Providing clear error messages
- Returning list of supported file types
```

## Page Development Prompts

### 10. Main Page Enhancement
```
Update the home page to include:
- 12 step types instead of 4
- Custom step type with textarea for user prompt
- File upload mode with file picker
- Input mode toggle (text vs file)
- Character counter for text input
- File size validation feedback
- Loading animation integration
- Result modal integration
- Success/error message display
- Links to status and history pages
```

### 11. History Page
```
Create a history page that:
- Shows all workflow runs (not limited to 5)
- Has filters for all/success/error runs
- Displays runs in a table format
- Shows date, workflow name, input type, step count, duration, status
- Opens result modal when clicking on a run
- Has a back button to home
- Shows file information for file-based runs
```

## API Route Prompts

### 12. Enhanced Runs API
```
Update the /api/runs endpoint to:
- Support optional limit query parameter
- Return all runs if no limit specified
- Include inputType, fileName, fileType in run data
- Better error handling with descriptive messages
- Return errors immediately when steps fail
- Save all run data to database regardless of success/failure
```

### 13. Workflows API
```
Ensure the /api/workflows endpoint:
- Validates 2-4 step requirement
- Supports custom prompt field in steps
- Returns clear error messages
- Handles all 12 step types
```

## Documentation Prompts

### 14. README Update
```
Update README.md to include:
- New features (file upload, custom steps, history page)
- File size limits and supported formats
- Updated architecture description
- New step types list
- Enhanced screenshots section
```

### 15. AI Notes Update
```
Update AI_NOTES.md to reflect:
- Use of Groq Llama 3.1 70B instead of GPT
- Reasons for choosing Groq (speed, token limits, cost, performance)
- New file handling features
- Enhanced error handling
- Modal component with tabs
```

## Testing and Debugging Prompts

### 16. Error Handling
```
Implement comprehensive error handling for:
- Empty input text or files
- File size exceeding limits
- Unsupported file types
- Invalid workflow selection
- Database connection failures
- Groq API failures
- Network errors
```

### 17. Validation
```
Add validation for:
- Workflow name required
- 2-4 steps selection
- Custom step prompts required when custom type selected
- File size under 10MB
- Text size under Groq token limit (~512KB)
- Non-empty file content
```
- Initializes with API key from environment
- Implements processWithGemini function for different step types (note: function name retained for backward compatibility)
- Handles errors gracefully
- Includes health check function
```

### 6. Step Type Prompts
```
Generate appropriate prompts for each step type:
- Clean: Remove whitespace and fix formatting
- Summarize: Create concise summary
- Extract: Extract key points as bullets
- Categorize: Tag with relevant categories
```

## API Routes Prompts

### 7. Workflows API
```
Create API routes for workflows:
- GET /api/workflows - list all workflows
- POST /api/workflows - create new workflow with validation
- GET /api/workflows/[id] - get specific workflow
- DELETE /api/workflows/[id] - delete workflow
```

### 8. Runs API
```
Create API routes for workflow execution:
- GET /api/runs - get last 5 runs
- POST /api/runs - execute workflow, process through steps sequentially
Include error handling for each step
```

### 9. Status API
```
Create health check endpoint that:
- Checks backend status
- Pings MongoDB
- Tests Groq connection
- Returns JSON with status for each service
```

## Frontend Component Prompts

### 10. Home Page
```
Create a home page with three sections:
1. Create Workflow - form to build workflows with step selection
2. Run Workflow - select workflow and input text to process
3. Recent Runs - display last 5 runs with step outputs
Include error handling and loading states
```

### 11. Status Page
```
Create a status monitoring page that:
- Displays health of backend, database, and LLM
- Shows visual indicators (red/green)
- Auto-refreshes every 30 seconds
- Includes manual refresh button
```

### 12. Layout and Navigation
```
Update the root layout to include:
- Navigation bar with links to Home and Status pages
- Consistent styling with Tailwind CSS
- Dark mode support
```

## Styling Prompts

### 13. UI Design
```
Style the application with:
- Modern gradient background
- Card-based layout for sections
- Indigo/blue color scheme
- Responsive design for mobile and desktop
- Dark mode compatible
- Smooth transitions and hover effects
```

### 14. Status Indicators
```
Create status indicators that:
- Use color coding (green=healthy, red=unhealthy)
- Include animated pulse effects
- Show status labels clearly
- Work in both light and dark modes
```

## Documentation Prompts

### 15. README
```
Write a comprehensive README that includes:
- Project description and features
- Tech stack
- Prerequisites and setup instructions
- Usage guide
- What is done and not done
- Project structure
- API documentation
```

### 16. AI Notes
```
Document AI usage in development:
- What AI was used for (code generation, architecture, docs)
- What was manually verified (API integration, business logic, testing)
- Which LLM provider and model was chosen and why
- Development process and lessons learned
```

### 17. ABOUTME Template
```
Create an ABOUTME template with sections for:
- Name and contact information
- Professional summary
- Skills (languages, frontend, backend, databases, tools)
- Education and experience
- Projects and certifications
```

### 18. PROMPTS_USED
```
Create a document recording all major prompts used during development,
organized by category (setup, database, AI, API, frontend, styling, docs)
```

## Testing and Refinement Prompts

### 19. Error Handling
```
Add error handling for:
- Empty or missing input
- Invalid workflow selection
- Database connection failures
- AI API errors
- Network timeouts
```

### 20. Input Validation
```
Implement validation for:
- Workflow must have 2-4 steps
- Workflow name is required
- Input text cannot be empty
- Workflow ID must be valid
```

## Environment Setup Prompts

### 21. Environment Variables
```
Create .env.local file with:
- MONGODB_URI for database connection
- GROQ_API_KEY for AI processing
Add validation to check these are set
```

### 22. Dependencies
```
Install required packages:
- mongodb for database
- @google/generative-ai for AI
- TypeScript types as needed
```

---

## Notes

- Prompts are paraphrased for clarity and brevity
- Actual prompts may have included additional context or iterations
- Some prompts were refined through multiple attempts
- Error handling and edge cases were added iteratively
- Styling was adjusted based on visual feedback

---

*Document Purpose*: Track AI-assisted development process for transparency and learning. This log shows the iterative nature of building a full-stack application with AI assistance while maintaining human oversight for validation and refinement.
