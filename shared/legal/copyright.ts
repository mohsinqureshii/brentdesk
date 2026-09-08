/**
 * Copyright, Licensing & Syndication Policy.
 *
 * Outlines intellectual property ownership, quotation guidelines,
 * commercial republication rules, and infringement reporting for BrentDesk.
 */
import { type LocalizedDocument, section, p, list, note } from "./types";

export const copyrightPolicy: LocalizedDocument = {
  en: {
    title: "Copyright, Licensing & Syndication",
    standfirst:
      "Rules governing the reproduction, citation, syndication, and intellectual property rights of {site}.",
    updated: "2026-09-06",
    sections: [
      section(
        "ownership",
        "Intellectual Property Ownership",
        p(
          "All editorial copy, analysis, research databases, graphic lockups, infographics, metadata structures, and original reporting published on {domain} are the exclusive intellectual property of {legalName}, protected by Saudi copyright laws, international treaties, and the Berne Convention."
        ),
        p(
          "Unauthorised reproduction, redistribution, adaptation, or public display of our reporting without express written permission is strictly prohibited."
        )
      ),

      section(
        "fair-use",
        "Fair Use, Citation & Quotation Guidelines",
        p(
          "We welcome fair-use citations and scholarly or journalistic references under the following strict conditions:"
        ),
        list(
          "Short Excerpts Only — Citations must be limited to brief excerpts (no more than 75 words) reasonably necessary to support commentary, critique, or news reporting.",
          "Mandatory Attribution — Full attribution must be provided, identifying {site} as the original publisher and author.",
          "Direct Hyperlink — Digital republications must include a direct, followable hyperlink to the original canonical URL on {domain}.",
          "No Full Reproduction — Republishing full articles, entire data tables, or significant portions of original reporting without prior licensing is an infringement of copyright."
        )
      ),

      section(
        "syndication",
        "Commercial Licensing & Syndication",
        p(
          "Organisations wishing to syndicate {site} coverage, integrate our industry reporting into intranet platforms, or license content for commercial newsletters or research reports may obtain commercial licensing agreements."
        ),
        p(
          "To inquire about syndication rights, republishing permissions, or corporate subscription licensing, please contact our legal desk at {legalEmail}."
        )
      ),

      section(
        "trademarks",
        "Brand Assets & Wordmark Usage",
        p(
          "The '{site}' name, wordmark, logo, and distinctive visual dress are protected trademarks of {legalName}."
        ),
        list(
          "No Deceptive Use — You may not use our brand assets in any manner likely to cause confusion among readers, imply endorsement, or mislead the public regarding sponsorship.",
          "Media Inquiries — Journalists and conference organizers seeking official logo assets for event coverage should request press kits via {helloEmail}."
        )
      ),

      section(
        "infringement",
        "Notice of Copyright Infringement",
        p(
          "If you believe that any material available on {site} infringes upon your copyright, please notify our designated copyright agent with the following details:"
        ),
        list(
          "Identification of the copyrighted work claimed to have been infringed.",
          "Identification of the specific material on {site} claimed to be infringing, including the full URL.",
          "Your contact information, including name, physical address, telephone number, and email address.",
          "A statement affirming your good-faith belief that the contested use is not authorised by the copyright owner, its agent, or the law.",
          "A statement, under penalty of perjury, that the notification is accurate and that you are authorised to act on behalf of the owner."
        ),
        p(
          "Send all infringement notices directly to our legal department: {legalEmail}."
        )
      )
    ]
  },

  ar: {
    title: "حقوق النشر والتراخيص والنقل",
    standfirst:
      "القواعد الحاكمة للاقتباس، والترخيص التجاري، وحماية الملكية الفكرية لمنصة {site}.",
    updated: "2026-09-06",
    sections: [
      section(
        "ownership",
        "ملكية حقوق الملكية الفكرية",
        p(
          "جميع المقالات التحريرية، والتحليلات، وقواعد البيانات البحثية، والشعارات، والرسوم البيانية، وهياكل البيانات الوصفية المنشورة على {domain} هي ملكية فكرية حصرية لشركة {legalName}، وتخضع للحماية بموجب نظام حماية حقوق المؤلف في المملكة العربية السعودية والاتفاقيات والمعاهدات الدولية ذات الصلة."
        ),
        p(
          "يُحظر تماماً نسخ أو توزيع أو تعديل أو إعادة نشر موادنا الصحفية دون الحصول على إذن خطي مسبق."
        )
      ),

      section(
        "fair-use",
        "قواعد الاستخدام العادل والاقتباس الصحفي",
        p(
          "نرحب بالاقتباسات المشروعة والأكاديمية والصحفية وفقاً للشروط المحددة التالية:"
        ),
        list(
          "الاقتباسات المحدودة فقط — يجب أن تقتصر الاقتباسات على فقرات وجيزة (بما لا يتجاوز 75 كلمة) للغرض التوضيحي أو النقدي أو الإخباري فقط.",
          "الإسناد الصريح — يجب ذكر اسم {site} بوضوح كجهة النشر الأصلية مع ذكر كاتب المادة الصحفية.",
          "الرابط المباشر — يتعين على المنصات الرقمية تضمين رابط إلكتروني مباشر وقابل للتتبع يقود إلى الصفحة الأصلية للمقال على {domain}.",
          "حظر إعادة النشر الكامل — يُعد نشر المقالات كاملة أو تداول جداول البيانات الأرشيفية دون ترخيص كتابي صريح انتهاكاً لحقوق النشر."
        )
      ),

      section(
        "syndication",
        "الترخيص التجاري والشراكات الإعلامية",
        p(
          "يمكن للمؤسسات والشركات الراغبة في إعادة نشر تغطيات {site}، أو إدراج تقاريرنا ضمن شبكاتها الداخلية، أو الحصول على تراخيص تجارية، التنسيق مع إدارة التراخيص."
        ),
        p(
          "للاستفسار عن التراخيص وحقوق التوزيع والنقل التجاري، يُرجى مراسلة الدائرة القانونية عبر {legalEmail}."
        )
      ),

      section(
        "trademarks",
        "العلامات التجارية واستخدام الهوية",
        p(
          "اسم '{site}'، وشعارها اللفظي، ورموزها البصرية هي علامات تجارية محمية تابعة لشركة {legalName}."
        ),
        list(
          "منع التضليل — لا يجوز استخدام العلامة أو الشعار بأي وسيلة قد توحي برعاية أو شراكة غير قائمة أو تثير الالتباس لدى الجمهور.",
          "الاستخدام الإعلامي — لممثلي وسائل الإعلام ومنظمي المؤتمرات الراغبين في الحصول على شعار المنصة، يُرجى التواصل عبر {helloEmail}."
        )
      ),

      section(
        "infringement",
        "الإبلاغ عن انتهاك حقوق النشر",
        p(
          "إذا كنت تعتقد أن هناك محتوى منشوراً على {site} ينتهك حقوق النشر الخاصة بك، يُرجى إرسال إشعار رسمي إلى وكيل حماية حقوق النشر لدينا يتضمن:"
        ),
        list(
          "تحديد المصنف المحمي بحقوق النشر المدعى انتهاكه.",
          "تحديد المادة المنشورة على {site} المدعى مخالفتها مع إرفاق رابط URL كامل ومباشر.",
          "بيانات الاتصال الكاملة: الاسم، العنوان، رقم الهاتف، والبريد الإلكتروني.",
          "إقرار بحسن النية يفيد بأن الاستخدام موضوع الشكوى لم يتم بتفويض من صاحب الحق أو وكيله أو بموجب النظام.",
          "إقرار بصحة البيانات المقدمة وأن مقدم الإشعار مفوض رسمياً بالتصرف نيابة عن صاحب الحق."
        ),
        p(
          "تُرسل جميع الإخطارات القانونية مباشرةً إلى الدائرة القانونية عبر البريد الإلكتروني: {legalEmail}."
        )
      )
    ]
  }
};
