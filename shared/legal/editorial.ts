/**
 * Editorial Standards, Ethics & Corrections Policy.
 *
 * Articulates the journalistic principles, sourcing rules, AI disclosure,
 * commercial firewall, and formal correction procedure for BrentDesk.
 */
import { type LocalizedDocument, section, p, list, note } from "./types";

export const editorialPolicy: LocalizedDocument = {
  en: {
    title: "Editorial Standards & Corrections Policy",
    standfirst:
      "How {site} reports, verifies facts, attributes sources, uses technology, and corrects mistakes.",
    updated: "2026-09-06",
    sections: [
      section(
        "independence",
        "Editorial Independence & Mission",
        p(
          "{site} is an independent trade publication covering the physical economy — construction, infrastructure, energy, manufacturing, logistics, transportation, mining, utilities, and industrial technology across Saudi Arabia, the GCC, MENA, and connected global markets."
        ),
        p(
          "Our reporting is conducted independently of commercial advertisers, sponsors, and corporate relationships. News decisions are made solely by the editorial desk based on news value, factual significance, and relevance to industry professionals."
        ),
        note(
          "Commercial advertisers and sponsors have no prior review of editorial coverage, no influence on bylined reporting, and no authority to alter or suppress published journalism."
        )
      ),

      section(
        "sourcing",
        "Sourcing, Verification & Attribution",
        p(
          "Accurate reporting is the foundation of {site}. Our reporting adheres to strict standards of factual provenance:"
        ),
        list(
          "Primary Documentation — Wherever feasible, articles are anchored in verified primary records: procurement notices, royal decrees, ministry disclosures, regulatory filings, audited corporate financials, and official stock exchange statements (such as Tadawul, ADX, or DFM).",
          "Attribution of Claims — Every assertion of fact, contract figure, capacity estimate, or event date is directly attributed to its originating agency, company statement, or on-the-record spokesperson.",
          "Direct Quotations — Quotes reflect genuine statements made by named industry executives, officials, or technical specialists. Fabricated quotes or anonymous assertions without editorial corroboration are prohibited.",
          "Transparent Linking — Contextual hyperlinks in our reporting connect readers directly to verified primary source records or corresponding archival intelligence."
        )
      ),

      section(
        "ai-policy",
        "Use of Artificial Intelligence & Technology",
        p(
          "In keeping with our commitment to transparency and truthfulness, {site} enforces a clear protocol regarding artificial intelligence:"
        ),
        list(
          "Human Editorial Accountability — Every published article, analysis, and translated brief is curated, fact-verified, and edited by human journalists. Automated tools assist with data aggregation and translation, but final accountability resides with our editorial staff.",
          "No AI Hallucinations — Automated drafting tools are barred from generating speculative facts, unverified statistics, or synthetic quotations.",
          "Copyright & Scraping Firewalls — While we deploy technology to assist our research, {site} strictly respects source intellectual property and expects reciprocal respect under international copyright frameworks."
        )
      ),

      section(
        "sponsored-content",
        "Commercial Content & Native Advertising",
        p(
          "Readers must always be able to distinguish independent journalism from commercial communications:"
        ),
        list(
          "Explicit Labelling — Any content produced with financial sponsorship, commercial partnership, or advertising support is prominently marked as 'Sponsored', 'Partner Content', or 'Advertisement'.",
          "No Undisclosed Compensation — Editorial staff are prohibited from accepting personal gifts, undisclosed hospitality, or financial compensation in exchange for editorial coverage."
        )
      ),

      section(
        "corrections",
        "Corrections, Clarifications & Right of Reply",
        p(
          "When factual errors occur, we correct them promptly, transparently, and unreservedly:"
        ),
        list(
          "Substantive Corrections — If an error of fact (such as a misstated contract value, incorrect company attribution, or date) is confirmed, the article is updated promptly and an explicit correction note is appended explaining the change.",
          "Minor Typographical Fixes — Minor typographic or orthographic corrections that do not alter factual understanding may be corrected without a formal note.",
          "Right of Reply — Any entity or individual who believes they have been factually misrepresented or subjected to inaccurate reporting is invited to contact the editorial desk for prompt review."
        ),
        p(
          "To request a factual correction or clarify published details, please email {helloEmail} with the subject line 'Correction Request' including the URL and the specific factual discrepancy."
        )
      )
    ]
  },

  ar: {
    title: "المعايير التحريرية وسياسة التصحيح",
    standfirst:
      "كيف تنقل {site} الأخبار، وتتحقق من الوقائع، وتنسب المصادر، وتستخدم التقنية، وتصحح الأخطاء.",
    updated: "2026-09-06",
    sections: [
      section(
        "independence",
        "الاستقلالية التحريرية والرسالة",
        p(
          "{site} منصة إعلامية متخصصة ومستقلة تغطي الاقتصاد الفعلي — الإنشاءات، البنية التحتية، الطاقة، الصناعة، الخدمات اللوجستية، النقل، التعدين، المرافق، والتقنية الصناعية عبر المملكة العربية السعودية، ودول مجلس التعاون الخليجي، ومنطقة الشرق الأوسط وشمال أفريقيا، والأسواق العالمية المرتبطة بها."
        ),
        p(
          "يتم إعداد تقاريرنا الإخبارية باستقلالية تامة عن المعلنين التجاريين والجهات الراعية والعلاقات المؤسسية. تُتخذ القرارات التحريرية حصرياً من قبل هيئة التحرير بناءً على القيمة الإخبارية والأهمية المهنية لصناع القرار."
        ),
        note(
          "لا يملك المعلنون التجاريون والجهات الراعية أي حق للمراجعة المسبقة للمحتوى التحريري، ولا يمارسون أي تأثير على المواد المنشورة أو تعديلها أو حجبها."
        )
      ),

      section(
        "sourcing",
        "المصادر والتحقق والإسناد",
        p(
          "الدقة والنزاهة هما أساس العمل في {site}. تلتزم تقاريرنا بمعايير صارمة للموثوقية والإسناد:"
        ),
        list(
          "الوثائق الأولية — حيثما أمكن، ترتكز مقالاتنا على السجلات الرسمية الموثقة: إعلانات المناقصات، المراسيم، إفصاحات الوزارات، البيانات التنظيمية، القوائم المالية المدققة، وبيانات أسواق المال الرسمية (مثل تداول، سوق أبوظبي، أو سوق دبي).",
          "إسناد الادعاءات — يُنسب كل رقم تعاقدي، أو تقدير طاقة استيعابية، أو موعد إنجاز مشروع، مباشرةً إلى الجهة المصدرة أو البيان المؤسسي أو المتحدث الرسمي.",
          "الاقتباسات المباشرة — تعكس الاقتباسات تصريحات حقيقية وموثقة صادرة عن مسؤولين أو خبراء تقنيين محددين بأسمائهم، ويُحظر تماماً اختلاق التصريحات أو الاعتماد على مصادر مجهولة دون تدقيق.",
          "الروابط الشفافة — تتيح الروابط السياقية داخل المقالات للقارئ الرجوع مباشرةً إلى المصادر الأولية أو الدراسات الأرشيفية المقابلة."
        )
      ),

      section(
        "ai-policy",
        "استخدام الذكاء الاصطناعي والتقنية",
        p(
          "التزاماً بالشفافية والمصداقية، تعتمد {site} بروتوكولاً واضحاً ومحدداً بشأن أدوات الذكاء الاصطناعي:"
        ),
        list(
          "المسؤولية التحريرية البشرية — يخضع كل مقال وتحليل وخبر منشور لمراجعة وتدقيق وتوثيق من قبل صحفيين ومحررين بشريين. تُستخدم الأدوات التقنية للمساعدة في تجميع البيانات والترجمة، بينما تبقى المسؤولية التحريرية النهائية على عاتق فريق التحرير.",
          "منع التوليد غير الموثق — يُحظر استخدام أدوات الذكاء الاصطناعي لتوليد وقائع غير مثبتة أو إحصاءات غير مدعومة أو تصريحات وهمية.",
          "حماية الحقوق الفكرية — تلتزم {site} باحترام حقوق الملكية الفكرية لمصادر البيانات، وتتوقع المعاملة بالمثل بموجب القوانين والاتفاقيات الدولية."
        )
      ),

      section(
        "sponsored-content",
        "المحتوى التجاري والإعلانات المدمجة",
        p(
          "يجب أن يتمكن القراء دائماً من التمييز بين الصحافة المستقلة والتواصل التجاري والترويجي:"
        ),
        list(
          "التمييز الصريح — يتم تمييز أي محتوى تم إنتاجه برعاية تجارية أو شراكة إعلانية بوضوح بصفته 'محتوى برعاية' أو 'إعلان شركاء'.",
          "حظر المكافآت غير المعلنة — يُحظر على الصحفيين والمحررين قبول أي هدايا أو مزايا خاصة أو تعويضات مالية مقابل تغطية تحريرية."
        )
      ),

      section(
        "corrections",
        "التصحيحات وحق الرد",
        p(
          "عند وقوع خطأ في الوقائع، نعمل على تصحيحه فوراً وبشفافية تامة ودون تردد:"
        ),
        list(
          "التصحيحات الجوهرية — إذا تأكد وجود خطأ في حقيقة مادية (مثل قيمة عقد، أو اسم جهة، أو تاريخ إنجاز)، يتم تحديث المقال فوراً مع إضافة تنويه تصحيحي يوضح التعديل للقراء.",
          "التعديلات الإملائية الطفيفة — يجوز تصحيح الأخطاء المطبعية التي لا تؤثر على المعنى والوقائع دون الحاجة لتنويه تصحيحي منفصل.",
          "حق الرد — يحق لأي جهة أو شخص يرى أن اسمه أو بياناته وردت بصورة غير دقيقة التواصل مع هيئة التحرير لإجراء المراجعة اللازمة."
        ),
        p(
          "لطلب تصحيح أو توضيح بشأن أي محتوى منشور، يُرجى مراسلة هيئة التحرير عبر البريد الإلكتروني {helloEmail} بعنوان 'طلب تصحيح' مع إرفاق رابط المقال والبيانات المراد تصحيحها."
        )
      )
    ]
  }
};
