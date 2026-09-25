/**
 * Cognify Server-Side Emergency SOS Dispatch Endpoint
 *
 * Replaces client-side window.open with a guaranteed, non-interactive server-side
 * notification pipeline. Essential for ALS/quadriplegic patients who cannot click buttons.
 */
import { applyCorsHeaders } from '../_lib/cors.js';

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

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, max-age=0');

  // CORS Guard
  if (!applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload: EmergencyDispatchPayload = req.body || {};
    const incidentId = `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = payload.timestamp || new Date().toISOString();
    // SAFETY: Only count a channel as notified if the HTTP request actually succeeded.
    // 'server_event_bus' is removed from the default — it only appears if we log to a
    // real persistence store. A patient must not be told their SOS was delivered unless
    // at least one real-world notification channel (Telegram / SMS / Webhook) confirmed it.
    const channelsNotified: string[] = [];
    const channelErrors: string[] = [];

    const student = payload.studentName || 'Cognify Student';
    const locationStr = payload.location?.lat && payload.location?.lng
      ? `https://maps.google.com/?q=${payload.location.lat},${payload.location.lng}`
      : 'Location unavailable';

    const alertMessage = `🚨 [CRITICAL EMERGENCY SOS]
Incident ID: ${incidentId}
Student: ${student} (UID: ${payload.uid || 'Anonymous'})
Trigger Source: ${payload.source || 'eye_closure'}
Caregiver Contact: ${payload.caregiverName || 'Primary Caregiver'} (${payload.caregiverPhone || 'Not set'})
Message: ${payload.text || 'Immediate medical/caregiver assistance requested!'}
Live Map: ${locationStr}
Time: ${timestamp}`;

    console.warn(`[EMERGENCY SOS DISPATCHED]:`, {
      incidentId,
      student,
      phone: payload.caregiverPhone,
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
          body: JSON.stringify({ incidentId, alertMessage, payload, timestamp }),
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

    // 3. Dispatch to Twilio SMS (if configured)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_PHONE;
    if (twilioSid && twilioAuth && twilioFrom && payload.caregiverPhone) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
        const smsParams = new URLSearchParams();
        smsParams.append('To', payload.caregiverPhone);
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
    }

    // CRITICAL SAFETY CHECK: If zero real-world channels delivered the alert,
    // return success:false so the client triggers a direct phone-call fallback.
    // A patient must NEVER be falsely told their emergency was dispatched.
    const noRealChannelsConfigured =
      !webhookUrl && !(tgToken && tgChatId) && !(twilioSid && twilioAuth && twilioFrom);
    const allConfiguredChannelsFailed =
      channelsNotified.length === 0 && channelErrors.length > 0;

    if (noRealChannelsConfigured || allConfiguredChannelsFailed) {
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
          ? 'Emergency server received SOS but no notification channels are configured (TELEGRAM_BOT_TOKEN / TWILIO_ACCOUNT_SID / EMERGENCY_WEBHOOK_URL). Direct call fallback activated.'
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
    });
  }
}
