import { execSync, exec } from "child_process";
import { createServer } from "http";

export function gitBisect(
  cwd: string,
  oldRef: string,
  newRef: string,
  isSameAsOld: () => boolean | Promise<boolean>
): Promise<{
  sha: string,
  output: string
}> {
  execSync(`git bisect start ${newRef} ${oldRef} --`, { cwd });
  
  const server = createServer(async (_, res) => {
    try {
      res.writeHead(200).end(await isSameAsOld() ? '0' : '1');
    } catch (err) {
      console.error(err);
      res.writeHead(200).end('125');
    }
  });

  server.listen(3000);
  return new Promise((resolve, reject) => {
    exec("git bisect run sh -c 'exit `curl -s http://localhost:3000`'", { encoding: 'utf8', cwd }, (err, stdout, stderr) => {
      server.close();
      if (err) {
        return reject(err);
      }

      const sha = stdout.substring(
        stdout.lastIndexOf(' is the first bad commit') - 40,
        stdout.lastIndexOf(' is the first bad commit'));
      console.log(stdout);
      execSync('git bisect reset');
      resolve({ sha, output: stdout });
    });
  });
  
}
