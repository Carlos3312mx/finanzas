const fs = require('fs');

const appContent = fs.readFileSync('app.js', 'utf8');
const htmlContent = fs.readFileSync('index.html', 'utf8');

// Match document.getElementById("...")
const idRegex = /document\.getElementById\("([^"]+)"\)/g;
const ids = new Set();
let match;
while ((match = idRegex.exec(appContent)) !== null) {
    ids.add(match[1]);
}

console.log("Checking IDs in index.html:");
let missingIdsCount = 0;
for (const id of ids) {
    if (!htmlContent.includes(`id="${id}"`) && !htmlContent.includes(`id='${id}'`)) {
        console.log(`[-] Missing ID: ${id}`);
        missingIdsCount++;
    } else {
        console.log(`[+] Found ID: ${id}`);
    }
}

// Match document.querySelectorAll(".class")
const classRegex = /document\.querySelectorAll\("\.([^"]+)"\)/g;
const classes = new Set();
while ((match = classRegex.exec(appContent)) !== null) {
    classes.add(match[1]);
}

console.log("\nChecking Classes in index.html:");
let missingClassesCount = 0;
for (const cls of classes) {
    // Check if class exists in HTML
    if (!htmlContent.includes(`class="${cls}`) && !htmlContent.includes(`class='${cls}`) && !htmlContent.includes(` ${cls}`)) {
        console.log(`[-] Missing Class: ${cls}`);
        missingClassesCount++;
    } else {
        console.log(`[+] Found Class: ${cls}`);
    }
}

if (missingIdsCount === 0 && missingClassesCount === 0) {
    console.log("\n[SUCCESS] All DOM elements mapped in app.js are present in index.html!");
} else {
    console.log(`\n[FAIL] Missing: ${missingIdsCount} IDs, ${missingClassesCount} Classes.`);
}
