import { verificarTokenGoogle } from "./authGoogle.js";

// API separada do piloto publico. Nenhum dado real ate migracao aprovada.
const A = "/api/seguro/";
const validas = new Set(["OPERACAO","ANALISTA","CO"]);
const codigos = new Set(["HML_MOOCA","HML_CENTRAL_PLAZA"]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store", "x-content-type-options":"nosniff" }
});
const emailValido = email =>
  typeof email === "string" && email.length < 255 &&
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);

function sanitizarUsuario(u) {
  return {
    email:u.email,
    nome:u.nome || "",
    perfil:u.perfil,
    loja_codigo:u.loja_codigo,
    ativo:u.ativo === 1
  };
}

async function usuarioAutenticado(request, env) {
  if (!env.DB || typeof env.LAVAFAST_GOOGLE_CLIENT_ID !== "string" ||
      !env.LAVAFAST_GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com")) {
    return { erro: json({ erro:"Autenticacao Google ainda nao configurada." },503) };
  }
  const value = request.headers.get("Authorization") || "";
  if (!/^Bearer [a-zA-Z0-9_.\-]{100,12000}$/.test(value)) {
    return { erro:json({ erro:"Entre com sua conta Google." },401) };
  }
  let identity;
  try {
    identity = await verificarTokenGoogle(value.slice(7),env.LAVAFAST_GOOGLE_CLIENT_ID);
  } catch {
    return { erro:json({ erro:"Sessao Google invalida ou expirada." },401) };
  }

  try {
    // Identidade principal Google sub: email e apenas convite para 1o vinculo.
    let user = await env.DB.prepare(
      "SELECT * FROM hml_usuarios WHERE google_sub = ? AND ativo = 1"
    ).bind(identity.google_sub).first();

    if (!user && identity.email_autoritativo) {
      const bootstrap = String(env.LAVAFAST_BOOTSTRAP_EMAIL || "").toLowerCase().trim();
      if (bootstrap && identity.email === bootstrap && emailValido(bootstrap)) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO hml_usuarios
          (email,google_sub,nome,perfil,loja_codigo)
          VALUES (?, ?, ?, 'CO', NULL)
        `).bind(identity.email,identity.google_sub,identity.nome).run();
      }

      let convite = await env.DB.prepare(
        "SELECT * FROM hml_usuarios WHERE email = ? AND ativo = 1"
      ).bind(identity.email).first();

      if (convite && !convite.google_sub) {
        try {
          await env.DB.prepare(`
            UPDATE hml_usuarios SET google_sub = ?, atualizado_em = ?
            WHERE email = ? AND ativo = 1 AND google_sub IS NULL
          `).bind(identity.google_sub,new Date().toISOString(),identity.email).run();
        } catch {
          // Concorrencia ou sub ja vinculado, falhar fechado.
        }
      }
      user = await env.DB.prepare(
        "SELECT * FROM hml_usuarios WHERE google_sub = ? AND ativo = 1"
      ).bind(identity.google_sub).first();
    }

    if (!user || !validas.has(user.perfil) || (user.perfil === "OPERACAO" &&
      !codigos.has(user.loja_codigo))) {
      return { erro:json({ erro:"Conta Google sem permissao no LavaFast." },403) };
    }
    return { user:sanitizarUsuario(user) };
  } catch {
    return { erro:json({ erro:"Nao foi possivel validar as permissoes." },503) };
  }
}

const cols = `
 SELECT s.id,s.numero_solicitacao,s.placa,s.status,
        s.recebida_em,s.finalizada_em,l.nome AS loja,l.codigo AS codigo_loja,
        t.nome AS tipo_lavagem
 FROM op_solicitacoes_lavagem s
 JOIN op_lojas l ON l.id=s.loja_id
 LEFT JOIN op_tipos_lavagem t ON t.id=s.tipo_lavagem_id
 WHERE s.origem='HOMOLOGACAO'
 AND s.fornecedor='LAB-HOMOLOGACAO'
 AND s.id LIKE 'HML-CARD-%'
`;
const seconds = (start,end) => {
  const a=Date.parse(start||""),b=Date.parse(end||"");
  return Number.isFinite(a)&&Number.isFinite(b) ? Math.max(0,Math.floor((b-a)/1000)) : null;
};
const card = row => ({
  id:row.id,numero_solicitacao:row.numero_solicitacao,
  placa:row.placa,status:row.status,recebida_em:row.recebida_em,
  finalizada_em:row.finalizada_em,loja:row.loja,codigo_loja:row.codigo_loja,
  tipo_lavagem:row.tipo_lavagem,
  tempo_total_segundos:row.status==="FINALIZADA"?seconds(row.recebida_em,row.finalizada_em):null
});

async function listar(env, user, url, tipo) {
  const solicitado = url.searchParams.get("loja") || "";
  if (solicitado && !codigos.has(solicitado))
    return json({ erro:"Loja invalida." },400);
  if (user.perfil==="OPERACAO" && solicitado && solicitado!==user.loja_codigo)
    return json({ erro:"Sem permissao para esta loja." },403);
  const loja = user.perfil==="OPERACAO" ? user.loja_codigo : solicitado;

  const filtro = tipo==="solicitacoes"
    ? " AND s.status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM')"
    : " AND s.status='FINALIZADA'";
  const query = cols + filtro + " AND (?='' OR l.codigo=?) ORDER BY s.recebida_em DESC LIMIT 100";
  const data = await env.DB.prepare(query).bind(loja,loja).all();
  const cards=(data.results||[]).map(card);
  return json({ ambiente:"homologacao",total:cards.length,cards });
}

async function finalizar(env, user, id) {
  if (!/^HML-CARD-[0-9]{1,8}$/.test(id))
    return json({ erro:"Identificador de homologacao invalido." },400);

  // A verificacao de loja acontece NO WHERE do UPDATE. Nao apenas no UI.
  const loja = user.perfil==="OPERACAO"?user.loja_codigo:"";
  const agora=new Date().toISOString();
  const updated=await env.DB.prepare(`
    UPDATE op_solicitacoes_lavagem
    SET status='FINALIZADA',finalizada_em=?,updated_at=?
    WHERE id=? AND origem='HOMOLOGACAO'
    AND fornecedor='LAB-HOMOLOGACAO'
    AND status IN ('SOLICITADO','AGUARDANDO','EM_LAVAGEM')
    AND loja_id IN (SELECT id FROM op_lojas WHERE (?='' OR codigo=?))
  `).bind(agora,agora,id,loja,loja).run();
  if(updated.meta?.changes!==1)
    return json({ erro:"Solicitacao inexistente, sem permissao ou ja concluida." },409);
  const row=await env.DB.prepare(cols+" AND s.id=?").bind(id).first();
  return json({ concluida:true,card:row?card(row):null },200);
}

async function financeiro(env,user,url) {
  if (!["ANALISTA","CO"].includes(user.perfil))
    return json({ erro:"Dados financeiros restritos a analista e C&O." },403);

  const requested=url.searchParams.get("loja")||"";
  if(requested && !codigos.has(requested))return json({ erro:"Loja invalida." },400);
  // Financeiro em rota SEGREGADA. Nunca misturar com lista operacional.
  const data=await env.DB.prepare(`
    SELECT l.codigo AS loja_codigo,l.nome AS loja,
      COUNT(*) AS quantidade,COALESCE(SUM(s.valor_centavos),0) AS total_centavos
    FROM op_solicitacoes_lavagem s
    JOIN op_lojas l ON l.id=s.loja_id
    WHERE s.origem='HOMOLOGACAO'
    AND s.fornecedor='LAB-HOMOLOGACAO' AND s.id LIKE 'HML-CARD-%'
    AND (?='' OR l.codigo=?)
    GROUP BY l.codigo,l.nome ORDER BY l.nome
  `).bind(requested,requested).all();
  return json({ ambiente:"homologacao",dados_ficticios:true,resumo:data.results||[] });
}

async function listarUsuarios(env,user) {
  if (user.perfil!=="CO")return json({ erro:"Acesso exclusivo do C&O." },403);
  const result=await env.DB.prepare(
    "SELECT email,nome,perfil,loja_codigo,ativo FROM hml_usuarios ORDER BY email LIMIT 100"
  ).all();
  return json({ usuarios:(result.results||[]).map(sanitizarUsuario) });
}

async function upsertUsuario(env,user,request) {
  if(user.perfil!=="CO")return json({ erro:"Acesso exclusivo do C&O." },403);
  let body;
  try {body=await request.json();}catch{return json({ erro:"JSON invalido." },400);}
  if(!body || typeof body!=="object" || Array.isArray(body))return json({ erro:"Dados invalidos." },400);
  const email=String(body.email||"").toLowerCase().trim();
  const perfil=String(body.perfil||"");
  const loja=body.loja_codigo||null;
  const ativo=body.ativo===false?0:1;
  if(!emailValido(email)||!validas.has(perfil)||
      (loja!==null&&!codigos.has(loja))||
      (perfil==="OPERACAO"&&!loja)||
      (typeof body.ativo!=="undefined"&&typeof body.ativo!=="boolean")){
    return json({ erro:"Email, perfil ou loja invalidos." },400);
  }
  // Evita que a ultima conta C&O remova seu proprio acesso sem revisao.
  if(email===user.email && (perfil!=="CO"||ativo!==1))
    return json({ erro:"O C&O nao pode desativar seu proprio acesso." },400);
  const nome=String(body.nome||"").slice(0,120);
  const now=new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO hml_usuarios(email,nome,perfil,loja_codigo,ativo,atualizado_em)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(email) DO UPDATE SET
      nome=excluded.nome,perfil=excluded.perfil,loja_codigo=excluded.loja_codigo,
      ativo=excluded.ativo,atualizado_em=excluded.atualizado_em
  `).bind(email,nome,perfil,loja,ativo,now).run();
  return json({ salvo:true,email,perfil,loja_codigo:loja,ativo:!!ativo },200);
}

export async function seguroApi(request,env,url) {
  const path=url.pathname;
  if(!path.startsWith(A))return null;
  if(env.ENVIRONMENT!=="homologacao")return json({ erro:"Rota indisponivel." },404);
  if(path===A+"configuracao") {
    if(request.method!=="GET")return json({ erro:"Metodo nao permitido." },405);
    const clientId=String(env.LAVAFAST_GOOGLE_CLIENT_ID||"");
    return json({
      ambiente:"homologacao",google_configurado:clientId.endsWith(".apps.googleusercontent.com"),
      google_client_id:clientId.endsWith(".apps.googleusercontent.com")?clientId:null
    });
  }
  const autorizacao=await usuarioAutenticado(request,env);
  if(autorizacao.erro)return autorizacao.erro;
  const user=autorizacao.user;
  try {
    if(path===A+"eu" && request.method==="GET")return json({ usuario:user });
    if(path===A+"solicitacoes" && request.method==="GET")return listar(env,user,url,"solicitacoes");
    if(path===A+"concluidos" && request.method==="GET")return listar(env,user,url,"concluidos");
    if(path===A+"financeiro/resumo" && request.method==="GET")return financeiro(env,user,url);
    if(path===A+"usuarios" && request.method==="GET")return listarUsuarios(env,user);
    const write=(path===A+"usuarios" || /^\/api\/seguro\/finalizar\/.+/.test(path));
    if(write && request.method==="POST"){
      if(request.headers.get("Origin")!==new URL(request.url).origin)
        return json({ erro:"Origem nao autorizada." },403);
      if(path===A+"usuarios")return upsertUsuario(env,user,request);
      return finalizar(env,user,path.slice((A+"finalizar/").length));
    }
    return json({ erro:"Rota ou metodo nao permitido." },404);
  } catch {
    return json({ erro:"Erro ao consultar o banco de homologacao." },503);
  }
}
