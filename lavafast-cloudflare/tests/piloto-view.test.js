import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import worker from "../src/index.js";

const chamar = (path, env = { ENVIRONMENT: "homologacao" }, method="GET") =>
  worker.fetch(new Request("https://lavafast-demo.invalid"+path, {method}), env);

test("painel visual pode ser aberto apenas em homologacao", async () => {
  const page = await chamar("/piloto/operacao");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  const html = await page.text();
  assert.match(html, /HOMOLOGAÇÃO/);
  assert.match(html, /Dados exclusivamente demonstrativos/);
  assert.match(html, /\/piloto\/operacao.js/);
  assert.match(html, /id="loja"/);
  assert.match(html, /id="busca"/);
});

test("script da pagina usa consulta D1 demonstrativa e e valido", async () => {
  const resp = await chamar("/piloto/operacao.js");
  assert.equal(resp.status, 200);
  assert.match(resp.headers.get("content-type"), /text\/javascript/);
  const script = await resp.text();
  new Script(script); // verifica sintaxe JS e impede regressao de deploy
  assert.match(script, /\/api\/piloto\/cards/);
  assert.match(script, /textContent/);
  assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML/);
});

test("pagina e script bloqueados fora da homologacao", async () => {
  assert.equal((await chamar("/piloto/operacao", {})).status, 404);
  assert.equal((await chamar("/piloto/operacao.js", { ENVIRONMENT: "production" })).status, 404);
  assert.equal((await chamar("/piloto", {}, "POST")).status, 405);
});
