/**
 * Location & daily-awareness quick answers for blind voice control:
 * "where am I", "street name", "what's around me", weather, time, date, battery.
 * All geography goes through the authenticated /api proxies (rate limited server-side).
 */

import { getAuthHeaders } from '../services/gemini';

export type QuickQuestion =
  | 'where_am_i'
  | 'street_name'
  | 'whats_around'
  | 'weather'
  | 'time'
  | 'date'
  | 'battery';

function getPosition(timeoutMs = 8000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<any | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/mobility/geocode?lat=${lat}&lon=${lng}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchNearby(lat: number, lng: number): Promise<string[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/mobility/nearby?lat=${lat}&lon=${lng}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.places) ? data.places.slice(0, 5) : [];
  } catch {
    return [];
  }
}

async function fetchWeather(lat: number, lng: number): Promise<{ temp: number; description: string } | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lng}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function describeAddress(geo: any, isArabic: boolean): string | null {
  const a = geo?.address || {};
  const road = a.road || a.pedestrian || a.neighbourhood || a.suburb || '';
  const area = a.neighbourhood || a.suburb || a.city_district || a.district || '';
  const city = a.city || a.town || a.village || a.governorate || '';
  const parts = [road, area !== road ? area : '', city].filter(Boolean);
  if (parts.length === 0 && geo?.display_name) {
    return String(geo.display_name).split(',').slice(0, 3).join('، ');
  }
  if (parts.length === 0) return null;
  return isArabic ? parts.join('، ') : parts.join(', ');
}

/** Answers one quick question with a short speakable string. Never throws. */
export async function answerQuickQuestion(q: QuickQuestion, isArabic: boolean): Promise<string> {
  const now = new Date();
  switch (q) {
    case 'time': {
      const time = now.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' });
      return isArabic ? `الساعة دلوقتي ${time}` : `It is ${time} now`;
    }
    case 'date': {
      const date = now.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return isArabic ? `النهارده ${date}` : `Today is ${date}`;
    }
    case 'battery': {
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          const b = await nav.getBattery();
          const pct = Math.round((b.level ?? 0) * 100);
          const charging = b.charging;
          return isArabic
            ? `البطارية ${pct} في المية${charging ? ' والموبايل بيشحن' : ''}`
            : `Battery is at ${pct} percent${charging ? ' and charging' : ''}`;
        }
      } catch { /* fall through */ }
      return isArabic ? 'مقدرش أعرف حالة البطارية من المتصفح ده' : 'I cannot read the battery status in this browser';
    }
    case 'where_am_i':
    case 'street_name': {
      const pos = await getPosition();
      if (!pos) {
        return isArabic
          ? 'مقدرش أحدد مكانك. اتأكد إن الموقع متفعل للمتصفح.'
          : 'I cannot determine your location. Please allow location access.';
      }
      const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      const desc = geo && describeAddress(geo, isArabic);
      if (desc) {
        return isArabic ? `انت في ${desc}` : `You are at ${desc}`;
      }
      return isArabic
        ? `إحداثياتك: خط العرض ${pos.coords.latitude.toFixed(4)}، خط الطول ${pos.coords.longitude.toFixed(4)}`
        : `Your coordinates are latitude ${pos.coords.latitude.toFixed(4)}, longitude ${pos.coords.longitude.toFixed(4)}`;
    }
    case 'whats_around': {
      const pos = await getPosition();
      if (!pos) {
        return isArabic ? 'مقدرش أحدد مكانك عشان أعرف اللي حواليك' : 'I cannot locate you to see what is around';
      }
      const places = await fetchNearby(pos.coords.latitude, pos.coords.longitude);
      if (places.length === 0) {
        return isArabic ? 'مفيش أماكن معروفة قريبة منك واضحة دلوقتي' : 'No known places found nearby right now';
      }
      return isArabic ? `حواليك: ${places.join('، ')}` : `Around you: ${places.join(', ')}`;
    }
    case 'weather': {
      const pos = await getPosition();
      if (!pos) {
        return isArabic ? 'محتاج مكانك عشان أجيب الطقس' : 'I need your location to get the weather';
      }
      const w = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
      if (!w) return isArabic ? 'الطقس مش متاح دلوقتي' : 'Weather is unavailable right now';
      return isArabic
        ? `درجة الحرارة ${Math.round(w.temp)} درجة، والجو ${w.description}`
        : `It is ${Math.round(w.temp)} degrees, ${w.description}`;
    }
    default:
      return isArabic ? 'مش قادر أجاوب دلوقتي' : 'I cannot answer right now';
  }
}
