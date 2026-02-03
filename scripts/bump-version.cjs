const fs = require('fs');
const path = require('path');

const versionType = process.argv[2] || 'patch'; // 'major', 'minor', 'patch'
const packageJsonPath = path.resolve(__dirname, '../package.json');
const publicVersionJsonPath = path.resolve(__dirname, '../public/version.json');
const constantsVersionPath = path.resolve(__dirname, '../constants/version.ts'); // Adjust if needed

// Read package.json
const packageJson = require(packageJsonPath);
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
if (versionType === 'major') newVersion = `${major + 1}.0.0`;
else if (versionType === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update public/version.json
const publicVersionJson = require(publicVersionJsonPath);
publicVersionJson.version = newVersion;
publicVersionJson.url = "https://last-bench.vercel.app"; // Ensure URL is correct
publicVersionJson.message = `A new version (${newVersion}) is available! Please update for new features and improvements.`;
fs.writeFileSync(publicVersionJsonPath, JSON.stringify(publicVersionJson, null, 2) + '\n');

// Update constants/version.ts (if you use a constant file for app version)
// This is critical if the app uses a compiled constant
const versionTsContent = `export const APP_VERSION = '${newVersion}';
export const MIN_SUPPORTED_VERSION = '1.0.0'; // Update this manually if needed
export const VERSION_CHECK_URL = '/version.json';
`;

// Only write if constants folder exists
const constantsDir = path.resolve(__dirname, '../constants');
if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir);
}
fs.writeFileSync(path.join(constantsDir, 'version.ts'), versionTsContent);


console.log('✅ Version bumped successfully!');
