export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze" && request.method === "POST") {
      return analyze(request, env);
    }

    return new Response(HTML, {
      headers: { "content-type": "text/html; charset=UTF-8" }
    });
  }
};

async function analyze(request, env) {
  try {
    const body = await request.json();
    const offerUrl = String(body.url || "").trim();

    if (!offerUrl) {
      return json({
        ok: false,
        message: "أدخل رابط العرض أولاً."
      });
    }

    if (!/^https?:\/\//i.test(offerUrl)) {
      return json({
        ok: false,
        message: "الرابط غير صحيح. يجب أن يبدأ بـ https://"
      });
    }

    let pageText = "";

    try {
      const r = await fetch(offerUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (r.ok) {
        const html = await r.text();
        pageText = extractText(html);
      }
    } catch (_) {}

    if (pageText.length < 100) {
      try {
        const jina = await fetch(
          "https://r.jina.ai/" + offerUrl,
          {
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          }
        );

        if (jina.ok) {
          pageText = await jina.text();
        }
      } catch (_) {}
    }

    if (!pageText) {
      return json({
        ok: false,
        message: "تعذر قراءة صفحة العرض. لا توجد نتيجة موثوقة."
      });
    }

    const offer = extractOffer(pageText, offerUrl);

    if (!env.TAVILY_API_KEY) {
      return json({
        ok: false,
        message: "محرك البحث غير مفعّل بعد. نحتاج إضافة مفتاح Tavily."
      });
    }

    const queries = buildQueries(offer);

    const searchResults = [];

    for (const q of queries.slice(0, 3)) {
      const r = await tavilySearch(q, env.TAVILY_API_KEY);

      if (r && Array.isArray(r.results)) {
        searchResults.push(...r.results);
      }
    }

    const unique = dedupe(searchResults);
    const matches = matchResults(offer, unique);

    const prices = matches
      .map(x => x.price)
      .filter(x => Number.isFinite(x));

    let comparison = null;

    if (prices.length >= 2 && Number.isFinite(offer.price)) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

      let verdict = "ضمن النطاق";

      if (offer.price < min * 0.9) {
        verdict = "السعر أقل من النتائج المقارنة";
      } else if (offer.price > max * 1.1) {
        verdict = "السعر أعلى من النتائج المقارنة";
      }

      comparison = {
        min,
        max,
        avg: Math.round(avg),
        count: prices.length,
        verdict
      };
    }

    const risks = detectRisks(pageText);

    return json({
      ok: true,
      offer,
      comparison,
      risks,
      sources: matches.slice(0, 8).map(x => ({
        title: x.title,
        url: x.url,
        price: x.price
      })),
      evidence:
        matches.length >= 2
          ? "بيانات مقارنة متوفرة"
          : "بيانات المقارنة محدودة",
      engine:
        "تم البحث في الويب الحقيقي عبر محرك بحث خارجي، ثم تحليل النتائج ومطابقتها."
    });

  } catch (e) {
    return json({
      ok: false,
      message: "حدث خطأ أثناء الفحص. لا توجد نتيجة موثوقة حاليًا."
    });
  }
}

async function tavilySearch(query, key) {
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 8,
        include_answer: false
      })
    });

    if (!r.ok) return null;

    return await r.json();
  } catch (_) {
    return null;
  }
}

function buildQueries(o) {
  const q = [];

  const base = [
    o.brand,
    o.model,
    o.year
  ].filter(Boolean).join(" ");

  if (base) {
    q.push(base + " price Jordan JOD");
    q.push(base + " used for sale Jordan");
    q.push(base + " سعر الأردن");
  }

  if (o.category) {
    q.push(
      [o.category, o.brand, o.model, o.year, "Jordan"]
        .filter(Boolean)
        .join(" ")
    );
  }

  return [...new Set(q)];
}

function extractOffer(text, sourceUrl) {
  const clean = text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30000);

  const lower = clean.toLowerCase();

  let category = "منتج";

  if (/hyundai|toyota|kia|honda|nissan|mercedes|bmw|lexus|tesla|ford|chevrolet|سيارة|سيارات|مركبة/.test(lower))
    category = "سيارة";

  if (/truck|pickup|شاحنة|بيك أب/.test(lower))
    category = "شاحنة";

  if (/iphone|samsung galaxy|xiaomi|oppo|huawei|هاتف|جوال/.test(lower))
    category = "هاتف";

  if (/laptop|macbook|lenovo|dell|hp laptop|asus|لابتوب|حاسوب/.test(lower))
    category = "لابتوب";

  if (/television|smart tv|tv |تلفزيون|شاشة/.test(lower))
    category = "تلفزيون";

  if (/apartment|villa|house|property|شقة|فيلا|منزل|عقار/.test(lower))
    category = "عقار";

  const yearMatch = clean.match(/\b(20[0-2][0-9])\b/);

  const pricePatterns = [
    /([\d,]+(?:\.\d+)?)\s*(?:JOD|JD|د\.?\s*أ|دينار)/i,
    /(?:JOD|JD|د\.?\s*أ|دينار)\s*([\d,]+(?:\.\d+)?)/i,
    /(?:السعر|price)\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i
  ];

  let price = null;

  for (const p of pricePatterns) {
    const m = clean.match(p);
    if (m) {
      price = Number(m[1].replace(/,/g, ""));
      break;
    }
  }

  let brand = "";
  let model = "";

  const knownBrands = [
    "Hyundai","Toyota","Kia","Honda","Nissan","Mercedes",
    "BMW","Lexus","Tesla","Ford","Chevrolet",
    "iPhone","Samsung","Xiaomi","Huawei","Lenovo",
    "Dell","HP","Asus"
  ];

  for (const b of knownBrands) {
    if (new RegExp("\\b" + b + "\\b", "i").test(clean)) {
      brand = b;
      break;
    }
  }

  if (brand) {
    const idx = clean.toLowerCase().indexOf(brand.toLowerCase());
    model = clean
      .slice(idx + brand.length, idx + brand.length + 80)
      .split(/[|,\n\-:]/)[0]
      .trim();
  }

  return {
    category,
    brand,
    model,
    year: yearMatch ? Number(yearMatch[1]) : null,
    price,
    currency: price !== null ? "JOD" : null,
    sourceUrl,
    text: clean.slice(0, 1200)
  };
}

function matchResults(offer, results) {
  return results
    .map(r => {
      const text = [
        r.title || "",
        r.content || "",
        r.url || ""
      ].join(" ");

      const lower = text.toLowerCase();

      let score = 0;

      if (
        offer.brand &&
        lower.includes(offer.brand.toLowerCase())
      ) score += 3;

      if (
        offer.year &&
        lower.includes(String(offer.year))
      ) score += 3;

      if (
        offer.model &&
        lower.includes(
          offer.model.toLowerCase().split(" ")[0]
        )
      ) score += 2;

      const price = extractPrice(text);

      if (price) score += 1;

      return {
        title: r.title || "مصدر",
        url: r.url,
        content: r.content || "",
        price,
        score
      };
    })
    .filter(x => x.score >= 4)
    .sort((a, b) => b.score - a.score);
}

function extractPrice(text) {
  const patterns = [
    /([\d,]+(?:\.\d+)?)\s*(?:JOD|JD|د\.?\s*أ|دينار)/i,
    /(?:JOD|JD|د\.?\s*أ|دينار)\s*([\d,]+(?:\.\d+)?)/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (n > 10 && n < 10000000) return n;
    }
  }

  return null;
}

function detectRisks(text) {
  const risks = [];

  if (/deposit|تحويل|عربون|دفعة مقدمة|حول قبل/.test(text.toLowerCase()))
    risks.push("يوجد مؤشر على طلب دفعة أو تحويل مالي قبل إتمام الصفقة.");

  if (/urgent|عاجل|مستعجل|اليوم فقط|last chance/.test(text.toLowerCase()))
    risks.push("لغة استعجال قد تستدعي التحقق الإضافي.");

  if (/no warranty|بدون ضمان|لا يوجد ضمان/.test(text.toLowerCase()))
    risks.push("لا يوجد ضمان واضح في بيانات العرض.");

  return risks;
}

function dedupe(arr) {
  const seen = new Set();

  return arr.filter(x => {
    if (!x.url || seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "access-control-allow-origin": "*"
    }
  });
}

const HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>فاحص العروض</title>
<style>
body{
 margin:0;
 font-family:Arial,sans-serif;
 background:#f5f7fa;
 color:#17202a;
}
main{
 max-width:850px;
 margin:40px auto;
 padding:20px;
}
.card{
 background:white;
 border-radius:18px;
 padding:28px;
 box-shadow:0 5px 25px #0001;
}
h1{
 margin-top:0;
}
input{
 width:100%;
 box-sizing:border-box;
 padding:15px;
 border:1px solid #ddd;
 border-radius:10px;
 font-size:16px;
 margin:10px 0;
}
button{
 width:100%;
 padding:15px;
 border:0;
 border-radius:10px;
 background:#146c43;
 color:white;
 font-size:18px;
 cursor:pointer;
}
.result{
 margin-top:20px;
 padding:20px;
 background:#f8fafc;
 border-radius:12px;
}
.source{
 margin-top:10px;
 padding:10px;
 background:white;
 border-radius:8px;
}
a{
 color:#1261a0;
}
.small{
 color:#687078;
 font-size:14px;
}
</style>
</head>
<body>
<main>
<div class="card">
<h1>🛒 فاحص العروض</h1>
<p>قبل ما تشتري .. افحص</p>

<p class="small">
لا يعتمد فاحص العروض على الذكاء الاصطناعي وحده.
نبحث في الويب الحقيقي ومصادر متعددة، ثم نحلل ونطابق النتائج.
</p>

<input id="url" placeholder="ضع رابط العرض هنا">

<button onclick="check()">🔎 افحص العرض الآن</button>

<div id="result"></div>
</div>
</main>

<script>
async function check(){
 const url=document.getElementById("url").value.trim();
 const box=document.getElementById("result");

 if(!url){
  box.innerHTML="<div class='result'>أدخل رابط العرض أولاً.</div>";
  return;
 }

 box.innerHTML="<div class='result'>🔎 نقرأ العرض ونبحث في الويب الحقيقي...</div>";

 try{
  const r=await fetch("/api/analyze",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({url})
  });

  const d=await r.json();

  if(!d.ok){
   box.innerHTML="<div class='result'>⚠️ "+d.message+"</div>";
   return;
  }

  let h="<div class='result'>";
  h+="<h2>نتيجة الفحص</h2>";

  h+="<p><b>الفئة:</b> "+(d.offer.category||"غير محددة")+"</p>";
  h+="<p><b>المنتج:</b> "+(d.offer.brand||"")+" "+(d.offer.model||"")+"</p>";

  if(d.offer.year)
   h+="<p><b>السنة:</b> "+d.offer.year+"</p>";

  if(d.offer.price)
   h+="<p><b>السعر:</b> "+d.offer.price.toLocaleString()+" دينار</p>";

  h+="<p><b>حالة البيانات:</b> "+d.evidence+"</p>";

  if(d.comparison){
   h+="<hr>";
   h+="<h3>مقارنة الأسعار</h3>";
   h+="<p>النطاق الموجود في النتائج المطابقة: "+
      d.comparison.min.toLocaleString()+
      " – "+
      d.comparison.max.toLocaleString()+
      " دينار</p>";

   h+="<p><b>"+d.comparison.verdict+"</b></p>";
   h+="<p class='small'>تمت المقارنة مع "+
      d.comparison.count+
      " نتائج مطابقة من المصادر التي تم العثور عليها.</p>";
  }else{
   h+="<p>⚠️ لا توجد بيانات كافية لإعطاء حكم سعري موثوق.</p>";
  }

  if(d.risks && d.risks.length){
   h+="<hr><h3>⚠️ مؤشرات تحتاج الانتباه</h3>";
   d.risks.forEach(x=>h+="<p>"+x+"</p>");
  }

  if(d.sources && d.sources.length){
   h+="<hr><h3>🔗 المصادر التي اعتمدنا عليها</h3>";

   d.sources.forEach(s=>{
    h+="<div class='source'>";
    h+="<a href='"+s.url+"' target='_blank'>"+
       (s.title||s.url)+"</a>";

    if(s.price)
      h+="<br><span class='small'>السعر الظاهر في المصدر: "+
         s.price.toLocaleString()+"</span>";

    h+="</div>";
   });
  }

  h+="<hr><p class='small'>"+d.engine+"</p>";
  h+="</div>";

  box.innerHTML=h;

 }catch(e){
  box.innerHTML="<div class='result'>⚠️ تعذر إتمام الفحص. لا توجد نتيجة موثوقة.</div>";
 }
}
</script>
</body>
</html>`;
