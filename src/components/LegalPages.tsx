import React from 'react';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { isArabicLocale, isFrenchLocale, L } from '../lib/translations';
import { MEDIA_CONSENT_VERSION } from '../lib/mediaConsent';

interface LegalPageProps {
  language?: string;
  onBack?: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-6">
    <h2 className="text-lg font-black text-white mb-2">{title}</h2>
    <div className="text-sm leading-relaxed text-stone-300 font-semibold space-y-2">{children}</div>
  </section>
);

const shell = (
  isAr: boolean,
  onBack: (() => void) | undefined,
  icon: React.ReactNode,
  title: string,
  updated: string,
  children: React.ReactNode
) => (
  <div className="flex-1 flex flex-col bg-[#0E1416] text-stone-100 overflow-y-auto custom-scrollbar p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
    <header className="flex items-center gap-3 mb-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={isAr ? 'رجوع' : L('Back')}
          className="min-h-[44px] min-w-[44px] p-2.5 text-stone-300 bg-[#162327] border border-stone-800 hover:text-white hover:bg-stone-800 shadow-sm rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F59E0B]"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          <span className="text-xs font-bold hidden sm:inline">{isAr ? 'رجوع' : L('Back')}</span>
        </button>
      )}
      {icon}
      <div>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        <p className="text-xs text-stone-500 font-bold">{updated}</p>
      </div>
    </header>
    <main className="max-w-3xl">{children}</main>
  </div>
);

export const PrivacyPolicyPage: React.FC<LegalPageProps> = ({ language, onBack }) => {
  const isAr = isArabicLocale(language);
  const isFr = isFrenchLocale(language);
  const updated = isAr ? `آخر تحديث: ${MEDIA_CONSENT_VERSION}` : isFr ? `Dernière mise à jour : ${MEDIA_CONSENT_VERSION}` : `Last updated: ${MEDIA_CONSENT_VERSION}`;

  const content = isAr ? (
    <>
      <Section title="الصور والكاميرا">
        <p>صور الكاميرا اللي بتلتقطها في رفيق البصيرة بتتبعت مشفرة (TLS) لخدمة الذكاء الاصطناعي Gemini من جوجل عشان توصفها في نفس اللحظة. إحنا مش بنخزن الصور على سيرفراتنا، ومش بنكتبها في أي قاعدة بيانات عندنا. احتفاظ جوجل بالبيانات بيعتمد على نوع الـ API وسياسة جوجل نفسها، وده خارج عن سيطرتنا وبنوضحه هنا بدل ما ندعي عكسه.</p>
      </Section>
      <Section title="المايكروفون والصوت">
        <p>الأوامر الصوتية بتستخدم خدمة التعرف على الكلام المدمجة في المتصفح (SpeechRecognition). حسب المتصفح، الصوت ممكن يتبعت لجوجل (كروم/أندرويد) أو أبل (سفاري) عشان يتحول لكتابة، وده بيتم تحت سياسة الخصوصية بتاعتهم. التسجيلات اللي بتعملها بنفسك عشان تفريغ صوتي بتتبعت مشفرة لنقطة الذكاء الاصطناعي ومش بتتخزن عندنا.</p>
      </Section>
      <Section title="الموقع">
        <p>موقعك بيتستخدم في حالة الطوارئ (SOS) بس، وبيتبعت لأرقام المرافقين اللي إنت سجلتهم بنفسك بعد موافقتهم. مفيش تتبع مستمر للموقع.</p>
      </Section>
      <Section title="إيه اللي بنخزنه">
        <p>بيانات الحساب (الاسم، الإيميل، إعدادات الإتاحة)، ذاكرة الأشياء اللي بتطلب حفظها من الكاميرا (مشفرة AES-256-GCM بمفتاح على جهازك، زي المحادثات وذاكرة الأماكن)، محادثاتك، وبيانات التعلم والتقدم.</p>
      </Section>
      <Section title="مين يقدر يشوف إيه">
        <p>محادثاتك وذاكرة الأماكن (spatialObjects) للمالك بس، محدش يقدر يوصلها، وده متطبق في قواعد قاعدة البيانات نفسها. الأدمن يقدر يشوف بيانات الحساب وذاكرة التعلم لأغراض الدعم والإدارة. أرقام المرافقين بتتخزن عشان خدمة الطوارئ بس.</p>
      </Section>
      <Section title="الاحتفاظ والمسح">
        <p>ذاكرة الكاميرا بتتمسح تلقائيًا بعد 90 يوم، وفيه زرار "امسح كل ذاكرة الكاميرا" في صفحة الكاميرا يمسحها فورًا. المحادثات بتفضل لحد ما تمسحها إنت أو تمسح حسابك. مسح الحساب بيمسح كل بياناتك نهائيًا من صفحة الخصوصية والأمان.</p>
      </Section>
      <Section title="الموافقة">
        <p>قبل أول استخدام للكاميرا أو المايكروفون بنعرض شاشة موافقة واضحة (مقروءة صوتيًا كمان)، وبنسجل موافقتك مع التاريخ ورقم النسخة في ملفك. تقدر تراجع الصفحة دي في أي وقت من #/privacy-policy.</p>
      </Section>
      <Section title="تواصل معنا">
        <p>لأي سؤال عن الخصوصية، استخدم صفحة الدعم جوه التطبيق.</p>
      </Section>
    </>
  ) : isFr ? (
    <>
      <Section title="Photos et caméra">
        <p>Les photos prises avec le Compagnon visuel sont envoyées chiffrées (TLS) à l'IA Gemini de Google pour être décrites sur le moment. Nous ne stockons pas les photos sur nos serveurs et ne les écrivons dans aucune de nos bases de données. La conservation par Google dépend du niveau d'API et de la politique de Google ; cela échappe à notre contrôle et nous le précisons ici plutôt que d'affirmer le contraire.</p>
      </Section>
      <Section title="Microphone et voix">
        <p>Les commandes vocales utilisent la reconnaissance vocale intégrée au navigateur (SpeechRecognition). Selon votre navigateur, l'audio peut être envoyé à Google (Chrome/Android) ou à Apple (Safari) pour être transcrit, selon leurs politiques de confidentialité. Les enregistrements que vous faites volontairement pour la transcription par IA sont envoyés chiffrés au point d'accès IA et ne sont pas conservés par nous.</p>
      </Section>
      <Section title="Position">
        <p>Votre position n'est utilisée que pour les alertes d'urgence SOS, envoyée aux numéros d'accompagnants que vous avez enregistrés vous-même avec leur accord. Il n'y a aucun suivi continu de la position.</p>
      </Section>
      <Section title="Ce que nous stockons">
        <p>Les données du compte (nom, e-mail, réglages d'accessibilité), les mémoires d'objets de la caméra que vous demandez d'enregistrer (chiffrées en AES-256-GCM avec une clé sur votre appareil, comme les discussions et les mémoires de lieux), vos discussions et vos données d'apprentissage et de progression.</p>
      </Section>
      <Section title="Qui peut voir quoi">
        <p>Vos discussions et vos mémoires spatiales sont réservées à leur propriétaire ; personne d'autre ne peut les lire, ce qui est appliqué dans les règles de la base de données elles-mêmes. Les administrateurs peuvent consulter les données du compte et de la mémoire d'apprentissage pour l'assistance et l'administration. Les numéros des accompagnants ne sont stockés que pour le service d'urgence.</p>
      </Section>
      <Section title="Conservation et suppression">
        <p>Les mémoires de la caméra sont supprimées automatiquement après 90 jours, et un bouton « Supprimer toute la mémoire de la caméra » sur la page de la caméra les efface immédiatement. Les discussions restent jusqu'à ce que vous les supprimiez ou supprimiez votre compte. La suppression du compte efface définitivement toutes vos données depuis la page Confidentialité et sécurité.</p>
      </Section>
      <Section title="Consentement">
        <p>Avant la première utilisation de la caméra ou du microphone, nous affichons un écran de consentement clair (également lu à voix haute), et nous enregistrons votre consentement avec la date et la version dans votre profil. Vous pouvez revoir cette page à tout moment à l'adresse #/privacy-policy.</p>
      </Section>
      <Section title="Contact">
        <p>Pour toute question sur la confidentialité, utilisez la page d'assistance dans l'application.</p>
      </Section>
    </>
  ) : (
    <>
      <Section title="Photos and camera">
        <p>Camera snapshots you take in the Visual Companion are sent encrypted (TLS) to Google's Gemini AI to be described in the moment. We do not store the photos on our servers or write them to any database of ours. Google's retention depends on the API tier and Google's own policy; that is outside our control and we disclose it here rather than claim otherwise.</p>
      </Section>
      <Section title="Microphone and voice">
        <p>Voice commands use the browser's built-in speech recognition (SpeechRecognition). Depending on your browser, audio may be sent to Google (Chrome/Android) or Apple (Safari) for transcription, under their privacy policies. Recordings you explicitly make for AI transcription are sent encrypted to the AI endpoint and are not stored by us.</p>
      </Section>
      <Section title="Location">
        <p>Your location is used only for emergency SOS alerts, sent to the caregiver numbers you registered yourself with their consent. There is no continuous location tracking.</p>
      </Section>
      <Section title="What we store">
        <p>Account data (name, email, accessibility settings), the camera object memories you ask to save (AES-256-GCM encrypted with a key on your device, like chats and spatial memories), your chats, and learning progress data.</p>
      </Section>
      <Section title="Who can see what">
        <p>Your chat threads and spatial memories are owner-only; nobody else can read them, enforced in the database rules themselves. Admins can view account and learning-memory data for support and administration. Caregiver phone numbers are stored only for the emergency service.</p>
      </Section>
      <Section title="Retention and deletion">
        <p>Camera memories are automatically deleted after 90 days, and a "Clear all camera memory" button on the camera page removes them instantly. Chats stay until you delete them or delete your account. Deleting your account permanently erases all your data from the Privacy &amp; Security page.</p>
      </Section>
      <Section title="Consent">
        <p>Before the first camera or microphone use we show a clear consent screen (also read aloud), and we record your consent with the date and version in your profile. You can revisit this page anytime at #/privacy-policy.</p>
      </Section>
      <Section title="Contact">
        <p>For any privacy question, use the Support page inside the app.</p>
      </Section>
    </>
  );

  return shell(
    isAr,
    onBack,
    <ShieldCheck className="w-9 h-9 text-amber-400 shrink-0" aria-hidden="true" />,
    isAr ? 'سياسة الخصوصية' : L('Privacy Policy'),
    updated,
    content
  );
};

export const TermsOfServicePage: React.FC<LegalPageProps> = ({ language, onBack }) => {
  const isAr = isArabicLocale(language);
  const isFr = isFrenchLocale(language);
  const updated = isAr ? `آخر تحديث: ${MEDIA_CONSENT_VERSION}` : isFr ? `Dernière mise à jour : ${MEDIA_CONSENT_VERSION}` : `Last updated: ${MEDIA_CONSENT_VERSION}`;

  const content = isAr ? (
    <>
      <Section title="الخدمة">
        <p>رفيقي مساعد إتاحة بالذكاء الاصطناعي: وصف المشاهد، قراءة النصوص والأدوية والعملات، أوامر صوتية، تنقل، وتنبيهات طوارئ. الخدمة مساعدة وليست بديلاً عن العصا البيضاء أو الكلب المرشد أو نصيحة طبية.</p>
      </Section>
      <Section title="حدود الاعتماد على الذكاء الاصطناعي">
        <p>الذكاء الاصطناعي ممكن يغلط. متعتمدش على وصف العملة أو الدواء أو تاريخ الصلاحية لوحده في قرارات مهمة، وراجع مع حد يشوف أو مع الصيدلي أو الدكتور. رفيقي مش بيدي نصائح طبية أو جرعات أدوية أبدًا.</p>
      </Section>
      <Section title="حسابك">
        <p>إنت مسؤول عن سرية حسابك. بيانات المرافقين (أرقامهم) بتتسجل بعد موافقتهم، وإنت مسؤول إنك تأخذ موافقتهم قبل تسجيل أرقامهم.</p>
      </Section>
      <Section title="الاستخدام المقبول">
        <p>ممنوع استخدام الخدمة في أي نشاط غير قانوني، أو محاولة الوصول لبيانات مستخدمين آخرين، أو تعطيل الخدمة.</p>
      </Section>
      <Section title="التغييرات والإنهاء">
        <p>ممكن نحدث الخدمة أو الشروط دي، وهنحدث تاريخ "آخر تحديث" فوق. تقدر تمسح حسابك في أي وقت من صفحة الخصوصية والأمان.</p>
      </Section>
    </>
  ) : isFr ? (
    <>
      <Section title="Le service">
        <p>Rafiqi est un assistant d'accessibilité par IA : description de scènes, lecture de textes, de médicaments et de monnaie, commandes vocales, navigation et alertes d'urgence. Le service est une aide, et non un remplacement de la canne blanche, du chien guide ou d'un avis médical.</p>
      </Section>
      <Section title="Limites de la confiance accordée à l'IA">
        <p>L'IA peut se tromper. Ne vous fiez pas à la seule lecture d'une monnaie, d'un médicament ou d'une date de péremption pour des décisions importantes ; vérifiez avec une personne qui voit, ou avec un pharmacien ou un médecin. Rafiqi ne donne jamais de conseil médical ni de posologie.</p>
      </Section>
      <Section title="Votre compte">
        <p>Vous êtes responsable de la confidentialité de vos identifiants. Les numéros des accompagnants sont enregistrés avec leur accord, et il vous incombe d'obtenir cet accord avant d'enregistrer le numéro de quelqu'un.</p>
      </Section>
      <Section title="Utilisation acceptable">
        <p>N'utilisez pas le service pour une activité illégale, pour accéder aux données d'autres utilisateurs ou pour perturber le service.</p>
      </Section>
      <Section title="Modifications et résiliation">
        <p>Nous pouvons mettre à jour le service ou ces conditions et nous actualiserons la date de « dernière mise à jour » ci-dessus. Vous pouvez supprimer votre compte à tout moment depuis la page Confidentialité et sécurité.</p>
      </Section>
    </>
  ) : (
    <>
      <Section title="The service">
        <p>Rafiqi is an AI accessibility assistant: scene description, reading text, medicine and currency, voice commands, navigation, and emergency alerts. The service is an aid, not a replacement for a white cane, a guide dog, or medical advice.</p>
      </Section>
      <Section title="Limits of AI reliance">
        <p>AI can be wrong. Do not rely on a currency, medicine, or expiry-date reading alone for important decisions; double-check with someone who can see, or with a pharmacist or doctor. Rafiqi never gives medical advice or medicine doses.</p>
      </Section>
      <Section title="Your account">
        <p>You are responsible for keeping your account credentials private. Caregiver numbers are stored with their consent, and you are responsible for getting that consent before saving someone's number.</p>
      </Section>
      <Section title="Acceptable use">
        <p>Do not use the service for anything illegal, to access other users' data, or to disrupt the service.</p>
      </Section>
      <Section title="Changes and termination">
        <p>We may update the service or these terms and will refresh the "last updated" date above. You can delete your account anytime from the Privacy &amp; Security page.</p>
      </Section>
    </>
  );

  return shell(
    isAr,
    onBack,
    <FileText className="w-9 h-9 text-amber-400 shrink-0" aria-hidden="true" />,
    isAr ? 'شروط الاستخدام' : L('Terms of Use'),
    updated,
    content
  );
};
