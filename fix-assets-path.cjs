import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const files = await glob('tools/**/*.html');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // 替换相对路径 "../assets/" 为绝对路径 "/assets/"
  content = content.replace(/\.\.\/\.\.\/assets\//g, '/assets/');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
    count++;
  }
}

console.log(`\nTotal fixed: ${count} files`);