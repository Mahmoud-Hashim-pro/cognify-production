/**
 * Cognify Server-Side Emergency SOS Dispatch Endpoint
 *
 * Replaces client-side window.open with a guaranteed, non-interactive server-side
 * notification pipeline. Essential for ALS/quadriplegic patients who cannot click buttons.
 *
 * Hardened with:
 * 1. Mandatory Firebase Authentication ID Token verification (prevents open-relay abuse).
 * 2. Sliding-window rate limiting per UID and IP (prevents SMS spamming / bombing).
 * 3. E.164 phone sanitization and validation.
 * 4. Persistent non-PII incident audit trail logging.
 * 5. Deterministic fallback direct call if zero channels deliver.
 */
import { applyCorsHeaders } from '../_lib/cors.js';
import { verifyRequestAuth } from '../_lib/authGuard.js';
import { checkRateLimit } from '../_lib/rateLimiter.js';

export interface EmergencyDispatchPayload {
  uid?: string;
  studentName?: string;
  caregiverPhone?: string;
  caregiverName?: string;
  location?: { lat: number; lng: number };
  source?: 'eye_closure' | 'button' | 'vocal';
  text?: string;
  timestamp?: string;
}

function sanitizeAndValidatePhone(phone?: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();
  // Valid international E.164 phone standard: e.g. +201012345678 or standard 10-15 digit string
  if (/^\+?[1-9]\d{7,14}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Store metadata-only incident audit trail in Firestore (Zero audio/video PII)
async function recordIncidentAuditLog(incidentData: {
  incidentId: string;
  uid: string;
  timestamp: string;
  source: string;
  channelsNotified: string[];
  channelErrors: string[];
  fallbackDirectCall: boolean;
  hasLocation: boolean;
}) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0347404066';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/emergency_incidents?documentId=${incidentData.incidentId}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          incidentId: { stringValue: incidentData.incidentId },
          uid: { stringValue: incidentData.uid },
          timestamp: { stringValue: incidentData.timestamp },
          source: { stringValue: incidentData.source },
          channelsNotified: { arrayValue: { values: incidentData.channelsNotified.map((c) => ({ stringValue: c })) } },
          channelErrors: { arrayValue: { values: incidentData.channelErrors.map((e) => ({ stringValue: e })) } },
          fallbackDirectCall: { booleanValue: incidentData.fallbackDirectCall },
          hasLocation: { booleanValue: incidentData.hasLocation },
        },
      }),
    }).catch(() => {});
  } catch {
    // Non-blocking telemetry
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, max-age=0');

  // 1. CORS Guard
  if (!applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Mandatory Authentication Guard (Prevents Open-Relay SMS abuse)
  const authResult = await verifyRequestAuth(req);
  if (!authResult.authenticated || !authResult.uid) {
    return res.status(401).json({
      success: false,
      error: authResult.error || 'Authentication required for emergency dispatch.',
      fallbackDirectCall: true,
    });
  }
  const authenticatedUid = authResult.uid;

  // 3. Sliding-Window Rate Limiting (5 requests/minute per UID, 15 per IP)
  const clientIp = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const userRate = checkRateLimit(`sos:uid:${authenticatedUid}`, 5);
  const ipRate = checkRateLimit(`sos:ip:${clientIp}`, 15);

  if (!userRate.allowed || !ipRate.allowed) {
    console.warn(`[SOS Rate Limit Exceeded]: UID=${authenticatedUid} IP=${clientIp}`);
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded: Too many SOS dispatch attempts. Please dial emergency services directly.',
      fallbackDirectCall: true,
      retryAfterMs: Math.max(userRate.resetMs, ipRate.resetMs),
    });
  }

  try {
    const payload: EmergencyDispatchPayload = req.body || {};
    const incidentId = `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = payload.timestamp || new Date().toISOString();

    const channelsNotified: string[] = [];
    const channelErrors: string[] = [];

    const student = payload.studentName || 'Cognify Student';
    const validCaregiverPhone = sanitizeAndValidatePhone(payload.caregiverPhone);

    const locationStr = payload.location?.lat && payload.location?.lng
      ? `https://maps.google.com/?q=${payload.location.lat},${payload.location.lng}`
      : 'Location unavailable';

    const alertMessage = `🚨 [CRITICAL EMERGENCY SOS]
Incident ID: ${incidentId}
Student: ${student} (UID: ${authenticatedUid})
Trigger Source: ${payload.source || 'eye_closure'}
Caregiver Contact: ${payload.caregiverName || 'Primary Caregiver'} (${validCaregiverPhone || 'Not set or unverified'})
Message: ${payload.text || 'Immediate medical/caregiver assistance requested!'}
Live Map: ${locationStr}
Time: ${timestamp}`;

    console.warn(`[EMERGENCY SOS DISPATCHED]:`, {
      incidentId,
      authenticatedUid,
      student,
      phone: validCaregiverPhone,
      location: payload.location,
      time: timestamp,
    });

    // 1. Dispatch to Webhook (Hospital / Pager / Home Automation integration)
    const webhookUrl = process.env.EMERGENCY_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const whRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incidentId, alertMessage, payload, timestamp, uid: authenticatedUid }),
        });
        if (whRes.ok) {
          channelsNotified.push('webhook_pager');
        } else {
          channelErrors.push(`webhook_pager: HTTP ${whRes.status}`);
          console.error(`[SOS Webhook HTTP Error]: ${whRes.status}`);
        }
      } catch (webhookErr: any) {
        channelErrors.push(`webhook_pager: ${webhookErr?.message || 'network error'}`);
        console.error('[SOS Webhook Error]:', webhookErr);
      }
    }

    // 2. Dispatch to Telegram Bot (if configured for instant push alerts)
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChatId) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgChatId, text: alertMessage, parse_mode: 'HTML' }),
        });
        if (tgRes.ok) {
          channelsNotified.push('telegram_instant_push');
        } else {
          const tgBody = await tgRes.json().catch(() => ({}));
          channelErrors.push(`telegram: HTTP ${tgRes.status} — ${(tgBody as any)?.description || ''}`);
          console.error(`[SOS Telegram HTTP Error]:`, tgRes.status, tgBody);
        }
      } catch (tgErr: any) {
        channelErrors.push(`telegram: ${tgErr?.message || 'network error'}`);
        console.error('[SOS Telegram Error]:', tgErr);
      }
    }

    // 3. Dispatch to Twilio SMS (if configured and caregiver phone is valid)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_PHONE;
    if (twilioSid && twilioAuth && twilioFrom && validCaregiverPhone) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
        const smsParams = new URLSearchParams();
        smsParams.append('To', validCaregiverPhone);
        smsParams.append('From', twilioFrom);
        smsParams.append('Body', alertMessage);

        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: smsParams.toString(),
          }
        );
        if (smsRes.ok) {
          channelsNotified.push('sms_gateway');
        } else {
          const smsBody = await smsRes.json().catch(() => ({}));
          channelErrors.push(`sms: HTTP ${smsRes.status} — ${(smsBody as any)?.message || ''}`);
          console.error(`[SOS Twilio HTTP Error]:`, smsRes.status, smsBody);
        }
      } catch (smsErr: any) {
        channelErrors.push(`sms: ${smsErr?.message || 'network error'}`);
        console.error('[SOS SMS Error]:', smsErr);
      }
    } else if (payload.caregiverPhone && !validCaregiverPhone) {
      channelErrors.push('sms: Invalid caregiver phone format (E.164 required)');
    }

    // CRITICAL SAFETY CHECK: If zero real-world channels delivered the alert,
    // return success:false so the client triggers a direct phone-call fallback.
    const noRealChannelsConfigured =
      !webhookUrl && !(tgToken && tgChatId) && !(twilioSid && twilioAuth && twilioFrom);
    const allConfiguredChannelsFailed =
      channelsNotified.length === 0 && channelErrors.length > 0;

    const fallbackDirectCall = noRealChannelsConfigured || allConfiguredChannelsFailed;

    // Asynchronously record immutable audit trail (metadata only)
    recordIncidentAuditLog({
      incidentId,
      uid: authenticatedUid,
      timestamp,
      source: payload.source || 'eye_closure',
      channelsNotified,
      channelErrors,
      fallbackDirectCall,
      hasLocation: !!(payload.location?.lat && payload.location?.lng),
    });

    if (fallbackDirectCall) {
      console.error('[SOS CRITICAL]: No real-world channels delivered the emergency. Returning fallback flag.', {
        noRealChannelsConfigured,
        channelErrors,
      });
      return res.status(200).json({
        success: false,
        incidentId,
        dispatchedAt: timestamp,
        channels: channelsNotified,
        channelErrors,
        fallbackDirectCall: true,
        message: noRealChannelsConfigured
          ? 'Emergency server received SOS but no notification channels are configured. Direct call fallback activated.'
          : 'Emergency dispatched to server but all configured channels failed. Direct call fallback activated.',
      });
    }

    return res.status(200).json({
      success: true,
      incidentId,
      dispatchedAt: timestamp,
      channels: channelsNotified,
      channelErrors,
      status: 'acknowledged',
      message: `Emergency SOS confirmed and delivered via: ${channelsNotified.join(', ')}.`,
    });
  } catch (err: any) {
    console.error('[Emergency Dispatch Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch emergency alert.',
      fallbackDirectCall: true,
    });
  }
}
