/**
 * Privacy Policy.
 *
 * Written against what this codebase actually does. Every category in
 * "What we collect" maps to a table in the schema or a request the
 * server makes: accounts, newsletter subscriptions, submissions, job
 * applications, bookmarks and reading history, search, advertising
 * measurement, and server logs. Nothing is listed that the product does
 * not do, and nothing the product does is left out.
 *
 * The rights section is written three times over — once generally, then
 * for Saudi Arabia's PDPL, the EU/UK GDPR and California — because those
 * regimes give different rights and a single merged list would overstate
 * some and understate others.
 */
import { type LocalizedDocument, section, p, list, note, table } from "./types";

export const privacyPolicy: LocalizedDocument = {
  en: {
    title: "Privacy Policy",
    standfirst:
      "What {site} collects, why, who sees it, and what you can tell us to do about it.",
    updated: "2026-09-05",
    sections: [
      section(
        "who",
        "Who we are",
        p(
          "{site} is a trade publication covering the physical economy — construction, infrastructure, energy, manufacturing, logistics, transportation, mining, utilities and industrial technology — across Saudi Arabia, the GCC, MENA and the markets connected to them. It is published by {legalName}, based in {city}.",
        ),
        p(
          "{legalName} is the controller of the personal data described here. That means we decide what is collected and why, and we are the party you hold to account for it.",
        ),
        p(
          "This policy covers {domain} and the services on it: reading, newsletters, accounts, the company and people directories, events, and job listings and applications. It does not cover sites we link to, which have their own policies.",
        ),
        note(
          "The short version: you can read this publication without an account and without telling us anything about yourself. Everything below describes what happens when you choose to do more than read.",
        ),
      ),

      section(
        "collect",
        "What we collect",
        p("We collect four kinds of data, and we collect the fourth from everyone."),
        list(
          "Data you give us to set something up — your name, email address and password when you create an account; your email address and chosen lists when you subscribe to a newsletter; the profile details you add, including a photograph if you upload one.",
          "Data you give us to be published or considered — companies, people, events and job listings you submit to our directories; a job application, its covering note and any CV or portfolio link attached to it; a correction request, a tip or a message sent through the contact form. Where you send us someone else's details, you are telling us you have the standing to do that.",
          "Data about what you do here while signed in — the stories you bookmark, the reading history we keep so we can show you where you left off, the newsletters you open where your mail client reports it, and the searches you run. Recent searches are stored in your own browser and are never sent to us.",
          "Data your browser sends to any website — IP address, user-agent string, the page you asked for, the page you came from, and the time. It is in our server logs because it is how the web works; we use it to serve the page, to keep the site up and to defend it against abuse.",
        ),
        p(
          "We do not ask for and do not want special-category data — health, religion, political opinion, biometrics, criminal records. Do not send it to us. If it arrives in a submission or an application we will remove it.",
        ),
        p(
          "We do not collect payment card details. Where a payment is taken it is taken by a payment processor on its own systems, and we receive only the result and the last four digits.",
        ),
      ),

      section(
        "use",
        "What we use it for",
        table(
          ["Purpose", "What it uses"],
          [
            [
              "Publishing the site to you",
              "Server logs, your language and edition choices, your session if you are signed in.",
            ],
            [
              "Your account",
              "Name, email, password hash, role, and the settings you save.",
            ],
            [
              "Newsletters",
              "Email address, the lists you chose, the record of your consent, and delivery and open results from our email provider.",
            ],
            [
              "Directories and listings",
              "The company, person, event or job details you submitted, so they can be reviewed and published.",
            ],
            [
              "Job applications",
              "Your application and CV, passed to the employer whose role you applied for.",
            ],
            [
              "Making the publication better",
              "Aggregate reading figures, error reports and page timings. Only with your analytics consent.",
            ],
            [
              "Advertising",
              "Frequency capping and campaign measurement. Only with your advertising consent, and only where advertising is enabled.",
            ],
            [
              "Security and abuse",
              "Server logs, sign-in attempts, and rate-limit counters.",
            ],
            [
              "Legal obligations",
              "Whatever a law, a regulator or a valid court order requires us to keep or produce.",
            ],
          ],
        ),
        p(
          "We do not use your personal data to make automated decisions that have a legal or similarly significant effect on you. Where the site ranks or recommends stories, it does so from what has been read on the site generally, not from a profile of you.",
        ),
        p(
          "We do not use reader data, submissions or applications to train third-party artificial intelligence models, and we do not sell it to anyone who would.",
        ),
      ),

      section(
        "bases",
        "Our legal grounds",
        p(
          "Where the law requires us to name a basis for processing — the GDPR does, and Saudi Arabia's Personal Data Protection Law works to the same shape — these are ours.",
        ),
        list(
          "Performance of a contract — running your account, delivering a newsletter you asked for, passing on a job application you made.",
          "Consent — analytics and advertising cookies, and marketing email. Given by an affirmative act, recorded, and withdrawable at any time without penalty. Withdrawal does not undo what was lawful before it.",
          "Legitimate interests — keeping the site up and secure, defending against fraud and abuse, understanding in aggregate which coverage is read, and contacting a business about a listing it submitted. We have weighed each against your interests and will share that reasoning on request.",
          "Legal obligation — retention, tax, and responses to lawful requests.",
        ),
      ),

      section(
        "cookies",
        "Cookies and browser storage",
        p(
          "Only strictly necessary cookies are set before you choose. Analytics and advertising are off until you switch them on, and you can change your mind at any time from “Cookie preferences” in the footer. Our Cookie Policy lists every cookie by name, purpose and lifetime.",
        ),
        p(
          "Where your browser sends a Global Privacy Control signal we treat it as a withdrawal of consent for analytics and advertising.",
        ),
      ),

      section(
        "advertising",
        "Advertising",
        p(
          "This publication is funded by advertising. Advertising is labelled, and editorial decisions are made independently of it — the standards that govern that are set out in our Editorial Policy.",
        ),
        p(
          "Where advertising is served programmatically through Google, Google receives the technical data any ad request carries — your IP address, your browser and the page you are on — and acts as an independent controller for it under its own terms. Google may use cookies to cap frequency and measure campaigns, and only with your advertising consent. You can control what Google shows you through Google's own advertising settings.",
        ),
        p(
          "Sponsored content and advertiser-supplied creative never receive reader data from us. We do not sell personal information and we do not share it for cross-context behavioural advertising as those terms are defined in California law.",
        ),
      ),

      section(
        "sharing",
        "Who else sees it",
        p("We share personal data only in these cases, and only what the case needs."),
        list(
          "Service providers acting on our instructions — hosting, database, email delivery, error monitoring and analytics. They process on our behalf under contract, may not use the data for their own purposes, and are held to confidentiality and security terms.",
          "Employers, when you apply for a job — your application goes to the organisation that posted the role. That organisation becomes a controller of it in its own right, and its privacy notice governs what it does next.",
          "The public, when you ask us to publish — a directory entry, a company or event listing, an author profile, or a letter you send for publication.",
          "Authorities and advisers — where a law, a regulator or a valid court order requires it, or to establish or defend a legal claim. We tell you when we are permitted to.",
          "A successor — if the publication is sold or merged, under the same protections as this policy.",
        ),
        p("We do not sell personal data, and we never have."),
      ),

      section(
        "transfers",
        "Where it goes",
        p(
          "{site} is published from {city} and read across the world, and some of our providers operate outside the Kingdom. Where personal data leaves Saudi Arabia, the transfer is made on the grounds the Personal Data Protection Law allows — an adequacy decision, appropriate safeguards in the contract, or your explicit consent — and, where the data concerns readers in the EEA or the UK, on Standard Contractual Clauses or the UK Addendum with a transfer assessment behind them.",
        ),
        p("You can ask us which providers hold data in which countries, and we will tell you."),
      ),

      section(
        "retention",
        "How long we keep it",
        table(
          ["Data", "Kept for"],
          [
            ["Account", "While the account is open, then 90 days, then deleted."],
            [
              "Newsletter subscription",
              "Until you unsubscribe. The record that you unsubscribed is kept, so we do not email you again.",
            ],
            ["Job applications", "12 months from the application, unless the employer's own retention applies."],
            ["Submissions to the directories", "Published entries: while published. Rejected: 6 months."],
            ["Bookmarks and reading history", "While the account is open. Clearable by you at any time."],
            ["Server logs", "90 days, then deleted."],
            ["Advertising measurement", "13 months, aggregated after 90 days."],
            ["Consent records", "3 years from the choice, because we have to be able to show it was given."],
          ],
        ),
        p(
          "Where a law requires longer, the law wins, and we keep only what it requires.",
        ),
      ),

      section(
        "security",
        "Keeping it safe",
        p(
          "Traffic is encrypted in transit. Passwords are stored only as salted hashes and cannot be read back, by us or by anyone who obtained the database. Access to production data is limited to the people who need it to do their job, and administrative actions are logged.",
        ),
        p(
          "No system is perfectly secure, and any publication that tells you otherwise is selling something. If a breach occurs that is likely to harm you, we will tell you and the relevant authority within the time the law allows.",
        ),
      ),

      section(
        "rights",
        "Your rights",
        p(
          "Wherever you are, you can ask us to show you what we hold, correct it, delete it, or stop a particular use of it. Write to {privacyEmail}. We answer within 30 days; if a request is complex we will say so and why before that runs out. There is no charge unless a request is repetitive or excessive, and we will say so before doing any work.",
        ),
        p(
          "We may need to verify who you are before acting — usually by confirming control of the email address on the account. That check exists to stop somebody else exercising your rights against you.",
        ),
        p("Some regimes add to that list."),
        list(
          "Saudi Arabia (PDPL) — the right to be informed, to access your data, to obtain a copy in a readable format, to have it corrected or completed, and to have it destroyed when it is no longer needed for the purpose it was collected for. Where processing rests on consent, you may withdraw it. Complaints go to the competent supervisory authority in the Kingdom.",
          "EEA and United Kingdom (GDPR / UK GDPR) — access, rectification, erasure, restriction, portability, and objection to processing based on legitimate interests. An objection to direct marketing is absolute and we will act on it immediately. You may complain to your national data protection authority, or to the ICO in the United Kingdom.",
          "California (CCPA/CPRA) — the right to know what is collected and why, to delete it, to correct it, to limit the use of sensitive information, and not to be discriminated against for exercising any of them. We do not sell or share personal information as those terms are defined, so there is nothing to opt out of, but the request will be honoured as a withdrawal of advertising consent.",
        ),
      ),

      section(
        "children",
        "Children",
        p(
          "This is a trade publication for people working in industry. It is not directed at children, and accounts are for people aged 18 or over. We do not knowingly collect data from a child; if we learn that we have, we delete it. A parent or guardian who believes we hold a child's data should write to {privacyEmail} and we will act on it.",
        ),
      ),

      section(
        "links",
        "Other people's sites",
        p(
          "We link to company sites, tender portals, regulators and filings, because a trade report that does not show its sources is not worth much. Those sites are not ours and this policy does not reach them. Read theirs.",
        ),
      ),

      section(
        "changes",
        "Changes to this policy",
        p(
          "When this policy changes, the date at the top of the page changes with it. Where a change materially affects what we do with data we already hold, we will say so on the site before it takes effect, and where the law requires it we will ask again rather than assume.",
        ),
      ),

      section(
        "contact",
        "Contact and complaints",
        p(
          "Privacy questions, requests and complaints go to {privacyEmail}, or by post to {legalName}, {city}. Editorial corrections have their own route — see the Corrections Policy — and are handled by the desk, not by this mailbox.",
        ),
        p(
          "If we have not resolved something to your satisfaction, you have the right to take it to the data protection authority in your country. We would rather you came to us first, but that right does not depend on it.",
        ),
      ),
    ],
  },

  ar: {
    title: "سياسة الخصوصية",
    standfirst: "ما الذي يجمعه {site}، ولماذا، ومن يطّلع عليه، وما الذي يمكنك أن تطلب منّا فعله بشأنه.",
    updated: "2026-09-05",
    sections: [
      section(
        "who",
        "من نحن",
        p(
          "{site} صحيفة متخصصة تغطي الاقتصاد المادي — الإنشاءات والبنية التحتية والطاقة والصناعة والخدمات اللوجستية والنقل والتعدين والمرافق والتقنية الصناعية — في السعودية ودول الخليج ومنطقة الشرق الأوسط وشمال أفريقيا والأسواق المتصلة بها. وتصدر عن {legalName} ومقرها {city}.",
        ),
        p(
          "و{legalName} هي الجهة المتحكمة في البيانات الشخصية الموصوفة هنا، أي أنها من يقرّر ما يُجمع ولماذا، وهي الجهة التي تُساءل عن ذلك.",
        ),
        p(
          "تشمل هذه السياسة {domain} والخدمات القائمة عليه: القراءة والنشرات البريدية والحسابات وأدلة الشركات والأشخاص والفعاليات وإعلانات الوظائف والتقدّم إليها. ولا تشمل المواقع التي نحيل إليها، ولكلٍّ منها سياسته.",
        ),
        note(
          "الخلاصة: يمكنك قراءة هذه الصحيفة دون حساب ودون أن تخبرنا شيئاً عن نفسك. وكل ما يلي يصف ما يحدث حين تختار أن تفعل أكثر من القراءة.",
        ),
      ),

      section(
        "collect",
        "ما الذي نجمعه",
        p("نجمع أربعة أنواع من البيانات، والرابع نجمعه من الجميع."),
        list(
          "بيانات تمنحنا إياها لتفعيل شيء ما — اسمك وبريدك الإلكتروني وكلمة المرور عند إنشاء حساب؛ وبريدك والقوائم التي تختارها عند الاشتراك في نشرة؛ وتفاصيل الملف الشخصي التي تضيفها، وصورتك إن رفعتها.",
          "بيانات تمنحنا إياها لتُنشر أو لتُدرس — الشركات والأشخاص والفعاليات وإعلانات الوظائف التي ترسلها إلى أدلّتنا؛ وطلب التوظيف وخطابه وأي سيرة ذاتية أو رابط أعمال مرفق به؛ وطلب التصحيح أو البلاغ أو الرسالة عبر نموذج التواصل. وحين ترسل إلينا بيانات شخص آخر فأنت تقرّ بأن لك صفة في ذلك.",
          "بيانات عمّا تفعله هنا وأنت مسجّل الدخول — القصص التي تحفظها، وسجلّ القراءة الذي نحتفظ به لنعيدك إلى حيث توقفت، والنشرات التي تفتحها متى أبلغ برنامج بريدك بذلك، وعمليات البحث التي تجريها. أما عمليات البحث الأخيرة فتُخزَّن في متصفحك ولا تصلنا أبداً.",
          "بيانات يرسلها متصفحك إلى أي موقع — عنوان IP، ومعرّف المتصفح، والصفحة التي طلبتها، والصفحة التي جئت منها، والوقت. وهي في سجلات خادمنا لأن هذه هي طريقة عمل الويب، ونستعملها لتقديم الصفحة وإبقاء الموقع عاملاً والدفاع عنه ضد إساءة الاستخدام.",
        ),
        p(
          "لا نطلب البيانات ذات الطابع الحساس ولا نرغب فيها — الصحة أو الدين أو الرأي السياسي أو السمات الحيوية أو السجل الجنائي. فلا ترسلها إلينا. وإن وردت ضمن طلب أو تقديم حذفناها.",
        ),
        p(
          "ولا نجمع بيانات بطاقات الدفع. وحين يُستوفى مبلغ فإن مزوّد الدفع يستوفيه على أنظمته، ولا يصلنا سوى النتيجة وآخر أربعة أرقام.",
        ),
      ),

      section(
        "use",
        "فيمَ نستعملها",
        table(
          ["الغرض", "ما يستعمله"],
          [
            ["تقديم الموقع لك", "سجلات الخادم، واختياراتك للغة والنسخة، وجلستك إن كنت مسجّل الدخول."],
            ["حسابك", "الاسم والبريد وبصمة كلمة المرور والدور والإعدادات التي تحفظها."],
            [
              "النشرات البريدية",
              "البريد الإلكتروني، والقوائم التي اخترتها، وسجل موافقتك، ونتائج التسليم والفتح من مزوّد البريد.",
            ],
            ["الأدلة والإعلانات", "تفاصيل الشركة أو الشخص أو الفعالية أو الوظيفة التي أرسلتها، لتُراجع وتُنشر."],
            ["طلبات التوظيف", "طلبك وسيرتك الذاتية، يُمرّران إلى صاحب العمل الذي تقدّمت إلى وظيفته."],
            [
              "تحسين الصحيفة",
              "أرقام قراءة إجمالية وتقارير أخطاء وأزمنة تحميل. بموافقتك على التحليلات فقط.",
            ],
            [
              "الإعلانات",
              "الحدّ من تكرار العرض وقياس الحملات. بموافقتك على الإعلانات فقط، وحيث تكون الإعلانات مفعّلة.",
            ],
            ["الأمن ومنع الإساءة", "سجلات الخادم، ومحاولات تسجيل الدخول، وعدّادات تحديد المعدّل."],
            ["الالتزامات النظامية", "ما يوجب نظام أو جهة رقابية أو أمر قضائي صحيح حفظه أو تقديمه."],
          ],
        ),
        p(
          "لا نستخدم بياناتك الشخصية في اتخاذ قرارات آلية ذات أثر قانوني عليك أو أثر مماثل في جسامته. وحين يرتّب الموقع القصص أو يوصي بها فإنه يفعل ذلك انطلاقاً مما يُقرأ على الموقع عموماً، لا من ملف يخصّك.",
        ),
        p(
          "ولا نستخدم بيانات القرّاء ولا ما يُرسل إلينا ولا طلبات التوظيف في تدريب نماذج ذكاء اصطناعي تابعة لأطراف أخرى، ولا نبيعها لمن يفعل ذلك.",
        ),
      ),

      section(
        "bases",
        "أسسنا النظامية",
        p(
          "حيث يوجب النظام تسمية أساس للمعالجة — وهو ما تفعله اللائحة الأوروبية العامة لحماية البيانات، ويسير نظام حماية البيانات الشخصية السعودي على النسق ذاته — فهذه أسسنا.",
        ),
        list(
          "تنفيذ عقد — إدارة حسابك، وتسليم نشرة طلبتها، وتمرير طلب توظيف تقدّمت به.",
          "الموافقة — ملفات التحليلات والإعلانات، والبريد التسويقي. تُؤخذ بفعل إيجابي، وتُسجَّل، ويمكن سحبها في أي وقت دون تبعة. ولا يُبطل السحب ما كان مشروعاً قبله.",
          "المصلحة المشروعة — إبقاء الموقع عاملاً وآمناً، والتصدي للاحتيال وإساءة الاستخدام، وفهم أي التغطيات تُقرأ إجمالاً، ومخاطبة منشأة بشأن إدراج أرسلته. وقد وازنّا كلاً منها بمصالحك، ونشارك هذا التقدير عند الطلب.",
          "التزام نظامي — الحفظ، والضريبة، والاستجابة للطلبات المشروعة.",
        ),
      ),

      section(
        "cookies",
        "ملفات الارتباط وتخزين المتصفح",
        p(
          "لا يُضبط قبل اختيارك سوى الملفات الضرورية. أما التحليلات والإعلانات فمعطّلة حتى تُفعّلها، ويمكنك تغيير رأيك في أي وقت من «تفضيلات ملفات الارتباط» في التذييل. وتُدرج سياسة ملفات الارتباط لدينا كل ملف باسمه وغرضه ومدته.",
        ),
        p(
          "وحين يرسل متصفحك إشارة التحكم العام بالخصوصية نعدّها سحباً للموافقة على التحليلات والإعلانات.",
        ),
      ),

      section(
        "advertising",
        "الإعلانات",
        p(
          "تُموَّل هذه الصحيفة بالإعلان. والإعلان مُعلَّم بوضوح، وتُتخذ القرارات التحريرية باستقلال عنه، وفق المعايير المبيَّنة في سياستنا التحريرية.",
        ),
        p(
          "وحين تُعرض الإعلانات برمجياً عبر Google فإنها تتلقى البيانات التقنية التي يحملها أي طلب إعلاني — عنوان IP والمتصفح والصفحة التي تتصفحها — وتتصرف حيالها بوصفها متحكماً مستقلاً وفق شروطها. وقد تستخدم ملفات ارتباط للحدّ من التكرار وقياس الحملات، وذلك بموافقتك الإعلانية وحدها. ويمكنك التحكم فيما تعرضه عليك من خلال إعدادات الإعلانات لدى Google.",
        ),
        p(
          "أما المحتوى المموّل والمواد الإعلانية المورَّدة فلا تتلقى منّا بيانات القرّاء إطلاقاً. ونحن لا نبيع البيانات الشخصية ولا نشاركها لأغراض الإعلان السلوكي عبر السياقات بالمعنى المقرّر في نظام ولاية كاليفورنيا.",
        ),
      ),

      section(
        "sharing",
        "من يطّلع عليها غيرنا",
        p("لا نشارك البيانات الشخصية إلا في هذه الحالات، وبقدر ما تقتضيه الحالة."),
        list(
          "مزوّدو خدمة يعملون بتعليماتنا — الاستضافة وقواعد البيانات وتسليم البريد ومراقبة الأخطاء والتحليلات. يعالجون نيابة عنا بموجب عقد، ولا يجوز لهم استعمال البيانات لأغراضهم، وهم مُلزمون بشروط سرية وأمن.",
          "أصحاب العمل عند تقدّمك لوظيفة — يذهب طلبك إلى الجهة التي نشرت الوظيفة، فتصبح متحكّمة فيه بذاتها، ويحكم إشعار خصوصيتها ما تفعله بعد ذلك.",
          "الجمهور حين تطلب منّا النشر — إدراج في دليل، أو إعلان شركة أو فعالية، أو ملف كاتب، أو رسالة ترسلها للنشر.",
          "الجهات المختصة والمستشارون — حيث يوجب ذلك نظام أو جهة رقابية أو أمر قضائي صحيح، أو لإقامة دعوى أو الدفاع فيها. ونُخبرك متى كان ذلك جائزاً لنا.",
          "خلف — إن بيعت الصحيفة أو اندمجت، بالحمايات ذاتها المقررة في هذه السياسة.",
        ),
        p("نحن لا نبيع البيانات الشخصية، ولم نفعل ذلك قط."),
      ),

      section(
        "transfers",
        "إلى أين تذهب",
        p(
          "يصدر {site} من {city} ويُقرأ في أنحاء العالم، ويعمل بعض مزوّدينا خارج المملكة. وحين تغادر البيانات الشخصية المملكة يتم النقل على الأسس التي يجيزها نظام حماية البيانات الشخصية — قرار بكفاية الحماية، أو ضمانات مناسبة في العقد، أو موافقتك الصريحة — وحين تتعلق البيانات بقرّاء في المنطقة الاقتصادية الأوروبية أو المملكة المتحدة فبموجب الشروط التعاقدية النموذجية أو الملحق البريطاني مع تقييم للنقل يسندهما.",
        ),
        p("ويمكنك أن تسألنا أي المزوّدين يحتفظ ببيانات في أي دولة، وسنخبرك."),
      ),

      section(
        "retention",
        "كم نحتفظ بها",
        table(
          ["البيانات", "مدة الحفظ"],
          [
            ["الحساب", "ما دام الحساب قائماً، ثم ٩٠ يوماً، ثم يُحذف."],
            ["الاشتراك في النشرة", "حتى تُلغي الاشتراك. ويُحفظ سجل الإلغاء نفسه كي لا نراسلك مجدداً."],
            ["طلبات التوظيف", "١٢ شهراً من تاريخ الطلب، ما لم تسرِ مدة حفظ صاحب العمل."],
            ["ما يُرسل إلى الأدلة", "المنشور: ما دام منشوراً. والمرفوض: ٦ أشهر."],
            ["المحفوظات وسجل القراءة", "ما دام الحساب قائماً. ويمكنك مسحه في أي وقت."],
            ["سجلات الخادم", "٩٠ يوماً، ثم تُحذف."],
            ["قياس الإعلانات", "١٣ شهراً، وتُجمَّع إحصائياً بعد ٩٠ يوماً."],
            ["سجلات الموافقة", "٣ سنوات من تاريخ الاختيار، لأنه يلزمنا إثبات أنها أُعطيت."],
          ],
        ),
        p("وحيث يوجب نظام مدة أطول، فالنظام هو المتّبع، ونحتفظ بما يوجبه وحده."),
      ),

      section(
        "security",
        "كيف نحميها",
        p(
          "تُشفَّر البيانات أثناء نقلها. ولا تُخزَّن كلمات المرور إلا بصمات مملَّحة لا يمكن ردّها إلى أصلها، لا من قبلنا ولا من قبل من حصل على قاعدة البيانات. والوصول إلى بيانات الإنتاج مقصور على من يحتاجه لأداء عمله، وتُسجَّل الإجراءات الإدارية.",
        ),
        p(
          "لا يوجد نظام آمن تماماً، وأي جهة تقول لك غير ذلك إنما تبيعك شيئاً. وإن وقع اختراق يُرجَّح أن يضرّك، أخبرناك وأخبرنا الجهة المختصة في المدة التي يقرّرها النظام.",
        ),
      ),

      section(
        "rights",
        "حقوقك",
        p(
          "أينما كنت، يمكنك أن تطلب منّا إطلاعك على ما لدينا، أو تصحيحه، أو حذفه، أو وقف استعمال بعينه له. راسلنا على {privacyEmail}. ونجيب خلال ٣٠ يوماً؛ وإن كان الطلب مركّباً أخبرناك بذلك وبسببه قبل انقضاء المدة. ولا رسوم إلا إذا كان الطلب متكرراً أو مفرطاً، وسنخبرك قبل مباشرة أي عمل.",
        ),
        p(
          "وقد يلزمنا التحقق من هويتك قبل التنفيذ، عادةً بتأكيد سيطرتك على البريد المسجّل في الحساب. وهذا التحقق قائم كي لا يمارس شخص آخر حقوقك ضدك.",
        ),
        p("وتضيف بعض الأنظمة إلى تلك القائمة."),
        list(
          "السعودية (نظام حماية البيانات الشخصية) — الحق في العلم، والحق في الوصول إلى بياناتك، والحق في الحصول عليها بصيغة مقروءة، والحق في تصحيحها أو إكمالها، والحق في إتلافها متى لم تعد لازمة للغرض الذي جُمعت من أجله. وحيث تقوم المعالجة على الموافقة جاز لك سحبها. وتُرفع الشكاوى إلى الجهة الرقابية المختصة في المملكة.",
          "المنطقة الاقتصادية الأوروبية والمملكة المتحدة — الوصول والتصحيح والمحو وتقييد المعالجة ونقل البيانات والاعتراض على المعالجة القائمة على المصلحة المشروعة. والاعتراض على التسويق المباشر مطلق ونعمل به فوراً. ويجوز لك التقدّم بشكوى إلى هيئة حماية البيانات في بلدك، أو إلى مكتب مفوض المعلومات في المملكة المتحدة.",
          "كاليفورنيا — الحق في معرفة ما يُجمع ولماذا، وحذفه، وتصحيحه، وتقييد استعمال المعلومات الحساسة، وألّا تُميَّز ضدك لممارستك أياً منها. ونحن لا نبيع البيانات الشخصية ولا نشاركها بالمعنى المقرر هناك، فلا شيء تنسحب منه، غير أننا نعامل الطلب بوصفه سحباً للموافقة الإعلانية.",
        ),
      ),

      section(
        "children",
        "الأطفال",
        p(
          "هذه صحيفة متخصصة موجّهة إلى العاملين في الصناعة. وهي غير موجّهة إلى الأطفال، والحسابات لمن أتمّ الثامنة عشرة. ولا نجمع عن علم بيانات طفل؛ وإن علمنا أننا فعلنا حذفناها. وعلى وليّ الأمر الذي يعتقد أن لدينا بيانات طفل أن يراسل {privacyEmail} وسنتصرف بناءً على ذلك.",
        ),
      ),

      section(
        "links",
        "مواقع الآخرين",
        p(
          "نحيل إلى مواقع الشركات وبوابات المنافسات والجهات الرقابية والإفصاحات، لأن تقريراً متخصصاً لا يُظهر مصادره قليل القيمة. وتلك المواقع ليست لنا ولا تمتد إليها هذه السياسة. فاقرأ سياساتها.",
        ),
      ),

      section(
        "changes",
        "تعديل هذه السياسة",
        p(
          "حين تتغير هذه السياسة يتغير التاريخ في أعلى الصفحة معها. وحيث يمسّ التغيير جوهرياً ما نفعله ببيانات لدينا بالفعل، أعلنّاه على الموقع قبل نفاذه، وحيث يوجب النظام ذلك سألناك من جديد بدل الافتراض.",
        ),
      ),

      section(
        "contact",
        "التواصل والشكاوى",
        p(
          "تُرسل أسئلة الخصوصية وطلباتها وشكاواها إلى {privacyEmail}، أو بالبريد إلى {legalName}، {city}. أما التصحيحات التحريرية فلها مسار خاص — انظر سياسة التصحيحات — ويتولاها قسم التحرير لا هذا البريد.",
        ),
        p(
          "وإن لم نحسم أمراً على النحو الذي يُرضيك، فلك أن ترفعه إلى هيئة حماية البيانات في بلدك. ونودّ أن تأتينا أولاً، غير أن هذا الحق لا يتوقف على ذلك.",
        ),
      ),
    ],
  },
};
