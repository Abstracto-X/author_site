const fs = require('fs');
const path = require('path');

const files = [
  'subscription.html',
  'subscription.css',
  'js/subscription/aether-data.js',
  'js/subscription/aether-app.js',
  'js/subscription/main.js',
  'js/subscription/state.js',
  'js/subscription/auth.js',
  'js/subscription/db.js',
  'js/subscription/router.js',
  'js/subscription/ui.js',
  'js/subscription/render.js'
];

let output = '# Subscription SPA Consolidated Code Bundle\n\n';
output += 'This file contains the source code of the active Subscription SPA bridge files plus legacy modular reference files for easy auditing or ingestion by an external AI.\n\n';

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let ext = path.extname(file).substring(1);
    if (ext === 'html') ext = 'html';
    else if (ext === 'css') ext = 'css';
    else if (ext === 'js') ext = 'javascript';
    
    const content = fs.readFileSync(filePath, 'utf8');
    output += `## File Path: \`${file}\`\n\n`;
    output += `\`\`\`${ext}\n${content}\n\`\`\`\n\n---\n\n`;
    console.log(`Bundled ${file}`);
  } else {
    output += `## File Path: \`${file}\` (Not Found)\n\n---\n\n`;
    console.warn(`File not found: ${file}`);
  }
});

const outputPath = path.join(__dirname, '..', 'subscription_bundle.md');
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Successfully bundled subscription files into: ${outputPath}`);
