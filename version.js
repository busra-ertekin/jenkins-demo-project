const fs = require('fs');
const { execSync } = require('child_process');

function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commitDate = execSync('git log -1 --format=%cd --date=iso').toString().trim();
    const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
    
    return {
      commitHash,
      branch,
      commitDate,
      commitMessage,
      buildDate: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Git bilgisi alınamadı:', error.message);
    return {
      commitHash: 'unknown',
      branch: 'unknown',
      commitDate: new Date().toISOString(),
      commitMessage: 'No git info',
      buildDate: new Date().toISOString()
    };
  }
}

const buildInfo = {
  version: process.env.BUILD_VERSION || '1.0.0-dev',
  ...getGitInfo()
};

fs.writeFileSync(
  'public/build-info.json',
  JSON.stringify(buildInfo, null, 2)
);

console.log('✅ Build info oluşturuldu:');
console.log(JSON.stringify(buildInfo, null, 2));
