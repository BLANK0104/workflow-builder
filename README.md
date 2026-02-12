# Workflow Builder Lite

A powerful and elegant web application for creating and running text automation workflows using AI. Process text, documents, and files through customizable multi-step workflows powered by Groq AI.

## Features

- **Create Custom Workflows**: Build workflows with 2-4 steps from 12 predefined step types or create your own custom steps
- **AI-Powered Processing**: Uses Groq Llama 3.1 70B to process text through multiple stages with 128K token context window
- **File Upload Support**: Process TXT, MD, CSV, and JSON files (up to 10MB)
- **Custom Steps**: Define your own processing steps using natural language
- **Complete History**: View all workflow runs with detailed step outputs and filtering
- **Result Modal**: See outputs in an elegant popup with tabs for each step
- **Loading Animation**: Clear feedback during workflow execution
- **System Status**: Monitor backend, database, and AI connection health
- **File Size Validation**: Automatic validation against Groq token limits (~512KB)

## Step Types

### Predefined Steps (11)
1. **Clean Text**: Remove extra whitespace and fix formatting
2. **Summarize**: Create a concise summary of the text
3. **Extract Key Points**: Extract main points as bullet list
4. **Categorize**: Tag text with relevant categories
5. **Translate**: Translate to English
6. **Sentiment Analysis**: Analyze sentiment and tone
7. **Extract Keywords**: Find important keywords and phrases
8. **Generate Questions**: Create relevant questions from text
9. **Expand**: Add more details and context
10. **Simplify**: Make text easier to understand
11. **Bullet Points**: Convert to clear bullet format

### Custom Steps
12. **Custom**: Define your own processing with natural language prompts

## Tech Stack

- **Framework**: Next.js 15 with App Router and TypeScript
- **Database**: MongoDB Atlas
- **AI Provider**: Groq with Llama 3.1 70B (128K token context, extremely fast)
- **Styling**: Tailwind CSS
- **Runtime**: Node.js

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Groq API key (free at console.groq.com)

## How to Run

1. **Clone the repository**
   ```bash
   cd workflow-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with:
   ```
   MONGODB_URI=your_mongodb_connection_string
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

### 1. Create a Workflow
- Click "+ New" in the Create Workflow section
- Give your workflow a name and optional description
- Select 2-4 steps by clicking on them (they are ordered by selection)
- For custom steps, provide a natural language prompt describing what you want
- Click "Create Workflow"

### 2. Run a Workflow
- Select a workflow from the dropdown
- Choose input type: Text or File
- **For text**: Enter or paste your text (up to ~4MB)
- **For files**: Upload TXT, MD, CSV, or JSON file (max 10MB)
- Click "▶ Run Workflow"
- Watch the loading animation while processing

### 3. View Results
- Results appear automatically in a popup modal
- Use tabs to navigate between Input and each step's output
- See execution time, status, and any errors for each step
- Click "Close" to dismiss the modal
- Recent runs are shown on the home page (click to reopen)

### 4. Check History
- Click "Run History" in the top navigation or home page
- Filter by All, Success, or Error runs
- Click any run to view full results in the modal
- See file information for file-based runs

### 5. Check System Status
- Navigate to the Status page using the top navigation
- View health of Backend, Database, and LLM connection
- Red = unhealthy, Green = healthy

## File Support

### Supported Formats
- **Text files**: .txt, .md
- **Data files**: .csv, .json
- **Documents**: .pdf (PDF), .docx (Word)
- **Spreadsheets**: .xlsx, .xls (Excel)

### File Limitations
- Maximum file size: 10MB
- Maximum content size: ~512KB (Groq Llama 3.1 70B token limit)
- Empty files are rejected with clear error messages
- Files are parsed on the server for security and compatibility

## Error Handling

The app provides clear error messages for:
- Empty input text or files
- File size exceeding limits
- Unsupported file types
- Invalid workflow selection
- Database connection failures
- Groq API failures
- Network errors
- Missing custom step prompts

## What is Done

✅ Full workflow creation with 2-4 steps
✅ 12 AI-powered step types including custom natural language prompts
✅ Workflow execution with step-by-step processing
✅ Complete run history with filtering (all runs saved)
✅ File upload support (TXT, MD, CSV, JSON, PDF, DOCX, XLSX, XLS)
✅ Result modal with tabbed interface (Input + all steps)
✅ Loading animation during execution
✅ System status monitoring page
✅ Comprehensive error handling for all scenarios
✅ File size validation based on Groq limits
✅ MongoDB integration for persistent storage
✅ Groq Llama 3.1 70B integration (128K context, ultra-fast)
✅ Responsive design with dark mode support
✅ Real-time feedback during workflow execution
✅ Navigation between Home, Status, and History pages
✅ API routes for workflows, runs, and status
✅ Complete documentation (README, AI_NOTES, PROMPTS_USED)

## What is Not Done

❌ User authentication/authorization
❌ Workflow editing/updating (only create and delete)
❌ Workflow templates/sharing
❌ Export/import workflows
❌ Advanced analytics or visualization charts
❌ Workflow scheduling/automation
❌ Rate limiting for API calls
❌ Comprehensive error logging service
❌ Unit/integration tests
❌ Batch file processing
❌ Real-time streaming of LLM responses
❌ Workflow versioning

## Project Structure

```
workflow-builder/
├── app/
│   ├── api/           # API routes
│   │   ├── workflows/ # Workflow CRUD operations
│   │   ├── runs/      # Run execution
│   │   └── status/    # Health check
│   ├── status/        # Status page
│   ├── history/       # History page with all runs
│   ├── layout.tsx     # Root layout with navigation
│   └── page.tsx       # Home page
├── components/
│   ├── ResultModal.tsx   # Modal popup with tabs for results
│   └── LoadingSpinner.tsx # Loading animation
├── lib/
│   ├── mongodb.ts     # Database connection
│   ├── gemini.ts      # AI integration with Groq Llama 3.1 70B
│   ├── types.ts       # TypeScript types
│   └── fileUtils.ts   # File upload and extraction utilities
└── .env.local         # Environment variables
```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `GROQ_API_KEY`: Groq API key

## API Endpoints

- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows/[id]` - Get workflow by ID
- `DELETE /api/workflows/[id]` - Delete workflow
- `GET /api/runs` - Get runs (optional ?limit=5 for recent only)
- `POST /api/runs` - Execute a workflow (supports text and file input)
- `GET /api/status` - Check system health

## Token Limits

### Groq with Llama 3.1 70B
- **Input**: 128,000 tokens (~512KB of text)
- **Output**: 8,000 tokens
- **Speed**: 10x faster than other providers
- **File size limit**: 10MB (content checked against token limit)

## License

MIT

## Author

See [ABOUTME.md](./ABOUTME.md) for author information.

