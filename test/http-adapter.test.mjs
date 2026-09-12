import test from 'node:test';
import assert from 'node:assert/strict';
import { FileSystemMCPServer } from '../dist/server.js';

test('FileSystem MCP Stateless HTTP Adapter (P2-D1)', async (t) => {
  const server = new FileSystemMCPServer();
  const testPort = 8993;

  await server.run({ transport: 'http', port: testPort, host: '127.0.0.1' });

  await t.test('GET /healthz returns ok and role', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.server, 'filesystem-mcp');
    assert.equal(body.role, 'hela-membrane');
  });

  await t.test('GET /discovery returns manifest', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/discovery`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.protocolVersion, '2026-07-28');
    assert.equal(body.role, 'hela-membrane');
  });

  await t.test('POST / with tools/list returns filesystem tools', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': 'tools/list'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'fs-1',
        method: 'tools/list',
        params: {}
      })
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('mcp-method'), 'tools/list');
    const body = await res.json();
    assert.ok(Array.isArray(body.result?.tools));
    assert.ok(body.result.tools.some(t => t.name === 'read_file'));
  });

  await server.stop();
});
