/**
 * Terms of Use.
 *
 * Written for what this site is: a trade publication that also carries
 * user-submitted directory entries, event listings, job postings and
 * applications. Each of those is a different relationship, so each gets
 * its own section rather than being folded into one clause about "user
 * content".
 *
 * Two clauses here are load-bearing for a publisher and are easy to
 * leave out: the reservation of rights against text and data mining
 * (Article 4(3) of the EU DSM Directive requires it to be expressed
 * machine-readably and in the terms), and the statement that editorial
 * reporting is not professional advice.
 */
import { type LocalizedDocument, section, p, list, note } from "./types";

export const termsOfUse: LocalizedDocument = {
  en: {
    title: "Terms of Use",
    standfirst: "The agreement between you and {legalName} when you use {domain}.",
    updated: "2026-09-05",
    sections: [
      section(
        "agreement",
        "This agreement",
        p(
          "{domain} and everything on it is published by {legalName} of {city}. By using the site you accept these terms. If you do not accept them, do not use the site.",
        ),
        p(
          "Where you use the site on behalf of an organisation — posting a job, claiming a company profile, buying advertising — you are telling us you have authority to bind that organisation, and these terms bind it too.",
        ),
        note(
          "Nothing in these terms limits any right you have as a consumer under a law that cannot be contracted out of.",
        ),
      ),

      section(
        "using",
        "Who may use the site",
        p(
          "Reading is open to anyone. An account is for people aged 18 or over, and you may hold one only if you can form a binding contract and are not barred from doing so under any applicable law or sanctions regime.",
        ),
        p(
          "You are responsible for the security of your account and for everything done through it. Choose a password you use nowhere else, and tell us at once if you think somebody else has it.",
        ),
      ),

      section(
        "editorial",
        "What our reporting is, and is not",
        p(
          "{site} reports on contracts, tenders, projects, appointments, policy and the companies behind them. We verify before we publish and we correct when we are wrong — the standards we hold ourselves to are set out in our Editorial Policy, and our Corrections Policy explains how to tell us about a mistake.",
        ),
        p(
          "None of it is professional advice. It is journalism. Do not treat a story, a figure, a contract value or a project timeline as investment advice, legal advice, engineering advice or a substitute for your own due diligence, and do not make a commercial decision on it without checking the primary source yourself.",
        ),
        p(
          "Where we report a company's own claim — a contract value, a capacity figure, a completion date — we are reporting the claim, and we say whose it is. That is not us adopting it as fact.",
        ),
      ),

      section(
        "submissions",
        "What you send us",
        p(
          "You keep ownership of everything you submit — a directory entry, a company or event listing, a job posting, a comment, a letter, a photograph. You are not selling it to us.",
        ),
        p(
          "By submitting it you grant {legalName} a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt for format, publish, distribute and archive it as part of the publication, and to allow others to link to and quote it as the law permits. The licence lasts as long as we publish the material and survives only to the extent needed for our archive and for legal record. It does not let us sell your material on as a standalone product.",
        ),
        list(
          "You promise the material is yours to send, that publishing it will not infringe anybody's rights, and that it is accurate so far as you know.",
          "You promise it is not unlawful, defamatory, misleading, hateful, or an attempt to pass off somebody else's business as your own.",
          "You promise it is not marketing dressed as editorial. Paid placement is available and is labelled as such — that is what our advertising terms are for.",
          "Where the material includes another person's personal data, you promise you may lawfully give it to us for publication.",
        ),
        p(
          "We are not obliged to publish anything, and we may decline, edit for length, house style and accuracy, or remove material at any time. Where we remove something you submitted we will tell you why if you ask.",
        ),
      ),

      section(
        "listings",
        "Directories, events and jobs",
        p(
          "Company and people profiles, event listings and job postings are supplied by the organisations they describe or compiled from public sources. We check what we reasonably can; we do not guarantee that any listing is current, complete or accurate, and a listing is not an endorsement.",
        ),
        p(
          "A job posting is an advertisement placed by an employer. {legalName} is not the employer, is not a party to any employment relationship that follows, and does not screen applicants for the employer or vet the employer for applicants. When you apply, your application and anything attached to it goes to that employer, which then handles it under its own privacy notice.",
        ),
        p(
          "If a listing about you or your organisation is wrong, write to us and we will correct or remove it.",
        ),
      ),

      section(
        "acceptable",
        "What you may not do",
        list(
          "Scrape, crawl or bulk-download the site beyond what robots.txt permits, or use automated means to extract the archive.",
          "Republish our articles in full. You may quote fairly, with attribution and a link — that is how the trade press works. Wholesale reproduction is not fair quotation.",
          "Interfere with the site: probing, penetration testing without written permission, defeating rate limits, or anything designed to degrade it for other readers.",
          "Use the site to send unsolicited marketing, to harvest contact details, or to impersonate anybody.",
          "Circumvent access controls, share account credentials, or use one account for a whole organisation where a licence says otherwise.",
          "Post anything unlawful, or use the site to break a law that applies to you.",
        ),
        p(
          "Good-faith security research is welcome. Tell us at {legalEmail} before you test anything, keep to what you need to demonstrate the issue, and do not access other people's data. We will not pursue research conducted on that basis.",
        ),
      ),

      section(
        "ip",
        "Our rights",
        p(
          "The articles, photographs, graphics, page designs, the compiled directories and the {site} name and marks are owned by {legalName} or licensed to it, and are protected by copyright, database and trade mark law. These terms give you a personal, revocable licence to read the site and to share links to it. They give you nothing else.",
        ),
        p(
          "Licensing for reuse — reprints, internal distribution, syndication, quotation beyond fair dealing — is available. Write to {legalEmail}.",
        ),
      ),

      section(
        "tdm",
        "Text and data mining, and AI training",
        p(
          "{legalName} expressly reserves all rights in the content of this site against text and data mining, and against use for training, fine-tuning, grounding or evaluating machine-learning or generative artificial-intelligence systems. This reservation is made for the purposes of Article 4(3) of Directive (EU) 2019/790 and any equivalent provision elsewhere, and is expressed in machine-readable form in our robots.txt and response headers.",
        ),
        p(
          "No general permission is granted by the site being publicly readable. Licensing enquiries, including for AI training corpora, go to {legalEmail}, and are answered.",
        ),
      ),

      section(
        "advertising",
        "Advertising and sponsored content",
        p(
          "This publication is funded by advertising. Advertisements and sponsored articles are labelled, and advertisers have no influence over the reporting around them. Where a sponsor commissions a feature, it is marked as sponsored and the sponsor is named.",
        ),
        p(
          "An advertisement is the advertiser's statement, not ours. We do not verify advertisers' claims and are not responsible for what they sell, though we will remove advertising that we consider misleading or unlawful.",
        ),
      ),

      section(
        "third-party",
        "Links out",
        p(
          "We link to source documents, company sites, tender portals and regulators. We do not control them, we are not responsible for them, and a link is not an endorsement.",
        ),
      ),

      section(
        "availability",
        "Availability and change",
        p(
          "We aim to keep the site up and current, and we do not promise it. Publishing schedules change, features are added and withdrawn, and maintenance happens. We may change or discontinue any part of the site, and we will give notice where a change materially affects a paid service.",
        ),
      ),

      section(
        "disclaimer",
        "Disclaimers",
        p(
          "The site and its content are provided as they are. To the fullest extent the law allows, {legalName} excludes all warranties, express or implied, including as to accuracy, completeness, fitness for a particular purpose and uninterrupted availability.",
        ),
        p(
          "Nothing in this section excludes liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for anything else that cannot lawfully be excluded.",
        ),
      ),

      section(
        "liability",
        "Limitation of liability",
        p(
          "To the fullest extent the law allows, {legalName} is not liable for indirect or consequential loss, loss of profit, loss of business, loss of contracts, or loss of anticipated savings arising from your use of the site or from reliance on anything published on it.",
        ),
        p(
          "Where liability cannot be excluded, it is limited in aggregate to the greater of the amount you paid us in the twelve months before the claim arose, or one thousand Saudi riyals.",
        ),
      ),

      section(
        "indemnity",
        "Indemnity",
        p(
          "If a third party brings a claim against us because of material you submitted or because you used the site in breach of these terms, you will cover the reasonable costs and damages we incur, provided we tell you about the claim promptly and let you take part in defending it.",
        ),
      ),

      section(
        "termination",
        "Ending it",
        p(
          "You may close your account at any time from your profile. We may suspend or close an account that breaches these terms, and we will tell you why unless a law prevents us. Sections that by their nature should survive — ownership, the reservation against mining, disclaimers, liability, indemnity and governing law — survive.",
        ),
      ),

      section(
        "law",
        "Governing law and disputes",
        p(
          "These terms are governed by the laws of the Kingdom of Saudi Arabia, and the competent courts of the Kingdom have jurisdiction. If you are a consumer resident elsewhere, this does not deprive you of the protection of mandatory consumer law where you live, or of the right to bring proceedings there.",
        ),
        p(
          "Before going to court, please write to {legalEmail}. Most disputes are a misunderstanding about a fact, and most are settled by correcting it.",
        ),
      ),

      section(
        "changes",
        "Changes to these terms",
        p(
          "We update these terms as the site changes. The date at the top of the page is the date of the current version. Where a change materially reduces your rights we will give notice on the site before it takes effect; continuing to use the site after that is acceptance.",
        ),
      ),

      section(
        "contact",
        "Contact",
        p(
          "Legal and licensing: {legalEmail}. Privacy: {privacyEmail}. Editorial corrections: through the Corrections Policy. General: {helloEmail}. By post: {legalName}, {city}.",
        ),
      ),
    ],
  },

  ar: {
    title: "شروط الاستخدام",
    standfirst: "الاتفاق بينك وبين {legalName} عند استخدامك {domain}.",
    updated: "2026-09-05",
    sections: [
      section(
        "agreement",
        "هذا الاتفاق",
        p(
          "يصدر {domain} وكل ما فيه عن {legalName} في {city}. وباستخدامك الموقع فإنك تقبل هذه الشروط. وإن لم تقبلها فلا تستخدم الموقع.",
        ),
        p(
          "وحين تستخدم الموقع نيابة عن منشأة — بنشر وظيفة أو المطالبة بملف شركة أو شراء إعلان — فأنت تقرّ بأن لك صلاحية إلزامها، وتلزمها هذه الشروط كذلك.",
        ),
        note("ولا يحدّ شيء في هذه الشروط من حق مقرَّر لك كمستهلك بموجب نظام لا يجوز الاتفاق على خلافه."),
      ),

      section(
        "using",
        "من يجوز له الاستخدام",
        p(
          "القراءة متاحة للجميع. أما الحساب فلمن أتمّ الثامنة عشرة، ولا يجوز لك امتلاكه إلا إذا كنت أهلاً لإبرام عقد ملزم وغير ممنوع من ذلك بموجب أي نظام أو نظام عقوبات واجب التطبيق.",
        ),
        p(
          "وأنت مسؤول عن أمن حسابك وعن كل ما يُنفَّذ من خلاله. فاختر كلمة مرور لا تستعملها في مكان آخر، وأخبرنا فوراً إن ظننت أن غيرك حصل عليها.",
        ),
      ),

      section(
        "editorial",
        "ما تكونه تغطيتنا وما لا تكونه",
        p(
          "يغطي {site} العقود والمنافسات والمشاريع والتعيينات والسياسات والشركات القائمة عليها. ونتحقّق قبل النشر ونصحّح متى أخطأنا — والمعايير التي نلزم بها أنفسنا مبيّنة في سياستنا التحريرية، وتوضّح سياسة التصحيحات كيف تُبلغنا بخطأ.",
        ),
        p(
          "ولا شيء من ذلك مشورة مهنية؛ إنما هو صحافة. فلا تعدّ قصة أو رقماً أو قيمة عقد أو جدول مشروع مشورةً استثمارية أو قانونية أو هندسية أو بديلاً عن عنايتك الواجبة، ولا تبنِ قراراً تجارياً عليه دون الرجوع إلى المصدر الأصلي بنفسك.",
        ),
        p(
          "وحين ننقل ادعاء شركة عن نفسها — قيمة عقد أو رقم طاقة إنتاجية أو موعد إنجاز — فإننا ننقل الادعاء وننسبه إلى صاحبه. وليس في ذلك تبنٍّ له بوصفه واقعة.",
        ),
      ),

      section(
        "submissions",
        "ما ترسله إلينا",
        p(
          "تبقى ملكية كل ما ترسله لك — إدراج في دليل، أو إعلان شركة أو فعالية، أو إعلان وظيفة، أو تعليق، أو رسالة، أو صورة. فأنت لا تبيعه لنا.",
        ),
        p(
          "وبإرساله تمنح {legalName} ترخيصاً عالمياً غير حصري ومعفى من الأتاوة لاستضافته وتخزينه ونسخه وتكييفه للصيغة ونشره وتوزيعه وأرشفته ضمن الصحيفة، وللسماح للآخرين بالإحالة إليه واقتباسه بما يجيزه النظام. ويستمر الترخيص ما دمنا ننشر المادة، ولا يبقى بعد ذلك إلا بالقدر اللازم للأرشيف وللسجل النظامي. وهو لا يخوّلنا بيع مادتك بوصفها منتجاً مستقلاً.",
        ),
        list(
          "تُقرّ بأن المادة لك حق إرسالها، وأن نشرها لن يخلّ بحقوق أحد، وأنها صحيحة على حدّ علمك.",
          "وتُقرّ بأنها ليست غير مشروعة ولا قاذفة ولا مضلِّلة ولا محرّضة على الكراهية، وليست محاولة لانتحال نشاط غيرك.",
          "وتُقرّ بأنها ليست تسويقاً في ثوب مادة تحريرية. فالإدراج المدفوع متاح ويُعلَّم بوصفه كذلك، ولهذا وُضعت شروطنا الإعلانية.",
          "وحيث تتضمن المادة بيانات شخصية لغيرك، تُقرّ بأن لك أن تمنحنا إياها للنشر مشروعاً.",
        ),
        p(
          "ولسنا ملزمين بنشر شيء، ولنا أن نمتنع أو نحرّر للطول وأسلوب الدار والدقة أو نزيل مادة في أي وقت. وحين نزيل شيئاً أرسلته أخبرناك بالسبب إن سألت.",
        ),
      ),

      section(
        "listings",
        "الأدلة والفعاليات والوظائف",
        p(
          "ملفات الشركات والأشخاص وإعلانات الفعاليات والوظائف تُورَّد من الجهات التي تصفها أو تُجمَع من مصادر عامة. ونتحقق مما يمكن التحقق منه بصورة معقولة؛ ولا نضمن أن أي إدراج محدَّث أو كامل أو دقيق، والإدراج ليس تزكية.",
        ),
        p(
          "وإعلان الوظيفة إعلان يضعه صاحب عمل. و{legalName} ليست صاحب العمل ولا طرفاً في أي علاقة عمل تنشأ بعده، ولا تفرز المتقدّمين لصالح صاحب العمل ولا تدقّق في صاحب العمل لصالح المتقدّمين. وحين تتقدّم يذهب طلبك وما أُرفق به إلى ذلك صاحب العمل، فيعالجه وفق إشعار خصوصيته.",
        ),
        p("وإن كان إدراج يخصّك أو يخصّ منشأتك خاطئاً فراسلنا وسنصحّحه أو نزيله."),
      ),

      section(
        "acceptable",
        "ما لا يجوز لك",
        list(
          "كشط الموقع أو الزحف عليه أو تنزيله بالجملة بما يتجاوز ما يجيزه ملف robots.txt، أو استخراج الأرشيف بوسائل آلية.",
          "إعادة نشر مقالاتنا كاملة. ولك أن تقتبس اقتباساً منصفاً مع النسب والإحالة — فهكذا تعمل الصحافة المتخصصة. أما النسخ بالجملة فليس اقتباساً منصفاً.",
          "التشويش على الموقع: السبر أو اختبار الاختراق دون إذن مكتوب أو تجاوز حدود المعدّل أو كل ما يُقصد به إضعافه على القرّاء الآخرين.",
          "استخدام الموقع لإرسال تسويق غير مطلوب أو لحصاد بيانات التواصل أو لانتحال صفة أحد.",
          "الالتفاف على ضوابط الوصول أو مشاركة بيانات الدخول أو استخدام حساب واحد لمنشأة كاملة حيث يقضي الترخيص بخلاف ذلك.",
          "نشر ما هو غير مشروع، أو استخدام الموقع لمخالفة نظام يسري عليك.",
        ),
        p(
          "والبحث الأمني بحسن نية مرحَّب به. أخبرنا على {legalEmail} قبل أن تختبر شيئاً، واقتصر على ما يلزم لإثبات المشكلة، ولا تصل إلى بيانات الآخرين. ولن نلاحق بحثاً يجري على هذا الأساس.",
        ),
      ),

      section(
        "ip",
        "حقوقنا",
        p(
          "المقالات والصور والرسوم وتصاميم الصفحات والأدلة المجمَّعة واسم {site} وعلاماته مملوكة لـ{legalName} أو مرخَّصة لها، ومحمية بأنظمة حق المؤلف وقواعد البيانات والعلامات التجارية. وتمنحك هذه الشروط ترخيصاً شخصياً قابلاً للإلغاء لقراءة الموقع ومشاركة روابطه. ولا تمنحك سواه.",
        ),
        p(
          "والترخيص لإعادة الاستعمال — الطبعات المستنسخة والتوزيع الداخلي والتوزيع الصحفي والاقتباس بما يتجاوز الاقتباس المنصف — متاح. راسل {legalEmail}.",
        ),
      ),

      section(
        "tdm",
        "التنقيب في النصوص والبيانات وتدريب الذكاء الاصطناعي",
        p(
          "تحتفظ {legalName} صراحةً بجميع الحقوق في محتوى هذا الموقع تجاه التنقيب في النصوص والبيانات، وتجاه الاستخدام في تدريب أنظمة التعلّم الآلي أو الذكاء الاصطناعي التوليدي أو ضبطها أو إسنادها أو تقييمها. ويُبدى هذا التحفظ لأغراض المادة ٤(٣) من التوجيه (الاتحاد الأوروبي) ٢٠١٩/٧٩٠ وأي حكم مماثل في غيره، ويُعبَّر عنه بصيغة مقروءة آلياً في ملف robots.txt وفي ترويسات الاستجابة لدينا.",
        ),
        p(
          "ولا يُستفاد إذن عام من كون الموقع مقروءاً للعموم. وتُرسل طلبات الترخيص، ومنها ما يتعلق بمجاميع تدريب الذكاء الاصطناعي، إلى {legalEmail}، ويُجاب عنها.",
        ),
      ),

      section(
        "advertising",
        "الإعلانات والمحتوى المموّل",
        p(
          "تُموَّل هذه الصحيفة بالإعلان. والإعلانات والمقالات الممولة معلَّمة، وليس للمعلنين أثر في التغطية المحيطة بها. وحين يطلب راعٍ إعداد مادة، تُعلَّم بوصفها ممولة ويُسمّى الراعي.",
        ),
        p(
          "والإعلان قول المعلن لا قولنا. ولا نتحقق من ادعاءات المعلنين ولسنا مسؤولين عمّا يبيعونه، غير أننا نزيل الإعلان الذي نراه مضلِّلاً أو غير مشروع.",
        ),
      ),

      section(
        "third-party",
        "الروابط الخارجة",
        p(
          "نحيل إلى الوثائق المصدرية ومواقع الشركات وبوابات المنافسات والجهات الرقابية. ولا نتحكم فيها ولسنا مسؤولين عنها، والإحالة ليست تزكية.",
        ),
      ),

      section(
        "availability",
        "الإتاحة والتغيير",
        p(
          "نسعى إلى إبقاء الموقع عاملاً ومحدَّثاً، ولا نعد بذلك. فمواعيد النشر تتغير، والخصائص تُضاف وتُسحب، والصيانة تقع. ولنا أن نغيّر أي جزء من الموقع أو نوقفه، ونُشعر حيث يمسّ التغيير خدمة مدفوعة مساساً جوهرياً.",
        ),
      ),

      section(
        "disclaimer",
        "إخلاء المسؤولية",
        p(
          "يُقدَّم الموقع ومحتواه على حالهما. وإلى أقصى حدّ يجيزه النظام، تستبعد {legalName} كل الضمانات، صريحها وضمنيها، بما فيها ما يتعلق بالدقة والاكتمال والملاءمة لغرض بعينه والإتاحة دون انقطاع.",
        ),
        p(
          "ولا يستبعد شيء في هذا البند المسؤولية عن الوفاة أو الإصابة الشخصية الناشئة عن إهمال، ولا عن الغش أو التغرير الاحتيالي، ولا عن أي أمر لا يجوز استبعاده نظاماً.",
        ),
      ),

      section(
        "liability",
        "حدّ المسؤولية",
        p(
          "إلى أقصى حدّ يجيزه النظام، لا تُسأل {legalName} عن الخسارة غير المباشرة أو التبعية، ولا عن فوات الربح أو خسارة النشاط أو فقد العقود أو ضياع وفورات متوقعة، الناشئة عن استخدامك الموقع أو عن التعويل على ما يُنشر فيه.",
        ),
        p(
          "وحيث لا يجوز استبعاد المسؤولية، فإنها تُحدّ إجمالاً بأكبر المبلغين: ما دفعته لنا خلال الاثني عشر شهراً السابقة لنشوء المطالبة، أو ألف ريال سعودي.",
        ),
      ),

      section(
        "indemnity",
        "التعويض",
        p(
          "إن أقام الغير علينا مطالبة بسبب مادة أرسلتها أو بسبب استخدامك الموقع مخالفاً هذه الشروط، فإنك تتحمّل ما نتكبّده من تكاليف وتعويضات معقولة، بشرط أن نخبرك بالمطالبة فوراً ونمكّنك من المشاركة في الدفاع.",
        ),
      ),

      section(
        "termination",
        "الإنهاء",
        p(
          "لك أن تغلق حسابك في أي وقت من ملفك الشخصي. ولنا أن نوقف حساباً يخالف هذه الشروط أو نغلقه، ونخبرك بالسبب ما لم يمنعنا نظام. وتبقى نافذةً البنود التي تقتضي طبيعتها البقاء — الملكية، والتحفظ تجاه التنقيب، وإخلاء المسؤولية، وحدّ المسؤولية، والتعويض، والنظام الواجب التطبيق.",
        ),
      ),

      section(
        "law",
        "النظام الواجب التطبيق وتسوية المنازعات",
        p(
          "تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص محاكمها المختصة بنظر المنازعات. وإن كنت مستهلكاً مقيماً في غيرها فلا يحرمك ذلك من حماية أنظمة المستهلك الآمرة في محل إقامتك ولا من حق التقاضي فيها.",
        ),
        p(
          "وقبل اللجوء إلى القضاء، نرجو مراسلة {legalEmail}. فأكثر المنازعات سوء فهم بشأن واقعة، وأكثرها يُحسم بتصحيحها.",
        ),
      ),

      section(
        "changes",
        "تعديل هذه الشروط",
        p(
          "نحدّث هذه الشروط مع تغيّر الموقع. والتاريخ في أعلى الصفحة هو تاريخ النسخة السارية. وحيث يقلّص التغيير حقوقك تقليصاً جوهرياً نُشعر على الموقع قبل نفاذه، ويُعدّ استمرارك في الاستخدام بعده قبولاً.",
        ),
      ),

      section(
        "contact",
        "التواصل",
        p(
          "الشؤون النظامية والترخيص: {legalEmail}. الخصوصية: {privacyEmail}. التصحيحات التحريرية: عبر سياسة التصحيحات. العام: {helloEmail}. وبالبريد: {legalName}، {city}.",
        ),
      ),
    ],
  },
};
