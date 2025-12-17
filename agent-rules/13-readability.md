# 13. 可読性ルール（if-else ネストは非推奨）

## 目的
可読性と保守性を高め、変更時の事故（デグレ）を減らす。

## 基本方針
- **if-else の深いネストは非推奨（discouraged）** とする。
- 条件分岐は **ガード節（早期return）** / **continue/break** / **switch** / **ヘルパー関数抽出** を優先して、ネストを浅く保つ。

## 推奨パターン

### 1) ガード節で早期return（推奨）
```ts
// ❌ 非推奨: ネストが深く読みづらい
if (a) {
  if (b) {
    doSomething();
  } else {
    doOther();
  }
}

// ✅ 推奨: ガード節でネストを浅くする
if (!a) return;
if (!b) return doOther();
doSomething();
```

### 2) else を削除（no-else-return）
```ts
// ❌ 非推奨
if (ok) {
  return value;
} else {
  return fallback;
}

// ✅ 推奨
if (ok) return value;
return fallback;
```

### 3) 条件分岐が増えるなら switch / map を検討
```ts
switch (kind) {
  case 'a': return handleA();
  case 'b': return handleB();
  default:  return handleDefault();
}
```

## 運用（lint）
- ESLint でネストを深くしない運用を **warn** で促す（例: `max-depth`, `no-else-return`, `no-lonely-if`）。
- 例外的にネストが必要な場合は、**関数抽出**などで読みやすさを担保する。

---

**適用優先度**: 高（可読性向上のため推奨）
**更新頻度**: 随時

