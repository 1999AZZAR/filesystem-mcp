# FileSystem MCP Server


> **Part of the [HeLa MCP Ecosystem](https://github.com/1999AZZAR/hela-hela-mcp-ecosystem)** — This server is **HeLa Membrane (`hela-membrane`)** — the *Workspace FS* component of the HeLa cellular architecture. See the [ecosystem docs](https://github.com/1999AZZAR/hela-hela-mcp-ecosystem) for profiles, workflows, and multi-client setup.

A comprehensive Model Context Protocol (MCP) server for advanced file system operations. This server provides structured file management capabilities including file operations, directory management, file watching, search functionality, and archiving operations.

![Blotcat stamping cached metadata folders on a conveyor belt with a 5-minute TTL timer](assets/blotcat-caching.jpg)

## Table of Contents

- [Features](#features)
  - [Core File Operations](#core-file-operations)
  - [Directory Operations](#directory-operations)
  - [Advanced Operations](#advanced-operations)
  - [Enterprise Features](#enterprise-features)
- [Available Resources](#available-resources)
- [Installation](#installation)
- [Configuration](#configuration)
  - [For Cursor IDE](#for-cursor-ide)
  - [For Claude Desktop](#for-claude-desktop)
- [Available Tools](#available-tools)
  - [1. File Operations](#1-file-operations)
  - [2. Directory Operations](#2-directory-operations)
  - [3. Advanced Operations](#3-advanced-operations)
- [Usage Examples](#usage-examples)
  - [Basic File Operations](#basic-file-operations)
  - [Directory Management](#directory-management)
  - [Advanced Operations](#advanced-operations)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Development Commands](#development-commands)
  - [Testing](#testing)
  - [Error Handling](#error-handling)
  - [Performance Considerations](#performance-considerations)
- [Security Considerations](#security-considerations)
- [License](#license)
- [Contributing](#contributing)
- [Support](#support)

## Features

### Core File Operations
- **File Reading**: Read files with optional encoding and range support
- **File Writing**: Write content with encoding options and directory creation
- **File Copying**: Copy files with timestamp preservation and overwrite control
- **File Moving**: Move/rename files with conflict resolution
- **File Deletion**: Delete files and directories with recursive options
- **File Information**: Get detailed file metadata including permissions and timestamps

### Directory Operations
- **Directory Creation**: Create directories with recursive parent creation
- **Directory Listing**: List contents with filtering, recursion, and depth control
- **File Finding**: Find files using glob patterns with advanced filtering
- **Directory Size**: Calculate directory sizes recursively with human-readable formatting

### Advanced Operations
- **Text Search**: Search for patterns in files with context and filtering
- **File Watching**: Watch files and directories for changes with event handling
- **File Comparison**: Compare files with whitespace and case sensitivity options
- **Archiving**: Create and extract archives in multiple formats (ZIP, TAR, GZIP)
- **Batch Operations**: Perform operations on multiple files efficiently

### Enterprise Features
- **TypeScript**: Fully typed with comprehensive error handling
- **Input Validation**: Zod schema validation for all parameters
- **Error Recovery**: Graceful error handling with detailed error messages
- **Resource Management**: Automatic cleanup of watchers and resources
- **Performance**: Optimized for large file operations and batch processing
- **Intelligent Caching**: TTL-based caching system for file metadata and search results
- **MCP Resources**: 7 specialized resources providing cached filesystem data and metadata

## Available Resources

FileSystem MCP Server provides **7 specialized resources** that offer cached file system data and intelligent metadata access with configurable TTL-based caching for optimal performance:

### `file://metadata/{path}`
Returns cached metadata for files and directories including permissions, size, modification dates, and ownership.

**Resource Details:**
- **Purpose**: Access file/directory metadata without repeated stat calls
- **Benefits**: Faster file information queries, reduced I/O operations, metadata caching
- **Cache TTL**: 5 minutes - balances metadata freshness with performance
- **Use Cases**: File explorers, permission checking, size calculations, file monitoring

**Response Format:**
```json
{
  "path": "/home/user/document.txt",
  "metadata": {
    "size": 1024,
    "permissions": "rw-r--r--",
    "owner": "user",
    "group": "users",
    "modified": "2025-11-02T10:30:00.000Z",
    "accessed": "2025-11-02T10:30:00.000Z",
    "created": "2025-11-01T15:20:00.000Z"
  },
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

### `file://directory/{path}`
Provides cached directory listing with file details, sizes, and metadata for faster browsing.

**Resource Details:**
- **Purpose**: Access directory contents without repeated directory reads
- **Benefits**: Instant directory browsing, cached file listings, reduced I/O for navigation
- **Cache TTL**: 5 minutes - keeps directory structure reasonably current
- **Use Cases**: File managers, directory exploration, project navigation

**Response Format:**
```json
{
  "path": "/home/user/projects",
  "contents": {
    "success": true,
    "data": {
      "items": [
        {
          "name": "app.js",
          "path": "/home/user/projects/app.js",
          "type": "file",
          "size": 2048,
          "permissions": "rw-r--r--",
          "modified": "2025-11-02T10:30:00.000Z"
        }
      ]
    }
  },
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

### `file://search/cache/{query}`
Caches results from file content and pattern searches across the filesystem.

**Resource Details:**
- **Purpose**: Cache expensive search operations across large codebases
- **Benefits**: Fast repeated searches, reduced filesystem traversal, search result persistence
- **Cache TTL**: 5 minutes - allows for reasonable search result freshness
- **Use Cases**: Code search, content finding, pattern matching, file discovery

**Response Format:**
```json
{
  "query": "function.*handleError",
  "results": {
    "success": true,
    "data": {
      "matches": [
        {
          "file": "/src/error-handler.js",
          "line": 15,
          "content": "function handleError(error) {",
          "context": ["// Error handling function", "function handleError(error) {", "  console.error(error);"]
        }
      ]
    }
  },
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

### `file://watch/status/{path}`
Shows current status and recent events for file system watchers.

**Resource Details:**
- **Purpose**: Monitor file watching status and recent change events
- **Benefits**: Track active watchers, view recent file changes, debug watch operations
- **Cache TTL**: 30 seconds - provides near real-time watch status
- **Use Cases**: Development monitoring, file change tracking, watch debugging

**Response Format:**
```json
{
  "path": "/home/user/projects",
  "isWatching": true,
  "lastEvents": [
    {
      "event": "change",
      "filename": "app.js",
      "timestamp": "2025-11-02T17:08:45.123Z"
    }
  ],
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

### `file://recent/{type}`
Lists recently accessed files of specified type (read/write/modified).

**Resource Details:**
- **Purpose**: Track recently accessed files for quick access and auditing
- **Benefits**: Quick access to recently worked files, usage tracking, productivity insights
- **Cache TTL**: 5 minutes - keeps recent file list reasonably current
- **Use Cases**: File history, recent documents, usage analytics

**Response Format:**
```json
{
  "type": "modified",
  "files": [
    {
      "path": "/home/user/document.txt",
      "accessed": "2025-11-02T17:05:00.000Z",
      "size": 1024
    }
  ],
  "count": 1,
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

### `file://structure/{path}`
Provides hierarchical directory structure with file counts and size summaries.

**Resource Details:**
- **Purpose**: Get complete directory tree structure with statistics
- **Benefits**: Project overview, size analysis, structure visualization, disk usage tracking
- **Cache TTL**: 5 minutes - balances structure accuracy with performance
- **Use Cases**: Project analysis, disk cleanup, directory visualization

**Response Format:**
```json
{
  "path": "/home/user/projects",
  "structure": {
    "name": "projects",
    "type": "directory",
    "path": "/home/user/projects",
    "children": [
      {
        "name": "src",
        "type": "directory",
        "path": "/home/user/projects/src",
        "size": 0
      },
      {
        "name": "README.md",
        "type": "file",
        "path": "/home/user/projects/README.md",
        "size": 2048
      }
    ],
    "stats": {
      "totalFiles": 5,
      "totalDirs": 3,
      "totalSize": 15360
    }
  },
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

### `file://content/preview/{path}`
Generates cached preview of file content (first lines/chars) for quick inspection.

**Resource Details:**
- **Purpose**: Preview file content without loading entire files
- **Benefits**: Quick file inspection, content type detection, safe file preview
- **Cache TTL**: 5 minutes - keeps previews reasonably fresh
- **Use Cases**: File exploration, content verification, type detection, safe browsing

**Response Format:**
```json
{
  "path": "/home/user/document.txt",
  "preview": {
    "path": "/home/user/document.txt",
    "type": "file",
    "preview": "This is the beginning of the document...\nIt contains important information...",
    "canPreview": true,
    "size": 1024,
    "mimeType": "text/plain",
    "encoding": "utf8"
  },
  "cached": false,
  "timestamp": "2025-11-02T17:09:14.866Z"
}
```

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/1999AZZAR/filesystem-mcp.git
cd filesystem-mcp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Test the server:**
```bash
npm start
```

## Configuration

### For Cursor IDE

Add this server to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "filesystem-mcp": {
      "command": "node",
      "args": ["/path/to/filesystem-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### For Claude Desktop

Add this server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "filesystem-mcp": {
      "command": "node",
      "args": ["/path/to/filesystem-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## Available Tools

![Blotcat operating a complex MCP switchboard with 18 tool sockets for read, write, watch, search, and archive](assets/blotcat-tools.jpg)

This MCP server provides **18 powerful tools** for comprehensive file system management:

### 1. File Operations

#### `read_file` - Read File Content
Read file content with optional encoding and range support.

**Parameters:**
- `path` (required): Path to the file to read
- `encoding` (optional): File encoding - "utf8", "utf16le", "latin1", "base64", "hex", "ascii", "binary" (default: "utf8")
- `offset` (optional): Byte offset to start reading from
- `limit` (optional): Maximum number of bytes to read

**Example:**
```json
{
  "name": "read_file",
  "arguments": {
    "path": "/path/to/file.txt",
    "encoding": "utf8",
    "offset": 0,
    "limit": 1024
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "File read successfully",
  "path": "/path/to/file.txt",
  "data": {
    "content": "File content here...",
    "encoding": "utf8",
    "size": 1024
  }
}
```

#### `write_file` - Write File Content
Write content to file with optional encoding and directory creation.

**Parameters:**
- `path` (required): Path to the file to write
- `content` (required): Content to write to the file
- `encoding` (optional): File encoding (default: "utf8")
- `createDirs` (optional): Create parent directories if they don't exist (default: false)
- `append` (optional): Append to file instead of overwriting (default: false)

**Example:**
```json
{
  "name": "write_file",
  "arguments": {
    "path": "/path/to/file.txt",
    "content": "Hello, World!",
    "encoding": "utf8",
    "createDirs": true
  }
}
```

#### `copy_file` - Copy File
Copy file from source to destination with options.

**Parameters:**
- `source` (required): Source file path
- `destination` (required): Destination file path
- `overwrite` (optional): Overwrite destination if it exists (default: false)
- `preserveTimestamps` (optional): Preserve file timestamps (default: true)

**Example:**
```json
{
  "name": "copy_file",
  "arguments": {
    "source": "/path/to/source.txt",
    "destination": "/path/to/destination.txt",
    "overwrite": true,
    "preserveTimestamps": true
  }
}
```

#### `move_file` - Move File
Move file from source to destination.

**Parameters:**
- `source` (required): Source file path
- `destination` (required): Destination file path
- `overwrite` (optional): Overwrite destination if it exists (default: false)

**Example:**
```json
{
  "name": "move_file",
  "arguments": {
    "source": "/path/to/source.txt",
    "destination": "/path/to/destination.txt",
    "overwrite": false
  }
}
```

#### `delete_file` - Delete File or Directory
Delete file or directory with options.

**Parameters:**
- `path` (required): Path to delete
- `recursive` (optional): Recursively delete directories (default: false)
- `force` (optional): Force deletion even if path doesn't exist (default: false)

**Example:**
```json
{
  "name": "delete_file",
  "arguments": {
    "path": "/path/to/file.txt",
    "recursive": false,
    "force": false
  }
}
```

#### `get_file_info` - Get File Information
Get detailed file information including metadata.

**Parameters:**
- `path` (required): Path to get information for
- `followSymlinks` (optional): Follow symbolic links (default: true)

**Example:**
```json
{
  "name": "get_file_info",
  "arguments": {
    "path": "/path/to/file.txt",
    "followSymlinks": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "File information retrieved successfully",
  "path": "/path/to/file.txt",
  "data": {
    "name": "file.txt",
    "path": "/path/to/file.txt",
    "type": "file",
    "size": 1024,
    "isDirectory": false,
    "isFile": true,
    "isSymlink": false,
    "permissions": "644",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "modifiedAt": "2024-01-15T10:30:00.000Z",
    "accessedAt": "2024-01-15T10:30:00.000Z",
    "extension": ".txt",
    "mimeType": "text/plain"
  }
}
```

### 2. Directory Operations

#### `create_directory` - Create Directory
Create directory with optional recursive creation.

**Parameters:**
- `path` (required): Directory path to create
- `recursive` (optional): Create parent directories recursively (default: false)
- `mode` (optional): Directory permissions in octal format

**Example:**
```json
{
  "name": "create_directory",
  "arguments": {
    "path": "/path/to/new/directory",
    "recursive": true,
    "mode": "755"
  }
}
```

#### `list_directory` - List Directory Contents
List directory contents with optional filtering and recursion.

**Parameters:**
- `path` (required): Directory path to list
- `recursive` (optional): List contents recursively (default: false)
- `includeHidden` (optional): Include hidden files and directories (default: false)
- `maxDepth` (optional): Maximum depth for recursive listing
- `fileTypes` (optional): Filter by file types - ["file", "directory", "symlink"]

**Example:**
```json
{
  "name": "list_directory",
  "arguments": {
    "path": "/path/to/directory",
    "recursive": true,
    "includeHidden": false,
    "maxDepth": 3,
    "fileTypes": ["file", "directory"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Directory listed successfully (15 items)",
  "path": "/path/to/directory",
  "data": {
    "items": [
      {
        "name": "file1.txt",
        "path": "/path/to/directory/file1.txt",
        "type": "file",
        "size": 1024,
        "isDirectory": false,
        "isFile": true,
        "isSymlink": false,
        "permissions": "644",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "modifiedAt": "2024-01-15T10:30:00.000Z",
        "accessedAt": "2024-01-15T10:30:00.000Z",
        "extension": ".txt",
        "mimeType": "text/plain"
      }
    ],
    "count": 15,
    "recursive": true,
    "includeHidden": false
  }
}
```

#### `find_files` - Find Files
Find files matching a pattern.

**Parameters:**
- `pattern` (required): Glob pattern to match files
- `directory` (optional): Directory to search in (default: ".")
- `maxDepth` (optional): Maximum search depth
- `includeHidden` (optional): Include hidden files (default: false)
- `fileTypes` (optional): Filter by file types
- `caseSensitive` (optional): Case-sensitive pattern matching (default: false)

**Example:**
```json
{
  "name": "find_files",
  "arguments": {
    "pattern": "*.txt",
    "directory": "/path/to/search",
    "maxDepth": 3,
    "includeHidden": false,
    "fileTypes": ["file"],
    "caseSensitive": false
  }
}
```

#### `get_directory_size` - Get Directory Size
Get directory size recursively.

**Parameters:**
- `path` (required): Directory path

**Example:**
```json
{
  "name": "get_directory_size",
  "arguments": {
    "path": "/path/to/directory"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Directory size calculated successfully",
  "path": "/path/to/directory",
  "data": {
    "totalSize": 1048576,
    "fileCount": 25,
    "dirCount": 5,
    "humanReadable": "1.00 MB"
  }
}
```

### 3. Advanced Operations

![Blotcat multitasking with a magnifying glass for fast search and a zipper-box archiver](assets/blotcat-advanced.jpg)

#### `search_in_files` - Search in Files
Search for text patterns in files.

**Parameters:**
- `pattern` (required): Text pattern to search for
- `directory` (optional): Directory to search in (default: ".")
- `filePattern` (optional): Glob pattern for files to search
- `maxDepth` (optional): Maximum search depth
- `includeHidden` (optional): Include hidden files (default: false)
- `caseSensitive` (optional): Case-sensitive search (default: false)
- `wholeWord` (optional): Match whole words only (default: false)
- `contextLines` (optional): Number of context lines around matches (default: 2)

**Example:**
```json
{
  "name": "search_in_files",
  "arguments": {
    "pattern": "function",
    "directory": "/path/to/code",
    "filePattern": "*.js",
    "maxDepth": 2,
    "includeHidden": false,
    "caseSensitive": false,
    "wholeWord": true,
    "contextLines": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Search completed: 5 files with matches",
  "path": "/path/to/code",
  "data": {
    "results": [
      {
        "path": "/path/to/code/file.js",
        "matches": [
          {
            "line": 10,
            "column": 1,
            "text": "function",
            "context": "// This is a function\nexport function myFunction() {\n  return 'hello';\n}"
          }
        ],
        "fileInfo": {
          "name": "file.js",
          "path": "/path/to/code/file.js",
          "type": "file",
          "size": 2048,
          "isDirectory": false,
          "isFile": true,
          "isSymlink": false,
          "permissions": "644",
          "createdAt": "2024-01-15T10:30:00.000Z",
          "modifiedAt": "2024-01-15T10:30:00.000Z",
          "accessedAt": "2024-01-15T10:30:00.000Z",
          "extension": ".js",
          "mimeType": "application/javascript"
        }
      }
    ],
    "totalMatches": 8,
    "pattern": "function",
    "directory": "/path/to/code"
  }
}
```

#### `watch_file` - Watch File or Directory
Watch file or directory for changes.

**Parameters:**
- `path` (required): Path to watch
- `recursive` (optional): Watch recursively (default: false)
- `ignoreInitial` (optional): Ignore initial events (default: true)
- `ignored` (optional): Patterns to ignore

**Example:**
```json
{
  "name": "watch_file",
  "arguments": {
    "path": "/path/to/watch",
    "recursive": true,
    "ignoreInitial": true,
    "ignored": ["*.tmp", "node_modules/**"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "File watching started successfully",
  "path": "/path/to/watch",
  "data": {
    "watching": true,
    "recursive": true,
    "ignoreInitial": true,
    "events": [
      {
        "type": "add",
        "path": "/path/to/watch/newfile.txt",
        "stats": {
          "name": "newfile.txt",
          "path": "/path/to/watch/newfile.txt",
          "type": "file",
          "size": 0,
          "isDirectory": false,
          "isFile": true,
          "isSymlink": false,
          "permissions": "644",
          "createdAt": "2024-01-15T10:30:00.000Z",
          "modifiedAt": "2024-01-15T10:30:00.000Z",
          "accessedAt": "2024-01-15T10:30:00.000Z"
        }
      }
    ]
  }
}
```

#### `stop_watching` - Stop Watching
Stop watching a file or directory.

**Parameters:**
- `path` (required): Path to stop watching

**Example:**
```json
{
  "name": "stop_watching",
  "arguments": {
    "path": "/path/to/watch"
  }
}
```

#### `compare_files` - Compare Files
Compare two files and show differences.

**Parameters:**
- `file1` (required): First file path
- `file2` (required): Second file path
- `ignoreWhitespace` (optional): Ignore whitespace differences (default: false)
- `ignoreCase` (optional): Ignore case differences (default: false)

**Example:**
```json
{
  "name": "compare_files",
  "arguments": {
    "file1": "/path/to/file1.txt",
    "file2": "/path/to/file2.txt",
    "ignoreWhitespace": true,
    "ignoreCase": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Files differ: 3 differences found",
  "path": "/path/to/file1.txt",
  "data": {
    "identical": false,
    "differences": [
      {
        "line": 5,
        "type": "modified",
        "content": "- old content\n+ new content"
      }
    ],
    "totalDifferences": 3,
    "file1": {
      "path": "/path/to/file1.txt",
      "lines": 10,
      "size": 1024
    },
    "file2": {
      "path": "/path/to/file2.txt",
      "lines": 12,
      "size": 1156
    },
    "options": {
      "ignoreWhitespace": true,
      "ignoreCase": false
    }
  }
}
```

#### `archive_files` - Create Archive
Create archive from files.

**Parameters:**
- `files` (required): Files to archive
- `archivePath` (required): Archive file path
- `format` (optional): Archive format - "zip", "tar", "gzip" (default: "zip")
- `compressionLevel` (optional): Compression level (0-9, default: 6)
- `includeHidden` (optional): Include hidden files (default: false)
- `excludePatterns` (optional): Patterns to exclude

**Example:**
```json
{
  "name": "archive_files",
  "arguments": {
    "files": ["/path/to/file1.txt", "/path/to/file2.txt"],
    "archivePath": "/path/to/archive.zip",
    "format": "zip",
    "compressionLevel": 6,
    "includeHidden": false,
    "excludePatterns": ["*.tmp"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Archive created successfully",
  "path": "/path/to/archive.zip",
  "data": {
    "archivePath": "/path/to/archive.zip",
    "format": "zip",
    "compressionLevel": 6,
    "size": 2048,
    "filesCount": 2,
    "humanReadable": "2.00 KB"
  }
}
```

#### `extract_archive` - Extract Archive
Extract archive to destination.

**Parameters:**
- `archivePath` (required): Archive file path
- `destination` (required): Extraction destination

**Example:**
```json
{
  "name": "extract_archive",
  "arguments": {
    "archivePath": "/path/to/archive.zip",
    "destination": "/path/to/extract"
  }
}
```

## Usage Examples

### Basic File Operations

```typescript
// Read a file
const readResult = await mcpClient.callTool('read_file', {
  path: '/path/to/file.txt',
  encoding: 'utf8'
});

// Write a file
const writeResult = await mcpClient.callTool('write_file', {
  path: '/path/to/newfile.txt',
  content: 'Hello, World!',
  createDirs: true
});

// Copy a file
const copyResult = await mcpClient.callTool('copy_file', {
  source: '/path/to/source.txt',
  destination: '/path/to/destination.txt',
  overwrite: true
});
```

### Directory Management

```typescript
// Create directory
const createDirResult = await mcpClient.callTool('create_directory', {
  path: '/path/to/new/directory',
  recursive: true
});

// List directory contents
const listResult = await mcpClient.callTool('list_directory', {
  path: '/path/to/directory',
  recursive: true,
  includeHidden: false,
  maxDepth: 3
});

// Find files
const findResult = await mcpClient.callTool('find_files', {
  pattern: '*.js',
  directory: '/path/to/code',
  maxDepth: 2,
  fileTypes: ['file']
});
```

### Advanced Operations

```typescript
// Search in files
const searchResult = await mcpClient.callTool('search_in_files', {
  pattern: 'function',
  directory: '/path/to/code',
  filePattern: '*.js',
  caseSensitive: false,
  wholeWord: true,
  contextLines: 3
});

// Watch for changes
const watchResult = await mcpClient.callTool('watch_file', {
  path: '/path/to/watch',
  recursive: true,
  ignoreInitial: true
});

// Compare files
const compareResult = await mcpClient.callTool('compare_files', {
  file1: '/path/to/file1.txt',
  file2: '/path/to/file2.txt',
  ignoreWhitespace: true
});

// Create archive
const archiveResult = await mcpClient.callTool('archive_files', {
  files: ['/path/to/file1.txt', '/path/to/file2.txt'],
  archivePath: '/path/to/archive.zip',
  format: 'zip',
  compressionLevel: 6
});
```

## Development

### Project Structure

```
filesystem-mcp/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── file-operations.ts    # Core file operations
│   ├── directory-operations.ts # Directory management
│   ├── advanced-operations.ts # Advanced features
│   └── types.ts              # Type definitions and schemas
├── dist/                     # Compiled JavaScript output
├── __tests__/               # Test files
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest testing configuration
└── README.md                # This documentation
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Clean build directory
npm run clean

# Start production server
npm start
```

### Testing

The server includes comprehensive Jest tests:

```bash
npm test
```

**Test Coverage:**
- File operations (read, write, copy, move, delete)
- Directory operations (create, list, find)
- Advanced operations (search, watch, compare, archive)
- Error handling and edge cases
- Input validation and schema validation

### Error Handling

The server includes comprehensive error handling:

- **Input Validation**: All parameters validated with Zod schemas
- **File System Errors**: Graceful handling of permission, not found, and access errors
- **Resource Cleanup**: Automatic cleanup of watchers and resources
- **Process Management**: Proper signal handling for graceful shutdown

### Performance Considerations

- **Streaming**: Large file operations use streaming for memory efficiency
- **Batch Operations**: Multiple file operations optimized for performance
- **Caching**: File information cached for repeated operations
- **Resource Management**: Automatic cleanup prevents memory leaks

## Security Considerations

- **Path Validation**: All paths validated to prevent directory traversal attacks
- **Permission Checks**: File operations respect system permissions
- **Input Sanitization**: All inputs validated and sanitized
- **Error Information**: Error messages don't expose sensitive information

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Support

For issues and questions:
- **GitHub Issues**: [Open an issue](https://github.com/1999AZZAR/filesystem-mcp/issues)
- **Documentation**: Check this README for comprehensive usage examples
- **Examples**: See the examples section above for common use cases

---

**FileSystem MCP Server** - Comprehensive file system operations for the Model Context Protocol ecosystem.