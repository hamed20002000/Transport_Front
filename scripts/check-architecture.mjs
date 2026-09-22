import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const errors = [];
const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(file)) sourceFiles.push(file);
  }
}
walk('src');
for (const file of sourceFiles) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
        ? node.arguments[0]
        : undefined;
    if (specifier && ts.isStringLiteral(specifier)) {
      const value = specifier.text;
      if (value.startsWith('src/') || value.startsWith('.')) {
        const base = value.startsWith('src/') ? value : path.join(path.dirname(file), value);
        const candidates = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];
        if (!candidates.some(extension => fs.existsSync(base.split('?')[0] + extension))) errors.push(`${file}: unresolved local import ${value}`);
      }
      if (/^(@mui\/|@emotion\/|stylis-plugin-rtl$)/.test(value)) errors.push(`${file}: forbidden UI dependency ${value}`);
      if (/^src\/(components|views|routes|layouts|store|context|assets|theme|socket|utils|lib)\//.test(value)) errors.push(`${file}: obsolete import ${value}`);
      if (file.startsWith('src/shared/') && /^src\/(app|features)\//.test(value)) errors.push(`${file}: shared cannot depend on ${value}`);
      if (file === 'src/app/router/Router.tsx' && /^src\/features\/[^/]+\//.test(value)) errors.push(`${file}: import the feature public API: ${value}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
  if (/^(@mui\/|@emotion\/|stylis-plugin-rtl$)/.test(name)) errors.push(`package.json: forbidden UI dependency ${name}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Architecture checks passed for ${sourceFiles.length} source files.`);
