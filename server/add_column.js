const { execSync } = require('child_process');
const result = execSync('node node_modules/.bin/prisma db push --skip-generate', {
    cwd: __dirname,
    stdio: 'pipe',
    timeout: 60000
});
console.log(result.toString());
