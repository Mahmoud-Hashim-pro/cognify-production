import {
  isImageGenerationRequest,
  extractImageSubject,
  buildImageUrl,
  hasMarkdownImage,
  ensureImageInResponse,
} from '../api/_lib/imageSynthesis.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function run() {
  console.log('\n============================================================');
  console.log('🎨 VERIFYING IMAGE SYNTHESIS & VISUAL FULFILLMENT');
  console.log('============================================================\n');

  // 1. Direct Request Detection
  console.log('--- 1. Request Detection ---');
  assert(
    isImageGenerationRequest('yes naruto uzumaki just give me an image of it'),
    'Detects user request: "yes naruto uzumaki just give me an image of it"'
  );
  assert(
    isImageGenerationRequest('give me an image of a red sports car'),
    'Detects user request: "give me an image of a red sports car"'
  );
  assert(
    isImageGenerationRequest('عايز صورة لبرج إيفل في باريس'),
    'Detects Arabic image request: "عايز صورة لبرج إيفل في باريس"'
  );
  assert(
    isImageGenerationRequest('ارسم لي شجرة عائلة'),
    'Detects Arabic drawing request: "ارسم لي شجرة عائلة"'
  );
  assert(
    isImageGenerationRequest('where', 'Here is an image of Naruto Uzumaki for you:'),
    'Detects follow-up "where" after assistant promised an image'
  );
  assert(
    !isImageGenerationRequest('how does quicksort work?'),
    'Rejects standard conceptual text query'
  );

  // 2. Subject Extraction
  console.log('\n--- 2. Subject Extraction ---');
  const subject1 = extractImageSubject('yes naruto uzumaki just give me an image of it');
  assert(
    subject1.toLowerCase().includes('naruto uzumaki'),
    `Extracted subject correctly from user prompt: "${subject1}"`
  );

  const subject2 = extractImageSubject('give me an image of the solar system planets');
  assert(
    subject2.toLowerCase().includes('solar system planets'),
    `Extracted subject: "${subject2}"`
  );

  const subject3 = extractImageSubject('عايز صورة لبرج القاهرة');
  assert(
    subject3.includes('برج القاهرة'),
    `Extracted Arabic subject: "${subject3}"`
  );

  const history = [
    { role: 'user', content: 'yes naruto uzumaki just give me an image of it' },
    { role: 'assistant', content: 'Okay, Mahmoud! Here is an image of Naruto Uzumaki for you:' },
  ];
  const subjectWhere = extractImageSubject('where', history[1].content, history);
  assert(
    subjectWhere.toLowerCase().includes('naruto uzumaki'),
    `Extracted subject on "where" follow-up: "${subjectWhere}"`
  );

  // 3. Image URL Generation
  console.log('\n--- 3. URL Construction ---');
  const url = buildImageUrl('naruto uzumaki');
  assert(
    url.startsWith('https://image.pollinations.ai/prompt/'),
    'URL points to Pollinations API'
  );
  assert(
    url.includes('naruto%20uzumaki'),
    'URL encodes subject properly'
  );
  assert(
    url.includes('nologo=true'),
    'URL includes clean rendering flag'
  );

  // 4. Fulfillment & Attachment Safety
  console.log('\n--- 4. Fulfillment & Attachment Safety ---');
  const userPrompt = 'yes naruto uzumaki just give me an image of it';
  const hallucinatedOutput = 'Okay, Mahmoud! Here is an image of Naruto Uzumaki for you:';
  const fulfilled = ensureImageInResponse(userPrompt, hallucinatedOutput, []);

  assert(
    hasMarkdownImage(fulfilled.text),
    'Enhanced response contains markdown image tag'
  );
  assert(
    fulfilled.text.includes('https://image.pollinations.ai/prompt/'),
    'Markdown image points to generated image'
  );
  assert(
    fulfilled.attachment !== undefined,
    'Response generates attachment object'
  );
  assert(
    fulfilled.attachment?.type === 'image/jpeg',
    'Attachment has valid MIME type'
  );
  assert(
    fulfilled.attachment?.url.includes('naruto%20uzumaki'),
    'Attachment URL matches generated image'
  );

  console.log('\n============================================================');
  console.log('🎉 IMAGE SYNTHESIS VERIFICATION: ALL 13 ASSERTIONS PASSED');
  console.log('============================================================\n');
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
