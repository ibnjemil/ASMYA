const fs=require("fs");let c=fs.readFileSync("src/components/mesjid/ChatView.tsx","utf8");
c=c.replace("  const handleVoiceToggle","  const uploadFile=async(p)=>{const r=await fetch(p.dataUrl);const b=await r.blob();const f=new FormData();f.append(\"file\",b,p.name);const u=await fetch(\"/api/upload-avatar\",{method:\"POST\",body:f});if(u.ok){const j=await u.json();return j.url||j.avatarUrl};return null};`n`n  const handleVoiceToggle");
c=c.replace("mediaUrl = pending.dataUrl","mediaUrl = await uploadFile(pending)");
c=c.replace("const [pending, setPending] = useState<PendingAttachment | null>(null)","const [pending, setPending] = useState<PendingAttachment | null>(null)`n  const [ctxMsg, setCtxMsg] = useState(null)`n  const lpRef = useRef(null)`n  const [sendingIds, setSendingIds] = useState(new Set())");
c=c.replace("  const loadMore","  const lpStart=(msg,e)=>{lpRef.current=setTimeout(()=>{setCtxMsg({msg,x:e.touches[0].clientX,y:e.touches[0].clientY})},500)};const lpEnd=()=>{if(lpRef.current){clearTimeout(lpRef.current);lpRef.current=null}};`n`n  const loadMore");
c=c.replace("onContextMenu={(e) => { e.preventDefault(); if (!isDel) handleReply(msg) }}","onContextMenu={(e)=>{e.preventDefault();if(!isDel)setCtxMsg({msg,x:e.clientX,y:e.clientY})}}");
c=c.replace("onContextMenu={(e) => { e.preventDefault(); if (!isDel) handleReply(msg) }}","onContextMenu={(e)=>{e.preventDefault();if(!isDel)setCtxMsg({msg,x:e.clientX,y:e.clientY})}}");
c=c.replace("a.href = msg.mediaUrl; a.download = msg.content || 'download'","if(msg.type===\"FILE\"){window.open(msg.mediaUrl,\"_blank\")}else{a.href=msg.mediaUrl;a.download=msg.content||\"download\"}");
fs.writeFileSync("src/components/mesjid/ChatView.tsx",c);console.log("Done: upload fix + context menu + sending status + file open");
