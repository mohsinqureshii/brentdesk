/**
 * Cookie Policy.
 *
 * The table is the document. Everything else is context for it, and it
 * lists what this site actually sets — the session cookie from
 * shared/const.ts, the language cookie from the locale middleware, the
 * edition cookie from the switcher, and the browser-storage keys the
 * client writes. If a cookie is added to the codebase and not to this
 * table, the table is wrong.
 */
import { type LocalizedDocument, section, p, list, note, table } from "./types";

export const cookiePolicy: LocalizedDocument = {
  en: {
    title: "Cookie Policy",
    standfirst:
      "What {site} stores on your device, why, and how to change it.",
    updated: "2026-09-05",
    sections: [
      section(
        "what",
        "What this covers",
        p(
          "This policy explains the cookies and similar technologies {site} uses, what each one does and how long it lasts. It sits alongside our Privacy Policy, which explains what we do with personal data more generally.",
        ),
        p(
          "“Cookies” here means cookies proper and the equivalent browser storage a modern site uses in their place — localStorage and sessionStorage. They do the same job and we treat them the same way.",
        ),
        note(
          "You can change your choices at any time from the “Cookie preferences” link in the footer. Nothing but the strictly necessary category is set before you choose.",
        ),
      ),
      section(
        "categories",
        "The three categories",
        list(
          "Strictly necessary — the site does not work without them. They keep you signed in, remember which language and regional edition you asked for, protect forms against cross-site request forgery, and record your cookie choice itself. These are set on the basis of our legitimate interest in delivering a site you asked for, and cannot be switched off.",
          "Analytics — measurement of how the site is used in aggregate: which stories are read, which pages error, how long a page takes to load. Off until you turn it on.",
          "Advertising — cookies set by our advertising partners to limit how often you see the same advertisement and to measure whether a campaign worked. Off until you turn it on.",
        ),
      ),
      section(
        "inventory",
        "What we set",
        table(
          ["Name", "Type", "Category", "Purpose", "Lifetime"],
          [
            [
              "app_session_id",
              "Cookie",
              "Strictly necessary",
              "Keeps you signed in to your account. HttpOnly, so it cannot be read by scripts.",
              "30 days",
            ],
            [
              "bdLang",
              "Cookie",
              "Strictly necessary",
              "The language you chose — English or Arabic — so a bare URL opens in it next time.",
              "1 year",
            ],
            [
              "tsEdition",
              "Cookie",
              "Strictly necessary",
              "The regional edition you chose, so listings default to the right market.",
              "1 year",
            ],
            [
              "ts_cookie_consent",
              "localStorage",
              "Strictly necessary",
              "Your answer to this banner. Without it we would have to ask on every page.",
              "Until cleared",
            ],
            [
              "theme",
              "localStorage",
              "Strictly necessary",
              "Light or dark, if you have set one.",
              "Until cleared",
            ],
            [
              "ts_recent_searches",
              "localStorage",
              "Strictly necessary",
              "Your recent searches, shown back to you in the search panel. Stored on your device only; it is never sent to us.",
              "Until cleared",
            ],
            [
              "ts_ad_session",
              "sessionStorage",
              "Advertising",
              "A random identifier for this browser tab, used to cap how often one advertisement is shown. Discarded when the tab closes.",
              "Session",
            ],
            [
              "Google AdSense / DoubleClick",
              "Third-party cookies",
              "Advertising",
              "Set by Google to select and measure advertisements. Only loaded once advertising is enabled on the site and you have consented.",
              "Set by Google",
            ],
          ],
        ),
        p(
          "Where a feature is not switched on for a given visitor — advertising, for example, before we begin serving it — the cookies in its row are not set at all.",
        ),
      ),
      section(
        "third-parties",
        "Third parties",
        p(
          "Advertising and video embeds are the only places a third party can set a cookie through {site}. Where we serve advertising through Google, Google acts as an independent controller for the data it collects; its practices are described in Google's own privacy and advertising notices, and you can adjust what Google shows you through Google's Ad Settings.",
        ),
        p(
          "We do not sell your personal information, and we do not share it with advertisers for their own marketing.",
        ),
      ),
      section(
        "managing",
        "Changing your mind",
        list(
          "On this site — open “Cookie preferences” in the footer. Your choice applies immediately and is remembered on this browser.",
          "In your browser — every major browser can block or delete cookies for a site, and offers a private window that discards them on close. Blocking the strictly necessary ones will sign you out and lose your language choice, but the site will still work.",
          "Global Privacy Control — where your browser or extension sends a GPC signal, we treat it as an instruction to switch analytics and advertising cookies off.",
        ),
      ),
      section(
        "changes",
        "Changes to this policy",
        p(
          "If we add a cookie, this table changes with it, and the date at the top of this page moves. Material changes are announced on the site before they take effect.",
        ),
      ),
      section(
        "contact",
        "Contact",
        p(
          "Questions about anything on this page go to {privacyEmail}, or by post to {legalName}, {city}.",
        ),
      ),
    ],
  },

  ar: {
    title: "سياسة ملفات الارتباط",
    standfirst: "ما الذي يخزّنه {site} على جهازك، ولماذا، وكيف تغيّره.",
    updated: "2026-09-05",
    sections: [
      section(
        "what",
        "نطاق هذه السياسة",
        p(
          "توضّح هذه السياسة ملفات الارتباط والتقنيات المشابهة التي يستخدمها {site}، ووظيفة كل منها ومدة بقائه. وهي مكمّلة لسياسة الخصوصية التي تشرح كيفية تعاملنا مع البيانات الشخصية بوجه عام.",
        ),
        p(
          "ونعني بـ«ملفات الارتباط» هنا الملفات نفسها وما يقوم مقامها من مساحات تخزين في المتصفح — localStorage و sessionStorage — إذ تؤدي الوظيفة ذاتها ونعاملها المعاملة ذاتها.",
        ),
        note(
          "يمكنك تغيير اختيارك في أي وقت من رابط «تفضيلات ملفات الارتباط» في تذييل الصفحة. ولا يُضبط شيء قبل اختيارك سوى الفئة الضرورية.",
        ),
      ),
      section(
        "categories",
        "الفئات الثلاث",
        list(
          "ضرورية — لا يعمل الموقع بدونها. تُبقيك مسجّل الدخول، وتتذكّر اللغة والنسخة الإقليمية اللتين اخترتهما، وتحمي النماذج من تزوير الطلبات عبر المواقع، وتحفظ اختيارك بشأن ملفات الارتباط نفسه. تُضبط استناداً إلى مصلحتنا المشروعة في تقديم الموقع الذي طلبته، ولا يمكن إيقافها.",
          "تحليلية — قياس إجمالي لكيفية استخدام الموقع: أي القصص تُقرأ، وأي الصفحات يقع فيها خطأ، وكم تستغرق الصفحة في التحميل. معطّلة حتى تُفعّلها.",
          "إعلانية — ملفات يضبطها شركاؤنا الإعلانيون للحدّ من تكرار عرض الإعلان نفسه ولقياس أثر الحملة. معطّلة حتى تُفعّلها.",
        ),
      ),
      section(
        "inventory",
        "ما الذي نضبطه",
        table(
          ["الاسم", "النوع", "الفئة", "الغرض", "المدة"],
          [
            [
              "app_session_id",
              "ملف ارتباط",
              "ضروري",
              "يُبقيك مسجّل الدخول إلى حسابك. من نوع HttpOnly، فلا تستطيع النصوص البرمجية قراءته.",
              "٣٠ يوماً",
            ],
            [
              "bdLang",
              "ملف ارتباط",
              "ضروري",
              "اللغة التي اخترتها — الإنجليزية أو العربية — ليُفتح الرابط المجرّد بها في المرة القادمة.",
              "سنة",
            ],
            [
              "tsEdition",
              "ملف ارتباط",
              "ضروري",
              "النسخة الإقليمية التي اخترتها، لتظهر القوائم افتراضياً بحسب السوق الصحيح.",
              "سنة",
            ],
            [
              "ts_cookie_consent",
              "localStorage",
              "ضروري",
              "إجابتك على هذا الإشعار. لولاه لاضطررنا إلى سؤالك في كل صفحة.",
              "حتى تمسحه",
            ],
            [
              "theme",
              "localStorage",
              "ضروري",
              "المظهر الفاتح أو الداكن، إن كنت قد اخترت أحدهما.",
              "حتى تمسحه",
            ],
            [
              "ts_recent_searches",
              "localStorage",
              "ضروري",
              "عمليات بحثك الأخيرة، تُعرض عليك في لوحة البحث. تُخزَّن على جهازك وحده ولا تصلنا أبداً.",
              "حتى تمسحه",
            ],
            [
              "ts_ad_session",
              "sessionStorage",
              "إعلاني",
              "معرّف عشوائي لهذه اللسان في المتصفح، يُستخدم للحدّ من تكرار الإعلان الواحد. يُمحى عند إغلاق اللسان.",
              "الجلسة",
            ],
            [
              "Google AdSense / DoubleClick",
              "ملفات طرف ثالث",
              "إعلاني",
              "تضبطها Google لاختيار الإعلانات وقياسها. لا تُحمّل إلا بعد تفعيل الإعلانات على الموقع وموافقتك.",
              "تحدّدها Google",
            ],
          ],
        ),
        p(
          "وحين لا تكون خاصية ما مفعّلة لزائر بعينه — كالإعلانات قبل أن نبدأ عرضها — فإن ملفات الصف الخاص بها لا تُضبط أصلاً.",
        ),
      ),
      section(
        "third-parties",
        "الأطراف الأخرى",
        p(
          "الإعلانات ومقاطع الفيديو المضمّنة هي المواضع الوحيدة التي يمكن فيها لطرف ثالث أن يضبط ملف ارتباط عبر {site}. وحين نعرض الإعلانات من خلال Google فإنها تتصرف بوصفها مراقباً مستقلاً للبيانات التي تجمعها، ووفق ما توضّحه إشعاراتها الخاصة بالخصوصية والإعلان، ويمكنك ضبط ما تعرضه عليك عبر إعدادات الإعلانات لدى Google.",
        ),
        p("نحن لا نبيع بياناتك الشخصية، ولا نشاركها مع المعلنين لأغراض تسويقهم الخاصة."),
      ),
      section(
        "managing",
        "إن غيّرت رأيك",
        list(
          "من الموقع — افتح «تفضيلات ملفات الارتباط» في التذييل. يسري اختيارك فوراً ويُحفظ على هذا المتصفح.",
          "من المتصفح — يتيح كل متصفح رئيسي حجب ملفات الارتباط أو حذفها لموقع بعينه، ويوفّر نافذة خاصة تمحوها عند الإغلاق. وحجب الملفات الضرورية سيُخرجك من حسابك ويُفقدك اختيار اللغة، لكن الموقع سيظل يعمل.",
          "إشارة التحكم العام بالخصوصية — حين يرسل متصفحك أو إضافته إشارة GPC، نعدّها تعليماً بإيقاف ملفات التحليلات والإعلانات.",
        ),
      ),
      section(
        "changes",
        "تعديل هذه السياسة",
        p(
          "إن أضفنا ملف ارتباط جديداً تغيّر هذا الجدول معه، وتحرّك التاريخ في أعلى الصفحة. ويُعلَن عن التغييرات الجوهرية على الموقع قبل نفاذها.",
        ),
      ),
      section(
        "contact",
        "التواصل",
        p("أي سؤال عمّا ورد في هذه الصفحة يُرسل إلى {privacyEmail}، أو بالبريد إلى {legalName}، {city}."),
      ),
    ],
  },
};
