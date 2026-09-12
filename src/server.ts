import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { FileOperations } from './file-operations.js';
import { DirectoryOperations } from './directory-operations.js';
import { AdvancedOperations } from './advanced-operations.js';
import { loadWorkspacePolicy, policyCheck, type WorkspacePolicy } from './policy.js';
import { textResult, errorResult } from './envelope.js';
import { HttpAdapter } from './http-adapter.js';
import {
  ReadFileSchema,
  WriteFileSchema,
  CopyFileSchema,
  MoveFileSchema,
  DeleteFileSchema,
  CreateDirectorySchema,
  ListDirectorySchema,
  FindFilesSchema,
  SearchInFilesSchema,
  WatchFileSchema,
  CompareFilesSchema,
  ArchiveFilesSchema,
  GetFileInfoSchema
} from './types.js';

/**
 * FileSystem MCP Server
 * Provides comprehensive file system operations via Model Context Protocol
 */
export class FileSystemMCPServer {
  private server: Server;
  private readonly policy: WorkspacePolicy = loadWorkspacePolicy();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly FILE_WATCH_CACHE_TTL = 30 * 1000; // 30 seconds for watch status
  private httpAdapter?: HttpAdapter;

  constructor() {
    this.server = this.createMcpServer();
    this.setupErrorHandling();
  }

  public createMcpServer(): Server {
    const server = new Server(
      {
        name: 'filesystem-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers(server);
    this.setupResourceHandlers(server);
    return server;
  }

  private getCacheKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }


  private setupToolHandlers(server: Server = this.server): void {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_file',
            description: 'Read file content with optional encoding and range',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to read' },
                encoding: { 
                  type: 'string', 
                  enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii', 'binary'],
                  default: 'utf8',
                  description: 'File encoding'
                },
                offset: { type: 'number', description: 'Byte offset to start reading from' },
                limit: { type: 'number', description: 'Maximum number of bytes to read' }
              },
              required: ['path']
            }
          },
          {
            name: 'write_file',
            description: 'Write content to file with optional encoding and directory creation',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to the file to write' },
                content: { type: 'string', description: 'Content to write to the file' },
                encoding: { 
                  type: 'string', 
                  enum: ['utf8', 'utf16le', 'latin1', 'base64', 'hex', 'ascii', 'binary'],
                  default: 'utf8',
                  description: 'File encoding'
                },
                createDirs: { type: 'boolean', default: false, description: 'Create parent directories if they don\'t exist' },
                append: { type: 'boolean', default: false, description: 'Append to file instead of overwriting' }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'copy_file',
            description: 'Copy file from source to destination',
            inputSchema: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'Source file path' },
                destination: { type: 'string', description: 'Destination file path' },
                overwrite: { type: 'boolean', default: false, description: 'Overwrite destination if it exists' },
                preserveTimestamps: { type: 'boolean', default: true, description: 'Preserve file timestamps' }
              },
              required: ['source', 'destination']
            }
          },
          {
            name: 'move_file',
            description: 'Move file from source to destination',
            inputSchema: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'Source file path' },
                destination: { type: 'string', description: 'Destination file path' },
                overwrite: { type: 'boolean', default: false, description: 'Overwrite destination if it exists' }
              },
              required: ['source', 'destination']
            }
          },
          {
            name: 'delete_file',
            description: 'Delete file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to delete' },
                recursive: { type: 'boolean', default: false, description: 'Recursively delete directories' },
                force: { type: 'boolean', default: false, description: 'Force deletion even if path doesn\'t exist' }
              },
              required: ['path']
            }
          },
          {
            name: 'get_file_info',
            description: 'Get detailed file information including metadata',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to get information for' },
                followSymlinks: { type: 'boolean', default: true, description: 'Follow symbolic links' }
              },
              required: ['path']
            }
          },
          {
            name: 'create_directory',
            description: 'Create directory with optional recursive creation',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path to create' },
                recursive: { type: 'boolean', default: false, description: 'Create parent directories recursively' },
                mode: { type: 'string', description: 'Directory permissions in octal format' }
              },
              required: ['path']
            }
          },
          {
            name: 'list_directory',
            description: 'List directory contents with optional filtering and recursion',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path to list' },
                recursive: { type: 'boolean', default: false, description: 'List contents recursively' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files and directories' },
                maxDepth: { type: 'number', description: 'Maximum depth for recursive listing' },
                fileTypes: { 
                  type: 'array', 
                  items: { type: 'string', enum: ['file', 'directory', 'symlink'] },
                  description: 'Filter by file types'
                }
              },
              required: ['path']
            }
          },
          {
            name: 'find_files',
            description: 'Find files matching a pattern',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: 'Glob pattern to match files' },
                directory: { type: 'string', default: '.', description: 'Directory to search in' },
                maxDepth: { type: 'number', description: 'Maximum search depth' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files' },
                fileTypes: { 
                  type: 'array', 
                  items: { type: 'string', enum: ['file', 'directory', 'symlink'] },
                  description: 'Filter by file types'
                },
                caseSensitive: { type: 'boolean', default: false, description: 'Case-sensitive pattern matching' }
              },
              required: ['pattern']
            }
          },
          {
            name: 'search_in_files',
            description: 'Search for text patterns in files',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: { type: 'string', description: 'Text pattern to search for' },
                directory: { type: 'string', default: '.', description: 'Directory to search in' },
                filePattern: { type: 'string', description: 'Glob pattern for files to search' },
                maxDepth: { type: 'number', description: 'Maximum search depth' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files' },
                caseSensitive: { type: 'boolean', default: false, description: 'Case-sensitive search' },
                wholeWord: { type: 'boolean', default: false, description: 'Match whole words only' },
                contextLines: { type: 'number', default: 2, description: 'Number of context lines around matches' }
              },
              required: ['pattern']
            }
          },
          {
            name: 'watch_file',
            description: 'Watch file or directory for changes',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to watch' },
                recursive: { type: 'boolean', default: false, description: 'Watch recursively' },
                ignoreInitial: { type: 'boolean', default: true, description: 'Ignore initial events' },
                ignored: { type: 'array', items: { type: 'string' }, description: 'Patterns to ignore' }
              },
              required: ['path']
            }
          },
          {
            name: 'stop_watching',
            description: 'Stop watching a file or directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Path to stop watching' }
              },
              required: ['path']
            }
          },
          {
            name: 'compare_files',
            description: 'Compare two files and show differences',
            inputSchema: {
              type: 'object',
              properties: {
                file1: { type: 'string', description: 'First file path' },
                file2: { type: 'string', description: 'Second file path' },
                ignoreWhitespace: { type: 'boolean', default: false, description: 'Ignore whitespace differences' },
                ignoreCase: { type: 'boolean', default: false, description: 'Ignore case differences' }
              },
              required: ['file1', 'file2']
            }
          },
          {
            name: 'archive_files',
            description: 'Create archive from files',
            inputSchema: {
              type: 'object',
              properties: {
                files: { type: 'array', items: { type: 'string' }, description: 'Files to archive' },
                archivePath: { type: 'string', description: 'Archive file path' },
                format: { type: 'string', enum: ['zip', 'tar', 'gzip'], default: 'zip', description: 'Archive format' },
                compressionLevel: { type: 'number', default: 6, description: 'Compression level (0-9)' },
                includeHidden: { type: 'boolean', default: false, description: 'Include hidden files' },
                excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Patterns to exclude' }
              },
              required: ['files', 'archivePath']
            }
          },
          {
            name: 'extract_archive',
            description: 'Extract archive to destination',
            inputSchema: {
              type: 'object',
              properties: {
                archivePath: { type: 'string', description: 'Archive file path' },
                destination: { type: 'string', description: 'Extraction destination' }
              },
              required: ['archivePath', 'destination']
            }
          },
          {
            name: 'get_directory_size',
            description: 'Get directory size recursively',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path' }
              },
              required: ['path']
            }
          }
        ]
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await policyCheck(this.policy, name, (args || {}) as Record<string, unknown>);
        switch (name) {
          case 'read_file':
            const readResult = await FileOperations.readFile(ReadFileSchema.parse(args));
            return textResult(name, readResult);
          
          case 'write_file':
            const writeResult = await FileOperations.writeFile(WriteFileSchema.parse(args));
            return textResult(name, writeResult);
          
          case 'copy_file':
            const copyResult = await FileOperations.copyFile(CopyFileSchema.parse(args));
            return textResult(name, copyResult);
          
          case 'move_file':
            const moveResult = await FileOperations.moveFile(MoveFileSchema.parse(args));
            return textResult(name, moveResult);
          
          case 'delete_file':
            const deleteResult = await FileOperations.deleteFile(DeleteFileSchema.parse(args));
            return textResult(name, deleteResult);
          
          case 'get_file_info':
            const infoResult = await FileOperations.getFileInfo(GetFileInfoSchema.parse(args));
            return textResult(name, infoResult);
          
          case 'create_directory':
            const createDirResult = await DirectoryOperations.createDirectory(CreateDirectorySchema.parse(args));
            return textResult(name, createDirResult);
          
          case 'list_directory':
            const listResult = await DirectoryOperations.listDirectory(ListDirectorySchema.parse(args));
            return textResult(name, listResult);
          
          case 'find_files':
            const findResult = await DirectoryOperations.findFiles(FindFilesSchema.parse(args));
            return textResult(name, findResult);
          
          case 'search_in_files':
            const searchResult = await AdvancedOperations.searchInFiles(SearchInFilesSchema.parse(args));
            return textResult(name, searchResult);
          
          case 'watch_file':
            const watchResult = await AdvancedOperations.watchFile(WatchFileSchema.parse(args));
            return textResult(name, watchResult);
          
          case 'stop_watching':
            const stopWatchResult = await AdvancedOperations.stopWatching(args?.['path'] as string);
            return textResult(name, stopWatchResult);
          
          case 'compare_files':
            const compareResult = await AdvancedOperations.compareFiles(CompareFilesSchema.parse(args));
            return textResult(name, compareResult);
          
          case 'archive_files':
            const archiveResult = await AdvancedOperations.archiveFiles(ArchiveFilesSchema.parse(args));
            return textResult(name, archiveResult);
          
          case 'extract_archive':
            const extractResult = await AdvancedOperations.extractArchive(args?.['archivePath'] as string, args?.['destination'] as string);
            return textResult(name, extractResult);
          
          case 'get_directory_size':
            const sizeResult = await DirectoryOperations.getDirectorySize(args?.['path'] as string);
            return textResult(name, sizeResult);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return errorResult(name, error instanceof Error ? error.message : 'Unknown error');
      }
    });
  }

  // Resource definitions
  private get resources(): Resource[] {
    return [
      {
        uri: "file://metadata/{path}",
        name: "File/Directory Metadata",
        description: "Cached metadata for files and directories including permissions, size, modification dates, and ownership",
        mimeType: "application/json",
      },
      {
        uri: "file://directory/{path}",
        name: "Directory Contents Cache",
        description: "Cached directory listing with file details, sizes, and metadata for faster browsing",
        mimeType: "application/json",
      },
      {
        uri: "file://search/cache/{query}",
        name: "File Search Results Cache",
        description: "Cached results from file content and pattern searches across the filesystem",
        mimeType: "application/json",
      },
      {
        uri: "file://watch/status/{path}",
        name: "File Watch Status",
        description: "Current status and recent events for file system watchers",
        mimeType: "application/json",
      },
      {
        uri: "file://recent/{type}",
        name: "Recently Accessed Files",
        description: "Recently read, written, or modified files of specified type (read/write/modified)",
        mimeType: "application/json",
      },
      {
        uri: "file://structure/{path}",
        name: "Directory Tree Structure",
        description: "Hierarchical directory structure with file counts and size summaries",
        mimeType: "application/json",
      },
      {
        uri: "file://content/preview/{path}",
        name: "File Content Preview",
        description: "Cached preview of file content (first lines/chars) for quick inspection",
        mimeType: "application/json",
      },
    ];
  }

  private setupResourceHandlers(server: Server = this.server): void {
    // List resources handler
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.resources,
      };
    });

    // Read resource handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const { uri } = request.params;

      try {
        // Handle file/directory metadata cache
        if (uri.startsWith("file://metadata/")) {
          const path = decodeURIComponent(uri.replace("file://metadata/", ""));
          const cacheKey = this.getCacheKey('metadata', { path });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Get fresh metadata
            const metadata = await FileOperations.getFileInfo({ path, followSymlinks: true });
            data = {
              path,
              metadata,
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        // Handle directory contents cache
        if (uri.startsWith("file://directory/")) {
          const path = decodeURIComponent(uri.replace("file://directory/", ""));
          const cacheKey = this.getCacheKey('directory', { path });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Get fresh directory listing
            const contents = await DirectoryOperations.listDirectory({ path, recursive: false, includeHidden: false });
            data = {
              path,
              contents,
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        // Handle search results cache
        if (uri.startsWith("file://search/cache/")) {
          const query = decodeURIComponent(uri.replace("file://search/cache/", ""));
          const cacheKey = this.getCacheKey('search_cache', { query });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Perform fresh search (simplified - would need to parse query)
            const searchResults = await AdvancedOperations.searchInFiles({
              pattern: query,
              directory: "/",
              includeHidden: false,
              caseSensitive: false,
              wholeWord: false,
              contextLines: 2
            });
            data = {
              query,
              results: searchResults,
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        // Handle file watch status
        if (uri.startsWith("file://watch/status/")) {
          const path = decodeURIComponent(uri.replace("file://watch/status/", ""));
          const cacheKey = this.getCacheKey('watch_status', { path });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Get current watch status (simplified - would need watch manager)
            data = {
              path,
              isWatching: false, // Would need to check actual watch status
              lastEvents: [],
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data, this.FILE_WATCH_CACHE_TTL);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        // Handle recently accessed files
        if (uri.startsWith("file://recent/")) {
          const type = uri.replace("file://recent/", "");
          const cacheKey = this.getCacheKey('recent_files', { type });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Get recent files (simplified - would need access tracking)
            data = {
              type,
              files: [], // Would need to track actual recent files
              count: 0,
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        // Handle directory tree structure
        if (uri.startsWith("file://structure/")) {
          const path = decodeURIComponent(uri.replace("file://structure/", ""));
          const cacheKey = this.getCacheKey('directory_structure', { path });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Generate directory tree (simplified)
            const structure = await this.getDirectoryStructure(path);
            data = {
              path,
              structure,
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        // Handle file content preview
        if (uri.startsWith("file://content/preview/")) {
          const path = decodeURIComponent(uri.replace("file://content/preview/", ""));
          const cacheKey = this.getCacheKey('content_preview', { path });

          let data = this.getCachedData(cacheKey);
          if (!data) {
            // Get file preview
            const preview = await this.getFilePreview(path);
            data = {
              path,
              preview,
              cached: false,
              timestamp: new Date().toISOString(),
            };
            this.setCachedData(cacheKey, data);
          } else {
            data.cached = true;
          }

          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private async getDirectoryStructure(path: string): Promise<any> {
    try {
      const result = await DirectoryOperations.listDirectory({ path, recursive: false, includeHidden: false });
      const contents = result.success ? (result.data?.items || []) : [];
      const structure: any = {
        name: path.split('/').pop() || path,
        type: 'directory',
        path: path,
        children: [],
        stats: {
          totalFiles: 0,
          totalDirs: 0,
          totalSize: 0
        }
      };

      for (const item of contents) {
        if (item.type === 'directory') {
          structure.stats.totalDirs++;
          // For deep structure, we'd recurse here but keeping it shallow for performance
          structure.children.push({
            name: item.name,
            type: 'directory',
            path: item.path,
            size: item.size || 0
          });
        } else {
          structure.stats.totalFiles++;
          structure.stats.totalSize += item.size || 0;
          structure.children.push({
            name: item.name,
            type: 'file',
            path: item.path,
            size: item.size || 0
          });
        }
      }

      return structure;
    } catch (error) {
      return {
        name: path.split('/').pop() || path,
        type: 'directory',
        path: path,
        error: error instanceof Error ? error.message : String(error),
        children: [],
        stats: { totalFiles: 0, totalDirs: 0, totalSize: 0 }
      };
    }
  }

  private async getFilePreview(path: string): Promise<any> {
    try {
      // Get basic file info first
      const statsResult = await FileOperations.getFileInfo({ path, followSymlinks: true });

      if (statsResult.success && statsResult.data) {
        const stats = statsResult.data;

        if (stats.isDirectory) {
          return {
            path,
            type: 'directory',
            preview: 'Directory contents',
            size: stats.size,
            canPreview: false
          };
        }

      // Try to read first few lines/chars
      let preview = '';
      let canPreview = false;

      try {
        const result = await FileOperations.readFile({ path, encoding: 'utf8', offset: 0, limit: 1024 });
        if (result.success && result.data?.content) {
          const content = typeof result.data.content === 'string' ? result.data.content : result.data.content.toString();
          preview = content.slice(0, 500); // First 500 chars
          canPreview = true;
        } else {
          preview = 'Unable to read file content';
          canPreview = false;
        }
      } catch (error) {
        preview = 'Binary file or read error';
        canPreview = false;
      }

      return {
        path,
        type: 'file',
        preview,
        canPreview,
        size: stats.size,
        mimeType: this.guessMimeType(path),
        encoding: canPreview ? 'utf8' : 'binary'
      };
      } else {
        return {
          path,
          type: 'unknown',
          preview: 'Unable to get file info',
          canPreview: false,
          error: 'File info not available'
        };
      }
    } catch (error) {
      return {
        path,
        type: 'unknown',
        preview: 'Unable to generate preview',
        canPreview: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private guessMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'json': 'application/json',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'md': 'text/markdown',
      'html': 'text/html',
      'css': 'text/css',
      'xml': 'application/xml',
      'yaml': 'application/yaml',
      'yml': 'application/yaml',
      'py': 'text/x-python',
      'java': 'text/x-java-source',
      'c': 'text/x-c',
      'cpp': 'text/x-c++',
      'h': 'text/x-c',
      'hpp': 'text/x-c++',
      'sh': 'application/x-shellscript',
      'bash': 'application/x-shellscript',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private setupErrorHandling(): void {
    // Handle process cleanup
    process.on('SIGINT', async () => {
      await AdvancedOperations.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await AdvancedOperations.cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await AdvancedOperations.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled Rejection:', reason);
      await AdvancedOperations.cleanup();
      process.exit(1);
    });
  }

  async run(options: { transport?: 'stdio' | 'http'; port?: number; host?: string } = {}): Promise<void> {
    const envTransport = process.env['MCP_TRANSPORT'];
    const transportMode = options.transport || (envTransport === 'http' ? 'http' : 'stdio');
    if (transportMode === 'http') {
      const envPort = process.env['PORT'];
      const envHost = process.env['HOST'];
      const port = options.port ?? (envPort ? parseInt(envPort, 10) : 8013);
      const host = options.host ?? envHost ?? '0.0.0.0';
      this.httpAdapter = new HttpAdapter(() => this.createMcpServer(), { port, host });
      await this.httpAdapter.start();
    } else {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('FileSystem MCP Server running on stdio');
    }
  }

  async stop(): Promise<void> {
    if (this.httpAdapter) {
      await this.httpAdapter.close();
    }
    await AdvancedOperations.cleanup();
  }
}