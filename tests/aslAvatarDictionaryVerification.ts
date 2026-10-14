import {
  ASL_CORE_SIGN_DICTIONARY,
  ASL_FINGERSPELLING_POSES,
  resolveAslAvatarSign,
  resolveAslFingerspellingCharacter,
} from '../src/lib/aslAvatarDictionary.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function verifyAslAvatarDictionary() {
  assert(Object.keys(ASL_FINGERSPELLING_POSES).length === 36, 'Expected 26 ASL letters and 10 digits');
  assert(ASL_FINGERSPELLING_POSES.J.motion === 'j', 'J must retain its temporal motion');
  assert(ASL_FINGERSPELLING_POSES.Z.motion === 'z', 'Z must retain its temporal motion');
  assert(ASL_CORE_SIGN_DICTIONARY.length === 14, 'Expected ASL Core 14 lexical vocabulary');
  assert(ASL_CORE_SIGN_DICTIONARY.every((sign) => sign.referenceNote.length > 0), 'Every sign must retain review provenance');

  const thankYou = resolveAslAvatarSign(['thank', 'you'], 0);
  assert(thankYou?.sign.id === 'THANK-YOU' && thankYou.consumed === 2, 'Longest phrase should win over individual tokens');
  assert(resolveAslAvatarSign(['help'], 0)?.sign.hands === 'both', 'HELP should declare two-hand execution');
  assert(resolveAslFingerspellingCharacter('j') === 'J', 'Lowercase fingerspelling must normalize to uppercase');
  assert(resolveAslFingerspellingCharacter('؟') === '', 'Non-ASL characters must not become an ASL letter');
}

if (process.argv[1]?.includes('aslAvatarDictionaryVerification')) {
  verifyAslAvatarDictionary();
  console.log('ASL avatar dictionary verification passed.');
}
