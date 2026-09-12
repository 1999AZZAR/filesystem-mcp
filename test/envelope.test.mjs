import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVER_NAME,
  TOOL_SIDE_EFFECTS,
  isEnvelopeEnabled,
  wrapResult,
  wrapError,
  textResult,
  errorResult,
} from '../dist/envelope.js';

const ALL_TOOLS = [
  'read_file', 'write_file', 'copy_file', 'move_file', 'delete_file',
  'get_file_info', 'create_directory', 'list_directory', 'find_files',
  'search_in_files', 'watch_file', 'stop_watching', 'compare_files',
  'archive_files', 'extract_archive', 'get_directory_size',
];
const WRITE_TOOLS = new Set([
  'write_file', 'copy_file', 'move_file', 'delete_file', 'create_directory',
  'watch_file', 'stop_watching', 'archive_files', 'extract_archive',
]);
const REQUIRED_KEYS = ['ok', 'summary', 'data', 'artifacts', 'provenance', 'warnings', 'sideEffects', 'execution', 'redaction'];

function withEnv(vars, fn) {
  const prev = {};
  for (const k of Object.keys(vars)) {
    prev[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

test('side-effect map covers every tool', () => {
  assert.deepEqual(new Set(Object.keys(TOOL_SIDE_EFFECTS)), new Set(ALL_TOOLS));
  for (const t of ALL_TOOLS) {
    if (WRITE_TOOLS.has(t)) assert.ok(TOOL_SIDE_EFFECTS[t].length > 0, `${t} must declare side effects`);
    else assert.deepEqual(TOOL_SIDE_EFFECTS[t], [], `${t} must be side-effect free`);
  }
});

test('flag off by default', () => {
  withEnv({ HELA_ENVELOPE: undefined }, () => assert.equal(isEnvelopeEnabled(), false));
});

for (const tool of ALL_TOOLS) {
  test(`off-mode byte-identical legacy output: ${tool}`, () => {
    withEnv({ HELA_ENVELOPE: undefined }, () => {
      const payload = { success: true, path: '/tmp/x' };
      const got = textResult(tool, payload);
      assert.deepEqual(got, { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] });
    });
  });

  test(`on-mode envelope schema: ${tool}`, () => {
    withEnv({ HELA_ENVELOPE: 'true' }, () => {
      const payload = { success: true };
      const got = textResult(tool, payload);
      assert.equal(got.content.length, 1);
      assert.equal(got.content[0].type, 'text');
      const env = JSON.parse(got.content[0].text);
      for (const k of REQUIRED_KEYS) assert.ok(k in env, `${tool} envelope missing ${k}`);
      assert.equal(env.ok, true);
      assert.deepEqual(env.data, payload);
      assert.equal(env.execution.serverName, SERVER_NAME);
      assert.equal(env.execution.toolName, tool);
      assert.deepEqual(env.redaction, { applied: false, fields: [] });
    });
  });
}

test('on-mode error envelope', () => {
  withEnv({ HELA_ENVELOPE: 'true' }, () => {
    const got = errorResult('read_file', 'nope');
    const env = JSON.parse(got.content[0].text);
    assert.equal(env.ok, false);
    assert.equal(env.data, null);
    assert.ok(env.error.includes('nope'));
  });
});

test('off-mode error preserves legacy shape', () => {
  withEnv({ HELA_ENVELOPE: undefined }, () => {
    const got = errorResult('read_file', 'nope');
    assert.deepEqual(got, {
      content: [{ success: false, message: 'Tool execution failed: nope', error: 'nope' }],
    });
  });
});

test('wrapResult/wrapError direct shape', () => {
  const ok = wrapResult('list_directory', [1, 2]);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.data, [1, 2]);
  const err = wrapError('delete_file', 'boom');
  assert.equal(err.ok, false);
  assert.deepEqual(err.sideEffects, ['filesystem-delete']);
});

test('run/step id propagation from env', () => {
  withEnv({ HELA_ENVELOPE: 'true', HELA_RUN_ID: 'r1', HELA_STEP_ID: 's2' }, () => {
    const env = JSON.parse(textResult('read_file', {}).content[0].text);
    assert.equal(env.execution.run_id, 'r1');
    assert.equal(env.execution.step_id, 's2');
  });
});
