const fs = require('fs');
const path = require('path');

const headerFull = fs.readFileSync(path.join(__dirname, 'templates', 'header-full.html'), 'utf8');
const footerScripts = fs.readFileSync(path.join(__dirname, 'templates', 'footer-standard.html'), 'utf8');

function processHtml(filePath, preserveInlineScripts = false) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace header comment
    content = content.replace(/<!-- Header Navigation -->\s*/g, '');

    // Replace header section
    content = content.replace(/<header class="site-header">[\s\S]*?<\/header>/, headerFull);

    if (preserveInlineScripts) {
        // For tools.html: just replace header, don't touch scripts
        // Remove duplicate footer if template was already injected
        const footerMatches = content.match(/<footer class="site-footer">/g);
        if (footerMatches && footerMatches.length > 1) {
            let lastIdx = content.lastIndexOf('<footer class="site-footer">');
            let afterLast = content.substring(lastIdx);
            let endIdx = afterLast.indexOf('</footer>') + 9;
            content = content.substring(0, lastIdx) + afterLast.substring(endIdx);
        }
    } else {
        // Standard: replace footer + ending scripts
        content = content.replace(/<\/footer>\s*<script src="assets\/js\/date-utils\.js"><\/script>\s*<\/body>/, 
            '</footer>\n\n' + footerScripts + '\n</body>');
    }

    fs.writeFileSync(filePath, content);
    console.log(`Processed: ${filePath}`);
}

const htmlFiles = ['index.html', 'about.html', 'privacy.html', 'cookie.html', 'customize.html', 'guestbook.html', 'license.html', 'admin.html', 'local-admin-generator.html'];
const toolCategoryFiles = fs.readdirSync('tools').filter(f => f.endsWith('.html')).map(f => `tools/${f}`);
const toolSubFiles = [];
fs.readdirSync('tools', { recursive: true }).filter(f => f.endsWith('.html') && f.includes(path.sep))
    .forEach(f => toolSubFiles.push(`tools/${f.replace(/\\/g, '/')}`));

// tools.html has inline scripts, preserve them
processHtml('tools.html', true);
[...htmlFiles, ...toolCategoryFiles, ...toolSubFiles].forEach(f => processHtml(f, false));