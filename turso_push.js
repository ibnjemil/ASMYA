const {createClient}=require('@libsql/client');
const fs=require('fs');
const db=createClient({url:'libsql://asmya-db-ibnjemil.aws-ap-northeast-1.turso.io',authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0ODM5MjgsImlkIjoiMDE5ZWZlNTYtMDUwMS03OGQ5LTk2NzEtYWZmNTMzZDZmMzRjIiwicmlkIjoiYWY5YTY4NDUtYThhOC00YjVhLWEzOGUtMzJmMDk2MjhhOWMzIn0.avDk0zuQK-v_fb2DrJDI7o2h0s4DJWBJVP0U9MjMZ8shWszsJH3-hSJr26pLnyt-n7rV7Xp4VfF_fFdjLSOiBQ'});
const sql=fs.readFileSync('/tmp/dump.sql','utf8');
const stmts=sql.split(';').map(s=>s.trim()).filter(s=>s.length>0);
(async()=>{
  for(let i=0;i<stmts.length;i++){
    try{
      await db.execute(stmts[i]);
      if(stmts[i].indexOf('CREATE')>=0) console.log('OK:', stmts[i].slice(0,60));
    }catch(e){
      console.error('ERR stmt',i,':',e.message.slice(0,100));
    }
  }
  const r=await db.execute('SELECT count(*) as c FROM User');
  console.log('Users in Turso:',r.rows[0].c);
  await db.close();
})().catch(e=>console.error(e));
