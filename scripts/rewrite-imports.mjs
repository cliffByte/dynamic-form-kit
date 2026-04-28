import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) yield p;
  }
}

function resolveTarget(importPath) {
  const base = path.join(SRC, importPath);
  const candidates = [
    base + '.tsx',
    base + '.ts',
    path.join(base, 'index.tsx'),
    path.join(base, 'index.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function toRel(fromFile, targetFile) {
  let rel = path.relative(path.dirname(fromFile), targetFile);
  rel = rel.replace(/\.tsx?$/, '');
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function replaceAtImports(text, file) {
  const replacer = (full, quote, importPath, quoteEnd) => {
    const target = resolveTarget(importPath);
    if (!target) {
      console.error(`Unresolved @/${importPath} in ${file}`);
      process.exit(1);
    }
    const rel = toRel(file, target);
    return `from ${quote}${rel}${quoteEnd}`;
  };

  return text
    .replace(/from\s+(['"])@\/([^'"]+)\1/g, (m, q, p) =>
      replacer(m, q, p, q),
    )
    .replace(/import\s*\(\s*(['"])@\/([^'"]+)\1\s*\)/g, (m, q, p) => {
      const target = resolveTarget(p);
      if (!target) {
        console.error(`Unresolved dynamic @/${p} in ${file}`);
        process.exit(1);
      }
      const rel = toRel(file, target);
      return `import(${q}${rel}${q})`;
    });
}

for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('@/')) continue;
  const next = replaceAtImports(text, file);
  fs.writeFileSync(file, next);
  console.log('rewrote', path.relative(SRC, file));
}

console.log('done');
