/**
 * Project Data, Financial & General Legal Disclaimer.
 *
 * Provides legal disclaimers regarding market data, contract figures,
 * forward-looking project timelines, and absence of investment advice.
 */
import { type LocalizedDocument, section, p, list, note } from "./types";

export const legalDisclaimer: LocalizedDocument = {
  en: {
    title: "Market Data & Legal Disclaimer",
    standfirst:
      "Important disclaimers regarding industrial market data, procurement estimations, forward-looking statements, and regulatory compliance.",
    updated: "2026-09-06",
    sections: [
      section(
        "no-advice",
        "Informational Purpose Only — No Investment Advice",
        p(
          "The content published by {site} on {domain} is prepared solely for general industry intelligence, trade reporting, and journalistic purposes. Nothing published on this website constitutes financial, investment, securities, legal, tax, or professional engineering advice."
        ),
        note(
          "Readers and market participants must perform their own independent technical and commercial due diligence before entering into contracts, capital investments, or commercial transactions."
        )
      ),

      section(
        "project-data",
        "Contract Figures, Tenders & Forward-Looking Estimates",
        p(
          "Our coverage frequently involves large-scale engineering, procurement, and construction (EPC) projects, infrastructure concessions, and industrial development rounds:"
        ),
        list(
          "Valuations & Financial Figures — Project valuations, contract awards, and financing sizes reported on {site} reflect figures disclosed in official procurement bulletins, company announcements, or regulatory filings at the time of publication.",
          "Timelines & Target Dates — Target commissioning dates, commercial operational deadlines, and development horizons are forward-looking statements subject to economic conditions, supply chain dynamics, and regulatory approvals.",
          "Dynamic Status — Industrial projects evolve rapidly. While {site} endeavors to keep intelligence current, historical archives reflect facts as verified on their publication date."
        )
      ),

      section(
        "third-party",
        "Third-Party Sources, Directory Listings & External Links",
        p(
          "{site} provides verified links to government registries, corporate websites, and industry standards bodies for reader convenience:"
        ),
        list(
          "External Websites — We do not control, endorse, or assume responsibility for the accuracy or policies of third-party websites linked within our copy.",
          "Directory Information — Company directory listings and executive profiles are compiled from public records and company disclosures. Entities are encouraged to notify our editorial team of operational changes."
        )
      ),

      section(
        "limitation",
        "Limitation of Liability",
        p(
          "To the fullest extent permissible under applicable law, {legalName}, its editors, correspondents, and affiliates shall not be liable for any direct, indirect, incidental, or consequential damages resulting from reliance on the news, project intelligence, or data published on this platform."
        )
      )
    ]
  },

  ar: {
    title: "إخلاء المسؤولية وبيانات السوق",
    standfirst:
      "تنويهات قانونية هامة بشأن بيانات الأسواق الصناعية، وتقديرات المناقصات، والتصريحات التقديرية، والمطابقة النظامية.",
    updated: "2026-09-06",
    sections: [
      section(
        "no-advice",
        "لأغراض إعلامية فقط — لا يُعد استشارة استثمارية",
        p(
          "المحتوى المنشور في {site} عبر {domain} مُعد حصرياً لأغراض إعلامية وصحفية وتغطية متخصصة لقطاعات الأعمال. لا يشكل أي محتوى منشور على هذا الموقع استشارة مالية أو استثمارية أو قانونية أو ضريبية أو هندسية."
        ),
        note(
          "يتعين على القراء والشركات إجراء الفحص النافي للجهالة والتقييم التجاري المستقل قبل الدخول في أي التزامات تعاقدية أو استثمارات رأسمالية أو صفقات تجارية."
        )
      ),

      section(
        "project-data",
        "قيم العقود والمناقصات والتوقعات المستقبلية للمشاريع",
        p(
          "تتضمن تغطيتنا الصحفية مشاريع هندسية وتوريدات وإنشاءات (EPC) ضخمة، وعقود امتياز للبنية التحتية، ومبادرات للتطوير الصناعي:"
        ),
        list(
          "التقييمات والقيم المالية — تعكس قيم المشاريع، وعقود الترسية، وحجم التمويل المنشور في {site} الأرقام المعلنة في نشرات المناقصات الرسمية، أو الإفصاحات المؤسسية، أو التقارير التنظيمية وقت النشر.",
          "المواعيد الزمنية والتشغيلية — تُعد المواعيد المستهدفة للتشغيل التجاري، وجداول الإنجاز الزمني، تصريحات تقديرية خاضعة لظروف السوق وسلاسل الإمداد والموافقات التنظيمية.",
          "تحديث البيانات — تشهد المشاريع الصناعية تطورات متسارعة. وفي حين تحرص {site} على الدقة، فإن المواد الأرشيفية تعكس الوقائع كما تم توثيقها في تاريخ نشرها."
        )
      ),

      section(
        "third-party",
        "المصادر الخارجية وقوائم الأدلة والروابط",
        p(
          "توفر {site} روابط موثوقة إلى منصات رسمية ومواقع شركات ومؤسسات مهنية لتيسير اطلاع القراء:"
        ),
        list(
          "المواقع الخارجية — لا تخضع المواقع الخارجية لسيطرتنا ولا نتحمل أي مسؤولية عن محتواها أو سياسات الخصوصية الخاصة بها.",
          "بيانات دليل الشركات — تُجمع بيانات دليل الشركات وملفات القيادات من السجلات العامة والإفصاحات الرسمية، ونرحب بتواصل الشركات لتحديث بياناتها."
        )
      ),

      section(
        "limitation",
        "حدود المسؤولية",
        p(
          "إلى أقصى حد يجيزه النظام المعمول به، لا تتحمل شركة {legalName} أو محرروها أو مراسلوها أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة تنشأ عن الاعتماد على الأخبار أو بيانات المشاريع المنشورة على هذه المنصة."
        )
      )
    ]
  }
};
