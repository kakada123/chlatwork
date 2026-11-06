import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseSfc } from "@vue/compiler-sfc";
import { parse as parseTemplate, NodeTypes } from "@vue/compiler-dom";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import english from "../app/locales/en/index.ts";
import khmer from "../app/locales/km/index.ts";

const parameters = text => [...text.matchAll(/\{([A-Za-z_][\w]*)\}/g)].map(match => match[1]);

/** Validate semantic keys and statically knowable named parameters at their call sites. */
export function checkTranslationCalls(code, filename = "source.ts") {
  const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
  const findings = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      const offset = name === "translateMessage" ? 1 : name === "t" ? 0 : -1;
      const argument = node.arguments[offset];
      if (offset >= 0 && argument && ts.isStringLiteralLike(argument)) {
        const key = argument.text;
        const location = source.getLineAndCharacterOfPosition(node.getStart(source));
        const report = issue => findings.push({ file: filename, line: location.line + 1, key, issue });
        if (!Object.hasOwn(english, key) || !Object.hasOwn(khmer, key)) report("missing language entry");
        else {
          const names = new Set([...parameters(english[key]), ...parameters(khmer[key])]);
          const values = node.arguments[offset + 1];
          if (names.size && !values) report(`missing parameters: ${[...names].join(", ")}`);
          if (names.size && values && ts.isObjectLiteralExpression(values) && !values.properties.some(ts.isSpreadAssignment)) {
            const supplied = new Set(values.properties.filter(property => property.name).map(property => property.name.getText(source).replace(/^["']|["']$/g, "")));
            const missing = [...names].filter(name => !supplied.has(name));
            if (missing.length) report(`missing parameters: ${missing.join(", ")}`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return findings;
}

function checkVue(content, filename) {
  const { descriptor, errors } = parseSfc(content, { filename });
  if (errors.length) throw new Error(`Cannot parse ${filename}`);
  const findings = [];
  for (const block of [descriptor.script, descriptor.scriptSetup]) if (block) {
    for (const finding of checkTranslationCalls(block.content, filename)) findings.push({ ...finding, line: finding.line + block.loc.start.line - 1 });
  }
  if (descriptor.template) {
    const visit = node => {
      const expressions = node.type === NodeTypes.INTERPOLATION ? [node.content] : node.type === NodeTypes.ELEMENT ? node.props.filter(prop => prop.type === NodeTypes.DIRECTIVE).map(prop => prop.exp).filter(Boolean) : [];
      for (const expression of expressions) for (const finding of checkTranslationCalls(expression.content, filename)) findings.push({ ...finding, line: finding.line + expression.loc.start.line + descriptor.template.loc.start.line - 2 });
      for (const child of node.children ?? []) visit(child);
    };
    visit(parseTemplate(descriptor.template.content));
  }
  return findings;
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (/(?:secret|credential|service-account|^firebase)/i.test(entry.name)) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|vue)$/.test(entry.name) ? [path] : [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = sourceFiles(resolve("app")).filter(file => !file.includes("/locales/"));
  const findings = files.flatMap(file => {
    const content = readFileSync(file, "utf8");
    const name = relative(resolve("."), file);
    return file.endsWith(".vue") ? checkVue(content, name) : checkTranslationCalls(content, name);
  });
  if (process.argv.includes("--json")) console.log(JSON.stringify({ files: files.length, messages: Object.keys(english).length, findings }, null, 2));
  else {
    for (const item of findings) console.log(`${item.file}:${item.line} ${item.key}: ${item.issue}`);
    console.log(`Checked ${files.length} source files and ${Object.keys(english).length} messages; ${findings.length} issues.`);
  }
  if (findings.length) process.exitCode = 1;
}
