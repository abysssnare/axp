/** AXP v1.0 manifest types — see ../../spec/01-format.md */
export type Privilege = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface Impl {
  js?: string;
  kotlin?: string;   // "path/to/x.dex#ClassName"
  native?: string;
  wasm?: string;
  bin?: string;
  url?: string;
  proc?: { cmd: string; args?: string[]; cwd?: string; env?: Record<string, string> };
}

export interface AxpManifest {
  axp: '1.0';
  id: string;
  name: Record<string, string>;
  version: string;
  description?: string;
  minHost?: string;
  minAndroid: number;
  abis: Array<'arm64-v8a' | 'armeabi-v7a' | 'x86' | 'x86_64'>;
  requires?: Array<{ id: string; range: string }>;
  entry?: { js: string; engine: 'quickjs' | 'hermes' | 'dex' | 'wasm' | 'bin' };
  tools?: Tool[];
  surfaces?: Surface[];
  knowledge?: Knowledge[];
  agents?: Agent[];
  events?: EventHook[];
  ui?: Ui;
  hotReload?: HotReload;
  capabilities: Capabilities;
  instances?: { multi?: boolean; max?: number };
  runtime?: { memoryMB?: number; cpuPct?: number; allowDynamicCode?: boolean };
  distribution: { channel: 'session-install' | 'trusted-channel' | 'preinstall'; publisher: string; signatureScheme: 'apk-v3' };
}

export interface Tool {
  id: string;
  description: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  impl?: Impl;
  gradient?: Partial<Record<Privilege, { impl: Impl }>>;
  sideEffects: 'none' | 'read' | 'device' | 'destructive';
  confirm?: boolean;
  cost?: 'fast' | 'slow';
}

export interface Surface {
  uri: string;
  description?: string;
  views: string[];
  anchor: 'node' | 'line' | 'offset' | 'range' | 'uri';
  watchable?: boolean;
  auth: Privilege;
  impl?: Impl;
}

export interface Knowledge {
  id: string;
  kind: 'skill' | 'prompt' | 'command' | 'rules';
  entry: string;
  progressive?: boolean;
  arguments?: Array<Record<string, unknown>>;
  triggers?: Array<{ on: string; filter?: string }>;
  allowedTools?: string[];
}

export interface Agent {
  id: string;
  prompt: string;
  tools?: string[];
  knowledge?: string[];
  model?: string;
  maxTurns?: number;
  privilege?: Privilege;
}

export interface EventHook {
  on: string;
  filter?: string;
  when?: Record<string, unknown>;
  run: Impl;
  privilege?: Privilege;
}

export interface UiSlot { kind: 'dsl' | 'web' | 'native'; entry: string }

export interface Ui {
  panel?: UiSlot;
  widget?: UiSlot;
  web?: UiSlot;
  activity?: UiSlot;
  inject?: Array<{ surface: string; label: string; run: string }>;
  lifecycle?: { onLoad?: string; onReload?: string; onUnload?: string };
  bind?: Array<{ from: string; to: string }>;
  actions?: Array<{ id: string; tool: string }>;
}

export interface HotReload {
  enabled: boolean;
  unit?: 'package' | 'component';
  targets?: string[];
  strategy?: 'immediate' | 'graceful' | 'next-session';
  signature?: 'on-install' | 'on-every-load';
  sources?: Array<'package' | 'trusted-channel' | 'preinstall'>;
  state?: { migrate?: string; preserve?: string[] };
  rollback?: { keep?: number; onError?: boolean };
  uiRebuild?: 'recompose' | 'recreate-activity' | 'restart-host';
  classloader?: 'isolated' | 'shared';
}

export interface Capabilities {
  privilege: Privilege;
  requests: string[];
  dangerous?: string[];
  runtimeServices?: Array<'sampling' | 'elicitation' | 'storage' | 'ui.push' | 'audit.read'>;
}

/** Context passed to impl.js / ui.lifecycle callbacks (host-defined shape). */
export interface ImplContext<T = Record<string, unknown>> {
  args: T;
  state: Record<string, unknown>;
  log: (...a: unknown[]) => void;
  surface: (uri: string) => unknown;
  runtimeService: (name: string, req: Record<string, unknown>) => unknown;
  release?: () => void;
}
