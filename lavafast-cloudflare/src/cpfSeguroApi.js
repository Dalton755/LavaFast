// Transicao de autenticacao CPF+senha para Cloudflare.
// Consulta o cadastro EXISTENTE, usa a senha atual no Supabase Auth
// e solicita o perfil ativo a API original. Nao cria funcionarios,
// nao copia hashes do Auth e nao altera registros de producao.
const PREFIX = "/api/seguro/";
const LEGACY_BASE = "https://lavafast-api.onrender.com/api";
const LEGACY_SUPABASE_HOST = "xgbdurmauhwpbiesdqmi.supabase.co";
const COOKIE = "__Host-lavafast_hml_cpf";
const MAX_AGE_SECONDS = 1800; // Sessao local curta; revogacao na expiracao.
const ERR_LOGIN = "CPF ou senha incorretos, ou acesso inativo.";
const tipos = ["OPERACAO","ANALISTA","CO"];
const lojas = ["HML_MOOCA","HML_CENTRAL_PLAZA"];

function json(value,status=200,headers={}) {
  return new Response(JSON.stringify(value),{status,headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store",
    "x-content-type-options":"nosniff",
    "referrer-policy":"no-referrer",...headers
  }});
}
const sessaoCookie = (token,age) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
const semSessao=()=>sessaoCookie("",0);
function cleanCpf(raw) {
  const digits = String(raw||"").replace(/\D/g,"");
  if(digits.length!==11||/^(\d)\1{10}$/.test(digits))return null;
  const verificador=n=>{
    let soma=0;for(let i=0;i<n;i++)soma+=Number(digits[i])*(n+1-i);
    const r=(soma*10)%11;return r===10?0:r;
  };
  return Number(digits[9])===verificador(9) &&
    Number(digits[10])===verificador(10) ? digits : null;
}
function maskCpf(cpf) { return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4"); }

function configurado(env) {
  if(env.ENVIRONMENT!=="homologacao"||env.LAVAFAST_BRIDGE_ENABLED!=="true"||
      typeof env.LAVAFAST_SUPABASE_URL!=="string"||
      typeof env.LAVAFAST_SUPABASE_ANON_KEY!=="string"||
      env.LAVAFAST_SUPABASE_ANON_KEY.length<20||
      typeof env.LAVAFAST_SESSION_SECRET!=="string"||
      env.LAVAFAST_SESSION_SECRET.length<32||
      !env.DB)return false;
  try {
    const u=new URL(env.LAVAFAST_SUPABASE_URL);
    return u.protocol==="https:" && u.hostname===LEGACY_SUPABASE_HOST &&
      (u.pathname==="/"||u.pathname==="") && !u.search && !u.hash &&
      !u.username && !u.password;
  }catch{return false;}
}
function operacaoLoja(loja) {
  const s=String(loja||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/\s+/g," ").trim();
  if(s==="mooca")return "HML_MOOCA";
  if(s==="central plaza")return "HML_CENTRAL_PLAZA";
  return null; // Nenhuma loja externa tem acesso ao piloto.
}
function perfilCargo(cargo) {
  return cargo==="C&O"?"CO":cargo==="Analista"?"ANALISTA":"OPERACAO";
}
async function digest(raw) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
}
async function hmac(secret,raw) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(sig),x=>x.toString(16).padStart(2,"0")).join("");
}
function sessionFromCookie(request) {
  const header=request.headers.get("Cookie")||"";
  const value=header.split(";").map(x=>x.trim())
    .find(x=>x.startsWith(COOKIE+"="));
  const token=value?value.slice(COOKIE.length+1):"";
  return /^[0-9a-f]{64}$/.test(token)?token:null;
}
function safeJson(req) {
  const n=Number(req.headers.get("content-length")||0);
  if(n>2048)return Promise.reject(new Error("body muito grande"));
  return req.text().then(t=>{
    if(t.length>2048)throw Error("body muito grande");
    return JSON.parse(t);
  });
}
function sameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}
async function fetchJson(url,options) {
  const resp=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(12000),...options});
  const data=await resp.json().catch(()=>({}));
  return {status:resp.status,ok:resp.ok,data};
}
async function rateKey(env,request,cpf) {
  const ip=String(request.headers.get("CF-Connecting-IP")||"sem-ip").slice(0,70);
  return hmac(env.LAVAFAST_SESSION_SECRET,"cpf:"+cpf+"|ip:"+ip);
}
async function bloqueado(env,key) {
  const value=await env.DB.prepare(
    "SELECT falhas,expira_em FROM hml_login_tentativas WHERE chave_hash=?"
  ).bind(key).first();
  return Boolean(value && value.expira_em>new Date().toISOString()&&value.falhas>=5);
}
async function falha(env,key) {
  const now=new Date().toISOString();
  const expira=new Date(Date.now()+15*60*1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO hml_login_tentativas(chave_hash,falhas,expira_em)
    VALUES (?,1,?)
    ON CONFLICT(chave_hash) DO UPDATE SET
      falhas=CASE WHEN hml_login_tentativas.expira_em<=?
                  THEN 1 ELSE hml_login_tentativas.falhas+1 END,
      expira_em=CASE WHEN hml_login_tentativas.expira_em<=?
                  THEN excluded.expira_em ELSE hml_login_tentativas.expira_em END
  `).bind(key,expira,now,now).run();
}
async function entrar(request,env) {
  if(!sameOrigin(request))return json({erro:"Origem nao autorizada."},403);
  if(!configurado(env))return json({erro:"Login CPF em configuracao."},503);

  let body;
  try{body=await safeJson(request);}catch{return json({erro:"Dados invalidos."},400);}
  const cpf=cleanCpf(body?.cpf);
  const senha=body?.senha;
  if(!cpf||typeof senha!=="string"||senha.length===0||senha.length>512)
    return json({erro:ERR_LOGIN},401);
  const key=await rateKey(env,request,cpf);
  if(await bloqueado(env,key))return json({erro:"Muitas tentativas. Tente novamente mais tarde."},429);

  let profile;
  try {
    // A base original continua sendo a autoridade para funcionario, cargo e loja.
    const lookup=await fetchJson(LEGACY_BASE+"/auth/verificar-cpf",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({cpf:maskCpf(cpf)})
    });
    if(!lookup.ok || lookup.data?.encontrado!==true ||
        typeof lookup.data.email!=="string"||lookup.data.possuiAuth!==true) {
      await falha(env,key);return json({erro:ERR_LOGIN},401);
    }
    const email=lookup.data.email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) {
      await falha(env,key);return json({erro:ERR_LOGIN},401);
    }

    // Senha ja cadastrada: validada exclusivamente pelo Supabase Auth
    // (mesmo provedor que atende o LavaFast em producao).
    const url=env.LAVAFAST_SUPABASE_URL.replace(/\/$/,"")+"/auth/v1/token?grant_type=password";
    const login=await fetchJson(url,{
      method:"POST",
      headers:{"content-type":"application/json","apikey":env.LAVAFAST_SUPABASE_ANON_KEY},
      body:JSON.stringify({email,password:senha})
    });
    if(!login.ok || typeof login.data.access_token!=="string"){
      await falha(env,key);return json({erro:ERR_LOGIN},401);
    }
    const me=await fetchJson(LEGACY_BASE+"/auth/me",{
      headers:{Authorization:"Bearer "+login.data.access_token}
    });
    // Inativo, sem vinculo ou CPF associado a outra conta: NEGAR.
    if(!me.ok || !me.data ||typeof me.data.id!=="string" ||
      me.data.email?.toLowerCase()!==email ||
      !tipos.includes(perfilCargo(me.data.cargo))) {
      await falha(env,key);return json({erro:ERR_LOGIN},401);
    }
    const profileCargo=String(me.data.cargo||"");
    profile={
      funcionario_id:me.data.id,
      nome:String(me.data.nome||"").slice(0,120),
      cargo:profileCargo,
      perfil:perfilCargo(profileCargo),
      loja:String(me.data.loja||"").slice(0,150),
      loja_codigo:operacaoLoja(me.data.loja)
    };
    if(!profile.nome||!profile.loja) {
      await falha(env,key);return json({erro:ERR_LOGIN},401);
    }
  } catch {
    return json({erro:"Nao foi possivel consultar o login atual do LavaFast."},503);
  }

  // Registra somente uma sessao curta; CPF, email, senha e token legado
  // nao sao persistidos em D1, cookies, HTML ou repositorio.
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),
    x=>x.toString(16).padStart(2,"0")).join("");
  const hash=await digest(token);
  const expira=new Date(Date.now()+MAX_AGE_SECONDS*1000).toISOString();
  try {
    await env.DB.prepare(`
      INSERT INTO hml_sessoes_cpf
      (chave_hash,funcionario_id,nome,cargo,perfil,loja,loja_codigo,expira_em)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(hash,profile.funcionario_id,profile.nome,profile.cargo,profile.perfil,
      profile.loja,profile.loja_codigo,expira).run();
    await env.DB.prepare(
      "DELETE FROM hml_login_tentativas WHERE chave_hash=?"
    ).bind(key).run();
  }catch{
    return json({erro:"Nao foi possivel criar sessao de homologacao."},503);
  }
  return json({autenticado:true,usuario:{
    id:profile.funcionario_id,nome:profile.nome,cargo:profile.cargo,
    perfil:profile.perfil,loja:profile.loja,loja_codigo:profile.loja_codigo
  }},200,{"set-cookie":sessaoCookie(token,MAX_AGE_SECONDS)});
}
async function usuarioAutenticado(request,env) {
  if(!env.DB)return null;
  const token=sessionFromCookie(request);
  if(!token)return null;
  const hash=await digest(token);
  const data=await env.DB.prepare(`
    SELECT funcionario_id,nome,cargo,perfil,loja,loja_codigo,expira_em
    FROM hml_sessoes_cpf WHERE chave_hash=? AND expira_em>?
  `).bind(hash,new Date().toISOString()).first();
  if(!data||!tipos.includes(data.perfil)||data.perfil!==perfilCargo(data.cargo))return null;
  return {
    id:data.funcionario_id,nome:data.nome,cargo:data.cargo,
    perfil:data.perfil,loja:data.loja,loja_codigo:data.loja_codigo
  };
}
async function sair(request,env) {
  if(!sameOrigin(request))return json({erro:"Origem nao autorizada."},403);
  const token=sessionFromCookie(request);
  if(token&&env.DB){
    await env.DB.prepare("DELETE FROM hml_sessoes_cpf WHERE chave_hash=?")
      .bind(await digest(token)).run();
  }
  return json({sucesso:true},200,{"set-cookie":semSessao()});
}

// Restricao de colunas: nenhum endpoint de operacao possui valor_centavos.
const baseSql=`
 SELECT s.id,s.numero_solicitacao,s.placa,s.status,s.recebida_em,s.finalizada_em,
   l.nome AS loja,l.codigo AS codigo_loja,t.nome AS tipo_lavagem
 FROM op_solicitacoes_lavagem s
 JOIN op_lojas l ON l.id=s.loja_id
 LEFT JOIN op_tipos_lavagem t ON t.id=s.tipo_lavagem_id
 WHERE s.origem='HOMOLOGACAO' AND s.fornecedor='LAB-HOMOLOGACAO'
 AND s.id LIKE 'HML-CARD-%'
`;
const tempo=(a,b)=>{
  const x=Date.parse(a||""),y=Date.parse(b||"");
  return Number.isFinite(x)&&Number.isFinite(y)?Math.max(0,Math.floor((y-x)/1000)):null;
};
function mostrar(c) {
  return {
    id:c.id,numero_solicitacao:c.numero_solicitacao,placa:c.placa,
    status:c.status,recebida_em:c.recebida_em,finalizada_em:c.finalizada_em,
    loja:c.loja,codigo_loja:c.codigo_loja,tipo_lavagem:c.tipo_lavagem,
    tempo_total_segundos:c.status==="FINALIZADA"?tempo(c.recebida_em,c.finalizada_em):null
  };
}
function filtroLoja(url,usuario) {
  const loja=url.searchParams.get("loja")||"";
  if(loja&&!lojas.includes(loja))return {erro:json({erro:"Loja invalida."},400)};
  if(usuario.perfil==="OPERACAO"){
    if(!usuario.loja_codigo)return {erro:json({erro:"Loja ainda nao disponivel no piloto."},403)};
    if(loja&&loja!==usuario.loja_codigo)
      return {erro:json({erro:"Sem autorizacao para esta loja."},403)};
    return {loja:usuario.loja_codigo};
  }
  return {loja};
}
async function listar(env,url,usuario,status) {
  const filtro=filtroLoja(url,usuario);
  if(filtro.erro)return filtro.erro;
  const cond=status==="solicitacoes"?
    " AND s.status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM')":
    " AND s.status='FINALIZADA'";
  const query=baseSql+cond+" AND (?='' OR l.codigo=?) ORDER BY s.recebida_em DESC LIMIT 100";
  const data=await env.DB.prepare(query).bind(filtro.loja,filtro.loja).all();
  const cards=(data.results||[]).map(mostrar);
  return json({ambiente:"homologacao",total:cards.length,cards});
}
async function finalizar(env,usuario,id) {
  if(!/^HML-CARD-[0-9]{1,8}$/.test(id))
    return json({erro:"Identificador demonstrativo invalido."},400);
  if(usuario.perfil==="OPERACAO"&&!usuario.loja_codigo)
    return json({erro:"Loja nao disponivel no piloto."},403);
  const loja=usuario.perfil==="OPERACAO"?usuario.loja_codigo:"";
  const now=new Date().toISOString();
  const result=await env.DB.prepare(`
    UPDATE op_solicitacoes_lavagem SET status='FINALIZADA',finalizada_em=?,updated_at=?
    WHERE id=? AND origem='HOMOLOGACAO' AND fornecedor='LAB-HOMOLOGACAO'
      AND status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM')
      AND loja_id IN (SELECT id FROM op_lojas WHERE (?='' OR codigo=?))
  `).bind(now,now,id,loja,loja).run();
  if(result.meta?.changes!==1)
    return json({erro:"Lavagem ja finalizada, inexistente ou nao autorizada."},409);
  const row=await env.DB.prepare(baseSql+" AND s.id=?").bind(id).first();
  return json({concluida:true,card:row?mostrar(row):null});
}
async function resumo(env,url,usuario) {
  if(!["ANALISTA","CO"].includes(usuario.perfil))
    return json({erro:"Acesso financeiro nao autorizado."},403);
  const f=filtroLoja(url,usuario);
  if(f.erro)return f.erro;
  const data=await env.DB.prepare(`
    SELECT l.codigo AS loja_codigo,l.nome AS loja,
      COUNT(*) AS quantidade,COALESCE(SUM(s.valor_centavos),0) AS total_centavos
    FROM op_solicitacoes_lavagem s JOIN op_lojas l ON l.id=s.loja_id
    WHERE s.origem='HOMOLOGACAO' AND s.fornecedor='LAB-HOMOLOGACAO'
      AND s.id LIKE 'HML-CARD-%' AND (?='' OR l.codigo=?)
    GROUP BY l.codigo,l.nome ORDER BY l.nome
  `).bind(f.loja,f.loja).all();
  return json({ambiente:"homologacao",ficticio:true,resumo:data.results||[]});
}

export async function cpfSeguroApi(request,env,url) {
  const path=url.pathname;
  if(!path.startsWith(PREFIX))return null;
  if(env.ENVIRONMENT!=="homologacao")return json({erro:"Rota indisponivel."},404);
  if(path===PREFIX+"configuracao"){
    if(request.method!=="GET")return json({erro:"Metodo nao permitido."},405);
    return json({ambiente:"homologacao",login_cpf_ativo:configurado(env),
      migracao_usuarios:"em_preparacao",validacao:"cadastro_atual"});
  }
  if(path===PREFIX+"entrar"){
    if(request.method!=="POST")return json({erro:"Metodo nao permitido."},405);
    return entrar(request,env);
  }
  if(path===PREFIX+"sair"){
    if(request.method!=="POST")return json({erro:"Metodo nao permitido."},405);
    return sair(request,env);
  }
  if(!configurado(env))return json({erro:"Autenticacao ainda nao configurada."},503);
  let usuario;
  try{usuario=await usuarioAutenticado(request,env);}
  catch{return json({erro:"Falha ao validar sessao."},503);}
  if(!usuario)return json({erro:"Sessao nao autorizada ou expirada."},401);
  try{
    if(path===PREFIX+"eu"&&request.method==="GET")return json({usuario});
    if(path===PREFIX+"solicitacoes"&&request.method==="GET")
      return listar(env,url,usuario,"solicitacoes");
    if(path===PREFIX+"concluidos"&&request.method==="GET")
      return listar(env,url,usuario,"concluidos");
    if(path===PREFIX+"financeiro/resumo"&&request.method==="GET")
      return resumo(env,url,usuario);
    if(path.startsWith(PREFIX+"finalizar/")&&request.method==="POST"){
      if(!sameOrigin(request))return json({erro:"Origem nao autorizada."},403);
      return finalizar(env,usuario,path.slice((PREFIX+"finalizar/").length));
    }
    return json({erro:"Rota nao encontrada ou metodo invalido."},404);
  }catch{
    return json({erro:"Falha ao acessar dados de homologacao."},503);
  }
}
