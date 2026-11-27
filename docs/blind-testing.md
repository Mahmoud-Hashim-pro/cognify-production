# Blind-User Testing Checklist (TalkBack / VoiceOver)

Automated checks (axe, Lighthouse) cannot judge blind usability. Every change
that touches the blind flows below MUST be verified on a real device with a
real screen reader before release.

## Setup
- Android + TalkBack (Chrome), and iOS + VoiceOver (Safari).
- Sign in as a user whose accessibility mode is Visual (blind) with `voiceFirstMode`.
- Keep the device on Arabic (Egypt) for the primary pass, then repeat in English.

## Blind-first home (voice-first screen)
- [ ] After login/onboarding with "Visual impairment", the app lands on the blind home.
- [ ] A spoken welcome plays automatically (Egyptian Arabic on an ar device).
- [ ] The 4 buttons (describe scene / read text / navigate / emergency) are reachable by swipe, each with a clear label, and each is at least one finger tall.
- [ ] No sign-in friction: the Google button is focusable and announced.

## Global voice control
- [ ] The floating microphone button is reachable on every screen and announced as the voice control button.
- [ ] Press-and-hold starts listening; releasing stops; a short spoken reply confirms each command.
- [ ] Commands verified end-to-end: "افتح الكاميرا", "اقرالي نص", "العملة دي بكام", "الباركود", "تنقل", "ارجع", "اقرا الشاشة", "اعد", "وقف", "اسرع", "ابطئ", "الوقت", "الطقس".
- [ ] An unrecognized command gets a polite spoken fallback, not silence.

## Emergency SOS from anywhere
- [ ] Saying "ساعدوني" on any screen starts the 5-second spoken countdown.
- [ ] Triple-tapping the floating button starts the countdown.
- [ ] Shaking the phone starts the countdown (with motion permission granted).
- [ ] The cancel button is huge, focused, and announced; cancelling speaks a confirmation.
- [ ] On dispatch: location reaches saved caregivers via /api/emergency/dispatch; on failure a direct-call button appears.
- [ ] With the network off, the SOS is queued locally and sent automatically when the network returns.

## Voice navigation
- [ ] Destination can be dictated by voice and confirmed by speech.
- [ ] Walking instructions are spoken in Egyptian Arabic with distances ("بعد 30 متر لف يمين").
- [ ] Instructions advance automatically as the user walks (watchPosition).
- [ ] "أنا فين" / "إيه حواليا" / "اسم الشارع" answer aloud.
- [ ] The safety disclaimer (assistant, not a cane/guide-dog replacement) is visible and spoken once per session.
- [ ] Obstacle assist starts only on explicit tap, has a huge stop button, and every warning vibrates.

## Daily aids
- [ ] Medication/alarm/appointment reminders fire with speech + a system notification while the app is open.
- [ ] The UI honestly states the browser limit (no alarms with the screen off).

## Offline basics
- [ ] With the network off, the app shell still loads (service worker cache).
- [ ] Emergency contacts are readable offline; SOS queuing works (above).

## Known people (opt-in)
- [ ] The consent screen is spoken and requires an explicit tap on "موافق".
- [ ] Photos stay on-device; the erase-all button clears everything and speaks confirmation.
