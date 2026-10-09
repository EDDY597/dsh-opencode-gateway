/**
 * Section copy, zh/en. Keys are flat; the type rides on `en` so a missing
 * translation is a compile error.
 *
 * @module dsh-opencode-gateway/client/locales
 */

export const en = {
  nav: 'OpenCode Gateway',
  title: 'OpenCode Gateway',
  intro: 'Refresh the live model listing and pick which models land in the model menu. A checked model is menu-visible (composer chip included); an unchecked one is only listed here.',
  cardGateway: 'OpenCode Go (subscription via gateway)',
  cardFree: 'OpenCode Free (local free tier)',
  refresh: 'Refresh',
  refreshing: 'Refreshing…',
  save: 'Save checked',
  saving: 'Saving…',
  saved: 'Saved',
  resetDefaults: 'Restore defaults',
  contextChip: 'ctx',
  discoveredTag: 'discovered',
  emptyListing: 'No models answered. Refresh once the route is reachable.',
  discoverRefused: 'Refresh failed: {message}',
  loadFailed: 'Settings load failed: {message}',
  writeConflict: 'Settings changed elsewhere; reloaded — apply your checks again.',
  writeRefused: 'Save refused: {message}',
  uncheckedCount: '{count} checked',
  stagedHint: 'Unsaved changes',
  providerLabel: 'route',
} as const

export const zh: Record<keyof typeof en, string> = {
  nav: 'OpenCode 网关',
  title: 'OpenCode 网关',
  intro: '刷新实时模型列表，并勾选哪些模型进入模型菜单。勾选的模型在菜单与输入框可见；未勾选的仅在此列出。',
  cardGateway: 'OpenCode Go（订阅 · 经网关）',
  cardFree: 'OpenCode Free（本地免费档）',
  refresh: '刷新',
  refreshing: '刷新中…',
  save: '保存勾选',
  saving: '保存中…',
  saved: '已保存',
  resetDefaults: '恢复内置默认',
  contextChip: '上下文',
  discoveredTag: '发现',
  emptyListing: '没有模型应答。路由可达后再点刷新。',
  discoverRefused: '刷新失败：{message}',
  loadFailed: '设置读取失败：{message}',
  writeConflict: '设置在别处被修改，已重新加载——请重新勾选。',
  writeRefused: '保存被拒绝：{message}',
  uncheckedCount: '已勾选 {count} 个',
  stagedHint: '有未保存的更改',
  providerLabel: '路由',
} as const

export type ModelManagerKey = keyof typeof en
