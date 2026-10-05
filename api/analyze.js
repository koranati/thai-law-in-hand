export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const problem=String(req.body?.problem||'').trim();
  const context=Array.isArray(req.body?.context)?req.body.context.slice(0,8):[];
  if(problem.length<5) return res.status(400).json({error:'กรุณาอธิบายเหตุการณ์เพิ่มเติม'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'AI backend ยังไม่ได้ตั้งค่า API key'});
  const system=`คุณคือผู้ช่วยข้อมูลกฎหมายไทยสำหรับประชาชน ชื่อ กฎหมายในมือ\nกติกาสำคัญ:\n1) ให้ข้อมูลเบื้องต้น ไม่วินิจฉัยคดีและไม่รับรองว่าฝ่ายใดผิด\n2) ห้ามสร้างชื่อกฎหมาย เลขมาตรา คำพิพากษา หรือ URL ขึ้นเอง\n3) เลขมาตราให้กล่าวได้เฉพาะรายการที่ปรากฏใน CONTEXT และ verified=true เท่านั้น\n4) ถ้าข้อมูลไม่พอให้ระบุว่าต้องตรวจสอบเพิ่ม\n5) ตอบภาษาไทยอ่านง่าย\n6) แยกคำตอบเป็น: สรุปสถานการณ์, ประเด็นกฎหมาย, กฎหมาย/มาตราที่ฐานข้อมูลยืนยัน, สิ่งที่ควรตรวจเพิ่ม, สิ่งที่ควรทำต่อ, แหล่งอ้างอิง\n7) เตือนให้ตรวจตัวบทฉบับปัจจุบันและขอคำปรึกษาผู้เชี่ยวชาญเมื่อมีผลต่อสิทธิสำคัญ`;
  const payload={model:process.env.OPENAI_MODEL||'gpt-5-mini',input:[{role:'system',content:[{type:'input_text',text:system}]},{role:'user',content:[{type:'input_text',text:`ปัญหาของผู้ใช้:\n${problem}\n\nCONTEXT จากฐานข้อมูลแอป:\n${JSON.stringify(context,null,2)}`}]}]};
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:'AI provider error',detail:data?.error?.message||'Unknown error'});
    const text=data.output_text || (data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
    return res.status(200).json({answer:text||'ไม่สามารถสร้างคำตอบได้ในขณะนี้',model:payload.model});
  }catch(err){return res.status(500).json({error:'Backend error',detail:String(err?.message||err)});}
}
