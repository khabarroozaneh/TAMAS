const KEY='wpjoo.expert.v2',VERSION='۱۴۰۵/۰۸/۰۱';
const $=s=>document.querySelector(s);
const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let vt=$('#versionTag');if(vt)vt.textContent='• نسخه '+VERSION;

/* ===== پایگاه داده =====
   leads:   لیدهای ورودی با اطلاعات کامل فنی (سرعت، افزونه‌ها، خطاها، تشخیص وردپرس)
   reports: گزارش‌های تماس کارشناس (هر لید ممکن است چند گزارش داشته باشد)
   meetings: گزارش‌های جلسه به ازای هر leadId
   draft:   تماس نیمه‌تمام برای بازیابی */
let db=JSON.parse(localStorage.getItem(KEY)||'{"leads":[],"reports":[],"meetings":[],"draft":null,"cursor":0,"duplicates":0}');
if(!Array.isArray(db.leads))db.leads=[];
if(!Array.isArray(db.reports))db.reports=[];
if(!Array.isArray(db.meetings))db.meetings=[];
if(!db.notified||typeof db.notified!=='object')db.notified={};
if(!Array.isArray(db.dismissed))db.dismissed=[];
if(typeof db.duplicates!=='number')db.duplicates=0;

function save(){localStorage.setItem(KEY,JSON.stringify(db));refresh()}
function go(id){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');
  if(id==='work')renderWork();
  if(id==='appointmentsView')renderAppointments();
  if(id==='contracts')renderContracts();
  if(id==='calendar')renderCalendar();
  if(id==='reports')renderReports();
  refresh()}
document.addEventListener('click',e=>{let b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});

/* ===== ابزارها ===== */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function norm(v=''){return v.toString().trim().toLowerCase().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/^tel:/,'').replace(/\/$/,'').replace(/[\s().-]/g,'')}
function fingerprints(x){let u=norm(x.url||x.website||x.domain||x.link),p=norm(x.phone||x.mobile||x.tel),n=norm(x.name||x.title);return [...new Set([u&&'url:'+u,p&&'phone:'+p,n&&p&&'namephone:'+n+'|'+p].filter(Boolean))]}
function pick(x,keys){for(const k of keys){let v=String(x[k]??'').trim();if(v)return v}return ''}
function site(x){return x.url||x.website||x.domain||x.link||'بدون لینک'}
// آدرس سایت به‌صورت لینک نمایش داده می‌شود تا با کلیک، در مرورگر باز شود
function siteLink(x){let s=typeof x==='string'?x:site(x);if(!s||s==='بدون لینک'||s==='ثبت نشده')return esc(s);let u=/^https?:\/\//.test(s)?s:'https://'+s;return `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s)}</a>`}
function download(name,data){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
// نام فایل‌ها شمسی و قابل‌فهم است تا کاربر راحت‌تر آن‌ها را پیدا کند
function jdate(){let j=Jalali.fromDate(new Date());return Jalali.fa(Jalali.pad(j.jy))+'-'+Jalali.fa(Jalali.pad(j.jm))+'-'+Jalali.fa(Jalali.pad(j.jd))}
function fmt(v){let d=v instanceof Date?v:new Date(v);return Number.isNaN(d.getTime())?'ثبت نشده':Jalali.storageText(d,'ثبت نشده')}

/* ===== نمایش اطلاعات فنی سایت =====
   کارشناس پیش از تماس، اطلاعات کامل را می‌بیند:
   نمره و معیارهای سرعت، افزونه‌های نصب‌شده، مشکلات سایت به زبان ساده و شواهد وردپرس */
function siteIntel(lead){
  if(!lead||typeof lead!=='object')return'';
  let src={...(lead.leadSnapshot||{}),...lead};
  let plugins=Array.isArray(src.plugins)?src.plugins.filter(Boolean):[];
  let issues=Array.isArray(src.issues)?src.issues.filter(Boolean):[];
  let s=src.speed;
  // خط لوله wordpressFacts را آبجکت می‌دهد و نسخه‌های قدیمی آرایه بودند؛ هر دو پشتیبانی می‌شود
  let facts=Array.isArray(src.wordpressFacts)?src.wordpressFacts.filter(Boolean)
    :(src.wordpressFacts&&Array.isArray(src.wordpressFacts.detectedBy)?src.wordpressFacts.detectedBy.filter(Boolean):[]);
  if(!plugins.length&&!issues.length&&!s&&!facts.length)return'';
  let out='';
  if(s&&s.score!=null){
    // معیارهای اصلی در یک نگاه: نمره + LCP + FCP + TTFB
    let bits=[`نمره ${fa(s.score)} از ۱۰۰ (${esc(s.grade||'نامشخص')})`];
    // دقت تست: میانهٔ چند اجرا (مثل گوگل PageSpeed)
    let runs=Number(s.runs)||1;
    if(runs>1)bits.unshift(`میانهٔ ${fa(runs)} اجرا`);
    [['lcp','بارگذاری اصلی'],['fcp','اولین محتوا'],['ttfb','پاسخ سرور']].forEach(([k,lbl])=>{
      if(s[k]!=null)bits.push(`${lbl}: ${fa(Math.round(s[k]))} میلی‌ثانیه`);
    });
    if(s.tbt!=null)bits.push(`قفل صفحه: ${fa(Math.round(s.tbt))} میلی‌ثانیه`);
    out+=`<div class="line"><b>سرعت سایت:</b> ${bits.join(' • ')}</div>`;
  }
  if(plugins.length){
    out+=`<div class="line"><b>افزونه‌های نصب‌شده:</b> ${plugins.map(p=>`<span class="chip">${esc(p)}</span>`).join('')}</div>`;
  }
  if(issues.length){
    out+=`<div class="site-intel"><b>مشکلات سایت:</b><ul>${issues.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`;
  }
  if(facts.length){
    out+=`<div class="site-intel"><b>شواهد وردپرس:</b><ul>${facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
  }
  return out;
}

/* ===== گفتار تماس =====
   این متن برای خواندن با صدای بلند نوشته شده، نه برای نمایش فنی.
   کارشناس همین را به صاحب سایت می‌گوید؛ پس لحن باید حرف‌زدن باشد، نه گزارش.

   قواعد لحن — موقع ویرایش این بلوک رعایت شود:
   ۱) محاوره‌ای و کوتاه؛ جمله‌ها مثل حرف زدن، نه مثل گزارش سیستمی.
   ۲) هیچ عددی از خودمان ساخته نمی‌شود: یا اندازه‌گیری خودمان است، یا آمار رسمی گوگل.
   ۳) آمار گوگل فقط در همان حدی که خودش اعلام کرده؛ ضرب‌کردن و تعمیم‌دادن ممنوع
      (مثلاً «۱۰٪ در هر ۰٫۱ ثانیه» را در ۲۰ ثانیه ضرب نمی‌کنیم).
   ۴) برای نتیجه عدد قطعی وعده نمی‌دهیم؛ جهت را می‌گوییم، نه میزان را.
   ۵) کلمه‌های کلیشه‌ای ممنوع: «نقش بسزایی»، «در دنیای امروز»، «بهبود چشمگیر»،
      «راهکار جامع»، «تجربهٔ کاربری بی‌نظیر»، «گام مهمی».
*/
const GOOGLE={
  over3:'خودِ گوگل اعلام کرده ۵۳ درصد کاربرهای موبایل صفحه‌ای را که بیشتر از ۳ ثانیه طول بکشد رها می‌کنند؛ یعنی از هر ده نفری که سایت شما را روی موبایل باز می‌کنند، حدود پنج نفر قبل از دیدن محتوا برمی‌گردند.',
  oneTo3:'در بررسی گوگل، وقتی زمان بارگذاری از ۱ ثانیه به ۳ ثانیه می‌رسد احتمال ترک صفحه حدود یک‌سوم بیشتر می‌شود؛ یعنی به ازای هر ده نفری که الان سایت را ترک می‌کنند، حدود سه نفر دیگر هم اضافه می‌شود.',
  rank:'گوگل رسماً اعلام کرده تجربهٔ صفحه را در رتبه‌بندی نتایج جستجو لحاظ می‌کند.',
  lead:'در مطالعهٔ مشترک گوگل و دیلویت روی سایت‌های تجاری، هر یک‌دهم ثانیه بهبود بارگذاری حدود ۱۰ درصد نرخ تبدیل بیشتر آورده؛ این رابطه خطی نیست، ولی جهت‌اش روشن است.'
};
// میلی‌ثانیه → جملهٔ قابل گفتن («حدود ۲۲ ثانیه»)
function dur(ms){
  if(ms==null)return'';
  let t=ms>=1000?(ms/1000>=10?Math.round(ms/1000):Math.round(ms/100)/10)+' ثانیه':Math.round(ms)+' میلی‌ثانیه';
  return 'حدود '+fa(t).replace('.','٫');
}
// محدوده‌های خود گوگل برای نمرهٔ سرعت
function rateFa(score){return score==null?'نامشخص':score>=90?'خوب':score>=50?'نیازمند بهبود':'ضعیف'}
/* نگاشت «فرصت‌های» اندازه‌گیری‌شدهٔ Lighthouse به سه چیز:
   say   = همان مشکل با زبان گفتاری (چه اندازه گرفتیم)
   means = همین مشکل در تجربهٔ واقعی مشتری (چه چیزی می‌بیند/حس می‌کند) — نه تکرار عدد
   fix   = کاری که ما انجام می‌دهیم
   هر گروه چند id دارد تا دو مورد هم‌خانواده (مثل دو نوع مشکل تصویر) دوبار گفته نشود. */
const OPP_GROUPS=[
  {g:'image',ids:['uses-optimized-images','modern-image-formats','uses-responsive-images','efficient-animated-content','offscreen-images'],
   say:o=>{let kb=Math.round(o.kb||0);return kb>=50?`تصاویر سایت بهینه نیستند؛ حدود ${fa(kb)} کیلوبایت بیشتر از لازم حجم دارند.`:'تصاویر سایت بهینه نیستند و بیشتر از لازم حجم دارند.'},
   means:'یعنی عکس‌ها دیرتر از متن می‌آیند و مشتری چند ثانیه صفحهٔ خالی یا ناقص می‌بیند؛ روی موبایل همین کافی است که فکر کند سایت خراب است و برگردد.',
   fix:'فشرده‌کردن و سبک‌کردن تصاویر'},
  {g:'css',ids:['unused-css-rules','unminified-css'],
   say:o=>{let ms=Math.round(o.ms||0);return ms>=150?`بخش زیادی از کدهای سایت بلااستفاده است و ${dur(ms)} از وقت صفحه را می‌گیرد.`:'بخش زیادی از کدهای سایت بلااستفاده است و فقط حجم صفحه را بالا می‌برد.'},
   means:'یعنی سایت یک لباس اضافی را هم دانلود می‌کند که هیچ‌کس نمی‌پوشد؛ فقط صفحه را سنگین‌تر می‌کند و دیرتر می‌آید.',
   fix:'حذف کدهای بلااستفاده'},
  {g:'js',ids:['unused-javascript','legacy-javascript','bootup-time','mainthread-work-breakdown'],
   say:o=>{let ms=Math.round(o.ms||0);return ms>=150?`کدهای زیادی روی گوشی اجرا می‌شود و ${dur(ms)} گوشی را مشغول می‌کند.`:'کدهای زیادی روی گوشی اجرا می‌شود و صفحه را کند می‌کند.'},
   means:'یعنی وقتی مشتری انگشت می‌گذارد روی دکمه، صفحه هیچ واکنشی ندارد؛ انگار گوشی هنگ کرده. برای کاربر فرقی نمی‌کند مشکل از سایت است یا گوشی‌اش — هر دو را یکی می‌بیند و می‌رود.',
   fix:'کم‌کردن کدهای اجرایی'},
  {g:'compression',ids:['uses-text-compression'],
   say:()=>'فایل‌های سایت فشرده فرستاده نمی‌شوند.',
   means:'یعنی فایل‌ها فشرده نمی‌شوند و حجم بیشتری روی خط می‌رود؛ روی اینترنت ضعیف تفاوتش را با چشم می‌بینید.',
   fix:'روشن‌کردن فشرده‌سازی روی سرور'},
  {g:'cache',ids:['uses-long-cache-ttl'],
   say:()=>'مرورگر برای فایل‌های ثابت سایت چیزی نگه نمی‌دارد.',
   means:'یعنی کسی که دوباره به سایت برمی‌گردد — مثلاً برای مقایسهٔ قیمت — باید همه‌چیز را از اول صبر کند؛ همان‌قدر که اولین بار.',
   fix:'تنظیم کش مرورگر'},
  {g:'blocking',ids:['render-blocking-resources'],
   say:o=>{let ms=Math.round(o.ms||0);return ms>=150?`قبل از اینکه صفحه چیزی نشان بدهد، باید فایل‌های اضافی بارگذاری شوند؛ ${dur(ms)} معطل می‌ماند.`:'قبل از اینکه صفحه چیزی نشان بدهد، باید فایل‌های اضافی بارگذاری شوند.'},
   means:'یعنی صفحه چند لحظه کاملاً سفید یا خاکستری است؛ کاربر نمی‌داند سایت در حال بارگذاری است یا از کار افتاده.',
   fix:'حذف فایل‌هایی که نمایش را عقب می‌اندازند'},
  {g:'weight',ids:['total-byte-weight','dom-size'],
   say:o=>{let kb=Math.round(o.kb||0);return kb>=200?`حجم کل صفحه سنگین است؛ حدود ${fa(kb)} کیلوبایت بیشتر از حد معمول.`:'حجم کل صفحه سنگین است و روی موبایل کند باز می‌شود.'},
   means:'یعنی هر بازدید حجم زیادی از اینترنت کاربر را می‌بلعد؛ روی ۴G معمولی خودش را به چند ثانیه صبر نشان می‌دهد.',
   fix:'سبک‌کردن صفحه'},
  {g:'redirect',ids:['redirects'],
   say:()=>'آدرس سایت چند مرحله تغییر مسیر می‌دهد.',
   means:'یعنی وقتی کسی آدرس سایت را می‌زند، یک دور اضافه می‌زند قبل از اینکه برسد؛ هر دور چند دهم ثانیه است که روی موبایل حس می‌شود.',
   fix:'حذف تغییر مسیرهای اضافه'},
  {g:'font',ids:['font-display'],
   say:()=>'فونت‌های سایت دیر بارگذاری می‌شوند.',
   means:'یعنی متن صفحه اول نامرئی است و بعد یک‌دفعه ظاهر می‌شود؛ صفحه انگار می‌پرد.',
   fix:'تنظیم بارگذاری فونت'}
];
const OPP_BY_ID={};OPP_GROUPS.forEach(x=>x.ids.forEach(id=>OPP_BY_ID[id]=x));

/* اسکریپت گفتار را از دادهٔ همان لید می‌سازد.
   ترتیب: مشکل اصلی (کندی صفحه) → علت‌های اندازه‌گیری‌شده (تصویر، کد، فشرده‌سازی، کش…)
   → معیارهای دیگر (سرور، قفل صفحه، جابه‌جایی) → زمینه (ابزارهای سنگین، نبود کش).
   حداکثر ۴ مشکل گفته می‌شود تا تماس به سخنرانی تبدیل نشود، و در «اگر درستش کنیم»
   دقیقاً همان‌ها جواب داده می‌شوند. */
function talkTrack(lead){
  if(!lead||typeof lead!=='object')return null;
  let src={...(lead.leadSnapshot||{}),...lead};
  let s=src.speed||null,plugins=Array.isArray(src.plugins)?src.plugins.filter(Boolean):[];
  let name=src.name||src.title||'';
  let primary=[],causes=[],metrics=[],context=[];
  // ۱) مشکل اصلی
  if(s&&s.lcp!=null){
    if(s.lcp>=4000)primary.push({
      say:`صفحهٔ اول سایت روی موبایل ${dur(s.lcp)} طول می‌کشد تا محتوای اصلی‌اش بالا بیاید.`,
      means:'یعنی کسی که از گوگل می‌آید، این مدت صفحه‌ای را می‌بیند که هنوز کامل نشده — نه عکس اصلی، نه محصول، نه دکمهٔ سفارش؛ و بیشتر آدم‌ها همین‌جا برمی‌گردند و سراغ نتیجهٔ بعدی گوگل می‌روند.'});
    else if(s.lcp>=2500)primary.push({
      say:`صفحهٔ اول روی موبایل ${dur(s.lcp)} طول می‌کشد تا محتوای اصلی بالا بیاید؛ گوگل برای «خوب» حساب‌کردن، زیر ۲٫۵ ثانیه را قبول می‌کند.`,
      means:'یعنی سایت خراب نیست، ولی کمی دیر جواب می‌دهد؛ و همین چند دهم ثانیه برای کسی که چند سایت را پشت سر هم باز می‌کند کافی است که صفحهٔ شما را ببندد و برود سراغ رقیب.'});
  }
  // ۲) علت‌های اندازه‌گیری‌شده
  let opps=Array.isArray(s&&s.opportunities)?s.opportunities.filter(o=>o&&o.id):[];
  let seen={};
  // فقط گروه‌هایی که اندازه‌شان با میلی‌ثانیه/کیلوبایت سنجیده می‌شود آستانه دارند؛
  // موارد «بود/نبود» (کش، فونت، ریدایرکت) همیشه گفته می‌شوند.
  const SIZED={image:1,css:1,js:1,blocking:1,weight:1};
  opps.forEach(o=>{
    let def=OPP_BY_ID[o.id];if(!def||seen[def.g])return;
    // چیزهای ناچیز به مشتری گفته نمی‌شوند؛ گفتنشان اعتبار حرف را کم می‌کند
    if(SIZED[def.g]&&(o.ms||0)<300&&(o.kb||0)<50)return;
    seen[def.g]=1;
    causes.push({say:def.say(o),means:def.means,fix:def.fix,impact:(o.ms||0)+(o.kb||0)*3});
  });
  causes.sort((a,b)=>b.impact-a.impact);
  // ۳) معیارهای دیگر
  if(s&&s.ttfb!=null&&s.ttfb>=800)metrics.push({
    say:`سرور سایت ${dur(s.ttfb)} طول می‌کشد تا اولین جواب را بدهد؛ این تأخیر روی همهٔ صفحه‌ها هست، نه فقط صفحهٔ اول.`,
    means:'یعنی حتی قبل از اینکه سایت شروع کند به فرستادن محتوا، کاربر منتظر مانده است؛ این انتظار در هر صفحه‌ای تکرار می‌شود.',
    fix:'ارتقای هاست یا روشن‌کردن کش سرور'});
  if(s&&s.tbt!=null&&s.tbt>=600)metrics.push({
    say:`وقتی صفحه باز می‌شود، ${dur(s.tbt)} نمی‌شود روی آن کاری کرد؛ نه اسکرول، نه کلیک.`,
    means:'یعنی صفحه روی گوشی یخ می‌زند؛ نه اسکرول می‌خورد، نه دکمه جواب می‌دهد. مشتری فکر می‌کند گوشی‌اش هنگ کرده و سایت را می‌بندد.',
    fix:'کم‌کردن کدهای اجرایی'});
  if(s&&s.cls!=null&&s.cls>=0.25)metrics.push({
    say:'صفحه موقع باز شدن جابه‌جا می‌شود و دکمه‌ها جایشان عوض می‌شود.',
    means:'یعنی وقتی مشتری می‌خواهد روی دکمهٔ سفارش بزند، عکس یک‌دفعه می‌پرد و دکمه می‌رود پایین‌تر؛ انگشتش روی جای خالی یا روی تبلیغ می‌افتد. دو سه بار که تکرار شود، کلافه می‌شود و سایت را می‌بندد.',
    fix:'ثابت‌کردن جای عناصر صفحه'});
  // صفحهٔ سفید فقط وقتی گفته می‌شود که علتش (سرور کند) جدا گفته نشده باشد
  if(s&&s.fcp!=null&&s.fcp>=1800&&!(s.lcp>=2500)&&!(s.ttfb>=800))metrics.push({
    say:`تا ${dur(s.fcp)} بعد از باز شدن، صفحه سفید است.`,
    means:'یعنی چند لحظه اول صفحه کاملاً سفید است؛ کاربر فکر می‌کند سایت خراب است یا اینترنتش قطع شده.',
    fix:'کم‌کردن کدهایی که اول صفحه اجرا می‌شوند'});
  // ۴) زمینه
  let heavy=plugins.filter(p=>['Elementor','Divi Builder','WPBakery','WooCommerce'].includes(p));
  if(heavy.length)context.push({
    say:`سایت با ${heavy.join(' و ')} ساخته شده و این‌ها خودشان سنگین هستند.`,
    means:'یعنی برای هر بازدید یک سایت کامل از نو سر هم می‌شود؛ حتی اگر همان صفحهٔ دیروز باشد.',
    fix:`بهینه‌سازی ${heavy.join(' و ')}`});
  if(s&&s.score!=null&&s.score<70&&!plugins.some(p=>/litespeed|wp.?rocket|w3.?total|cache/i.test(p)))
    context.push({
      say:'روی سایت افزونهٔ کش ندیدم.',
      means:'یعنی سرور هر بار همان کار را تکرار می‌کند؛ مثل اینکه برای هر مشتری، کارگاه را از نو راه بیندازند.',
      fix:'نصب و تنظیم افزونهٔ کش'});
  if(!primary.length&&!causes.length&&!metrics.length&&!context.length&&!(s&&s.score!=null))return null;
  let f=[...primary,...causes.slice(0,3),...metrics,...context].slice(0,4);
  // «اگر درستش کنیم» دقیقاً همان مشکل‌هایی را جواب می‌دهد که گفته شد
  let fixes=[...new Set(f.map(x=>x.fix).filter(Boolean))].slice(0,4);

  // سایت سالم: اگر نه مشکل جدی هست و نه نمرهٔ گوگل زیر ۹۰، گفتار «نجات سایت» ساخته نمی‌شود.
  // تماس با زاویهٔ «سایتتان کند است» روی چنین سایتی هم بی‌ادبانه است، هم غلط.
  let serious=primary.length>0||metrics.length>0;
  if(!serious&&!(s&&s.score!=null&&s.score<90)){
    let bits=[];
    if(s&&s.score!=null)bits.push(`نمرهٔ سرعت ${fa(s.score)} از ۱۰۰`);
    if(s&&s.lcp!=null)bits.push(`بارگذاری اصلی ${dur(s.lcp)}`);
    return {noPitch:true,summary:bits.join(' و ')};
  }

  let opening=`سلام، وقتتون بخیر. از تیم وردپرس جو تماس می‌گیرم. دربارهٔ ${name?'سایت '+name:'سایتتان'} تماس گرفتم؛ چند نکتهٔ مشخص توی سرعتش دیدم که به نظرم باید در جریانش باشید. دو دقیقه وقت دارید؟`;

  /* «یعنی چه ضرری» یک جملهٔ آماری نیست؛ باید صحنه را برای صاحب سایت بسازد:
     مشتری چه می‌کند، بعد چه اتفاقی می‌افتد، و آخرش این برای کسب‌وکار یعنی چه. */
  let cost='';
  if(s&&s.lcp!=null&&s.lcp>=4000){
    cost=GOOGLE.over3
      +' این را در عمل ببینید: کسی در گوگل دنبال کاری مثل کار شما می‌گردد، روی سایتتان می‌آید، صفحه هنوز کامل نشده و همان‌جا برمی‌گردد. آن پنج نفر هم که می‌روند، معمولاً سراغ نتیجهٔ بعدی گوگل می‌روند؛ یعنی همان مشتری، سایت رقیب شما را می‌بیند. این اتفاق همین حالا دارد می‌افتد، بدون اینکه کسی به شما خبر بدهد.';
  }else if(s&&s.lcp!=null&&s.lcp>=2500){
    cost=GOOGLE.oneTo3
      +' سایت شما خراب نیست، ولی درست در همان چند ثانیه‌ای گیر کرده که کاربر تصمیم می‌گیرد بماند یا برود. کسی که چند سایت را پشت سر هم باز می‌کند، سایت کندتر را می‌بندد و همان‌جا می‌رود.';
  }else if(s&&s.score!=null&&s.score<50){
    cost=`نمرهٔ گوگل سایت ${fa(s.score)} از ۱۰۰ است که در محدودهٔ «ضعیف» می‌افتد. گوگل برای این حالت عدد دقیقی اعلام نکرده و ما هم از خودمان نمی‌سازیم؛ ولی همین محدوده جایی است که کاربر وسط کار صفحه را می‌بندد: نه فرم تماس پر می‌شود، نه سبد خرید، نه تماس تلفنی.`;
  }else if(f.length&&s&&s.score!=null){
    cost=`سایت در محدودهٔ «${rateFa(s.score)}» گوگل است (نمرهٔ ${fa(s.score)} از ۱۰۰). مشکل بزرگی نیست، ولی همین چند مورد روی هم دست‌به‌دست هم می‌دهند: هر کدام کمی وقت کاربر را می‌گیرد و جمعشان همان چیزی است که باعث می‌شود بعضی‌ها بی‌خیال شوند و سراغ گزینهٔ بعدی بروند.`;
  }else if(f.length){
    cost='مشکل بزرگی نیست، ولی همین چند مورد روی هم دست‌به‌دست هم می‌دهند و باعث می‌شود بخشی از بازدیدکننده‌ها بی‌خیال شوند و سراغ گزینهٔ بعدی بروند.';
  }

  // «اگر درستش کنیم» اول همان مشکل‌هایی را جواب می‌دهد که در «چی دیدم» گفته شد
  let gain=[];
  let fixList=fixes.length>1?fixes.slice(0,-1).join('، ')+' و '+fixes[fixes.length-1]:(fixes[0]||'');
  if(fixList)gain.push(`این‌ها با ${fixList} حل می‌شود؛ ظاهر سایت هم به هم نمی‌خورد.`);
  if((s&&s.lcp!=null&&s.lcp>=2500)||(s&&s.score!=null&&s.score<50))
    gain.push('اگر این‌ها درست شود، سایت از محدودهٔ «ضعیف» گوگل بیرون می‌آید و به «خوب» می‌رسد؛ گوگل هم رسماً می‌گوید تجربهٔ صفحه را در رتبه‌بندی لحاظ می‌کند.');
  if(s&&s.score!=null&&s.score<90)gain.push(GOOGLE.lead);
  gain.push('عدد قطعی وعده نمی‌دهم؛ ولی همان بازدیدکننده‌ای که الان می‌رود، می‌ماند و شانس تماس و سفارش پیدا می‌کند.');

  let next='اگر بخواهید، دقیق می‌گویم برای سایت شما کدام‌شان لازم است و چند روز طول می‌کشد.';

  return {opening,findings:f.map(x=>({say:x.say,means:x.means||''})),cost,gain:gain.join(' '),next,runs:Number(s&&s.runs)||1};
}
function talkSteps(t){
  return [
    {key:'open',label:'شروع',text:t.opening},
    {key:'see',label:'چی دیدم',text:t.findings.map(f=>f.say+' '+(f.means||'')).join(' ')},
    {key:'cost',label:'یعنی چه ضرری',text:t.cost},
    {key:'gain',label:'اگر درستش کنیم',text:t.gain},
    {key:'next',label:'قدم بعدی',text:t.next}
  ].filter(x=>x.text&&String(x.text).trim());
}
function talkBlock(lead){
  let t=talkTrack(lead);if(!t)return'';
  if(t.noPitch)return `<div class="talk quiet"><div class="talk-head"><b>این سایت مشکل سرعت ندارد</b></div>
    <p class="talk-say">${esc((t.summary?t.summary+' — ':'')+'با زاویهٔ «سایتتان کند است» تماس نگیرید. اگر تماس گرفتید، موضوع را ببرید روی نگهداری و بهینه‌سازی، نه نجات سایت.')}</p></div>`;
  let steps=talkSteps(t);
  // «چی دیدم» هر مشکل را در دو تکه نشان می‌دهد: چه دیدیم، و مشتری چه چیزی را تجربه می‌کند
  let body=steps.map((st,i)=>{
    let inner=st.key==='see'
      ? t.findings.map(f=>`<p class="talk-say">${esc(f.say)}</p>${f.means?`<p class="talk-why">${esc(f.means)}</p>`:''}`).join('')
      : `<p class="talk-say">${esc(st.text)}</p>`;
    return `<div class="talk-step"><span class="talk-label">${fa(i+1)}. ${st.label}</span>${inner}</div>`;
  }).join('');
  return `<div class="talk">
    <div class="talk-head"><b>گفتار تماس</b><span class="talk-hint">از روی این بخوانید — همین را به صاحب سایت بگویید</span><button type="button" class="talk-copy" data-copy-talk>کپی متن</button></div>
    ${body}
    ${t.runs>1?`<div class="talk-note">سایت را ${fa(t.runs)} بار تست کردم و نتیجه همین بود؛ می‌توانید همین را به مشتری بگویید.</div>`:''}
  </div>`;
}
function talkPlain(lead){
  let t=talkTrack(lead);if(!t||t.noPitch)return'';
  return talkSteps(t).map((st,i)=>`${fa(i+1)}. ${st.label}\n${st.text}`).join('\n\n');
}
// کپی گفتار: کارشناس می‌تواند متن را در واتساپ/پیامک بفرستد یا جدا نگه دارد
document.addEventListener('click',e=>{
  let b=e.target.closest('[data-copy-talk]');if(!b)return;
  let i=next();if(i<0)return;
  let txt=talkPlain(db.leads[i]),label=b.textContent;
  let done=ok=>{b.textContent=ok?'کپی شد':'متن انتخاب شد؛ کپی کنید';setTimeout(()=>{b.textContent=label},1600)};
  let select=()=>{let box=b.closest('.talk');if(!box)return;let r=document.createRange();r.selectNodeContents(box);let sel=window.getSelection();sel.removeAllRanges();sel.addRange(r)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(()=>done(true)).catch(()=>{select();done(false)});
  else{select();done(false)}
});

/* ===== منطق وضعیت‌ها ===== */
// وضعیت‌های پایانی: با این نتایج، پروندهٔ تماس آن لید کامل می‌شود
const TERMINAL=['قرارداد بسته شد (در همین تماس)','انصراف و عدم تمایل مشتری','اشتباه بودن شماره','سایت نداشتند'];
const CONTRACT_CALL='قرارداد بسته شد (در همین تماس)';   // بستن قرارداد در همان تماس اول
const CONTRACT_MEETING='جلسه برگزار شد و قرارداد بسته شد'; // بستن قرارداد در جلسه
const MEETING_SET='قرار جلسه با کارشناس';
const NO_SITE='سایت نداشتند';
/* این شش وضعیت پرونده را نمی‌بندند: تاریخ پیگیری اجباری است و لید در بخش «قرارها و پیگیری‌ها»
   می‌ماند تا از چرخه خارج نشود. «رد شد» هم عمداً اینجاست؛ «انصراف» پایانی است و بایگانی می‌شود. */
const FOLLOWUP_STATUSES=[MEETING_SET,'نیازمند پیگیری','منشی پاسخ داد','صحبت با مدیر','پاسخ نداد','رد شد'];

function leadById(id){return db.leads.find(l=>l.id===id)}
function latestReports(){let m=new Map();db.reports.forEach(r=>m.set(r.leadId,r));return m}
function meetingFor(id){return db.meetings.find(m=>m.leadId===id)}
function reportLead(r){return leadById(r.leadId)||r.lead||{}}
// آخرین وضعیت هر لید؛ «قرار جلسه» تا پیش از گزارش جلسه فعال می‌ماند
function leadState(id){
  let r=latestReports().get(id);
  if(!r)return null;
  if(r.status===MEETING_SET){
    let m=meetingFor(id);
    if(m&&m.status===CONTRACT_MEETING)return{status:'قرارداد بسته شد (در جلسه)',report:r,meeting:m};
    if(m)return{status:'جلسه گزارش‌شده: '+m.status,report:r,meeting:m};
    return{status:MEETING_SET,report:r};
  }
  return{status:r.status,report:r};
}
function isDone(id){let s=leadState(id);return s&&(TERMINAL.includes(s.status)||s.status==='قرارداد بسته شد (در جلسه)')}
// قرارها و پیگیری‌های فعال: هر شش وضعیت FOLLOWUP_STATUSES تا پرونده از چرخه خارج نشود.
// kind = meeting برای قرار جلسه، followup برای پیگیری تلفنی.
function appointments(){
  return db.leads.map(l=>({lead:l,state:leadState(l.id)}))
    .filter(a=>{
      let s=a.state;if(!s)return false;
      if(s.status.startsWith('جلسه گزارش‌شده'))return true;
      return FOLLOWUP_STATUSES.includes(s.status);
    })
    .map(a=>{
      let s=a.state;
      let isMeeting=s.status===MEETING_SET||s.status.startsWith('جلسه گزارش‌شده');
      return {lead:a.lead,state:s,followUp:s.report.followUp,kind:isMeeting?'meeting':'followup'};
    })
    .filter(a=>a.followUp&&!Number.isNaN(new Date(a.followUp).getTime()))
    .sort((x,y)=>new Date(x.followUp)-new Date(y.followUp));
}
// قراردادهای بسته‌شده: در تماس اول یا در جلسه
function contracts(){
  return db.leads.filter(l=>{
    let s=leadState(l.id);
    return s&&(s.status===CONTRACT_CALL||s.status==='قرارداد بسته شد (در جلسه)');
  }).sort((x,y)=>{
    let da=new Date((leadState(y.id).meeting||leadState(y.id).report).createdAt||0);
    let db2=new Date((leadState(x.id).meeting||leadState(x.id).report).createdAt||0);
    return da-db2;
  });
}
// پیگیری‌های زمان‌بندی‌شدهٔ فعال
function scheduledFollowUps(){
  return db.leads.filter(l=>{
    let s=leadState(l.id);
    return s&&!isDone(l.id)&&s.report.scheduledFollowUp&&s.report.followUp&&!Number.isNaN(new Date(s.report.followUp).getTime());
  }).map(l=>({lead:l,report:leadState(l.id).report}))
    .sort((x,y)=>new Date(x.report.followUp)-new Date(y.report.followUp));
}

/* ===== صفحه اصلی و آمار ===== */
function refresh(){
  let pending=db.leads.filter(l=>!isDone(l.id)&&!leadState(l.id)?.report?.scheduledFollowUp).length;
  let appts=appointments();
  let now=Date.now();
  let soon=appts.filter(a=>{let x=new Date(a.followUp)-now;return x>=0&&x<=86400000});
  let over=appts.filter(a=>new Date(a.followUp)<now);
  $('#pendingCount').textContent=fa(pending);
  $('#apptCount').textContent=fa(appts.length);
  $('#apptBadge').textContent=fa(appts.length);
  $('#contractStat').textContent=fa(contracts().length);
  $('#reportStat').textContent=fa(db.reports.length);
  $('#contractCount').textContent=fa(contracts().length);
  let due=scheduledFollowUps().filter(f=>new Date(f.report.followUp)<=now).length;
  $('#calBadge').textContent=due?fa(due)+' سررسیدشده':'';
  let al=$('#alertBox');
  let msgs=[];
  if(soon.length)msgs.push(`${fa(soon.length)} قرار/پیگیری تا ۲۴ ساعت آینده`);
  if(over.length)msgs.push(`${fa(over.length)} قرار/پیگیری گذشته`);
  if(due)msgs.push(`${fa(due)} تماس پیگیری سررسیدشده`);
  if(msgs.length){al.className=over.length||due?'alert urgent':'alert';al.textContent='هشدار: '+msgs.join('؛ ')}
  else{al.className='alert hidden'}
}

/* ===== ورود لید =====
   لیدها مستقیماً به پنل کارشناس می‌آیند — از فایل JSON یا فید خودکار خط لوله.
   داده‌های کامل هر لید (افزونه‌ها، سرعت، مشکلات، شواهد وردپرس) دست‌نخورده باقی می‌ماند. */
function importLeads(arr,fname){
  if(!Array.isArray(arr))throw Error('فرمت آرایه‌ای یا کلید leads/data/items لازم است');
  let old=new Set(db.leads.flatMap(fingerprints)),added=0,dup=0,rejected=0;
  arr.forEach(x=>{
    if(!x||typeof x!=='object')return;
    if(!pick(x,['ownerName','owner'])||!pick(x,['name','title'])||!pick(x,['url','website','domain','link'])||!pick(x,['phone','mobile','tel'])){rejected++;return}
    let keys=fingerprints(x),duplicate=!keys.length||keys.some(k=>old.has(k));
    if(duplicate){dup++;return}
    keys.forEach(k=>old.add(k));
    db.leads.push({...x,id:crypto.randomUUID(),sourceFile:fname,importedAt:new Date().toISOString()});
    added++
  });
  db.duplicates+=dup;
  save();
  return{added,dup,rejected}
}
function showImportResult(out,res){out.style.background='#e9f7ed';out.textContent=`${fa(res.added)} لید اضافه شد؛ ${fa(res.dup)} مورد تکراری مهار شد؛ ${fa(res.rejected)} لید ناقص رد شد؛ داده‌های قبلی حفظ شدند.`}
$('#jsonFile').addEventListener('change',async e=>{
  let f=e.target.files[0];if(!f)return;let out=$('#importResult');
  try{
    let raw=JSON.parse(await f.text()),arr=Array.isArray(raw)?raw:(raw.leads||raw.data||raw.items||[]);
    showImportResult(out,importLeads(arr,f.name))
  }catch(err){out.style.background='#ffe7e7';out.textContent='خطا: '+err.message}
});
// مسیر فید خروجی خط لوله (نسبی به ریشهٔ پروژه که با http.server سرو می‌شود)
const FEED_URLS=['../RAVAND/PIPELINE/OUTPUT/secretary_feed.json','./secretary_feed.json'];
// بارگذاری خودکار جدیدترین فید تولیدشده توسط خط لوله — بدون انتخاب دستی فایل
$('#loadFeed').onclick=async()=>{
  let out=$('#importResult');
  let btn=$('#loadFeed'),oldText=btn.textContent;
  btn.disabled=true;btn.textContent='در حال دریافت فید تازه …';
  try{
    let raw=null,errs=[];
    for(let u of FEED_URLS){
      try{let r=await fetch(u,{cache:'no-store'});if(r.ok){raw=await r.json();break}}catch(err){errs.push(err.message)}
    }
    if(raw===null)throw Error('فید پیدا نشد. خط لوله را اجرا کنید یا فایل را دستی انتخاب کنید. '+errs.join(' | '));
    let arr=Array.isArray(raw)?raw:(raw.leads||raw.data||raw.items||[]);
    showImportResult(out,importLeads(arr,'خط‌لوله/secretary_feed.json'));
  }catch(err){out.style.background='#ffe7e7';out.textContent='خطا: '+err.message}
  finally{btn.disabled=false;btn.textContent=oldText}
};
$('#loadSample').onclick=()=>$('#jsonPreview').textContent=JSON.stringify([{ownerName:'نام صاحب سایت',name:'نام کسب‌وکار',url:'https://example.com',phone:'09120000000'}],null,2);
// پاک‌کردن فقط لیدهای ورودی — گزارش‌ها، قرارها و قراردادها حفظ می‌شوند
$('#clearLeads').onclick=()=>{
  if(!confirm('لیدهای ورودی پاک شوند؟ گزارش‌ها، قرارها و قراردادها حفظ می‌شوند.'))return;
  if(!confirm('تأیید نهایی: همه لیدهای ورودی برای همیشه حذف می‌شوند. مطمئن هستید؟'))return;
  db.leads=[];db.cursor=0;db.draft=null;db.duplicates=0;save();
  let out=$('#importResult');out.style.background='#e9f7ed';out.textContent='لیدهای ورودی پاک شد؛ گزارش‌ها و قراردادها حفظ شدند.'
};

/* ===== صفحه تماس ===== */
// لیدی که فرم گزارش برایش باز است؛ ثبت گزارش همیشه روی همین لید انجام می‌شود
// (نه روی next()) تا با ورود پیگیری‌ها به چرخه، گزارش روی لید اشتباه ثبت نشود.
let currentLeadId=null;
// بازکردن مستقیم یک لید مشخص از بخش قرارها/پیگیری‌ها
let openLeadId=null;
// لید بعدی برای تماس: ابتدا پیش‌نویس نیمه‌تمام، بعد پیگیری‌های سررسیدشده، بعد لیدهای تازه
function next(){
  if(db.draft){let i=db.leads.findIndex(l=>l.id===db.draft.leadId);if(i>=0)return i}
  let due=scheduledFollowUps().filter(f=>new Date(f.report.followUp)<=Date.now());
  if(due.length){let i=db.leads.findIndex(l=>l.id===due[0].lead.id);if(i>=0)return i}
  for(let o=0;o<db.leads.length;o++){
    let i=(db.cursor+o)%db.leads.length,l=db.leads[i];
    if(!isDone(l.id)&&!latestReports().get(l.id)?.scheduledFollowUp)return i;
  }
  return -1
}
function renderWork(){
  let i=openLeadId?db.leads.findIndex(l=>l.id===openLeadId):next(),card=$('#leadCard'),form=$('#reportForm');
  openLeadId=null;
  if(i<0){card.innerHTML='<div class="notice">تماس آماده‌ای ندارید؛ تقویم پیگیری‌ها را بررسی کنید یا لید جدید وارد کنید.</div>';form.classList.add('hidden');currentLeadId=null;return}
  db.cursor=i;let x=db.leads[i];currentLeadId=x.id;form.reset();
  $('#resumeHint').classList.add('hidden');
  if(!db.draft){db.draft={leadId:x.id};localStorage.setItem(KEY,JSON.stringify(db))}
  card.innerHTML=`<div class="lead"><strong>لید ${fa(i+1)} از ${fa(db.leads.length)}</strong>
    <div class="row"><b>نام صاحب سایت:</b> ${esc(x.ownerName||x.owner||'ثبت نشده')}</div>
    <div class="row"><b>نام کسب‌وکار:</b> ${esc(x.name||x.title||'ثبت نشده')}</div>
    <div class="row"><b>سایت:</b> ${siteLink(x)}</div>
    <div class="row"><b>تلفن:</b> ${esc(x.phone||x.mobile||x.tel||'ثبت نشده')}</div>
    <a class="primary" style="display:block;text-align:center;margin-top:12px;text-decoration:none;border-radius:10px;padding:10px" href="tel:${encodeURIComponent(x.phone||x.mobile||x.tel||'')}">تماس با لید</a>
    ${talkBlock(x)}
    <details class="tech"><summary>جزئیات فنی — برای خودتان، به مشتری نگویید</summary>${siteIntel(x)}</details></div>`;
  form.classList.remove('hidden');
  if(db.draft&&db.draft.leadId===x.id){
    $('#status').value=db.draft.status||'';
    $('#notes').value=db.draft.notes||'';
    $('#followUp').value=db.draft.followUp||'';
    $('#contactName').value=db.draft.contactName||'';
    $('#resumeHint').textContent='گزارش نیمه‌تمام این لید بازیابی شد.';
    $('#resumeHint').classList.remove('hidden');
  }
  updateFollowUpLabel();syncFollowUpText();
}
function needsDate(){let s=$('#status').value;return s===CONTRACT_CALL||FOLLOWUP_STATUSES.includes(s)}
function updateFollowUpLabel(){
  let s=$('#status').value;
  $('#followUpText').required=needsDate();
  $('#followUpLabel').textContent=s===MEETING_SET?'تاریخ و ساعت جلسه (اجباری)'
    :s===CONTRACT_CALL?'تاریخ قرارداد (اجباری)'
    :FOLLOWUP_STATUSES.includes(s)?'تاریخ و ساعت پیگیری (اجباری)'
    :'زمان پیگیری/جلسه (در صورت وجود)';
}
function persistDraft(){
  let lead=leadById(currentLeadId);if(!lead)return;
  db.draft={leadId:lead.id,status:$('#status').value,notes:$('#notes').value,followUp:$('#followUp').value,contactName:$('#contactName').value};
  localStorage.setItem(KEY,JSON.stringify(db));
}
$('#status').addEventListener('change',updateFollowUpLabel);
$('#reportForm').addEventListener('input',persistDraft);
$('#reportForm').addEventListener('change',persistDraft);
$('#reportForm').addEventListener('submit',e=>{
  e.preventDefault();
  let i=db.leads.findIndex(l=>l.id===currentLeadId);if(i<0)return;
  let lead=db.leads[i],status=$('#status').value,notes=$('#notes').value.trim(),
      followUp=$('#followUp').value,contactName=$('#contactName').value.trim(),
      stamp=new Date(followUp).getTime();
  if(!status||notes.length<3||!contactName){alert('نتیجه تماس، توضیحات (حداقل ۳ حرف) و نام پاسخ‌دهنده اجباری است.');return}
  if(needsDate()&&(!followUp||!Number.isFinite(stamp))){$('#followUpText').classList.add('invalid');alert('تاریخ و ساعت را صریحاً وارد کنید.');return}
  // شش وضعیت پیگیری همیشه زمان‌بندی می‌شوند تا در بخش قرارها بمانند؛
  // وضعیت‌های دیگر اگر تاریخ داشته باشند، پیگیری زمان‌بندی‌شده حساب می‌شوند.
  let isFollow=FOLLOWUP_STATUSES.includes(status);
  let scheduled=isFollow||(!TERMINAL.includes(status)&&!!followUp&&Number.isFinite(stamp));
  if(scheduled&&stamp<=Date.now()){alert('زمان پیگیری باید در آینده باشد.');return}
  db.reports.push({id:crypto.randomUUID(),leadId:lead.id,lead,status,notes,followUp,contactName,scheduledFollowUp:!!scheduled,createdAt:new Date().toISOString()});
  db.draft=null;db.cursor=i+1;save();
  e.target.reset();updateFollowUpLabel();
  go('home');
});

/* ===== قرارهای جلسه ===== */
let apptFilter='all';
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');apptFilter=b.dataset.filter;renderAppointments();
});
function apptType(a){let x=new Date(a.followUp)-Date.now();return x<0?'overdue':x<=86400000?'soon':'future'}
function ago(v){let d=new Date(v),x=d-Date.now(),m=Math.floor(Math.abs(x)/60000),h=Math.floor(m/60);return x>=0?`${fa(h)} ساعت و ${fa(m%60)} دقیقه مانده`:`${fa(h)} ساعت و ${fa(m%60)} دقیقه گذشته`}
function renderAppointments(){
  let list=appointments(),now=Date.now();
  $('#soonCount').textContent=fa(list.filter(a=>apptType(a)==='soon').length);
  $('#overdueCount').textContent=fa(list.filter(a=>apptType(a)==='overdue').length);
  let show=apptFilter==='soon'?list.filter(a=>apptType(a)==='soon')
    :apptFilter==='overdue'?list.filter(a=>apptType(a)==='overdue')
    :apptFilter==='followup'?list.filter(a=>a.kind!=='meeting')
    :apptFilter==='met'?list.filter(a=>a.kind==='meeting'&&a.state.meeting)
    :apptFilter==='unmet'?list.filter(a=>a.kind==='meeting'&&!a.state.meeting)
    :list;
  $('#appointmentList').innerHTML=show.length?
    show.map(a=>{
      let t=apptType(a),l=a.lead,m=a.state.meeting,isMeeting=a.kind==='meeting';
      let badge=t==='soon'?'تا ۲۴ ساعت آینده':t==='overdue'?'گذشته':'آینده';
      let kindLabel=isMeeting?'قرار جلسه':a.state.status;
      return `<details class="appointment ${t}" data-lid="${esc(l.id)}">
        <summary>
          <span class="ap-name">${esc(l.ownerName||l.owner||'نام صاحب سایت ثبت نشده')}</span>
          <span class="ap-meta"><span class="badge">${badge}</span><span class="ap-kind">${esc(kindLabel)}</span></span>
          <span class="ap-time">${fmt(a.followUp)} — ${ago(a.followUp)}</span>
        </summary>
        <div class="appt-body">
          <div class="line time-line" data-followup="${esc(a.followUp)}"><b>زمان:</b> ${fmt(a.followUp)} — ${ago(a.followUp)}</div>
          <div class="line"><b>سایت:</b> ${siteLink(l)}</div>
          <div class="line"><b>تلفن:</b> ${esc(l.phone||l.mobile||l.tel||'ثبت نشده')}</div>
          <div class="line"><b>توضیحات تماس:</b> ${esc(a.state.report.notes||'')}</div>
          <div class="line"><b>نام پاسخ‌دهنده:</b> ${esc(a.state.report.contactName||'ثبت نشده')}</div>
          ${talkBlock(l)}
          <details class="tech"><summary>جزئیات فنی — برای خودتان، به مشتری نگویید</summary>${siteIntel(l)}</details>
          ${m?`<div class="report-box"><b>گزارش جلسه:</b><br>${esc(m.status)}<br>${esc(m.notes||'')}<br><small>${fmt(m.at)}</small></div>`:''}
          ${isMeeting
            ?`<button type="button" class="reportBtn" data-meeting="${esc(l.id)}">${m?'ویرایش گزارش جلسه':'ثبت گزارش جلسه'}</button>`
            :`<button type="button" class="reportBtn" data-followup-lead="${esc(l.id)}">ثبت نتیجه پیگیری</button>`}
        </div>
      </details>`;
    }).join('')
    :'<div class="result">برای این فیلتر قراری وجود ندارد.</div>';
}
// بازکردن فرم گزارش برای لیدی که از بخش قرارها/پیگیری‌ها انتخاب شده است
document.addEventListener('click',e=>{
  let b=e.target.closest('[data-followup-lead]');if(!b)return;
  openLeadId=b.dataset.followupLead;
  go('work');
});
// به‌روزرسانی درجای «مانده/گذشته» بدون بازنویسی کل لیست (اسکرول و فیلتر حفظ می‌شود)
function refreshApptTimes(){
  document.querySelectorAll('#appointmentList .time-line[data-followup]').forEach(el=>{
    el.innerHTML=`<b>زمان:</b> ${fmt(el.dataset.followup)} — ${ago(el.dataset.followup)}`;
  });
}

/* ===== ثبت/ویرایش گزارش جلسه ===== */
let meetingLeadId=null;
document.addEventListener('click',e=>{
  let b=e.target.closest('[data-meeting]');
  if(!b)return;
  meetingLeadId=b.dataset.meeting;
  let l=leadById(meetingLeadId);if(!l)return;
  let s=leadState(meetingLeadId);
  $('#meetingCard').innerHTML=`<h3>${esc(l.ownerName||l.owner||'نام صاحب سایت ثبت نشده')}</h3>
    <div class="line"><b>زمان قرار:</b> ${fmt(s?.report?.followUp)}</div>
    <div class="line"><b>سایت:</b> ${siteLink(l)}</div>
    <div class="line"><b>تلفن:</b> ${esc(l.phone||l.mobile||l.tel||'ثبت نشده')}</div>
    ${talkBlock(l)}
    <details class="tech"><summary>جزئیات فنی — برای خودتان، به مشتری نگویید</summary>${siteIntel(l)}</details>`;
  let old=meetingFor(meetingLeadId);
  $('#meetingStatus').value=old?old.status:'';
  $('#meetingNotes').value=old?old.notes:'';
  let d=old&&old.at?new Date(old.at):new Date();
  let p=n=>String(n).padStart(2,'0');
  $('#meetingAt').value=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  $('#meetingSaved').textContent='';
  go('meetingView');
});
$('#meetingForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!meetingLeadId)return;
  let status=$('#meetingStatus').value,notes=$('#meetingNotes').value.trim(),at=$('#meetingAt').value;
  if(!status||notes.length<3){alert('نتیجه جلسه و توضیحات (حداقل ۳ حرف) اجباری است.');return}
  let rec={leadId:meetingLeadId,status,notes,at:new Date(at).toISOString(),updatedAt:new Date().toISOString()};
  let i=db.meetings.findIndex(m=>m.leadId===meetingLeadId);
  if(i>=0)db.meetings[i]=rec;else db.meetings.push(rec);
  save();
  $('#meetingForm').reset();
  $('#meetingSaved').textContent='گزارش جلسه ذخیره شد و روی دستگاه نگه داشته شد.';
  go('appointmentsView');
});

/* ===== قراردادها ===== */
function renderContracts(){
  let list=contracts();
  $('#contractList').innerHTML=list.length?
    list.map(l=>{
      let s=leadState(l.id),m=s.meeting,r=s.report;
      let src=m?m:r;
      return `<article class="appointment reported">
        <h3>${esc(l.ownerName||l.owner||'نام صاحب سایت ثبت نشده')}</h3>
        ${siteIntel(l)}
        <div class="line"><b>نحوهٔ بستن:</b> ${m?'در جلسه':'در همان تماس اول'}</div>
        <div class="line"><b>زمان:</b> ${fmt(src.at||src.createdAt)}</div>
        <div class="line"><b>سایت:</b> ${siteLink(l)}</div>
        <div class="line"><b>تلفن:</b> ${esc(l.phone||l.mobile||l.tel||'ثبت نشده')}</div>
        <div class="report-box"><b>قرارداد بسته شد</b><br>${esc(src.notes||'')}<br><small>${fmt(src.at||src.createdAt)}</small></div>
      </article>`;
    }).join('')
    :'<div class="result">هنوز قراردادی بسته نشده است.</div>';
}

/* ===== تقویم پیگیری تماس‌ها (شمسی) ===== */
let calView={jy:null,jm:null,day:null};
function moveMonth(step){if(calView.jy==null)return;let y=calView.jy,m=calView.jm+step;if(m<1){m=12;y--}if(m>12){m=1;y++}if(!Jalali.isValid(y,m,1))return;calView.jy=y;calView.jm=m;calView.day=null;renderCalendar()}
function goToday(){let t=Jalali.fromDate(new Date());calView.jy=t.jy;calView.jm=t.jm;calView.day=null;renderCalendar()}
$('#calPrev').onclick=()=>moveMonth(-1);$('#calNext').onclick=()=>moveMonth(1);$('#calToday').onclick=goToday;$('#calAll').onclick=()=>{calView.day=null;renderCalendar()};
document.addEventListener('click',e=>{let c=e.target.closest('.cal-day');if(!c||!c.dataset.day)return;calView.day=calView.day===c.dataset.day?null:c.dataset.day;renderCalendar()});
function renderCalendar(){
  let items=scheduledFollowUps(),now=Date.now();
  let today=Jalali.fromDate(new Date());
  if(calView.jy==null){calView.jy=today.jy;calView.jm=today.jm}
  let g=Jalali.toGregorian(calView.jy,calView.jm,1),first=new Date(g.gy,g.gm-1,g.gd),
      offset=Jalali.weekdayIndex(first),len=Jalali.monthLength(calView.jy,calView.jm),todayKey=Jalali.dateKey(new Date());
  $('#calTitle').textContent=Jalali.MONTHS[calView.jm-1]+' '+Jalali.fa(calView.jy);
  $('#calWeek').innerHTML=Jalali.WEEK_SHORT.map(d=>'<span>'+d+'</span>').join('');
  let byDay=new Map();
  items.forEach(f=>{let d=new Date(f.report.followUp);if(Number.isNaN(d))return;let k=Jalali.dateKey(d);if(!byDay.has(k))byDay.set(k,[]);byDay.get(k).push(f)});
  let cells='';
  for(let i=0;i<offset;i++)cells+='<div class="cal-blank"></div>';
  for(let day=1;day<=len;day++){
    let key=Jalali.dateKey(new Date(first.getFullYear(),first.getMonth(),first.getDate()+day-1)),lst=byDay.get(key)||[],
        overdue=lst.some(f=>new Date(f.report.followUp)<=now),soon=!overdue&&lst.some(f=>new Date(f.report.followUp)-now<=86400000);
    cells+='<div class="cal-day'+(lst.length?' has':'')+(overdue?' overdue':'')+(soon?' soon':'')+(key===todayKey?' today':'')+(calView.day===key?' sel':'')+'"'+(lst.length?' data-day="'+key+'"':'')+'><span class="n">'+Jalali.fa(day)+'</span>'+(lst.length?'<i>'+Jalali.fa(lst.length)+'</i>':'')+'</div>';
  }
  $('#calGrid').innerHTML=cells;
  $('#calAll').classList.toggle('hidden',!calView.day);
  let shown=calView.day?items.filter(f=>{let d=new Date(f.report.followUp);return Jalali.dateKey(d)===calView.day}):items;
  let dayDate=calView.day?new Date(calView.day+'T00:00:00'):null;
  // calView.day به‌صورت کلید ISO است؛ برای عنوان از Jalali استفاده می‌کنیم
  let head='<div class="cal-head">'+(calView.day?('پیگیری‌های انتخاب‌شده'):'همه پیگیری‌ها (به ترتیب سررسید)')+'</div>';
  $('#calendarList').innerHTML=head+(shown.length?shown.map(f=>{
    let remaining=new Date(f.report.followUp).getTime()-now,
        state=remaining<=0?'عقب‌افتاده / سررسیدشده':remaining<=86400000?'کمتر از ۲۴ ساعت تا تماس':'پیگیری آینده',
        l=f.lead;
    return '<div class="report '+(remaining<=0?'followup-overdue':remaining<=86400000?'followup-soon':'')+'"><b>'+esc(l.ownerName||l.owner||'')+'</b><br>'+siteLink(l)+'<br>'+esc(l.phone||l.mobile||l.tel||'')+'<br>'+fmt(f.report.followUp)+'<br>'+state+'<br>'+esc(f.report.status)+' — '+esc(f.report.notes)+(remaining<=0?'<br><button type="button" data-followup="'+esc(l.id)+'">شروع پیگیری</button>':'')+'</div>';
  }).join(''):'<div class="notice">'+(calView.day?'در این روز پیگیری‌ای ثبت نشده است.':'پیگیری زمان‌بندی‌شده‌ای ندارید.')+'</div>');
}
document.addEventListener('click',e=>{
  let b=e.target.closest('[data-followup]');if(!b)return;
  if(db.draft&&db.draft.leadId!==b.dataset.followup){alert('ابتدا تماس نیمه‌تمام فعلی را تکمیل کنید.');go('work');return}
  db.draft={leadId:b.dataset.followup};localStorage.setItem(KEY,JSON.stringify(db));go('work');
});

/* ===== گزارش‌ها و خروجی ===== */
function renderReports(){
  let b=$('#reportList');
  b.innerHTML=db.reports.length?db.reports.slice().reverse().map(r=>{
    let l=reportLead(r),m=meetingFor(r.leadId);
    return `<div class="report"><b>نام صاحب سایت:</b> ${esc(l.ownerName||l.owner||'بدون نام')}<br>
      <b>سایت:</b> ${siteLink(l)}<br>
      <b>نتیجه تماس:</b> ${esc(r.status)}<br>
      <b>توضیحات:</b> ${esc(r.notes)}<br>
      <b>زمان جلسه/پیگیری:</b> ${esc(fmt(r.followUp))}<br>
      <b>زمان ثبت گزارش:</b> ${esc(fmt(r.createdAt))}<br>
      <b>نام پاسخ‌دهنده:</b> ${esc(r.contactName||'ثبت نشده')}
      ${m?`<br><b>گزارش جلسه:</b> ${esc(m.status)} — ${esc(m.notes||'')}`:''}</div>`;
  }).join(''):'<div class="notice">هنوز گزارشی ثبت نشده است.</div>';
}
$('#exportReports').onclick=()=>{ // export to JSON file containing reports and leads
  if(!db.reports.length){alert('هنوز گزارشی ثبت نشده است.');return}
  // خروجی خود-حاوی: هر ردیف یک گزارش تماس + لید کامل (سرعت/افزونه‌ها/مشکلات) + گزارش جلسه در صورت وجود
  let rows=db.reports.map(r=>{
    let l=reportLead(r),m=meetingFor(r.leadId);
    return {...r,lead:l,meeting:m||null};
  });
  download('گزارش‌های-کارشناس-'+jdate()+'.json',rows);
};
$('#exportNoWebsite').onclick=()=>{
  // لیدهایی که آخرین گزارششان «سایت نداشتند» است، با مشخصات کامل
  let rows=db.leads.filter(l=>leadState(l.id)?.status===NO_SITE).map(l=>{
    let r=leadState(l.id).report;
    return{نام_صاحب_سایت:l.ownerName||l.owner||'',نام_کسب_و_کار:l.name||l.title||'',سایت:site(l),تلفن:l.phone||l.mobile||l.tel||'',توضیحات_تماس:r.notes||'',نام_پاسخ‌دهنده:r.contactName||'',زمان_ثبت_گزارش:fmt(r.createdAt)};
  });
  if(!rows.length){alert('هیچ لیدی با وضعیت «سایت نداشتند» ثبت نشده است.');return}
  download('لیدهای-بدون-سایت-'+jdate()+'.json',rows);
};
$('#exportAll').onclick=()=>download('پشتیبان-کامل-پنل-کارشناس-'+jdate()+'.json',db);
$('#clearReports').onclick=()=>{
  if(!confirm('گزارش‌های تماس پاک شوند؟ لیدها حفظ می‌شوند ولی قرارها و قراردادها از بین می‌روند.'))return;
  if(!confirm('تأیید نهایی: همه گزارش‌ها برای همیشه حذف می‌شوند. مطمئن هستید؟'))return;
  db.reports=[];db.meetings=[];db.cursor=0;db.draft=null;db.notified={};db.dismissed=[];save();renderReports();
};
$('#clearData').onclick=()=>{
  if(!confirm('همه اطلاعات پنل کارشناس پاک شود؟'))return;
  if(!confirm('تأیید نهایی: همه لیدها، گزارش‌ها، قرارها و قراردادها برای همیشه حذف می‌شوند. مطمئن هستید؟'))return;
  db={leads:[],reports:[],meetings:[],draft:null,cursor:0,duplicates:0,notified:{},dismissed:[]};
  save();
};

/* ===== انتخاب‌گر تاریخ و ساعت شمسی ===== */
function syncFollowUpText(){
  let v=$('#followUp').value,
      d=Jalali.parse(v);
  if(d){
    $('#followUpText').value=Jalali.dayText(d)+' — '+Jalali.fa(Jalali.pad(d.getHours())+':'+Jalali.pad(d.getMinutes()));
    $('#followUpText').classList.remove('invalid');
  }else{
    $('#followUpText').value='';
    $('#followUpText').classList.add('invalid');
  }
}
function setFollowUp(iso){$('#followUp').value=iso||'';syncFollowUpText();$('#followUp').dispatchEvent(new Event('input',{bubbles:true}));$('#followUp').dispatchEvent(new Event('change',{bubbles:true}))}
const picker=document.createElement('div');picker.className='dt-picker hidden';picker.setAttribute('role','dialog');picker.setAttribute('aria-label','انتخاب تاریخ و ساعت شمسی');picker.innerHTML='<div class="dt-head"><button type="button" class="dt-nav" data-step="-1">ماه قبل</button><div class="dt-title"></div><button type="button" class="dt-nav" data-step="1">ماه بعد</button></div><div class="dt-week"></div><div class="dt-grid"></div><div class="dt-time"><label>ساعت<select id="dtHour"></select></label><label>دقیقه<select id="dtMinute"></select></label><button type="button" id="dtNow">الان</button></div><div class="dt-actions"><button type="button" id="dtClear" class="danger">پاک کردن</button><button type="button" id="dtOk" class="primary">تأیید</button></div>';document.body.appendChild(picker);
const pickerScrim=document.createElement('div');pickerScrim.className='dt-scrim hidden';document.body.appendChild(pickerScrim);
(function(){let h='',m='';for(let i=0;i<24;i++)h+='<option value="'+i+'">'+Jalali.fa(Jalali.pad(i))+'</option>';for(let i=0;i<60;i++)m+='<option value="'+i+'">'+Jalali.fa(Jalali.pad(i))+'</option>';$('#dtHour').innerHTML=h;$('#dtMinute').innerHTML=m})();
let pk={jy:0,jm:0,day:0,hh:9,mm:0};
function renderPicker(){if(!Jalali.isValid(pk.jy,pk.jm,1)){let t=Jalali.fromDate(new Date());pk.jy=t.jy;pk.jm=t.jm}let g=Jalali.toGregorian(pk.jy,pk.jm,1),first=new Date(g.gy,g.gm-1,g.gd),offset=Jalali.weekdayIndex(first),len=Jalali.monthLength(pk.jy,pk.jm),todayKey=Jalali.dateKey(new Date());picker.querySelector('.dt-title').textContent=Jalali.MONTHS[pk.jm-1]+' '+Jalali.fa(pk.jy);picker.querySelector('.dt-week').innerHTML=Jalali.WEEK_SHORT.map(d=>'<span>'+d+'</span>').join('');let cells='';for(let i=0;i<offset;i++)cells+='<div class="dt-blank"></div>';for(let day=1;day<=len;day++){let key=Jalali.dateKey(new Date(first.getFullYear(),first.getMonth(),first.getDate()+day-1));cells+='<button type="button" class="dt-day'+(key===todayKey?' today':'')+(day===pk.day?' sel':'')+'" data-day="'+day+'">'+Jalali.fa(day)+'</button>'}picker.querySelector('.dt-grid').innerHTML=cells;$('#dtHour').value=String(pk.hh);$('#dtMinute').value=String(pk.mm)}
function openPicker(){let d=Jalali.parse($('#followUp').value);if(!d){d=new Date(Date.now()+3600e3);d.setSeconds(0,0)}let j=Jalali.fromDate(d);pk={jy:j.jy,jm:j.jm,day:j.jd,hh:d.getHours(),mm:d.getMinutes()};renderPicker();picker.classList.remove('hidden');pickerScrim.classList.remove('hidden')}
function closePicker(){picker.classList.add('hidden');pickerScrim.classList.add('hidden')}
$('#openPicker').onclick=openPicker;$('#followUpText').onclick=openPicker;pickerScrim.onclick=closePicker;
picker.addEventListener('click',e=>{let day=e.target.closest('.dt-day');if(day){pk.day=+day.dataset.day;renderPicker();return}let nav=e.target.closest('.dt-nav');if(nav){let step=+nav.dataset.step,m=pk.jm+step,y=pk.jy;if(m<1){m=12;y--}if(m>12){m=1;y++}if(Jalali.isValid(y,m,1)){pk.jy=y;pk.jm=m}renderPicker();return}if(e.target.id==='dtNow'){let n=new Date();n.setSeconds(0,0);let j=Jalali.fromDate(n);pk={jy:j.jy,jm:j.jm,day:j.jd,hh:n.getHours(),mm:n.getMinutes()};renderPicker();return}if(e.target.id==='dtClear'){setFollowUp('');closePicker();return}if(e.target.id==='dtOk'){if(!pk.day){alert('برای انتخاب، ابتدا یک روز را مشخص کنید.');return}setFollowUp(Jalali.toStorageFromJ(pk.jy,pk.jm,pk.day,pk.hh,pk.mm));closePicker()}});
$('#dtHour').addEventListener('change',()=>{pk.hh=+$('#dtHour').value});$('#dtMinute').addEventListener('change',()=>{pk.mm=+$('#dtMinute').value});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePicker()});

/* ===== یادآوری‌ها (نوتیفیکیشن + آلارم صوتی) ===== */
function remindersOn(){return 'Notification' in window&&Notification.permission==='granted'}
function dismissed(k){return db.dismissed.includes(k)}
let actx=null;
// آلارم صوتی بدون فایل خارجی — با نوسان‌ساز Web Audio API تولید می‌شود
function alarm(){
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended')actx.resume();
    let t=actx.currentTime,beeps=[0,.35,.7,1.05,1.4];
    beeps.forEach((o,i)=>{
      let g=actx.createGain(),osc=actx.createOscillator();
      osc.type='sine';osc.frequency.value=i%2?660:880;
      g.gain.setValueAtTime(0,t+o);
      g.gain.linearRampToValueAtTime(.3,t+o+.04);
      g.gain.setValueAtTime(.3,t+o+.22);
      g.gain.linearRampToValueAtTime(0,t+o+.32);
      osc.connect(g);g.connect(actx.destination);
      osc.start(t+o);osc.stop(t+o+.34);
    });
  }catch(err){}
}
// مرورگر صدا را فقط پس از تعامل کاربر پخش می‌کند؛ اولین کلیک AudioContext را فعال می‌کند
document.addEventListener('click',()=>{try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(err){}},{once:true});
function notify(title,body,tag,k){
  navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body,tag,requireInteraction:true,data:{k}})).catch(()=>{});
}
function checkReminders(){
  if(!remindersOn())return;
  let now=Date.now();
  // یادآوری پیگیری‌های تماس (۱۵ دقیقه قبل)
  scheduledFollowUps().forEach(f=>{
    let t=new Date(f.report.followUp).getTime();if(!Number.isFinite(t))return;
    let k=f.lead.id,tag='followup-'+k,x=t-now;
    if(dismissed(tag))return;
    if(x<=900000&&!db.notified[tag]){
      db.notified[tag]=1;save();alarm();
      let body=x<=0?'اکنون زمان تماس است':x<=60000?'کمتر از یک دقیقه تا تماس':'۱۵ دقیقه تا زمان تماس';
      notify('یادآوری تماس — '+(f.lead.ownerName||f.lead.owner||''),body,tag,tag);
    }
  });
  // یادآوری قرارهای جلسه (۲۴ ساعت قبل) + آلارم ۱۵ دقیقه قبل
  appointments().forEach(a=>{
    let t=new Date(a.followUp).getTime();if(!Number.isFinite(t))return;
    let k=a.lead.id,tag='gharar-'+k,x=t-now;
    if(dismissed(tag))return;
    if(x<=900000&&!db.notified[tag+'-alarm']){db.notified[tag+'-alarm']=1;save();alarm()}
    if(x<=86400000&&!db.notified[tag]){
      db.notified[tag]=1;save();
      let body=x<=0?'اکنون زمان قرار است':x<=3600000?'کمتر از یک ساعت تا قرار مانده':'۲۴ ساعت تا قرار دارید';
      notify('یادآوری قرار — '+(a.lead.ownerName||a.lead.owner||''),body,tag,tag);
    }
  });
}
// خودکار درخواست مجوز اعلان‌ها در بارگذاری برنامه و فعال‌سازی یادآورها
if ('Notification' in window) {
  Notification.requestPermission().then(p => {
    if (p === 'granted') {
      // اگر اجازه داده شد، دکمه مخفی می‌شود و یادآورها فعال می‌شوند
      $('#notifyBtn').classList.add('hidden');
      checkReminders();
      setInterval(checkReminders, 30000);
    } else {
      // در غیر اینصورت کاربر می‌تواند به‌صورت دستی دکمه را بزند
      $('#notifyBtn').classList.remove('hidden');
    }
  });
}
$('#notifyBtn').onclick = () => {
  Notification.requestPermission().then(p => {
    if (p === 'granted') {
      $('#notifyBtn').classList.add('hidden');
      checkReminders();
      setInterval(checkReminders, 30000);
    } else {
      alert('دسترسی نوتیفیکیشن داده نشد.');
    }
  });
};

/* ===== نصب PWA و سرویس‌ورکر ===== */
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e});
function installApp(){if(deferred){deferred.prompt();deferred=null;return}let ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!window.MSStream;alert(ios?'روی آیفون/آیپد: دکمهٔ اشتراک (آیکون مستطیل با فلش بالا) را بزنید و «Add to Home Screen / افزودن به صفحه اصلی» را انتخاب کنید.':'از منوی مرورگر (⋮ یا ⌘) گزینهٔ «Install app / نصب برنامه» یا «Add to Home Screen» را انتخاب کنید.')}
$('#installBtn').onclick=installApp;
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',e=>{
  if(e.data&&e.data.dismiss){let k=e.data.dismiss;if(!db.dismissed.includes(k)){db.dismissed.push(k);save()}}
  if(e.data&&e.data.openWork)go('work');
});

/* ===== شروع ===== */
refresh();
// هر ۶۰ ثانیه: زمان‌های «مانده/گذشته» در‌جا به‌روز می‌شوند
setInterval(()=>{refresh();refreshApptTimes()},60000);
// بازیابی تماس نیمه‌تمام یا هدایت به تماس سررسیدشده
if(db.draft){setTimeout(()=>{go('work');alert('یک تماس نیمه‌تمام دارید. باید ادامه همان لید را تکمیل کنید.')},150)}
else{
  let due=scheduledFollowUps().filter(f=>new Date(f.report.followUp)<=Date.now());
  if(due.length)setTimeout(()=>{db.draft={leadId:due[0].lead.id};localStorage.setItem(KEY,JSON.stringify(db));go('work');alert('تماس سررسیدشده دارید: '+(due[0].lead.ownerName||due[0].lead.owner||'')+'. مستقیماً به همان لید می‌رویم.')},150);
}
