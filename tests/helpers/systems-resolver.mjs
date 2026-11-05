import { register } from 'node:module';
let done = false;
export function installSystemsResolver() {
  if (done) return;
  done = true;
  register('./systems-resolve-hooks.mjs', import.meta.url);
}
