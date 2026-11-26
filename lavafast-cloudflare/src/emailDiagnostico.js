// Diagnostico sem dados pessoais ou financeiros.
// Cada categoria tem apenas um contador e a data da ultima ocorrencia.
const categorias=new Set([
 "EMAIL_RECEBIDO_WORKER","EMAIL_SEM_CONFIGURACAO","DESTINATARIO_DIFERENTE",
 "VERIFICACAO_GOOGLE","REMETENTE_OU_ASSUNTO_DIFERENTE",
 "CARDS_CRIADOS","SL_DUPLICADA","ERRO_PROCESSAMENTO"
]);
async function garantirTabela(env){
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ct_email_diagnostico(
  evento TEXT PRIMARY KEY NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  ultimo_em TEXT NOT NULL
 )`).run();
}
export async function registrarEventoEmail(env,tipo){
 if(!env.DB||env.ENVIRONMENT!=="homologacao"||!categorias.has(tipo))return;
 try{
  await garantirTabela(env);
  await env.DB.prepare(`INSERT INTO ct_email_diagnostico(evento,quantidade,ultimo_em)
   VALUES (?,1,?) ON CONFLICT(evento) DO UPDATE SET
   quantidade=ct_email_diagnostico.quantidade+1,ultimo_em=excluded.ultimo_em`)
    .bind(tipo,new Date().toISOString()).run();
 }catch{
  // Falha do diagnostico nao deve interromper entrega do email.
 }
}
export async function resumoDiagnosticoEmail(env){
 if(!env.DB||env.ENVIRONMENT!=="homologacao")return [];
 try{
  await garantirTabela(env);
  const q=await env.DB.prepare("SELECT evento,quantidade,ultimo_em FROM ct_email_diagnostico ORDER BY ultimo_em DESC").all();
  return (q.results||[]).filter(x=>categorias.has(x.evento));
 }catch{return [];}
}
