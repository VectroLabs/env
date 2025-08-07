const fs = require("node:fs"),
  path = require("node:path");

function load(opt = { file: ".env" }) {
  const file = path.resolve(process.cwd(), opt.file);
  if (!fs.existsSync(file)) return {};
  const env = fs.readFileSync(file, "utf8");
  const lines = env.split("\n");
  const obj = {};
  for (const line of lines) {
    const [key, ...value] = line.split("=");
    if (!key) continue;
    obj[key] = value.join("=");
  }
  return obj;
}