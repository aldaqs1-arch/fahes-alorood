const HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>فاحص العروض</title>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<style>
:root{--bg:#f5f7fb;--card:#fff;--ink:#18212f;--muted:#667085;--brand:#155eef;--line:#e4e7ec;--ok:#067647;--warn:#b54708;--bad:#b42318}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);font-family:Tahoma,Arial,sans-serif;color:var(--ink)}
.wrap{max-width:920px;margin:auto;padding:24px 16px 50px}
.hero{text-align:center;padding:22px 8px 14px}
.logo{font-size:34px;font-weight:900}
.tag{color:var(--muted);margin-top:7px;font-size:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;margin-top:16px;box-shadow:0 4px 18px #1018280b}
label{display:block;font-weight:800;margin-bottom:8px}
input[type=url],textarea{width:100%;border:1px solid #d0d5dd;border-radius:12px;padding:13px;font-size:15px;outline:none}
textarea{min-height:110px;resize:vertical}
.btn{border:0;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
.primary{background:var(--brand);color:#fff}
.ghost{background:#f2f4f7;color:#344054}
.file{display:none}
.drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:2px dashed #98a2b3;border-radius:14px;padding:20px;text-align:center;color:#475467;cursor:pointer;margin:12px 0}
.drop-icon{font-size:28px}
.drop small{font-size:12px;color:var(--muted)}
.status{display:none;padding:13px;border-radius:12px;background:#eef4ff;color:#1747a6;margin-top:15px}
.result{display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.fact{border:1px solid var(--line);border-radius:14px;padding:13px}
.fact b{display:block;margin-bottom:5px}
.muted{color:var(--muted)}
.verdict{border-radius:14px;padding:16px;margin-bottom:14px}
.good{background:#ecfdf3;color:#05603a}
.bad{background:#fef3f2;color:#912018}
.neutral{background:#f9fafb;color:#344054}
.source{border-top:1px solid var(--line);padding:13px 0}
.source a{color:#155eef;font-weight:800;text-decoration:none}
.pill{display:inline-block;padding:4px 8px;border-radius:99px;background:#f2f4f7;margin:3px;font-size:12px}
.small{font-size:13px}
.warn{color:var(--warn);font-weight:800}
.ok{color:var(--ok);font-weight:800}
.section-title{font-size:21px;font-weight:900;margin-bottom:14px}
.methods{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:0 0 18px}
.method{border:1px solid var(--line);border-radius:13px;padding:11px;display:flex;gap:8px;align-items:center;background:#fafbfc}
.method span{font-size:22px}
.big{width:100%;font-size:18px;padding:15px}
.clear-btn{width:100%;margin-top:8px}
.input-card label:not(.drop){margin-top:12px}
footer{text-align:center;color:var(--muted);font-size:12px;margin-top:25px}
@media(max-width:620px){
.methods{grid-template-columns:1fr}
.wrap{padding:12px 10px 35px}
.logo{font-size:30px}
.card{padding:16px}
}
</style>
</head>

<body>
<div class="wrap">

<div class="hero">
<div class="logo">🛒 ✓ فاحص العروض</div>
<div class="tag">قبل ما تشتري .. افحص</div>
</div>

<div class="card input-card">

<div class="section-title">أدخل العرض بأي طريقة</div>

<div class="methods">

<div class="method">
<span>🔗</span>
<div>
<b>رابط العرض</b>
<div class="small muted">رابط الإعلان أو المنتج</div>
</div>
</div>

<div class="method">
<span>🖼️</span>
<div>
<b>صورة العرض</b>
<div class="small muted">صورة الإعلان أو الشاشة</div>
</div>
</div>

<div class="method">
<span>✍️</span>
<div>
<b>تفاصيل العرض</b>
<div class="small muted">اكتب المنتج والسعر والمواصفات</div>
</div>
</div>

</div>

<label for="url">🔗 رابط العرض</label>
<input id="url" type="url" placeholder="https://...">

<label class="drop" id="drop" for="file">
<span class="drop-icon">📷</span>
<span>اضغط هنا لرفع صورة الإعلان</span>
<small>JPG / PNG / WEBP</small>
</label>

<input id="file" class="file" type="file" accept="image/*">

<div id="ocr" class="small muted" style="margin-top:8px"></div>

<label for="details">✍️ تفاصيل العرض</label>

<textarea id="details" placeholder="مثال: Hyundai Elantra 2021، مستعملة، السعر 8500 دينار، 120 ألف كم..."></textarea>

<button class="btn primary big" id="go">
🔎 افحص العرض الآن
</button>

<button class="btn ghost clear-btn" id="clear">
مسح البيانات
</button>

<div class="status" id="status"></div>

</div>

<div class="card result" id="result">

<div id="verdict"></div>

<div class="grid" id="facts"></div>

<div style="margin-top:18px">
<h3>المقارنة الفعلية</h3>
<div id="comparison"></div>
</div>

<div style="margin-top:18px">
<h3>المخاطر والتنبيهات</h3>
<div id="risks"></div>
</div>

<div style="margin-top:18px">
<h3>المصادر التي اعتمدنا عليها</h3>
<div id="sources"></div>
</div>

<div class="small muted" style="margin-top:16px">
فاحص العروض لا يعتمد على الذكاء الاصطناعي وحده؛
يتم البحث في الويب الحقيقي ومصادر متعددة،
ثم تحليل ومطابقة النتائج مع العرض.
إذا لم تتوفر أدلة كافية، لن نخترع نتيجة.
</div>

</div>

<footer>
النتائج مبنية على المصادر المتاحة لحظة الفحص وقد تتغير بتغير الأسعار والإعلانات.
</footer>

</div>

<script>

const $=id=>document.getElementById(id);

let offerText="";

$("drop").onclick=()=>$("file").click();

$("file").onchange=async e=>{

const f=e.target.files[0];

if(!f)return;

$("ocr").textContent="جارٍ قراءة النص من الصورة…";

try{

const r=await Tesseract.recognize(
f,
"ara+eng",
{
logger:m=>{
if(m.status==="recognizing text"){
$("ocr").textContent=
"جارٍ قراءة الصورة: "+
Math.round((m.progress||0)*100)+"%";
}
}
}
);

offerText=(r.data.text||"").trim();

$("ocr").textContent=
offerText?
"تم استخراج نص من الصورة.":
"لم نستطع استخراج نص واضح من الصورة.";

}catch(err){

$("ocr").textContent=
"تعذر قراءة الصورة. استخدم الرابط إن أمكن.";

}

};

$("clear").onclick=()=>{

$("url").value="";
$("details").value="";
offerText="";
$("ocr").textContent="";
$("result").style.display="none";
$("status").style.display="none";
$("file").value="";

};

$("go").onclick=async()=>{

const url=$("url").value.trim();

const details=$("details").value.trim();

const combinedText=
[offerText,details]
.filter(Boolean)
.join("\n");

if(!url && !combinedText){

$("status").style.display="block";

$("status").textContent=
"أدخل رابط العرض أو ارفع صورة واضحة أو اكتب تفاصيل العرض.";

return;

}

$("status").style.display="block";

$("status").textContent=
"جارٍ قراءة العرض والبحث في الويب الحقيقي ومطابقة النتائج…";

$("result").style.display="none";

try{

const res=await fetch(
"/api/analyze",
{
method:"POST",
headers:{
"content-type":"application/json"
},
body:JSON.stringify({
url,
offerText:combinedText
})
}
);

const data=await res.json();

if(!res.ok)
throw new Error(data.error||"تعذر الفحص");

render(data);

$("status").style.display="none";

$("result").style.display="block";

}catch(e){

$("status").textContent=
"تعذر إكمال الفحص: "+e.message;

}

};

function render(d){

const v=$("verdict");

v.className=
"verdict "+
(
d.verdict==="جيد"
?"good":
d.verdict==="مرتفع"
?"bad":
"neutral"
);

v.innerHTML=
"<h2 style='margin:0 0 7px'>"+
esc(d.verdictLabel)+
"</h2><div>"+
esc(d.verdictText)+
"</div>";

const f=d.offer||{};

$("facts").innerHTML=[

["المنتج",f.title||"غير متوفر"],

["الفئة",f.category||"غير محددة"],

["السعر",f.priceText||"غير متوفر"],

["السنة",f.year||"غير متوفرة"],

["الحالة",f.condition||"غير محددة"],

["المصدر",f.source||"غير متوفر"]

].map(x=>

"<div class='fact'><b>"+
esc(x[0])+
"</b>"+
esc(String(x[1]))+
"</div>"

).join("");

$("comparison").innerHTML=
d.comparison?.message?
"<p>"+esc(d.comparison.message)+"</p>":
"";

if(d.comparison?.range){

$("comparison").innerHTML+=
"<p><b>نطاق الأسعار المطابقة:</b> "+
esc(d.comparison.range)+
"</p>";

if(d.comparison.count)

$("comparison").innerHTML+=
"<p class='small muted'>عدد المقارنات المطابقة: "+
d.comparison.count+
"</p>";

}

if(d.comparison?.items?.length){

$("comparison").innerHTML+=
d.comparison.items.map(x=>

"<div class='source'>"+
"<a target='_blank' rel='noopener' href='"+
escAttr(x.url)+
"'>"+
esc(x.title)+
"</a>"+
"<div>"+
esc(x.priceText||"")+
"</div>"+
"<div class='small muted'>"+
esc(x.snippet||"")+
"</div>"+
"</div>"

).join("");

}

$("risks").innerHTML=
d.risks?.length?

d.risks.map(x=>
"<div class='pill'>"+
esc(x)+
"</div>"
).join(" "):

"<span class='ok'>لم نرصد تنبيهات واضحة من البيانات المتاحة.</span>";

$("sources").innerHTML=
(d.sources||[]).map(x=>

"<div class='source'>"+
"<a target='_blank' rel='noopener' href='"+
escAttr(x.url)+
"'>"+
esc(x.title||x.url)+
"</a>"+
"<div class='small muted'>"+
esc(x.snippet||"")+
"</div>"+
"</div>"

).join("")

||

"<span class='warn'>لا توجد مصادر موثوقة كافية.</span>";

}

function esc(s){

return String(s??"").replace(
/[&<>"']/g,
c=>({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#39;"
}[c])
);

}

function escAttr(s){

return esc(s).replace(/javascript:/gi,"");

}

</script>

</body>
</html>`;

const JSON_HEADERS={
"content-type":"application/json; charset=utf-8",
"access-control-allow-origin":"*"
};

const CURRENCY_PATTERNS=[

{
name:"JOD",
re:/(?:د\.?أ|دأ|دينار(?:\s*أردني)?|JOD|JD)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/ig
},

{
name:"USD",
re:/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)|([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:USD|US\$)/ig
},

{
name:"SAR",
re:/(?:ر\.?س|ريال(?:\s*سعودي)?|SAR)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/ig
}

];

function clean(s){

return (s||"").replace(/\s+/g," ").trim();

}

function stripHtml(s){

return clean(
(s||"")
.replace(/<script[\s\S]*?<\/script>/gi," ")
.replace(/<style[\s\S]*?<\/style>/gi," ")
.replace(/<[^>]+>/g," ")
);

}

function normalizeUrl(u){

try{

let x=new URL(u);

if(!/^https?:$/.test(x.protocol))
throw 0;

return x.toString();

}catch{

return null;

}

}

function extractPrice(text){

const t=clean(text);

let best=null;

for(const p of CURRENCY_PATTERNS){

for(const m of t.matchAll(p.re)){

const raw=m[1]||m[2];

if(!raw)continue;

const n=Number(raw.replace(/,/g,""));

if(!Number.isFinite(n))continue;

if(n<=0||n>100000000)continue;

best={
currency:p.name,
value:n,
raw:m[0]
};

break;

}

if(best)break;

}

return best;

}

function extractYear(text){

const m=clean(text).match(
/\b(19[89]\d|20[0-2]\d)\b/
);

return m?m[1]:null;

}

function classify(text){

const t=clean(text).toLowerCase();

if(
/شاحنة|truck|pickup|pick-up|foton|isuzu|hino|daewoo truck/.test(t)
)
return"شاحنة";

if(
/سيارة|سيارات|سياره|hyundai|kia|toyota|honda|nissan|mercedes|bmw|audi|lexus|ford|mazda|mitsubishi|chevrolet|elantra|sonata|camry|corolla/.test(t)
)
return"سيارة";

if(
/iphone|galaxy|samsung|xiaomi|redmi|pixel|oppo|huawei|هاتف|جوال|موبايل/.test(t)
)
return"هاتف";

if(
/laptop|notebook|macbook|thinkpad|dell|hp elitebook|lenovo|لابتوب|كمبيوتر محمول/.test(t)
)
return"لابتوب";

if(
/tv|television|smart tv|oled|qled|تلفزيون|شاشة/.test(t)
)
return"تلفزيون / شاشة";

if(
/غسالة|ثلاجة|فرن|microwave|washing machine|refrigerator|air conditioner|مكيف|جهاز منزلي/.test(t)
)
return"جهاز منزلي";

if(
/شقة|منزل|بيت|أرض|ارض|عقار|فيلا|villa|apartment|property|building|عمارة/.test(t)
)
return"عقار / مبنى";

return"منتج";

}

function extractTitle(text,url){

const m=text.match(
/(?:<title[^>]*>)([\s\S]*?)(?:<\/title>)/i
);

if(m)
return clean(stripHtml(m[1])).slice(0,180);

return url?
new URL(url).hostname:
"العرض";

}

function inferCondition(text){

const t=clean(text).toLowerCase();

if(/مستعمل|used|pre-owned|second hand/.test(t))
return"مستعمل";

if(/جديد|new|brand new|unused/.test(t))
return"جديد";

return"غير محددة";

}

function tokensForMatch(title){

return clean(title)
.toLowerCase()
.replace(/[^\p{L}\p{N}]+/gu," ")
.split(/\s+/)
.filter(
x=>
x.length>=3 &&
![
"the",
"for",
"with",
"and",
"from",
"price",
"سعر",
"للبيع"
].includes(x)
);

}

function scoreMatch(offer,resultText){

const t=clean(resultText).toLowerCase();

let score=0;

const titleTokens=
tokensForMatch(offer.title||"").slice(0,8);

if(titleTokens.length){

const hits=
titleTokens.filter(x=>t.includes(x)).length;

score+=hits/titleTokens.length*50;

}

if(offer.year && t.includes(String(offer.year)))
score+=25;

if(
offer.condition==="مستعمل" &&
/مستعمل|used|pre-owned/.test(t)
)
score+=15;

if(
offer.condition==="جديد" &&
/جديد|new|brand new/.test(t)
)
score+=15;

return score;

}

function priceText(p){

if(!p)return"";

const n=
p.value.toLocaleString(
"en-US",
{maximumFractionDigits:2}
);

return
p.currency==="JOD"?
n+" د.أ":
p.currency==="SAR"?
n+" ريال سعودي":
"$"+n;

}

async function tavilySearch(key,query,max=8){

const r=await fetch(
"https://api.tavily.com/search",
{
method:"POST",
headers:{
"content-type":"application/json",
"authorization":"Bearer "+key
},
body:JSON.stringify({
query,
search_depth:"basic",
max_results:max,
include_answer:false
})
}
);

if(!r.ok)
throw new Error("فشل بحث الويب");

return await r.json();

}

async function tavilyExtract(key,url){

const r=await fetch(
"https://api.tavily.com/extract",
{
method:"POST",
headers:{
"content-type":"application/json",
"authorization":"Bearer "+key
},
body:JSON.stringify({
urls:[url],
extract_depth:"basic",
include_images:false
})
}
);

if(!r.ok)return"";

const j=await r.json();

return clean(
j?.results?.[0]?.raw_content||
j?.results?.[0]?.content||
""
);

}

async function fetchOriginal(url){

try{

const r=await fetch(
url,
{
redirect:"follow",
headers:{
"user-agent":"Mozilla/5.0 (compatible; FahesAlorood/1.0)",
"accept":"text/html,application/xhtml+xml"
}
}
);

if(r.ok){

const ct=r.headers.get("content-type")||"";

if(ct.includes("text/html"))
return await r.text();

}

}catch{}

return"";

}

function parseOriginal(html,url,offerText){

const text=
clean(stripHtml(html||""))+
" "+
clean(offerText||"");

const title=
extractTitle(html||"",url)||
clean(offerText).slice(0,140);

const price=extractPrice(text);

const year=
extractYear(title+" "+text);

const category=
classify(title+" "+text);

const condition=
inferCondition(title+" "+text);

return{
title:clean(title).slice(0,180),
price,
currency:price?.currency||null,
priceText:priceText(price),
year,
category,
condition,
source:url?
new URL(url).hostname:
"صورة/نص"
};

}

function makeQueries(o){

const q=[];

const base=
clean(o.title)
.replace(/[|–—•]/g," ")
.slice(0,150);

const loc=
o.currency==="JOD"?
"الأردن Jordan":
o.currency==="SAR"?
"السعودية Saudi Arabia":
"";

q.push(`${base} ${loc} price`);

if(o.year)
q.push(`${base} ${o.year} ${loc} used price`);

q.push(`${base} ${loc} للبيع price`);

return [...new Set(q)];

}

async function analyze(req,env){

const key=env.TAVILY_API_KEY;

if(!key)
throw new Error("لم يتم إعداد مفتاح البحث بعد.");

const body=await req.json();

const url=
normalizeUrl(body.url||"");

let html="";
let extracted="";

if(url){

html=await fetchOriginal(url);

if(!html)
extracted=
await tavilyExtract(key,url);

}

const offer=
parseOriginal(
html,
url,
clean(body.offerText||"")+" "+extracted
);

if(
!offer.title ||
(
!offer.price &&
!body.offerText &&
!html &&
!extracted
)
){

return{

offer,

verdict:"غير محدد",

verdictLabel:"لا توجد نتيجة موثوقة",

verdictText:
"لم نستطع استخراج بيانات كافية من العرض. لا نريد اختراع نتيجة.",

comparison:{
message:
"جرّب رابطًا عامًا يمكن فتحه أو صورة أوضح للسعر والمنتج."
},

risks:[],

sources:[]

};

}

const queries=makeQueries(offer);

const all=[];

for(const q of queries.slice(0,3)){

try{

const s=
await tavilySearch(key,q,8);

for(
const r of(s.results||[])
){

all.push({
url:r.url,
title:r.title||r.url,
snippet:r.content||"",
score:r.score||0
});

}

}catch{}

}

const uniq=[];
const seen=new Set();

for(const r of all){

if(!seen.has(r.url)){

seen.add(r.url);
uniq.push(r);

}

}

const sources=uniq.slice(0,12);

const matched=[];

for(const r of uniq){

const p=
extractPrice(
r.title+" "+r.snippet
);

if(!p ||
p.currency!==offer.currency)
continue;

const ms=
scoreMatch(
offer,
r.title+" "+r.snippet
);

if(ms>=48){

matched.push({
...r,
price:p,
matchScore:ms
});

}

}

matched.sort(
(a,b)=>b.matchScore-a.matchScore
);

const top=matched.slice(0,8);

let verdict="غير محدد";

let verdictLabel=
"لا توجد نتيجة موثوقة";

let verdictText=
"لم نجد عددًا كافيًا من العروض المطابقة للحكم على السعر.";

let comparison={
message:
"لم نجد أدلة سعرية كافية مطابقة لنفس المنتج/المواصفات.",
items:
top.map(x=>({
url:x.url,
title:x.title,
snippet:x.snippet,
priceText:priceText(x.price)
}))
};

if(offer.price && top.length>=2){

const vals=
top.map(x=>x.price.value)
.sort((a,b)=>a-b);

const median=
vals[Math.floor(vals.length/2)];

const low=vals[0];

const high=vals[vals.length-1];

const pct=
((offer.price.value-median)/median)*100;

comparison={

message:
"تمت مطابقة نتائج ويب لها تشابه مع المنتج والسعر، ثم استبعاد النتائج غير المتوافقة.",

range:
priceText({
currency:offer.currency,
value:low
})
+
" – "+
priceText({
currency:offer.currency,
value:high
}),

count:top.length,

items:
top.map(x=>({
url:x.url,
title:x.title,
snippet:x.snippet,
priceText:priceText(x.price)
}))

};

if(pct<=-10){

verdict="جيد";

verdictLabel=
"السعر يبدو أقل من المقارنات المتاحة";

verdictText=
"السعر المعروض أقل من القيمة الوسطية للعروض المطابقة التي وجدناها.";

}

else if(pct>=10){

verdict="مرتفع";

verdictLabel=
"السعر يبدو أعلى من المقارنات المتاحة";

verdictText=
"السعر المعروض أعلى من القيمة الوسطية للعروض المطابقة التي وجدناها.";

}

else{

verdict="غير محدد";

verdictLabel=
"السعر قريب من المقارنات المتاحة";

verdictText=
"السعر يقع ضمن النطاق القريب من العروض المطابقة المتاحة، وليس لدينا ما يكفي لاعتباره صفقة ممتازة.";

}

}

const riskText=
(
html+
" "+
extracted+
" "+
body.offerText
).toLowerCase();

const risks=[];

if(
/عربون|تحويل|تحويل بنكي|deposit|transfer before|دفع قبل المعاينة/.test(riskText)
)
risks.push(
"تنبيه: توجد إشارة إلى عربون أو تحويل/دفع قبل المعاينة."
);

if(
/مستعجل|عاجل|فرصة اليوم|last chance|urgent/.test(riskText)
)
risks.push(
"تنبيه: لغة استعجال في الإعلان."
);

if(
/بدون كفالة|بدون ضمان|no warranty|without warranty/.test(riskText)
)
risks.push(
"تنبيه: لا يوجد ضمان واضح."
);

return{

offer:{
...offer,
price:
offer.price?
{
value:offer.price.value,
currency:offer.price.currency
}:
null
},

verdict,

verdictLabel,

verdictText,

comparison,

risks,

sources:
sources.map(x=>({
url:x.url,
title:x.title,
snippet:x.snippet
}))

};

}

export default{

async fetch(request,env){

const url=
new URL(request.url);

if(request.method==="OPTIONS")

return new Response(
"",
{
headers:{
"access-control-allow-origin":"*",
"access-control-allow-methods":"POST,GET,OPTIONS",
"access-control-allow-headers":"content-type"
}
}
);

if(
url.pathname==="/api/analyze" &&
request.method==="POST"
){

try{

const data=
await analyze(request,env);

return new Response(
JSON.stringify(data),
{
headers:JSON_HEADERS
}
);

}catch(e){

return new Response(
JSON.stringify({
error:e.message||"حدث خطأ"
}),
{
status:500,
headers:JSON_HEADERS
}
);

}

}

if(url.pathname==="/api/status")

return new Response(
JSON.stringify({
ok:true,
search:"Tavily",
message:
env.TAVILY_API_KEY?
"جاهز":
"مفتاح البحث غير مضبوط"
}),
{
headers:JSON_HEADERS
}
);

return new Response(
HTML,
{
headers:{
"content-type":
"text/html; charset=utf-8"
}
}
);

}

};
