/**
 * Rafiqi — Phase 2 & Phase 3: Visual Companion Intelligence Core Engine
 *
 * Implements:
 * 1. Scene Freshness, Unique Frame IDs, and Stale-Response Protection
 * 2. Monotonic Request Sequencing & In-Flight Abort Management
 * 3. Intelligent Scene Understanding (Spatial Clock-Face, Relative Distances, Environmental Details)
 * 4. Visual Question Answering (VQA) using Fresh Valid Camera Frames
 * 5. Smart Text Reader: Arabic & English OCR, Continuous Reading, Truncation Warnings, No Word Fabrication
 * 6. Object Finder: Grounded Relative Positions, Camera Movement Guidance, No Metric Distance Hallucination
 * 7. Product Assistant: Consumer Packaging, Brand, Price, Quantity, Expiry Date Honesty, Detected vs Inferred
 * 8. Currency Recognition: Denomination Identification, Confidence/Uncertainty, Counterfeit Disclaimers
 * 9. Contextual Scene Conversation: Multi-turn Dialogue strictly bound to Current Scene, Invalidation on Scene Change
 * 10. Accessible Voice Interaction: Pause, Resume, Replay, Stop, Verbosity, Screen-Reader Announcements
 * 11. Assistive Safety & Privacy Guards
 */
import { L } from './translations';

import { cleanVisionDescription } from './visionCleaner.js';

export type VisualToolId = 'scene' | 'currency' | 'read' | 'color' | 'object' | 'face' | 'product';
export type VisualQueryType =
  | 'scene'
  | 'vqa'
  | 'ocr'
  | 'object'
  | 'currency'
  | 'color'
  | 'face'
  | 'product'
  | 'compare'
  | 'document'
  | 'barcode'
  | 'clothing'
  | 'expiry';

export type SceneDetailLevel = 'concise' | 'standard' | 'detailed';

export const SAFETY_DISCLAIMER_AR =
  'تنبيه أمان: المساعد البصري أداة استرشادية ذكية ولا يضمن الأمان التام أثناء الحركة أو عبور الطرق ولا يغني عن العصا البيضاء أو كلب المرشد أو تدريبات الحركة المستقلة. قد تحتوي الأوصاف البصرية على أخطاء وتعتبر المسافات ومواقع الأشياء تقديرية ونسبية وليست قياسات دقيقة، ولا يجب الاعتماد على الكاميرا وحدها في المواقف الحرجة أو عبور الشوارع.';
export const SAFETY_DISCLAIMER_EN =
  'Safety Notice: Visual Companion is an assistive guide and cannot guarantee navigational safety. Never rely on camera analysis alone to cross roads or replace a white cane, guide dog, or orientation and mobility training. Visual descriptions may occasionally be inaccurate, and object positions are qualitative approximations rather than exact measurements. Never rely solely on this tool for safety-critical navigation.';

export const CURRENCY_COUNTERFEIT_DISCLAIMER_AR =
  'تنبيه أمان: فاحص العملات أداة استرشادية لتمييز الفئات فقط، ولا يمكنه التحقق من أمان الورقة أو كشف العملات المزيفة.';
export const CURRENCY_COUNTERFEIT_DISCLAIMER_EN =
  'Notice: Currency reader is an assistive denomination identifier only. It cannot verify banknote security features or detect counterfeit currency.';

export interface CameraFrameRecord {
  frameId: string;
  seqId: number;
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
  source: 'live-camera' | 'upload';
}

export interface VisualAnalysisRequest {
  requestId: string;
  seqId: number;
  frameId: string;
  captureTimestamp: number;
  tool: VisualToolId;
  queryType: VisualQueryType;
  question?: string;
  detailLevel: SceneDetailLevel;
  lang: 'ar' | 'en' | 'fr';
  targetItemQuery?: string;
  readAction?: 'summarize' | 'read';
}

export interface SpatialObjectRelation {
  item: string;
  clockPosition?: number; // 1 to 12
  relativeDistance?: string; // e.g. "في متناول اليد", "أمامك مباشرة", "in foreground", "on left" (No fake metric distances)
  direction?: 'left' | 'right' | 'center' | 'near' | 'far' | 'front';
  pathClear?: boolean;
}

export interface SceneConversationTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface SceneConversationContext {
  frameId: string;
  captureTimestamp: number;
  turns: SceneConversationTurn[];
  isSceneCurrent: boolean;
}

export interface ContinuousReadingChunk {
  index: number;
  totalChunks: number;
  text: string;
}

export interface ProductInfoResult {
  productName?: string;
  brand?: string;
  price?: string;
  quantity?: string;
  expiryDate?: string;
  isExpiryLegible: boolean;
  detectedText: string;
  inferredInfo: string;
  hasUncertainty: boolean;
}

export interface CurrencyResult {
  denomination?: string;
  currency?: string;
  confidence: 'high' | 'moderate' | 'uncertain';
  needsBetterImage: boolean;
  guidanceMessage?: string;
  disclaimer: string;
}

export interface ObjectFinderResult {
  found: boolean;
  item: string;
  clockPosition?: number;
  relativeLocation?: string;
  pathClear?: boolean;
  movementSuggestion?: string;
  cleanDescription: string;
}

export interface VisualSceneResult {
  resultId: string;
  requestId: string;
  frameId: string;
  captureTimestamp: number;
  completedTimestamp: number;
  tool: VisualToolId;
  queryType: VisualQueryType;
  description: string;
  cleanSpokenText: string;
  isCurrent: boolean;
  hasHazard: boolean;
  hazardText?: string;
  visibleText?: string;
  spatialRelationships?: SpatialObjectRelation[];
  isUncertain: boolean;
  uncertaintyReason?: string;
  sceneChangedFromPrevious: boolean;
  changeSummary?: string;
  snapshotDataUrl?: string;
  productInfo?: ProductInfoResult;
  currencyInfo?: CurrencyResult;
  objectFinderInfo?: ObjectFinderResult;
  textLimitations?: {
    hasLimitations: boolean;
    reason?: string;
    isTruncated: boolean;
    isBlurry: boolean;
  };
  // Phase 6 extensions
  colorPatternInfo?: ColorPatternResult;
  clothingInfo?: ClothingAnalysisResult;
  barcodeInfo?: BarcodeScannerResult;
  expiryInfo?: ExpiryDateResult;
  documentInfo?: StructuredDocumentResult;
  clutteredObjectInfo?: ClutteredObjectFinderResult;
}

// Phase 6: Smart Scene Memory Interfaces
export interface SceneObjectObservation {
  name: string;
  clockPosition?: number;
  relativeLocation?: string;
  adjacentTo?: string[];
}

export interface SceneObservationMemoryItem {
  id: string;
  frameId: string;
  timestamp: number;
  isCurrent: boolean;
  description: string;
  cleanSpokenText: string;
  tool: VisualToolId;
  detectedObjects: SceneObjectObservation[];
  colors?: string[];
  textSnippets?: string[];
}

export interface SceneMemoryQueryResult {
  answerAr: string;
  answerEn: string;
  groundedInCurrent: boolean;
  matchedObservationTime?: number;
  confidence: 'high' | 'moderate' | 'uncertain';
  relativeTimeAgoAr?: string;
  relativeTimeAgoEn?: string;
}

// Phase 6: Color & Pattern Detector
export type GarmentPatternType =
  | 'solid'
  | 'striped'
  | 'plaid'
  | 'checkered'
  | 'floral'
  | 'polka_dot'
  | 'textured'
  | 'unknown';

export interface ColorPatternResult {
  dominantColors: string[];
  pattern: GarmentPatternType;
  patternLabelAr: string;
  patternLabelEn: string;
  lightingConfidence: 'high' | 'moderate' | 'low';
  lightingWarningAr?: string;
  lightingWarningEn?: string;
  relationshipsAr: string;
  relationshipsEn: string;
  rawDescription: string;
}

// Phase 6: Clothing Assistant
export interface ClothingItemInfo {
  category: string;
  color: string;
  pattern: GarmentPatternType;
  isCutOff: boolean;
  positionNotice?: string;
}

export interface ClothingAnalysisResult {
  items: ClothingItemInfo[];
  pairingSuggestionsAr: string[];
  pairingSuggestionsEn: string[];
  hasCutOffGarments: boolean;
  cutOffNoticeAr?: string;
  cutOffNoticeEn?: string;
  rawDescription: string;
}

// Phase 6: Barcode & Label Scanner
export interface BarcodeScannerResult {
  barcodeValue?: string;
  barcodeFormat?: string;
  visibleLabelText: string;
  interpretation: string;
  databaseDisclaimerAr: string;
  databaseDisclaimerEn: string;
  hasBarcode: boolean;
  rawDescription: string;
}

// Phase 6: Expiry Date Reader
export interface ExpiryDateResult {
  expiryDate?: string;
  productionDate?: string;
  batchNumber?: string;
  isLegible: boolean;
  safetyDisclaimerAr: string;
  safetyDisclaimerEn: string;
  repositionGuidanceAr?: string;
  repositionGuidanceEn?: string;
  rawDescription: string;
}

// Phase 6: Document Understanding
export interface DocumentFormField {
  label: string;
  value: string;
}

export interface DocumentTable {
  headers: string[];
  rows: string[][];
}

export interface DocumentInvoiceData {
  vendor?: string;
  date?: string;
  total?: string;
  currency?: string;
  invoiceNumber?: string;
  items?: Array<{ name: string; price: string }>;
}

export interface StructuredDocumentResult {
  documentType: 'general' | 'invoice_receipt' | 'form' | 'table' | 'article_letter';
  summaryAr: string;
  summaryEn: string;
  headings: string[];
  paragraphs: string[];
  tables: DocumentTable[];
  formFields: DocumentFormField[];
  lists: string[][];
  invoiceData?: DocumentInvoiceData;
  literalOcrText: string;
  rawDescription: string;
}

// Phase 6: Object Finder in Cluttered Scenes
export interface ClutteredObjectFinderResult {
  found: boolean;
  targetItem: string;
  clockPosition?: number;
  relativePosition: 'left' | 'right' | 'center' | 'above' | 'below' | 'in_front' | 'behind' | 'unknown';
  landmarkReference?: string;
  isOccludedOrOverlapping: boolean;
  occlusionExplanationAr?: string;
  occlusionExplanationEn?: string;
  movementSuggestionAr?: string;
  movementSuggestionEn?: string;
  cleanDescription: string;
}

// Phase 6: Uploaded Image Validation
export interface ImageValidationResult {
  isValid: boolean;
  errorMessageAr?: string;
  errorMessageEn?: string;
  fileDetails?: {
    name: string;
    sizeBytes: number;
    mimeType: string;
  };
}

export interface SceneHistoryItem {
  historyId: string;
  frameId: string;
  timestamp: number;
  description: string;
  cleanSpokenText: string;
  tool: VisualToolId;
  queryType: VisualQueryType;
  snapshotDataUrl?: string;
}

export interface QuickQuestionPreset {
  id: string;
  queryAr: string;
  queryEn: string;
  queryFr: string;
  iconName: string;
}

export const QUICK_VQA_PRESETS: QuickQuestionPreset[] = [
  {
    id: 'in_front',
    queryAr: 'ماذا أمامي الآن مباشرة؟',
    queryEn: 'What is directly in front of me right now?',
    queryFr: 'Que se trouve-t-il directement devant moi ?',
    iconName: 'Eye',
  },
  {
    id: 'find_items',
    queryAr: 'أين الكوب أو المفاتيح أو الأغراض القريبة؟',
    queryEn: 'Where is the cup, keys, or nearby items?',
    queryFr: 'Où se trouvent la tasse, les clés ou objets proches ?',
    iconName: 'Compass',
  },
  {
    id: 'read_text',
    queryAr: 'ما المكتوب في هذه الورقة أو اللافتة أمامي؟',
    queryEn: 'What is written on this paper or sign in front of me?',
    queryFr: 'Qu\'est-il écrit sur ce papier ou panneau devant moi ?',
    iconName: 'FileText',
  },
  {
    id: 'product_inspect',
    queryAr: 'ما هذا المنتج وما بياناته وسعره وصلاحيته؟',
    queryEn: 'What is this product, its brand, price, and expiry date?',
    queryFr: 'Quel est ce produit, son prix et sa date d\'expiration ?',
    iconName: 'ShoppingBag',
  },
  {
    id: 'describe_room',
    queryAr: 'صف لي هذه الغرفة ومعالمها والممر أمامي',
    queryEn: 'Describe this room, its layout, and the path ahead',
    queryFr: 'Décrivez cette pièce, son agencement et le passage devant moi',
    iconName: 'MapPin',
  },
  {
    id: 'check_obstacles',
    queryAr: 'هل يوجد أي عائق أو خطر في طريقي؟',
    queryEn: 'Is there any obstacle or hazard in my path?',
    queryFr: 'Y a-t-il un obstacle ou danger sur mon chemin ?',
    iconName: 'AlertTriangle',
  },
  {
    id: 'scene_memory_change',
    queryAr: 'هل تغير شيء في هذا المشهد؟',
    queryEn: 'Has anything changed in this scene?',
    queryFr: 'Y a-t-il eu un changement dans cette scène ?',
    iconName: 'RefreshCw',
  },
  {
    id: 'scene_memory_keys',
    queryAr: 'أين رأيت المفاتيح أو الهاتف آخر مرة؟',
    queryEn: 'Where did I last see my keys or phone?',
    queryFr: 'Où ai-je vu mes clés ou mon téléphone pour la dernière fois ?',
    iconName: 'Clock',
  },
  {
    id: 'barcode_scan',
    queryAr: 'امسح الباركود واقرأ ملصق العبوة',
    queryEn: 'Scan barcode and packaging label',
    queryFr: 'Scanner le code-barres et l\'étiquette',
    iconName: 'ScanLine',
  },
  {
    id: 'expiry_read',
    queryAr: 'اقرأ تاريخ الصلاحية وتاريخ الإنتاج',
    queryEn: 'Read expiry and production date',
    queryFr: 'Lire la date d\'expiration et de fabrication',
    iconName: 'Calendar',
  },
  {
    id: 'clothing_outfit',
    queryAr: 'صف الملابس والألوان ونقوش الإطلالة',
    queryEn: 'Describe clothing, colors, and outfit patterns',
    queryFr: 'Décrire les vêtements, couleurs et motifs',
    iconName: 'Palette',
  },
  {
    id: 'document_structure',
    queryAr: 'حلل بنية المستند أو الفاتورة والجداول',
    queryEn: 'Analyze document structure, tables, and invoice',
    queryFr: 'Analyser la structure du document, tableaux et facture',
    iconName: 'FileText',
  },
];

/**
 * Creates a Visual Companion Session that tracks monotonic sequencing,
 * in-flight abort controllers, stale-response protection, scene conversation context,
 * continuous reading state, and history.
 */
export function createVisualCompanionSession() {
  let seqCounter = 0;
  let activeInFlightSeqId = 0;
  let latestCompletedSeqId = 0;
  let activeAbortController: AbortController | null = null;
  let currentScene: VisualSceneResult | null = null;
  const sceneHistory: SceneHistoryItem[] = [];

  // Phase 3: Scene-bound conversation memory
  let sceneConversationContext: SceneConversationContext | null = null;

  // Phase 6: Session-scoped Scene Memory
  const sceneMemoryObservations: SceneObservationMemoryItem[] = [];

  // Phase 3: Continuous reading state for long documents
  let continuousReadingChunks: string[] = [];
  let currentReadingChunkIndex = 0;
  let isContinuousReadingActiveState = false;

  // Phase 4: Reliability & Performance Telemetry
  let cameraInitTimeMs: number | null = null;
  let lastCaptureTimeMs: number | null = null;
  let lastAnalysisLatencyMs: number | null = null;
  let totalRequestsCount = 0;
  let completedRequestsCount = 0;
  let failedRequestsCount = 0;
  let cancelledRequestsCount = 0;
  let staleRequestsDroppedCount = 0;
  let speechErrorsCount = 0;
  let lowQualityFramesDetected = 0;
  const sessionStartTime = Date.now();

  function recordCameraInitTime(ms: number) {
    cameraInitTimeMs = ms;
  }
  function recordCaptureTime(ms: number) {
    lastCaptureTimeMs = ms;
  }
  function recordAnalysisLatency(ms: number) {
    lastAnalysisLatencyMs = ms;
  }
  function recordRequestAttempt() {
    totalRequestsCount++;
  }
  function recordRequestCompleted() {
    completedRequestsCount++;
  }
  function recordRequestFailed() {
    failedRequestsCount++;
  }
  function recordRequestCancelled() {
    cancelledRequestsCount++;
  }
  function recordStaleDropped() {
    staleRequestsDroppedCount++;
  }
  function recordSpeechError() {
    speechErrorsCount++;
  }
  function recordLowQualityFrame() {
    lowQualityFramesDetected++;
  }
  function getTelemetry(): VisualCompanionTelemetry {
    return {
      cameraInitTimeMs,
      lastCaptureTimeMs,
      lastAnalysisLatencyMs,
      totalRequestsCount,
      completedRequestsCount,
      failedRequestsCount,
      cancelledRequestsCount,
      staleRequestsDroppedCount,
      speechErrorsCount,
      lowQualityFramesDetected,
      sessionStartTime,
    };
  }
  function resetTelemetry() {
    cameraInitTimeMs = null;
    lastCaptureTimeMs = null;
    lastAnalysisLatencyMs = null;
    totalRequestsCount = 0;
    completedRequestsCount = 0;
    failedRequestsCount = 0;
    cancelledRequestsCount = 0;
    staleRequestsDroppedCount = 0;
    speechErrorsCount = 0;
    lowQualityFramesDetected = 0;
  }

  function nextSeqId(): number {
    return ++seqCounter;
  }

  function createFrameRecord(params: {
    dataUrl: string;
    width: number;
    height: number;
    source?: 'live-camera' | 'upload';
  }): CameraFrameRecord {
    const seqId = nextSeqId();
    const timestamp = Date.now();
    return {
      frameId: `frame_${timestamp}_${seqId}`,
      seqId,
      timestamp,
      dataUrl: params.dataUrl,
      width: params.width,
      height: params.height,
      source: params.source || 'live-camera',
    };
  }

  function createAnalysisRequest(params: {
    frame: CameraFrameRecord;
    tool: VisualToolId;
    queryType?: VisualQueryType;
    question?: string;
    detailLevel?: SceneDetailLevel;
    lang?: 'ar' | 'en' | 'fr';
    targetItemQuery?: string;
    readAction?: 'summarize' | 'read';
  }): VisualAnalysisRequest {
    const seqId = params.frame.seqId;
    return {
      requestId: `req_${params.frame.timestamp}_${seqId}`,
      seqId,
      frameId: params.frame.frameId,
      captureTimestamp: params.frame.timestamp,
      tool: params.tool,
      queryType:
        params.queryType ||
        (params.question
          ? 'vqa'
          : params.tool === 'read'
          ? 'ocr'
          : params.tool === 'currency'
          ? 'currency'
          : params.tool === 'object'
          ? 'object'
          : 'scene'),
      question: params.question,
      detailLevel: params.detailLevel || 'standard',
      lang: params.lang || 'ar',
      targetItemQuery: params.targetItemQuery,
      readAction: params.readAction,
    };
  }

  function registerInFlight(request: VisualAnalysisRequest): AbortController {
    totalRequestsCount++;
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    activeInFlightSeqId = request.seqId;
    const controller = new AbortController();
    activeAbortController = controller;
    return controller;
  }

  /**
   * Rule: A response is STALE if:
   * 1. Its request sequence ID is strictly less than the latest completed response.
   * 2. Its request sequence ID is not the active in-flight request.
   */
  function isResponseStale(request: VisualAnalysisRequest): boolean {
    if (request.seqId < latestCompletedSeqId) {
      return true;
    }
    if (request.seqId !== activeInFlightSeqId) {
      return true;
    }
    return false;
  }

  // Phase 3: Scene Conversation context management
  function addSceneConversationTurn(turn: { role: 'user' | 'assistant'; text: string; frameId?: string }) {
    const activeFrameId = turn.frameId || currentScene?.frameId || `frame_${Date.now()}`;
    if (!sceneConversationContext || sceneConversationContext.frameId !== activeFrameId) {
      sceneConversationContext = {
        frameId: activeFrameId,
        captureTimestamp: Date.now(),
        turns: [],
        isSceneCurrent: true,
      };
    }
    sceneConversationContext.turns.push({
      role: turn.role,
      text: turn.text,
      timestamp: Date.now(),
    });
  }

  function getSceneConversation(frameId?: string): { turns: SceneConversationTurn[]; isCurrent: boolean } {
    if (!sceneConversationContext) {
      return { turns: [], isCurrent: false };
    }
    if (frameId && sceneConversationContext.frameId !== frameId) {
      return { turns: [], isCurrent: false };
    }
    return {
      turns: [...sceneConversationContext.turns],
      isCurrent: sceneConversationContext.isSceneCurrent,
    };
  }

  function invalidateSceneContext() {
    if (sceneConversationContext) {
      sceneConversationContext.isSceneCurrent = false;
      sceneConversationContext = null;
    }
    // Phase 6 Invariant: Mark prior memory items as no longer current
    for (const obs of sceneMemoryObservations) {
      obs.isCurrent = false;
    }
  }

  // Phase 6: Session-scoped Scene Observation Memory methods
  function recordSceneObservation(observation: Omit<Partial<SceneObservationMemoryItem>, 'detectedObjects'> & {
    detectedObjects?: Array<SceneObjectObservation | string>;
    adjacency?: Array<{ itemA: string; itemB: string; relation?: string }>;
    rawSummary?: string;
  }): SceneObservationMemoryItem {
    for (const obs of sceneMemoryObservations) {
      obs.isCurrent = false;
    }

    const description = observation.description || observation.rawSummary || '';
    const cleanSpoken = observation.cleanSpokenText || cleanVisionDescription(description, 'ar');

    const normalizedObjects: SceneObjectObservation[] = (observation.detectedObjects || []).map((obj) => {
      if (typeof obj === 'string') {
        return { name: obj };
      }
      return obj;
    });

    if (observation.adjacency) {
      for (const adj of observation.adjacency) {
        const a = normalizedObjects.find((o) => o.name === adj.itemA);
        const b = normalizedObjects.find((o) => o.name === adj.itemB);
        if (a) {
          a.adjacentTo = a.adjacentTo || [];
          if (!a.adjacentTo.includes(adj.itemB)) a.adjacentTo.push(adj.itemB);
        }
        if (b) {
          b.adjacentTo = b.adjacentTo || [];
          if (!b.adjacentTo.includes(adj.itemA)) b.adjacentTo.push(adj.itemA);
        }
      }
    }

    const item: SceneObservationMemoryItem = {
      id: `scene_obs_${Date.now()}_${sceneMemoryObservations.length}`,
      frameId: observation.frameId || `frame_${Date.now()}`,
      timestamp: observation.timestamp || Date.now(),
      description,
      cleanSpokenText: cleanSpoken,
      tool: observation.tool || 'scene',
      detectedObjects: normalizedObjects,
      colors: observation.colors,
      textSnippets: observation.textSnippets,
      isCurrent: true,
    };
    sceneMemoryObservations.unshift(item);
    if (sceneMemoryObservations.length > 20) {
      sceneMemoryObservations.pop();
    }
    return item;
  }

  function getRecentSceneObservations(): SceneObservationMemoryItem[] {
    return [...sceneMemoryObservations];
  }

  function querySceneMemory(question: string, currentFrameId?: string): SceneMemoryQueryResult {
    const normQ = (question || '').toLowerCase().trim();

    // 1. "Has anything changed?" / "هل تغير شيء؟"
    if (/(?:تغير|تغيير|فرق|جديد|changed|different|change)/i.test(normQ)) {
      if (sceneMemoryObservations.length === 0) {
        return {
          answerAr: 'لا توجد مشاهد مسجلة في هذه الجلسة حتى الآن لإجراء المقارنة.',
          answerEn: 'No scene observations have been recorded in this session yet to perform a comparison.',
          groundedInCurrent: false,
          confidence: 'uncertain',
        };
      }
      const currentObs = sceneMemoryObservations[0];
      const prevObs = sceneMemoryObservations[1];
      if (!prevObs) {
        return {
          answerAr: 'هذا هو أول مشهد يتم فحصه في هذه الجلسة، ولا توجد لقطة سابقة للمقارنة بها.',
          answerEn: 'This is the first scene inspected in this session; there is no prior observation to compare against.',
          groundedInCurrent: currentObs.isCurrent,
          matchedObservationTime: currentObs.timestamp,
          confidence: 'high',
        };
      }

      const prevNames = prevObs.detectedObjects.map((o) => o.name);
      const currNames = currentObs.detectedObjects.map((o) => o.name);
      const missing = prevNames.filter((n) => !currNames.includes(n));
      const added = currNames.filter((n) => !prevNames.includes(n));

      const change = detectSceneChange(prevObs.description, currentObs.description, 'ar');
      if (!change.changed && missing.length === 0 && added.length === 0) {
        return {
          answerAr: 'المشهد أمامك مطابق للقطة السابقة تماماً، لم يتغير وضع الأغراض أو مسار الحركة.',
          answerEn: 'The scene in front of you remains unchanged from the previous observation.',
          groundedInCurrent: currentObs.isCurrent,
          matchedObservationTime: currentObs.timestamp,
          confidence: 'high',
        };
      } else {
        const itemDiffAr = [
          missing.length > 0 ? `اختفت بعض الأغراض من الإطار (${missing.join(' و ')})` : '',
          added.length > 0 ? `ظهرت أغراض جديدة (${added.join(' و ')})` : '',
        ]
          .filter(Boolean)
          .join('، ');

        const itemDiffEn = [
          missing.length > 0 ? `items no longer in view (${missing.join(', ')})` : '',
          added.length > 0 ? `new items appeared (${added.join(', ')})` : '',
        ]
          .filter(Boolean)
          .join(', ');

        const finalAr = itemDiffAr
          ? `حدث تغيير في المشهد: ${itemDiffAr}.`
          : `حدث تغيير في المشهد مقارنة باللقطة السابقة: ${change.summary || currentObs.cleanSpokenText}`;

        const finalEn = itemDiffEn
          ? `Scene change detected: ${itemDiffEn}.`
          : `A change occurred compared to the previous scene: ${change.summary || currentObs.cleanSpokenText}`;

        return {
          answerAr: finalAr,
          answerEn: finalEn,
          groundedInCurrent: currentObs.isCurrent,
          matchedObservationTime: currentObs.timestamp,
          confidence: 'high',
        };
      }
    }

    // 2. "Where did I last see [my keys / phone / cup]?" / "أين رأيت [المفاتيح / المحفظة]؟"
    const findItemMatchAr = normQ.match(/(?:أين رأيت|أين كانت|أين|مكان|فين)\s+([\u0600-\u06FF\w\s]+)/i);
    const findItemMatchEn = normQ.match(/(?:where did i (?:last )?see|where was my|where were the|where is my|where is the)\s+([a-zA-Z\s]+)/i);
    let targetEntity = (findItemMatchAr?.[1] || findItemMatchEn?.[1] || '').trim();
    targetEntity = targetEntity
      .replace(/[؟?.,!]/g, '')
      .replace(/(?:آخر مرة|مؤخراً|الآن|last time|recently|today|now)/gi, '')
      .trim();
    const targetNoAl = targetEntity.replace(/^(?:ال)/, '');

    if (targetEntity) {
      for (let i = 0; i < sceneMemoryObservations.length; i++) {
        const obs = sceneMemoryObservations[i];
        const matchObj = obs.detectedObjects.find((o) => {
          const oName = (o.name || '').toLowerCase();
          const oNoAl = oName.replace(/^(?:ال)/, '');
          return (
            oName.includes(targetEntity.toLowerCase()) ||
            targetEntity.toLowerCase().includes(oName) ||
            oNoAl.includes(targetNoAl.toLowerCase()) ||
            targetNoAl.toLowerCase().includes(oNoAl)
          );
        });
        const inText =
          (obs.cleanSpokenText || obs.description || '').toLowerCase().includes(targetEntity.toLowerCase()) ||
          (obs.cleanSpokenText || obs.description || '').toLowerCase().includes(targetNoAl.toLowerCase());

        if (matchObj || inText) {
          const isCurrentlyVisible = obs.isCurrent && obs.frameId === currentFrameId;
          const clockTextAr = matchObj?.clockPosition ? `عند الساعة ${matchObj.clockPosition}` : '';
          const clockTextEn = matchObj?.clockPosition ? `at ${matchObj.clockPosition} o'clock` : '';
          const locAr = matchObj?.relativeLocation || 'في المشهد';
          const locEn = matchObj?.relativeLocation || 'in view';

          const minutesAgo = Math.max(1, Math.round((Date.now() - obs.timestamp) / 60000));
          const timeAgoAr = `منذ ${minutesAgo} دقيقة`;
          const timeAgoEn = `${minutesAgo} min ago`;

          if (isCurrentlyVisible) {
            return {
              answerAr: `"${targetEntity}" موجودة في لقطة الكاميرا الحالية ${clockTextAr} ${locAr}.`,
              answerEn: `"${targetEntity}" is visible in your current camera view ${clockTextEn} ${locEn}.`,
              groundedInCurrent: true,
              matchedObservationTime: obs.timestamp,
              confidence: 'high',
              relativeTimeAgoAr: timeAgoAr,
              relativeTimeAgoEn: timeAgoEn,
            };
          } else {
            return {
              answerAr: `في لقطة سابقة (${timeAgoAr})، كانت "${targetEntity}" ${clockTextAr} ${locAr}، ولكنها غير ظاهرة في إطار الكاميرا الحالي.`,
              answerEn: `In an earlier observation (${timeAgoEn}), "${targetEntity}" was ${clockTextEn} ${locEn}, but it is not visible in your current camera view.`,
              groundedInCurrent: false,
              matchedObservationTime: obs.timestamp,
              confidence: 'moderate',
              relativeTimeAgoAr: timeAgoAr,
              relativeTimeAgoEn: timeAgoEn,
            };
          }
        }
      }

      return {
        answerAr: `لم أرصد "${targetEntity}" في أي من لقطات هذه الجلسة. جرب توجيه الكاميرا ببطء نحو الأسطح المحيطة.`,
        answerEn: `I have not detected "${targetEntity}" in any observation during this session. Try panning your camera around nearby surfaces.`,
        groundedInCurrent: false,
        confidence: 'uncertain',
      };
    }

    // 3. "What was next to [the cup]?" / "ماذا كان بجوار [الكوب]؟"
    const nextToMatchAr = normQ.match(/(?:ماذا كان (?:بجوار|بجانب|قرب))\s+([\u0600-\u06FF\w\s]+)/i);
    const nextToMatchEn = normQ.match(/(?:what was (?:next to|beside|near))\s+([a-zA-Z\s]+)/i);
    let anchorEntity = (nextToMatchAr?.[1] || nextToMatchEn?.[1] || '').trim();
    anchorEntity = anchorEntity.replace(/[؟?.,!]/g, '').trim();
    const anchorNoAl = anchorEntity.replace(/^(?:ال)/, '');

    if (anchorEntity) {
      for (const obs of sceneMemoryObservations) {
        const anchorObj = obs.detectedObjects.find((o) => {
          const oName = (o.name || '').toLowerCase();
          const oNoAl = oName.replace(/^(?:ال)/, '');
          return (
            oName.includes(anchorEntity.toLowerCase()) ||
            anchorEntity.toLowerCase().includes(oName) ||
            oNoAl.includes(anchorNoAl.toLowerCase()) ||
            anchorNoAl.toLowerCase().includes(oNoAl)
          );
        });
        if (anchorObj) {
          const neighbors = anchorObj.adjacentTo || obs.detectedObjects.filter((o) => o.name !== anchorObj.name).map((o) => o.name);
          const isCurrent = obs.isCurrent && obs.frameId === currentFrameId;
          const neighborStrAr = neighbors.length > 0 ? neighbors.join(' و ') : 'أغراض مكتبية أخرى';
          const neighborStrEn = neighbors.length > 0 ? neighbors.join(', ') : 'other desk items';

          if (isCurrent) {
            return {
              answerAr: `بجوار "${anchorEntity}" في المشهد الحالي يظهر: ${neighborStrAr}.`,
              answerEn: `Next to "${anchorEntity}" in the current view: ${neighborStrEn}.`,
              groundedInCurrent: true,
              matchedObservationTime: obs.timestamp,
              confidence: 'high',
            };
          } else {
            return {
              answerAr: `في لقطة سابقة، كان بجوار "${anchorEntity}": ${neighborStrAr}، ولكنها ليست في الإطار الحالي.`,
              answerEn: `In an earlier observation, next to "${anchorEntity}" was: ${neighborStrEn}, but it is not in the current frame.`,
              groundedInCurrent: false,
              matchedObservationTime: obs.timestamp,
              confidence: 'moderate',
            };
          }
        }
      }
      return {
        answerAr: `لم أرصد "${anchorEntity}" في الذاكرة لتحديد ما كان بجواره.`,
        answerEn: `Could not find "${anchorEntity}" in session memory to determine what was next to it.`,
        groundedInCurrent: false,
        confidence: 'uncertain',
      };
    }

    // Fallback to recent observation
    const latest = sceneMemoryObservations[0];
    if (latest) {
      return {
        answerAr: `آخر ما تم رصده في الجلسة: ${latest.cleanSpokenText}`,
        answerEn: `Latest observation recorded: ${latest.cleanSpokenText}`,
        groundedInCurrent: latest.isCurrent,
        matchedObservationTime: latest.timestamp,
        confidence: 'moderate',
      };
    }

    return {
      answerAr: 'الذاكرة البصرية لا تحتوي على أي ملاحظات بعد لهذه الجلسة.',
      answerEn: 'Visual session memory contains no observations yet.',
      groundedInCurrent: false,
      confidence: 'uncertain',
    };
  }

  // Phase 3: Continuous Reading Controller
  function initContinuousReading(text: string): ContinuousReadingChunk[] {
    continuousReadingChunks = segmentDocumentForContinuousReading(text);
    currentReadingChunkIndex = 0;
    isContinuousReadingActiveState = continuousReadingChunks.length > 0;
    return continuousReadingChunks.map((chunk, idx) => ({
      index: idx,
      totalChunks: continuousReadingChunks.length,
      text: chunk,
    }));
  }

  function getCurrentReadingChunk(): ContinuousReadingChunk | null {
    if (!isContinuousReadingActiveState || continuousReadingChunks.length === 0) return null;
    return {
      index: currentReadingChunkIndex,
      totalChunks: continuousReadingChunks.length,
      text: continuousReadingChunks[currentReadingChunkIndex] || '',
    };
  }

  function nextReadingChunk(): { chunk: ContinuousReadingChunk | null; isFinished: boolean } {
    if (!isContinuousReadingActiveState || continuousReadingChunks.length === 0) {
      return { chunk: null, isFinished: true };
    }
    if (currentReadingChunkIndex < continuousReadingChunks.length - 1) {
      currentReadingChunkIndex++;
      return { chunk: getCurrentReadingChunk(), isFinished: false };
    }
    isContinuousReadingActiveState = false;
    return { chunk: null, isFinished: true };
  }

  function prevReadingChunk(): ContinuousReadingChunk | null {
    if (!isContinuousReadingActiveState || continuousReadingChunks.length === 0) return null;
    if (currentReadingChunkIndex > 0) {
      currentReadingChunkIndex--;
    }
    return getCurrentReadingChunk();
  }

  function stopContinuousReading(): void {
    isContinuousReadingActiveState = false;
    currentReadingChunkIndex = 0;
  }

  function commitSceneResult(params: {
    request: VisualAnalysisRequest;
    rawAiResponse: string;
    snapshotDataUrl?: string;
  }): { result: VisualSceneResult; wasStale: boolean } {
    if (isResponseStale(params.request)) {
      staleRequestsDroppedCount++;
      return {
        result: {
          resultId: `res_stale_${Date.now()}`,
          requestId: params.request.requestId,
          frameId: params.request.frameId,
          captureTimestamp: params.request.captureTimestamp,
          completedTimestamp: Date.now(),
          tool: params.request.tool,
          queryType: params.request.queryType,
          description: params.rawAiResponse,
          cleanSpokenText: cleanVisionDescription(params.rawAiResponse, params.request.lang),
          isCurrent: false,
          hasHazard: false,
          isUncertain: false,
          sceneChangedFromPrevious: false,
        },
        wasStale: true,
      };
    }

    completedRequestsCount++;
    latestCompletedSeqId = params.request.seqId;
    activeInFlightSeqId = 0;
    activeAbortController = null;

    const cleanedSpoken = cleanVisionDescription(params.rawAiResponse, params.request.lang);
    const uncertaintyCheck = detectUncertainty(params.rawAiResponse, params.request.lang);
    const changeCheck = currentScene
      ? detectSceneChange(currentScene.description, params.rawAiResponse, params.request.lang)
      : { changed: true, summary: '' };

    // Phase 3 Invariant: If scene materially changed, invalidate previous scene conversation context!
    if (changeCheck.changed) {
      invalidateSceneContext();
    }

    const spatialRelations = extractSpatialRelations(params.rawAiResponse, params.request.lang);
    const textLimits = detectTextLimitations(params.rawAiResponse, params.request.lang);
    const productInfo =
      params.request.queryType === 'product'
        ? parseProductInformation(params.rawAiResponse, params.request.lang)
        : undefined;
    const currencyInfo =
      params.request.tool === 'currency' || params.request.queryType === 'currency'
        ? parseCurrencyResult(params.rawAiResponse, params.request.lang)
        : undefined;
    const objectFinderInfo =
      params.request.tool === 'object' || params.request.queryType === 'object'
        ? parseObjectFinderResult(
            params.rawAiResponse,
            params.request.targetItemQuery || 'الغرض المطلوب',
            params.request.lang
          )
        : undefined;

    // Phase 6 specialized parsers
    const colorPatternInfo =
      params.request.tool === 'color' || params.request.queryType === 'color'
        ? parseColorPatternResult(params.rawAiResponse, params.request.lang)
        : undefined;
    const clothingInfo =
      params.request.queryType === 'clothing' ||
      (params.request.tool === 'color' &&
        /قميص|بنطال|ملابس|لبس|حذاء|فستان|shirt|trousers|dress|garment|jacket|pants/i.test(params.rawAiResponse))
        ? parseClothingAnalysisResult(params.rawAiResponse, params.request.lang)
        : undefined;
    const barcodeInfo =
      params.request.queryType === 'barcode'
        ? parseBarcodeScannerResult(params.rawAiResponse, undefined, params.request.lang)
        : undefined;
    const expiryInfo =
      params.request.queryType === 'expiry' ||
      (params.request.queryType === 'product' &&
        /صلاحية|انتهاء|exp|mfg|prd/i.test(params.rawAiResponse))
        ? parseExpiryDateResult(params.rawAiResponse, params.request.lang)
        : undefined;
    const documentInfo =
      params.request.queryType === 'document' ||
      (params.request.tool === 'read' && /فاتورة|إيصال|جدول|نموذج|invoice|receipt|table|form/i.test(params.rawAiResponse))
        ? parseStructuredDocument(params.rawAiResponse, params.request.lang)
        : undefined;
    const clutteredObjectInfo =
      params.request.tool === 'object' || params.request.queryType === 'object'
        ? parseClutteredObjectFinderResult(
            params.rawAiResponse,
            params.request.targetItemQuery || 'الغرض المطلوب',
            params.request.lang
          )
        : undefined;

    // Phase 6: Grounded Scene Memory Recording
    const detectedObjects: SceneObjectObservation[] = [];
    if (spatialRelations && spatialRelations.length > 0) {
      for (const rel of spatialRelations) {
        detectedObjects.push({
          name: rel.item,
          clockPosition: rel.clockPosition,
          relativeLocation: rel.relativeDistance,
        });
      }
    }
    const commonEntities = [
      { ar: 'مفاتيح', en: 'keys', regex: /مفاتيح|ميدالية|keys/i },
      { ar: 'هاتف', en: 'phone', regex: /هاتف|موبايل|جوال|phone/i },
      { ar: 'كوب', en: 'cup', regex: /كوب|مج|فنجان|cup|mug/i },
      { ar: 'محفظة', en: 'wallet', regex: /محفظة|wallet/i },
      { ar: 'نظارة', en: 'glasses', regex: /نظارة|glasses/i },
      { ar: 'لابتوب', en: 'laptop', regex: /لابتوب|حاسوب|كمبيوتر|laptop/i },
      { ar: 'كتاب', en: 'book', regex: /كتاب|دفتر|book/i },
      { ar: 'قلم', en: 'pen', regex: /قلم|pen/i },
    ];
    for (const ent of commonEntities) {
      if (ent.regex.test(params.rawAiResponse)) {
        const name = params.request.lang === 'en' ? ent.en : ent.ar;
        if (!detectedObjects.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
          detectedObjects.push({
            name,
            clockPosition: spatialRelations[0]?.clockPosition,
            relativeLocation: spatialRelations[0]?.relativeDistance,
          });
        }
      }
    }
    for (let i = 0; i < detectedObjects.length; i++) {
      detectedObjects[i].adjacentTo = detectedObjects.filter((_, idx) => idx !== i).map((o) => o.name);
    }

    recordSceneObservation({
      frameId: params.request.frameId,
      timestamp: params.request.captureTimestamp,
      isCurrent: true,
      description: params.rawAiResponse,
      cleanSpokenText: cleanedSpoken,
      tool: params.request.tool,
      detectedObjects,
      colors: colorPatternInfo?.dominantColors,
      textSnippets: [cleanedSpoken.slice(0, 100)],
    });

    // Archive current scene before overwriting
    if (currentScene) {
      sceneHistory.unshift({
        historyId: `hist_${currentScene.completedTimestamp}_${sceneHistory.length}`,
        frameId: currentScene.frameId,
        timestamp: currentScene.completedTimestamp,
        description: currentScene.description,
        cleanSpokenText: currentScene.cleanSpokenText,
        tool: currentScene.tool,
        queryType: currentScene.queryType,
        snapshotDataUrl: currentScene.snapshotDataUrl,
      });
      if (sceneHistory.length > 25) {
        sceneHistory.pop();
      }
    }

    const newResult: VisualSceneResult = {
      resultId: `res_${Date.now()}_${params.request.seqId}`,
      requestId: params.request.requestId,
      frameId: params.request.frameId,
      captureTimestamp: params.request.captureTimestamp,
      completedTimestamp: Date.now(),
      tool: params.request.tool,
      queryType: params.request.queryType,
      description: params.rawAiResponse,
      cleanSpokenText: cleanedSpoken,
      isCurrent: true,
      hasHazard: /خطر|احذر|انتبه|عائق|درج|حفرة|hazard|obstacle|danger|warning|stairs|fall/i.test(
        params.rawAiResponse
      ),
      isUncertain: uncertaintyCheck.isUncertain,
      uncertaintyReason: uncertaintyCheck.reason,
      spatialRelationships: spatialRelations,
      sceneChangedFromPrevious: changeCheck.changed,
      changeSummary: changeCheck.summary,
      snapshotDataUrl: params.snapshotDataUrl,
      productInfo,
      currencyInfo,
      objectFinderInfo,
      textLimitations: textLimits,
      // Phase 6 extensions
      colorPatternInfo,
      clothingInfo,
      barcodeInfo,
      expiryInfo,
      documentInfo,
      clutteredObjectInfo,
    };

    currentScene = newResult;

    // Record turn in scene-bound conversation context
    if (params.request.question) {
      addSceneConversationTurn({ role: 'user', text: params.request.question, frameId: newResult.frameId });
      addSceneConversationTurn({ role: 'assistant', text: cleanedSpoken, frameId: newResult.frameId });
    }

    return { result: newResult, wasStale: false };
  }

  return {
    nextSeqId,
    createFrameRecord,
    createAnalysisRequest,
    registerInFlight,
    isResponseStale,
    commitSceneResult,
    getCurrentScene: () => currentScene,
    getSceneHistory: () => [...sceneHistory],
    getLatestCompletedSeqId: () => latestCompletedSeqId,
    getActiveInFlightSeqId: () => activeInFlightSeqId,
    cancelInFlight: () => {
      cancelledRequestsCount++;
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      activeInFlightSeqId = 0;
    },
    clearHistory: () => {
      sceneHistory.length = 0;
    },
    // Phase 3 extensions
    addSceneConversationTurn,
    getSceneConversation,
    invalidateSceneContext,
    initContinuousReading,
    getCurrentReadingChunk,
    nextReadingChunk,
    prevReadingChunk,
    stopContinuousReading,
    isContinuousReadingActive: () => isContinuousReadingActiveState,
    // Phase 4 Telemetry
    recordCameraInitTime,
    recordCaptureTime,
    recordAnalysisLatency,
    recordRequestAttempt,
    recordRequestCompleted,
    recordRequestFailed,
    recordRequestCancelled,
    recordStaleDropped,
    recordSpeechError,
    recordLowQualityFrame,
    getTelemetry,
    resetTelemetry,
    // Phase 6 Scene Memory
    recordSceneObservation,
    getRecentSceneObservations,
    querySceneMemory,
  };
}

/**
 * Detects whether the visual description explicitly communicates uncertainty or ambiguity.
 */
export function detectUncertainty(
  text: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): { isUncertain: boolean; reason?: string } {
  if (!text) return { isUncertain: true, reason: 'Empty text' };

  const uncertainArPatterns = [
    /غير واضحة?/i,
    /غير مؤكد/i,
    /لا يمكن التأكد/i,
    /يبدو كأنه/i,
    /قد يكون/i,
    /إضاءة خافتة/i,
    /مشوش/i,
    /غير مكتمل/i,
    /تعذر التعرف/i,
    /غير مقروء/i,
  ];

  const uncertainEnPatterns = [
    /unclear/i,
    /uncertain/i,
    /cannot confirm/i,
    /appears to be/i,
    /might be/i,
    /could be/i,
    /dimly lit/i,
    /blurry/i,
    /partially visible/i,
    /not enough evidence/i,
    /insufficient/i,
    /illegible/i,
  ];

  const uncertainFrPatterns = [
    /flou/i,
    /incertain/i,
    /semble être/i,
    /peut-être/i,
    /éclairage faible/i,
    /incomplet/i,
    /impossible de confirmer/i,
    /illisible/i,
  ];

  const patterns = lang === 'en' ? uncertainEnPatterns : lang === 'fr' ? uncertainFrPatterns : uncertainArPatterns;
  for (const pat of patterns) {
    if (pat.test(text)) {
      return { isUncertain: true, reason: pat.source };
    }
  }

  return { isUncertain: false };
}

/**
 * Compares two consecutive scene descriptions to check whether a material change occurred.
 */
export function detectSceneChange(
  previousDesc: string,
  newDesc: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): { changed: boolean; summary: string } {
  if (!previousDesc || !newDesc) {
    return { changed: true, summary: '' };
  }

  const cleanPrev = cleanVisionDescription(previousDesc, lang).toLowerCase().trim();
  const cleanNew = cleanVisionDescription(newDesc, lang).toLowerCase().trim();

  // If text is virtually identical or explicitly says unchanged
  if (cleanPrev === cleanNew) {
    const summary =
      lang === 'en'
        ? 'Scene unchanged, the view in front of you remains the same.'
        : lang === 'fr'
        ? 'Scène inchangée, la vue devant vous reste la même.'
        : 'المشهد لم يتغير، ما زال الوضع أمامك كما هو.';
    return { changed: false, summary };
  }

  // Token overlap similarity check
  const prevWords = new Set(cleanPrev.split(/\s+/).filter((w) => w.length > 2));
  const newWords = new Set(cleanNew.split(/\s+/).filter((w) => w.length > 2));
  let intersectionCount = 0;
  for (const w of newWords) {
    if (prevWords.has(w)) intersectionCount++;
  }
  const unionSize = new Set([...prevWords, ...newWords]).size;
  const jaccard = unionSize > 0 ? intersectionCount / unionSize : 0;

  if (jaccard > 0.8) {
    const summary =
      lang === 'en'
        ? 'Scene virtually unchanged.'
        : lang === 'fr'
        ? 'Scène quasi-identique.'
        : 'المشهد متطابق مع السابق دون تغيير يذكر.';
    return { changed: false, summary };
  }

  const summary =
    lang === 'en'
      ? 'New scene detected.'
      : lang === 'fr'
      ? 'Nouvelle scène détectée.'
      : 'مشهد جديد أمامك.';
  return { changed: true, summary };
}

/**
 * Extracts approximate spatial relationships (clock-face positions, directions, reachability)
 * from visual descriptions without fabricating exact metric distances.
 */
export function extractSpatialRelations(text: string, _lang: 'ar' | 'en' | 'fr' = 'ar'): SpatialObjectRelation[] {
  const relations: SpatialObjectRelation[] = [];
  if (!text) return relations;

  // Clock face detection: e.g. "عند الساعة 2", "الساعة 10", "at 2 o'clock", "à 3 heures"
  const clockMatchesAr = text.matchAll(/(?:عند\s+)?الساعة\s*(\d{1,2})/gi);
  for (const m of clockMatchesAr) {
    const clock = parseInt(m[1], 10);
    if (clock >= 1 && clock <= 12) {
      relations.push({
        item: 'غرض أو معلم مكاني',
        clockPosition: clock,
        direction: clock <= 2 || clock >= 11 ? 'front' : clock >= 3 && clock <= 5 ? 'right' : 'left',
        pathClear: !/عائق|مانع|حاجز/i.test(text),
      });
    }
  }

  const clockMatchesEn = text.matchAll(/at\s*(\d{1,2})\s*o'?clock/gi);
  for (const m of clockMatchesEn) {
    const clock = parseInt(m[1], 10);
    if (clock >= 1 && clock <= 12) {
      relations.push({
        item: 'detected object',
        clockPosition: clock,
        direction: clock <= 2 || clock >= 11 ? 'front' : clock >= 3 && clock <= 5 ? 'right' : 'left',
        pathClear: !/obstacle|hazard|blocked/i.test(text),
      });
    }
  }

  // Directional relative hints
  if (/على يمينك|على اليمين|to your right|on your right/i.test(text)) {
    relations.push({ item: 'معلم جهة اليمين', direction: 'right' });
  }
  if (/على يسارك|على اليسار|to your left|on your left/i.test(text)) {
    relations.push({ item: 'معلم جهة اليسار', direction: 'left' });
  }
  if (/أمامك مباشرة|في متناول اليد|directly in front|within reach/i.test(text)) {
    relations.push({ item: 'أمامك في المتناول', direction: 'front' });
  }

  return relations;
}

/**
 * Phase 3 — Smart Text Reader: Detects limitations, blur, truncation, or border cutoffs in OCR.
 */
export function detectTextLimitations(
  text: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): { hasLimitations: boolean; reason?: string; isTruncated: boolean; isBlurry: boolean } {
  if (!text) {
    return { hasLimitations: true, reason: 'Empty text', isTruncated: false, isBlurry: false };
  }

  const truncatedAr = /مقطوع|حافة|غير مكتمل|ناقص|طرف الصفحة|مبتور/i.test(text);
  const truncatedEn = /cut off|truncated|edge of (?:page|frame)|incomplete|partially visible text/i.test(text);
  const isTruncated = lang === 'en' ? truncatedEn : truncatedAr;

  const blurryAr = /مشوش|غير مقروء|إضاءة ضعيفة|غير واضح|طمس|باهت/i.test(text);
  const blurryEn = /blurry|illegible|poor lighting|unreadable|obscured|faint/i.test(text);
  const isBlurry = lang === 'en' ? blurryEn : blurryAr;

  const hasLimitations = isTruncated || isBlurry;
  let reason: string | undefined;

  if (isTruncated && isBlurry) {
    reason =
      lang === 'en'
        ? 'Text is partially cut off at frame edge and affected by low clarity.'
        : 'النص مقطوع جزئياً عند حافة الإطار ومشوش في بعض السطور.';
  } else if (isTruncated) {
    reason =
      lang === 'en'
        ? 'Text appears cut off at the edge of the camera view.'
        : 'النص مقطوع جزئياً عند حافة لقطة الكاميرا.';
  } else if (isBlurry) {
    reason =
      lang === 'en'
        ? 'Text clarity is reduced due to lighting or camera movement.'
        : 'وضوح النص ضعيف نظراً لظروف الإضاءة أو حركة الكاميرا.';
  }

  return { hasLimitations, reason, isTruncated, isBlurry };
}

/**
 * Phase 3 — Smart Text Reader: Segments long documents into natural paragraphs or sentence chunks
 * for accessible continuous reading with pause/resume and segment replay.
 */
export function segmentDocumentForContinuousReading(text: string): string[] {
  if (!text) return [];

  // Clean conversational prefixes or boilerplate
  const clean = text
    .replace(/^النص المكتوب[:\s]*/i, '')
    .replace(/^Text read[:\s]*/i, '')
    .trim();

  // Split by double newline (paragraphs) or clear section headers
  const rawParagraphs = clean.split(/\n\s*\n|\r\n\s*\r\n/);
  const chunks: string[] = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If paragraph is extraordinarily long (>350 characters), segment by sentences
    if (trimmed.length > 350) {
      const sentences = trimmed.match(/[^.!?؟]+[.!?؟]+|\S+$/g) || [trimmed];
      let currentSubChunk = '';
      for (const sent of sentences) {
        if ((currentSubChunk + ' ' + sent).length > 300) {
          if (currentSubChunk.trim()) chunks.push(currentSubChunk.trim());
          currentSubChunk = sent;
        } else {
          currentSubChunk += (currentSubChunk ? ' ' : '') + sent;
        }
      }
      if (currentSubChunk.trim()) chunks.push(currentSubChunk.trim());
    } else {
      chunks.push(trimmed);
    }
  }

  return chunks.length > 0 ? chunks : [clean];
}

/**
 * Phase 3 — Object Finder: Generates safe camera movement guidance when an object is not found.
 * Never invents fake physical metric distances.
 */
export function getRepositionAdvice(targetItem: string, lang: 'ar' | 'en' | 'fr' = 'ar'): string {
  if (lang === 'en') {
    return `The item "${targetItem}" is not clearly visible in this frame. Try slowly panning your camera to the right, or tilting down toward the desk surface under better lighting.`;
  }
  if (lang === 'fr') {
    return `L'objet "${targetItem}" n'est pas visible dans ce cadre. Essayez de déplacer lentement la caméra vers la droite ou de l'incliner vers la table.`;
  }
  return `لم أتمكن من رؤية "${targetItem}" في هذا الإطار. جرب تحريك الكاميرا ببطء جهة اليمين أو إمالتها لأسفل نحو سطح الطاولة مع تحسين الإضاءة.`;
}

/**
 * Phase 3 — Object Finder: Parses response to verify visual grounding and safety limits.
 */
export function parseObjectFinderResult(
  text: string,
  targetItem: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): ObjectFinderResult {
  const notFoundPatterns = [
    /غير مرئي/i,
    /لم أتمكن من العثور/i,
    /لا يظهر/i,
    /غير موجود في هذه اللقطة/i,
    /not visible/i,
    /cannot be found/i,
    /not detected/i,
    /not seen in this view/i,
  ];

  const isNotFound = notFoundPatterns.some((p) => p.test(text));
  const cleanDesc = cleanVisionDescription(text, lang);

  if (isNotFound) {
    return {
      found: false,
      item: targetItem,
      movementSuggestion: getRepositionAdvice(targetItem, lang),
      cleanDescription: cleanDesc,
    };
  }

  // Extract clock position if present
  let clock: number | undefined;
  const clockAr = text.match(/الساعة\s*(\d{1,2})/i);
  const clockEn = text.match(/at\s*(\d{1,2})\s*o'?clock/i);
  if (clockAr) clock = parseInt(clockAr[1], 10);
  else if (clockEn) clock = parseInt(clockEn[1], 10);

  // Relative location
  let location: string | undefined;
  if (/على اليمين|on your right/i.test(text)) location = lang === 'ar' ? 'جهة اليمين' : L('on the right');
  else if (/على اليسار|on your left/i.test(text)) location = lang === 'ar' ? 'جهة اليسار' : L('on the left');
  else if (/أمامك|in front/i.test(text)) location = lang === 'ar' ? 'أمامك في المتناول' : L('in front');

  const pathClear = !/عائق|مانع|حاجز|obstacle|blocked/i.test(text);

  return {
    found: true,
    item: targetItem,
    clockPosition: clock,
    relativeLocation: location,
    pathClear,
    cleanDescription: cleanDesc,
  };
}

/**
 * Phase 3 — Product Assistant: Parses packaging information and separates verbatim detected text
 * from inferred product categorization. Strictly rejects invented ingredients or expiry dates.
 */
export function parseProductInformation(text: string, lang: 'ar' | 'en' | 'fr' = 'ar'): ProductInfoResult {
  const clean = cleanVisionDescription(text, lang);

  // Extract price
  let price: string | undefined;
  const priceAr = text.match(/(?:السعر|بـ|بقيمة)?\s*(\d+(?:\.\d+)?)\s*(?:جنيه|ج\.م|ريال|دولار|يورو|EGP|USD|EUR|SAR)/i);
  if (priceAr) price = priceAr[0].trim();

  // Extract quantity/weight
  let quantity: string | undefined;
  const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:مل|لتر|جم|جرام|كجم|كيلو|g|kg|ml|l|oz|count|قطعة)/i);
  if (qtyMatch) quantity = qtyMatch[0].trim();

  // Expiry date verification
  const expiryUnclear = /تاريخ الصلاحية غير واضح|غير مقروء|غير ظاهر|no expiry date visible|expiry date not visible|illegible/i.test(
    text
  );
  let expiryDate: string | undefined;
  if (!expiryUnclear) {
    const expMatch = text.match(/(?:صلاحية|انتهاء|exp(?:iry)?|best before)?\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{2,4})/i);
    if (expMatch) expiryDate = expMatch[1].trim();
  }

  // Separate detected text from inferred information
  let detectedText = clean;
  let inferredInfo = '';

  const splitMarkerAr = /المعلومات المستنتجة|الاستنتاج|النوع التقريبي/i;
  const splitMarkerEn = /inferred product information|product summary/i;
  const marker = lang === 'en' ? splitMarkerEn : splitMarkerAr;

  if (marker.test(clean)) {
    const parts = clean.split(marker);
    detectedText = parts[0]?.trim() || clean;
    inferredInfo = parts[1]?.trim() || '';
  }

  return {
    price,
    quantity,
    expiryDate,
    isExpiryLegible: !expiryUnclear && Boolean(expiryDate),
    detectedText,
    inferredInfo,
    hasUncertainty: expiryUnclear || detectUncertainty(text, lang).isUncertain,
  };
}

/**
 * Phase 3 — Currency Recognition: Validates banknote denomination, evaluates confidence,
 * requests a better image if folded/unclear, and attaches counterfeit disclaimer.
 */
export function parseCurrencyResult(text: string, lang: 'ar' | 'en' | 'fr' = 'ar'): CurrencyResult {
  const isUncertain = detectUncertainty(text, lang).isUncertain || /لم أتمكن|غير واضحة?|unclear|folded/i.test(text);

  let denomination: string | undefined;
  let currency: string | undefined;

  // EGP checks
  if (/مائتا|مئتا|200\s*(?:جنيه|egp)/i.test(text)) {
    denomination = '200';
    currency = lang === 'ar' ? 'جنيه مصري' : L('Egyptian Pounds');
  } else if (/مائة|100\s*(?:جنيه|egp)/i.test(text)) {
    denomination = '100';
    currency = lang === 'ar' ? 'جنيه مصري' : L('Egyptian Pounds');
  } else if (/خمسون|50\s*(?:جنيه|egp)/i.test(text)) {
    denomination = '50';
    currency = lang === 'ar' ? 'جنيه مصري' : L('Egyptian Pounds');
  } else if (/عشرون|20\s*(?:جنيه|egp)/i.test(text)) {
    denomination = '20';
    currency = lang === 'ar' ? 'جنيه مصري' : L('Egyptian Pounds');
  } else if (/عشرة|10\s*(?:جنيه|egp)/i.test(text)) {
    denomination = '10';
    currency = lang === 'ar' ? 'جنيه مصري' : L('Egyptian Pounds');
  } else if (/خمسة|5\s*(?:جنيه|egp)/i.test(text)) {
    denomination = '5';
    currency = lang === 'ar' ? 'جنيه مصري' : L('Egyptian Pounds');
  }

  // USD / EUR / SAR checks
  if (!currency) {
    if (/dollar|دولار/i.test(text)) currency = lang === 'ar' ? 'دولار أمريكي' : L('US Dollars');
    else if (/euro|يورو/i.test(text)) currency = lang === 'ar' ? 'يورو' : L('Euros');
    else if (/riyal|ريال/i.test(text)) currency = lang === 'ar' ? 'ريال سعودي' : L('Saudi Riyals');
  }

  const confidence = isUncertain ? 'uncertain' : denomination ? 'high' : 'moderate';
  const needsBetterImage = isUncertain || !denomination;

  const guidanceMessage = needsBetterImage
    ? lang === 'en'
      ? 'Banknote is partially folded or in low light. Please unfold the bill and hold steady under clear light.'
      : 'الورقة النقدية مطوية أو الإضاءة غير كافية. يرجى فرد الورقة وتثبيت الكاميرا في إضاءة واضحة.'
    : undefined;

  return {
    denomination,
    currency,
    confidence,
    needsBetterImage,
    guidanceMessage,
    disclaimer: lang === 'en' ? CURRENCY_COUNTERFEIT_DISCLAIMER_EN : CURRENCY_COUNTERFEIT_DISCLAIMER_AR,
  };
}

/* =========================================================================
   Phase 6: Advanced Visual Intelligence Parsers & Utilities
   ========================================================================= */

/**
 * Phase 6 — Color & Pattern Detector:
 * Identifies dominant colors, simple patterns (solid, striped, plaid, floral, polka dots, textured),
 * color relationships, and explicit lighting warnings when low illumination introduces uncertainty.
 */
export function parseColorPatternResult(
  text: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): ColorPatternResult {
  const clean = cleanVisionDescription(text, lang);
  const lower = clean.toLowerCase();

  // Pattern detection
  let pattern: GarmentPatternType = 'solid';
  let patternLabelAr = 'سادة (لون موحد)';
  let patternLabelEn = 'Solid (Uniform Color)';

  if (/(?:مقلم|مخطط|خطوط|striped|stripes|rayé)/i.test(lower)) {
    pattern = 'striped';
    patternLabelAr = 'مقلم بخطوط';
    patternLabelEn = 'Striped';
  } else if (/(?:كاروهات|مربعات|شطرنجي|plaid|checkered|tartan|gingham|carreaux)/i.test(lower)) {
    pattern = 'plaid';
    patternLabelAr = 'كاروهات (مربعات)';
    patternLabelEn = 'Plaid / Checkered';
  } else if (/(?:مشجر|زهور|ورود|ورد|floral|flower|fleuri)/i.test(lower)) {
    pattern = 'floral';
    patternLabelAr = 'مشجر (نقوش زهور)';
    patternLabelEn = 'Floral';
  } else if (/(?:منقط|نقط|polka\s*dot|spotted|pois)/i.test(lower)) {
    pattern = 'polka_dot';
    patternLabelAr = 'منقط (بولكا دوت)';
    patternLabelEn = 'Polka Dot';
  } else if (/(?:محبوك|نسيج بارز|تريكو|صوف|textured|ribbed|waffle|cable knit)/i.test(lower)) {
    pattern = 'textured';
    patternLabelAr = 'محبوك بنسيج بارز';
    patternLabelEn = 'Textured / Knit';
  }

  // Dominant color detection
  const dominantColors: string[] = [];
  const colorMap: Array<{ key: string; ar: string; en: string; regex: RegExp }> = [
    { key: 'black', ar: 'أسود', en: 'Black', regex: /أسود|سوداء|black|noir/i },
    { key: 'white', ar: 'أبيض', en: 'White', regex: /أبيض|بيضاء|white|blanc/i },
    { key: 'navy', ar: 'كحلي داكن', en: 'Navy Blue', regex: /كحلي|أزرق داكن|navy/i },
    { key: 'blue', ar: 'أزرق', en: 'Blue', regex: /أزرق|زرقة|blue|bleu/i },
    { key: 'red', ar: 'أحمر', en: 'Red', regex: /أحمر|حمراء|red|rouge/i },
    { key: 'green', ar: 'أخضر', en: 'Green', regex: /أخضر|خضراء|زيتي|green|vert|olive/i },
    { key: 'grey', ar: 'رمادي', en: 'Grey', regex: /رمادي|رصاصي|grey|gray|gris/i },
    { key: 'beige', ar: 'بيج', en: 'Beige', regex: /بيج|خردلي|خاكي|beige|khaki/i },
    { key: 'brown', ar: 'بني', en: 'Brown', regex: /بني|بنية|brown|marron/i },
    { key: 'yellow', ar: 'أصفر', en: 'Yellow', regex: /أصفر|صفراء|yellow|jaune/i },
  ];

  for (const c of colorMap) {
    if (c.regex.test(lower)) {
      dominantColors.push(lang === 'en' ? c.en : c.ar);
    }
  }

  // Lighting confidence check
  const lowLight = /(?:إضاءة خافتة|إضاءة ضعيفة|ظلال|غير واضحة?|dim light|low light|shadowy|poor lighting|éclairage faible)/i.test(
    lower
  );
  const lightingConfidence = lowLight ? 'low' : 'high';
  const lightingWarningAr = lowLight
    ? 'تنبيه إضاءة: الإضاءة خافتة أو غير متساوية، لذا قد يصعب التمييز بدقة بين الكحلي والأسود أو البني والزيتي بصرياً.'
    : undefined;
  const lightingWarningEn = lowLight
    ? 'Lighting Notice: Dim illumination detected; subtle differentiation between deep navy, black, or dark olive cannot be optically guaranteed.'
    : undefined;

  const relationshipsAr =
    dominantColors.length > 1
      ? `تداخل متناسق بين ${dominantColors.slice(0, 3).join(' و ')} بنمط ${patternLabelAr}.`
      : `اللون السائد هو ${dominantColors[0] || 'غير محدد بدقة'} بنمط ${patternLabelAr}.`;

  const relationshipsEn =
    dominantColors.length > 1
      ? `Harmonious interplay of ${dominantColors.slice(0, 3).join(', ')} in a ${patternLabelEn} pattern.`
      : `Primary color is ${dominantColors[0] || 'unspecified'} in a ${patternLabelEn} pattern.`;

  return {
    dominantColors,
    pattern,
    patternLabelAr,
    patternLabelEn,
    lightingConfidence,
    lightingWarningAr,
    lightingWarningEn,
    relationshipsAr,
    relationshipsEn,
    rawDescription: clean,
  };
}

/**
 * Phase 6 — Clothing Assistant:
 * Describes visible clothing items, colors, patterns, and outfit matching suggestions.
 * Strictly avoids personal/demographic/body shape inferences and explicitly warns when garments are cut off.
 */
export function parseClothingAnalysisResult(
  text: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): ClothingAnalysisResult {
  const clean = cleanVisionDescription(text, lang);
  const lower = clean.toLowerCase();

  const items: ClothingItemInfo[] = [];
  const garmentDefinitions: Array<{ categoryAr: string; categoryEn: string; regex: RegExp }> = [
    { categoryAr: 'قميص / توب', categoryEn: 'Shirt / Top', regex: /قميص|بلوزة|تيشرت|shirt|t-shirt|blouse|haut/i },
    { categoryAr: 'بنطال / سروال', categoryEn: 'Trousers / Pants', regex: /بنطال|بنطلون|سروال|جينز|pants|trousers|jeans|pantalon/i },
    { categoryAr: 'جاكيت / معطف', categoryEn: 'Jacket / Coat', regex: /جاكيت|بليزر|معطف|سترة|jacket|coat|blazer|veste/i },
    { categoryAr: 'فستان / عباءة', categoryEn: 'Dress / Abaya', regex: /فستان|عباءة|عباية|dress|robe|abaya/i },
    { categoryAr: 'حذاء', categoryEn: 'Shoes / Footwear', regex: /حذاء|جزمة|كوتشي|shoes|sneakers|chaussures/i },
    { categoryAr: 'وشاح / حجاب', categoryEn: 'Scarf / Hijab', regex: /وشاح|إيشارب|حجاب|شال|scarf|hijab|écharpe/i },
  ];

  for (const g of garmentDefinitions) {
    if (g.regex.test(lower)) {
      const isCutOff = /(?:مقطوع|خارج الإطار|حافة الكاميرا|غير مكتمل|cut off|outside frame|edge of camera)/i.test(
        lower
      );
      items.push({
        category: lang === 'en' ? g.categoryEn : g.categoryAr,
        color: lang === 'en' ? 'Described in summary' : 'مفصل في الوصف',
        pattern: 'solid',
        isCutOff,
      });
    }
  }

  const hasCutOff = /(?:مقطوع|خارج الإطار|حافة الكاميرا|طرف الإطار|cut off|outside frame|partially visible at boundary)/i.test(
    lower
  );
  const cutOffNoticeAr = hasCutOff
    ? 'تنبيه: جزء من الملابس يقع عند حافة الكاميرا أو خارج الإطار، لذا قد لا تظهر القطعة كاملة.'
    : undefined;
  const cutOffNoticeEn = hasCutOff
    ? 'Notice: Portions of the garment are cut off at the camera frame boundary.'
    : undefined;

  const pairingSuggestionsAr: string[] = [];
  const pairingSuggestionsEn: string[] = [];
  if (/(?:يتناسق مع|مناسب مع|يمكن ارتداؤه مع|pairs well with|coordinates with|matches)/i.test(lower)) {
    pairingSuggestionsAr.push('ينسجم المظهر مع ألوان حيادية كالبيج، الرمادي الفاتح، أو الكحلي.');
    pairingSuggestionsEn.push('Pairs harmoniously with neutral tones like beige, light grey, or deep navy.');
  } else {
    pairingSuggestionsAr.push('ينصح بتنسيق القطعة مع بنطال أو تنورة بألوان كلاسيكية هادئة لضمان التناسق.');
    pairingSuggestionsEn.push('Recommended to coordinate with classic neutral trousers or skirt for balanced harmony.');
  }

  return {
    items,
    pairingSuggestionsAr,
    pairingSuggestionsEn,
    hasCutOffGarments: hasCutOff,
    cutOffNoticeAr,
    cutOffNoticeEn,
    rawDescription: clean,
  };
}

/**
 * Phase 6 — Native Browser Barcode Detector with graceful fallback
 */
export async function detectBarcodeFromCanvasOrImage(
  source: HTMLCanvasElement | HTMLImageElement
): Promise<{ value: string; format: string } | null> {
  try {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      });
      const results = await detector.detect(source);
      if (results && results.length > 0 && results[0].rawValue) {
        return {
          value: results[0].rawValue,
          format: results[0].format || 'barcode',
        };
      }
    }
  } catch (err) {
    // Native BarcodeDetector failed or format unsupported, fall back gracefully to OCR
  }
  return null;
}

/**
 * Phase 6 — Barcode & Product Label Scanner:
 * Parses scanned barcodes and visible product label text.
 * Strictly separates barcode data, OCR text, and AI interpretation, disclosing database absence honestly.
 */
export function parseBarcodeScannerResult(
  text: string,
  barcodeRaw?: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): BarcodeScannerResult {
  const clean = cleanVisionDescription(text, lang);
  let barcodeValue = barcodeRaw;

  if (!barcodeValue) {
    const codeMatch = text.match(/\b(97[89]\d{10}|\d{13}|\d{12}|\d{8})\b/);
    if (codeMatch) {
      barcodeValue = codeMatch[1];
    }
  }

  const hasBarcode = Boolean(barcodeValue);
  const barcodeFormat = barcodeValue
    ? barcodeValue.length === 13
      ? 'EAN-13'
      : barcodeValue.length === 12
      ? 'UPC-A'
      : barcodeValue.length === 8
      ? 'EAN-8'
      : 'Code-128'
    : undefined;

  const databaseDisclaimerAr =
    'تنبيه: تم رصد الباركود والملصق بنجاح. يرجى العلم بأنه لا تتوفر قاعدة بيانات تجارية محلية مفهرسة للبحث التلقائي عن الكتالوج، وتعتمد البيانات المعروضة على النصوص المقروءة بصرياً من العبوة.';
  const databaseDisclaimerEn =
    'Notice: Barcode and label detected. Please note that no offline commercial product catalog database is linked for automatic SKU registry lookup; details are grounded strictly in visible packaging text.';

  let visibleLabelText = clean;
  let interpretation = '';
  const interpMarker = /(?:الاستنتاج|البيان العام|interpretation|summary)/i;
  if (interpMarker.test(clean)) {
    const parts = clean.split(interpMarker);
    visibleLabelText = parts[0]?.trim() || clean;
    interpretation = parts[1]?.trim() || '';
  }

  return {
    barcodeValue,
    barcodeFormat,
    visibleLabelText,
    interpretation,
    databaseDisclaimerAr,
    databaseDisclaimerEn,
    hasBarcode,
    rawDescription: clean,
  };
}

/**
 * Phase 6 — Expiry Date Reader:
 * Detects manufacturing and expiry dates, distinguishing between production date, expiry date, and batch number.
 * Enforces safety disclaimer and provides repositioning advice when blurry or cropped.
 */
export function parseExpiryDateResult(
  text: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): ExpiryDateResult {
  const clean = cleanVisionDescription(text, lang);
  const lower = clean.toLowerCase();

  const safetyDisclaimerAr =
    'تنبيه سلامة: قراءة تاريخ الصلاحية أداة مساعدة ولا تغني عن فحص سلامة العبوة أو الرائحة. لا يمكن للذكاء الاصطناعي الجزم بصلاحية استهلاك المنتج الغذائي أو الدوائي بصرياً فقط.';
  const safetyDisclaimerEn =
    'Safety Notice: Optical date detection is assistive only and cannot guarantee seal integrity, proper storage, or product safety. Never consume questionable food or medicine based solely on camera reading.';

  let repositionGuidanceAr: string | undefined;
  let repositionGuidanceEn: string | undefined;
  const isUnclear = /(?:غير واضح|مشوش|غير مقروء|مقطوع|unclear|blurry|illegible|cut off|faint)/i.test(
    lower
  );
  if (isUnclear) {
    repositionGuidanceAr =
      'تاريخ الصلاحية غير واضح أو مقطوع عند الحافة. يرجى تدوير العبوة أو تقريب الكاميرا من قاع العبوة أو الغطاء تحت إضاءة مباشرة وتثبيت اليد.';
    repositionGuidanceEn =
      'Expiry date is blurry or cut off at the frame boundary. Please rotate the container or bring the camera closer to the bottom or cap under direct light.';
  }

  // Extract Expiry Date
  let expiryDate: string | undefined;
  const expMatch = clean.match(
    /(?:انتهاء|صلاحية|صالح حتى|صالحة لغاية|exp(?:iry)?|best before|bb)\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/i
  );
  if (expMatch) {
    expiryDate = expMatch[1].trim();
  }

  // Extract Production / Manufacturing Date
  let productionDate: string | undefined;
  const prdMatch = clean.match(
    /(?:إنتاج|صنع في|تاريخ الصنع|prd|mfg|prod)\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/i
  );
  if (prdMatch) {
    productionDate = prdMatch[1].trim();
  }

  // Extract Batch / Lot Number
  let batchNumber: string | undefined;
  const batchMatch = clean.match(
    /(?:تشغيلة|دفعة|رقم التشغيلة|lot|batch|bn)\s*[:\s]*([A-Za-z0-9\-_]+)/i
  );
  if (batchMatch) {
    batchNumber = batchMatch[1].trim();
  }

  // Fallback date match if no specific keyword matched, but ensure it's not the production date
  if (!expiryDate && !isUnclear) {
    const anyDate = clean.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{2,4})\b/);
    if (anyDate && anyDate[1] !== productionDate) {
      expiryDate = anyDate[1].trim();
    }
  }

  const isLegible = Boolean(expiryDate) && !isUnclear;

  return {
    expiryDate,
    productionDate,
    batchNumber,
    isLegible,
    safetyDisclaimerAr,
    safetyDisclaimerEn,
    repositionGuidanceAr,
    repositionGuidanceEn,
    rawDescription: clean,
  };
}

/**
 * Phase 6 — Document Understanding:
 * Structured OCR detecting headings, paragraphs, tables, forms, lists, invoices/receipts,
 * with audio-friendly summary and strict separation of literal text from interpretation.
 */
export function parseStructuredDocument(
  text: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): StructuredDocumentResult {
  const clean = cleanVisionDescription(text, lang);
  const lines = (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const headings: string[] = [];
  const paragraphs: string[] = [];
  const formFields: DocumentFormField[] = [];
  const tables: DocumentTable[] = [];
  const lists: string[][] = [];
  let currentList: string[] = [];

  let documentType: StructuredDocumentResult['documentType'] = 'general';

  // Invoice / receipt detection
  let invoiceData: DocumentInvoiceData | undefined;
  const isInvoice = /(?:فاتورة|إيصال|سند قبض|ضريبة|invoice|receipt|tax invoice|bill to|total amount)/i.test(
    clean
  );
  if (isInvoice) {
    documentType = 'invoice_receipt';
    let vendor: string | undefined;
    let date: string | undefined;
    let total: string | undefined;
    let invoiceNumber: string | undefined;

    const vendorMatch = clean.match(/(?:شركة|متجر|مؤسسة|محل|المورد|vendor|merchant|from):\s*([^\n\r]+)/i);
    if (vendorMatch) vendor = vendorMatch[1].trim();

    const dateMatch = clean.match(/(?:التاريخ|date):\s*([^\n\r]+)/i);
    if (dateMatch) date = dateMatch[1].trim();

    const invNumMatch = clean.match(/(?:رقم الفاتورة|فاتورة رقم|invoice\s*(?:#|no|number)?):\s*([A-Za-z0-9\-_]+)/i);
    if (invNumMatch) invoiceNumber = invNumMatch[1].trim();

    const totalMatch = clean.match(
      /(?:المجموع الكلي|الإجمالي|المجموع|total|grand total):\s*([0-9.,]+\s*(?:جنيه|ج\.م|ريال|دولار|egp|usd|eur|sar)?)/i
    );
    if (totalMatch) total = totalMatch[1].trim();

    invoiceData = { vendor, date, total, invoiceNumber };
  }

  for (const line of lines) {
    // Heading
    if (
      /^#{1,3}\s+/.test(line) ||
      /^(?:العنوان|الموضوع|الفصل|الباب|تقرير|مستند|title|subject|chapter):\s*/i.test(line)
    ) {
      headings.push(line.replace(/^#{1,3}\s+/, '').trim());
      continue;
    }

    // List item
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      currentList.push(line.replace(/^[-*•\d.)]+\s+/, '').trim());
      continue;
    } else if (currentList.length > 0) {
      lists.push([...currentList]);
      currentList = [];
    }

    // Table row
    if (line.includes('|') && line.split('|').length >= 3) {
      documentType = documentType === 'invoice_receipt' ? 'invoice_receipt' : 'table';
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c && !/^[-:]+$/.test(c));
      if (cells.length >= 2) {
        if (tables.length === 0) {
          tables.push({ headers: cells, rows: [] });
        } else {
          tables[tables.length - 1].rows.push(cells);
        }
        continue;
      }
    }

    // Form field
    const formMatch = line.match(/^([^:]{2,30}):\s*(.+)$/);
    if (formMatch && !line.includes('http')) {
      formFields.push({ label: formMatch[1].trim(), value: formMatch[2].trim() });
      if (documentType === 'general') documentType = 'form';
      continue;
    }

    paragraphs.push(line);
  }

  if (currentList.length > 0) {
    lists.push([...currentList]);
  }

  const summaryAr =
    documentType === 'invoice_receipt'
      ? `فاتورة أو إيصال مالي${invoiceData?.vendor ? ` من "${invoiceData.vendor}"` : ''}${
          invoiceData?.total ? ` بقيمة إجمالية ${invoiceData.total}` : ''
        }.`
      : documentType === 'form'
      ? `نموذج أو استمارة بيانات تحتوي على ${formFields.length} حقول رئيسية.${
          headings[0] ? ` العنوان: "${headings[0]}".` : ''
        }`
      : documentType === 'table'
      ? `مستند يحتوي على جداول بيانات منظمة في صفوف وأعمدة.`
      : `مستند نصي يضم ${headings.length} عناوين و${paragraphs.length} فقرات مقروءة.`;

  const summaryEn =
    documentType === 'invoice_receipt'
      ? `Invoice or receipt${invoiceData?.vendor ? ` from "${invoiceData.vendor}"` : ''}${
          invoiceData?.total ? ` with total ${invoiceData.total}` : ''
        }.`
      : documentType === 'form'
      ? `Data form containing ${formFields.length} structured fields.${
          headings[0] ? ` Title: "${headings[0]}".` : ''
        }`
      : documentType === 'table'
      ? `Document containing tabular structured data in rows and columns.`
      : `Text document containing ${headings.length} headings and ${paragraphs.length} readable paragraphs.`;

  return {
    documentType,
    summaryAr,
    summaryEn,
    headings,
    paragraphs,
    tables,
    formFields,
    lists,
    invoiceData,
    literalOcrText: clean,
    rawDescription: clean,
  };
}

/**
 * Phase 6 — Object Finder for Cluttered Scenes:
 * Handles complex multi-item environments with relative positions, clock-face coordinates,
 * landmark relationships, and occlusion explanations without metric distance hallucinations.
 */
export function parseClutteredObjectFinderResult(
  text: string,
  targetItem: string,
  lang: 'ar' | 'en' | 'fr' = 'ar'
): ClutteredObjectFinderResult {
  const baseResult = parseObjectFinderResult(text, targetItem, lang);
  const clean = cleanVisionDescription(text, lang);
  const lower = clean.toLowerCase();

  let relativePosition: ClutteredObjectFinderResult['relativePosition'] = 'unknown';
  if (/على يمينك?|جهة اليمين|to your right|on the right/i.test(lower)) relativePosition = 'right';
  else if (/على يسارك?|جهة اليسار|to your left|on the left/i.test(lower)) relativePosition = 'left';
  else if (/في الوسط|في المنتصف|in the center|middle/i.test(lower)) relativePosition = 'center';
  else if (/أعلى|فوق|above|on top/i.test(lower)) relativePosition = 'above';
  else if (/أسفل|تحت|below|under/i.test(lower)) relativePosition = 'below';
  else if (/أمامك|in front/i.test(lower)) relativePosition = 'in_front';
  else if (/خلف|behind/i.test(lower)) relativePosition = 'behind';

  const isOccluded = /(?:محجوب[ةه]?|مغطى جزئياً|متداخل[ةه]?|خلف|مستور[ةه]?|partially hidden|obscured|covered by|overlapping|behind)/i.test(
    lower
  );
  const occlusionExplanationAr = isOccluded
    ? `الغرض "${targetItem}" متداخل أو محجوب جزئياً خلف غرض آخر في المشهد.`
    : undefined;
  const occlusionExplanationEn = isOccluded
    ? `Item "${targetItem}" is partially obscured or overlapping with another object in the scene.`
    : undefined;

  let landmarkReference: string | undefined;
  const landmarkMatchAr = clean.match(
    /(?:بجوار|بجانب|قرب|خلف|أمام|على سطح)\s+([\u0600-\u06FF\w\s]+?)(?:[،,.]|$)/i
  );
  const landmarkMatchEn = clean.match(
    /(?:next to|beside|near|behind|in front of|on top of)\s+([a-zA-Z\s]+?)(?:[،,.]|$)/i
  );
  if (landmarkMatchAr && landmarkMatchAr[1]) {
    landmarkReference = landmarkMatchAr[0].trim();
  } else if (landmarkMatchEn && landmarkMatchEn[1]) {
    landmarkReference = landmarkMatchEn[0].trim();
  }

  const movementSuggestionAr = !baseResult.found
    ? getRepositionAdvice(targetItem, 'ar')
    : undefined;
  const movementSuggestionEn = !baseResult.found
    ? getRepositionAdvice(targetItem, 'en')
    : undefined;

  return {
    found: baseResult.found,
    targetItem,
    clockPosition: baseResult.clockPosition,
    relativePosition,
    landmarkReference,
    isOccludedOrOverlapping: isOccluded,
    occlusionExplanationAr,
    occlusionExplanationEn,
    movementSuggestionAr,
    movementSuggestionEn,
    cleanDescription: clean,
  };
}

/**
 * Phase 6 — Uploaded Image Validation:
 * Validates format (JPEG, PNG, WebP, GIF, BMP), file size (up to 10MB), non-empty files,
 * and provides clear bilingual error announcements.
 */
export function validateUploadedImageFile(file: File): ImageValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorMessageAr: 'لم يتم اختيار أي ملف.',
      errorMessageEn: 'No file was selected.',
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      errorMessageAr: 'ملف الصورة فارغ (0 بايت).',
      errorMessageEn: 'The image file is empty (0 bytes).',
    };
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      errorMessageAr: 'حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت).',
      errorMessageEn: 'Image file size exceeds the 10MB limit.',
      fileDetails: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    };
  }

  const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
  if (!validMimes.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      errorMessageAr: 'صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP.',
      errorMessageEn: 'Unsupported image format. Please select a JPEG, PNG, or WebP image.',
      fileDetails: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    };
  }

  return {
    isValid: true,
    fileDetails: {
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
    },
  };
}

/**
 * Builds specialized prompts that enforce natural descriptions, relative spatial positions,
 * explicit uncertainty communication, printed OCR preservation, and safety bounds.
 */
export function buildCompanionPrompt(params: {
  tool: VisualToolId;
  queryType: VisualQueryType;
  question?: string;
  detailLevel: SceneDetailLevel;
  lang: 'ar' | 'en' | 'fr';
  targetItemQuery?: string;
  previousDescription?: string;
  readAction?: 'summarize' | 'read';
  conversationTurns?: SceneConversationTurn[];
  isContinuousReading?: boolean;
}): string {
  const {
    tool,
    queryType,
    question,
    detailLevel,
    lang,
    targetItemQuery,
    previousDescription,
    readAction,
    conversationTurns,
    isContinuousReading,
  } = params;

  const langMandate =
    lang === 'en'
      ? 'CRITICAL MANDATE: You MUST reply entirely in English. Do NOT use any Arabic characters whatsoever.\n'
      : lang === 'fr'
      ? 'DIRECTIVE CRITIQUE : Vous DEVEZ répondre entièrement en français. Ne produisez AUCUN caractère arabe.\n'
      : 'توجيه حاسم: تحدث باللغة العربية الواضحة والسهلة والودودة.\n';

  const uncertaintyInstruction =
    lang === 'en'
      ? 'ACCURACY & UNCERTAINTY MANDATE: Never invent object positions, metric distances, or details. If the image is blurry, poorly lit, or does not provide enough evidence, explicitly state so (e.g. "Lighting is dim, appears to be..."). Clearly distinguish observed facts from interpretations. NEVER fabricate missing words.\n'
      : lang === 'fr'
      ? 'MANDAT D\'EXACTITUDE : N\'inventez jamais d\'objets ni de distances métriques. Si l\'image est floue ou sombre, exprimez explicitement votre incertitude. Ne fabriquez jamais de mots manquants.\n'
      : 'تعليمات الدقة والأمانة: لا تخترع أبداً أماكن أو مسافات مترية وهمية أو تفاصيل غير موجودة. إذا كانت الصورة غير واضحة أو الإضاءة خافتة، اذكر ذلك صراحة (مثلاً: الإضاءة خافتة ويبدو كأنه...). فرّق بين الحقائق المؤكدة والتفسيرات التقريبية. لا تخترع كلمات مفقودة أبداً.\n';

  const safetyDisclaimer =
    lang === 'en'
      ? `SAFETY NOTICE: Visual analysis is an assistive tool and cannot guarantee safe navigation. Never claim a path or road is 100% safe to cross without physical mobility aids.`
      : lang === 'fr'
      ? `AVIS DE SÉCURITÉ : Cet assistant est un outil indicatif et ne garantit pas la sécurité absolue lors des déplacements.`
      : `تنبيه أمان: التحليل أداة استرشادية ولا يعتبر ضماناً تاماً لسلامة عبور الطريق أو السير بدون أدوات الحركة الشخصية.`;

  // 1. Visual Question Answering (VQA) with Contextual Scene Conversation
  if (queryType === 'vqa' && question) {
    let contextSection = '';
    if (conversationTurns && conversationTurns.length > 0) {
      const recent = conversationTurns.slice(-4);
      contextSection =
        lang === 'ar'
          ? `\nسياق المحادثة المباشرة لنفس هذا المشهد الحالي:\n${recent.map((t) => `${t.role === 'user' ? 'المستخدم' : 'المساعد'}: ${t.text}`).join('\n')}\n`
          : `\nRecent scene conversation context for this specific frame:\n${recent.map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n')}\n`;
    } else if (previousDescription) {
      contextSection =
        lang === 'ar'
          ? `\nسياق المشهد الحالي: "${cleanVisionDescription(previousDescription, 'ar')}"\n`
          : `\nCurrent Scene Context: "${cleanVisionDescription(previousDescription, 'en')}"\n`;
    }

    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت رفيق بصري ذكي يجيب شخصاً كفيفاً عن الصورة المعروضة أمامه عبر الكاميرا الآن.
سؤال المستخدم المحدد: "${question.trim()}"
${contextSection}
تعليمات الإجابة الدقيقة:
1. أجب عن سؤال المستخدم مباشرة وبأمانة تامة بناءً على الإطار الحالي المعروض فقط.
2. اذكر موضع الشيء بالساعة والمسافة التقديرية (مثلاً: على يمينك عند الساعة 2 على بعد ذراع في المتناول). لا تخترع مسافات مترية رقمية وهمية (مثل "1.42 متر").
3. إن لم يكن الشيء المطلوب مرئياً في هذه اللقطة، قل ذلك صراحة ("غير مرئي في هذه اللقطة") واقترح تحريك الكاميرا بحذر (مثلاً: جرب تحريك الكاميرا قليلاً لليمين).
4. لا تفترض وجود أشياء من سياق الأسئلة السابقة إلا إذا كانت مرئية ومؤكدة في هذا الإطار الحالي.
5. تحدث بلغة عربية عامية سهلة وودودة في جملة أو جملتين، بدون نجوم ماركداون (**) أو عناوين روبوتية.`;
    } else if (lang === 'fr') {
      return `${langMandate}${uncertaintyInstruction}Vous êtes un assistant visuel répondant à une personne aveugle sur l'image actuelle de la caméra.
Question : "${question.trim()}"
${contextSection}
1. Répondez honnêtement en vous basant uniquement sur l'image actuelle.
2. Précisez la position en heures d'horloge et repères relatifs. N'inventez pas de distances métriques.
3. Si l'objet n'est pas visible, dites-le clairement et suggérez de déplacer la caméra.
Fournissez 1 à 2 phrases directes sans astérisques markdown (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert visual companion answering a blind or visually impaired user about their current camera view.
User's Question: "${question.trim()}"
${contextSection}
Instructions:
1. Answer the question directly and truthfully based solely on the current camera frame.
2. State object positions using clock-face directions (1 to 12 o'clock) and relative grounded cues (e.g. "at 2 o'clock, within arm's reach"). NEVER invent exact metric distances (no "1.42 meters").
3. If the queried item is not visible or identifiable in this frame, explicitly state so and suggest camera movement (e.g. "Item not visible in this view, try panning slightly to your right").
4. Do NOT hallucinate items from prior conversational turns unless confirmed visible right now.
5. Deliver 1-2 natural sentences without markdown asterisks (**) or robotic headings.`;
    }
  }

  // 2. Phase 3 — Product Assistant (Consumer packaging, prices, quantities, expiry dates)
  if (queryType === 'product') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت مساعد خبير في فحص وفهم عبوات المنتجات الاستهلاكية (أطعمة، مشروبات، معلبات، أدوات تنظيف) لشخص كفيف.
المطلوب فحص العبوة وتوضيح ما يلي بدقة:
1. اسم المنتج والعلامة التجارية: اقرأ الاسم البارز للعلامة والمنتج بدقة.
2. الأسعار والكميات: استخرج السعر الواضح إن وجد، والوزن أو الحجم (مثل: 500 مل، 1 كجم، عبوة 6 قطع).
3. تاريخ الصلاحية: اقرأ تاريخ الصلاحية فقط إذا كان واضحاً تماماً ومقروءاً بدون شك. إن لم يكن واضحاً، قل صراحة: "تاريخ الصلاحية غير ظاهر بوضوح في هذا الجانب من العبوة، يرجى تدوير العبوة لفحص القاع أو الغطاء."
4. الفصل بين النصوص المكتوبة والمعلومات المستنتجة: فرّق بوضوح بين ما هو مكتوب حرفياً على العبوة وبين استنتاجك العام لنوع المنتج.
5. تنبيه سلامة صارم: لا تخترع أبداً مكونات، مسببات حساسية، أو تواريخ صلاحية، أو مزاعم طبية غير مكتوبة بوضوح تام.
في 2 إلى 3 جمل عربية ودودة وسلسة بدون نجوم ماركداون (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert consumer product assistant speaking to a blind or low-vision user inspecting product packaging.
Instructions:
1. Product Name & Brand: Read the visible brand and product name clearly.
2. Price & Quantity: Extract clearly visible prices and volume/weight (e.g. 500 ml, 1 kg, pack of 6) if printed.
3. Expiry Date Rule: Read the expiry date ONLY when clearly legible. If not clearly visible or unreadable, explicitly state: "No expiry date is clearly visible on this side of the package; please rotate to inspect the bottom or cap."
4. Distinguish Detected vs. Inferred: Clearly differentiate verbatim text detected on packaging from inferred general product category.
5. Strict Safety: NEVER fabricate ingredients, allergens, expiry dates, or safety claims.
Deliver 2-3 crisp, natural sentences without markdown asterisks (**).`;
    }
  }

  // Phase 6 — Document Understanding & Structure (Headings, Tables, Forms, Invoices, Lists)
  if (queryType === 'document') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت قارئ ومحلل مستندات ذكي متخصص في فهم بنية الوثائق لشخص كفيف (فواتير، إيصالات، استمارات ونماذج، جداول بيانات، مقالات ورسائل).
التعليمات الدقيقة:
1. البنية والعناوين: حدد نوع المستند واقرأ العناوين الرئيسية بوضوح.
2. الجداول والقوائم: إن وجد جدول، اقرأ عناوين الأعمدة والصفوف بدقة. إن وجدت قائمة، اقرأ البنود بترتيبها.
3. الفواتير والإيصالات: استخرج اسم المتجر/الجهة، التاريخ، والإجمالي المالي الصافي بوضوح.
4. الاستمارات والحقول: اقرأ اسم الحقل ثم قيمته المكتوبة (مثال: "الاسم: أحمد").
5. ملخص صوتي: لخص المستند في جملتين موجزتين ومفهومتين صوتياً.
6. الأمانة المطلقة: لا تخترع أي أرقام أو بنود أو تواريخ مفقودة. فرّق بين النص الحرفي والملخص العام.
بدون نجوم ماركداون (**) وبأسلوب طبيعي وودود.`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert Document Understanding assistant analyzing document structure for a blind or visually impaired user (invoices, receipts, forms, data tables, letters, articles).
Instructions:
1. Structure & Headings: Identify document type and read main headings clearly.
2. Tables & Lists: If a table is visible, outline column headers and key row entries. For lists, read bullet/numbered items in sequence.
3. Invoices & Receipts: Extract vendor name, date, and final total balance clearly if visible.
4. Forms & Key-Value Fields: Clearly pair field labels with their corresponding filled values (e.g. "Name: John Doe").
5. Spoken Summary: Provide a crisp 2-sentence high-level audio summary of what this document is.
6. Absolute Fidelity: NEVER invent numbers, clauses, or missing lines. Strictly separate verbatim text from high-level interpretation.
Deliver 2-3 crisp natural sentences without markdown asterisks (**).`;
    }
  }

  // Phase 6 — Barcode & Label Scanner
  if (queryType === 'barcode') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت ماسح ضوئي ذكي للباركود والملصقات التجارية على المنتجات لشخص كفيف:
1. الباركود المطبوع: اقرأ أرقام الباركود (EAN-13 أو UPC أو كود 128) إن كانت واضحة.
2. ملصق العبوة: اقرأ الاسم التجاري والبيانات المطبوعة على الملصق حرفياً.
3. الصدق البرمجي: وضح أن البيانات مبنية على النص المقروء من العبوة نظراً لعدم توفر قاعدة بيانات تجارية خارجية مربوطة.
4. لا تخترع أي مكونات أو محاذير غير مكتوبة بحروف واضحة تماماً.
جملتان أو ثلاث جمل واضحة بدون نجوم (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert Barcode and Product Label Scanner speaking aloud to a blind user:
1. Barcode Digits: Read any clearly visible barcode numbers (EAN-13, UPC, Code 128, QR).
2. Packaging Label: Read brand name, product description, and printed text verbatim.
3. Honest Disclosure: State that details are extracted from visible packaging text because no offline commercial catalog registry is connected.
4. Never invent ingredients, allergens, or instructions not clearly visible.
2-3 direct natural sentences without markdown asterisks (**).`;
    }
  }

  // Phase 6 — Expiry Date Reader
  if (queryType === 'expiry') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت خبير في رصد وتدقيق تواريخ الإنتاج والصلاحية على عبوات المنتجات الغذائية والدوائية لشخص كفيف:
1. تاريخ الانتهاء vs تاريخ الإنتاج: فرّق بدقة حاسمة بين تاريخ الصلاحية/الانتهاء (EXP) وتاريخ التصنيع/الإنتاج (PRD/MFG) ورقم التشغيلة (Batch/Lot).
2. وضوح التاريخ: اقرأ التاريخ كاملاً (اليوم/الشهر/السنة). إن كان التاريخ غير واضح أو مشوشاً أو مقطوعاً عند الحافة، قل ذلك صراحة وانصح بتدوير العبوة لفحص القاع أو الغطاء تحت ضوء مباشر.
3. تنبيه السلامة: أضف دائماً أن القراءة البصرية أداة استرشادية ولا تجزم بسلامة المنتج أو جودة تخزينه.
في جملتين أو ثلاث جمل بدون نجوم (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert Expiration & Manufacturing Date Reader inspecting consumer products for a blind user:
1. Expiry vs. Production: Strictly differentiate the expiration/best-before date (EXP/BB) from manufacturing date (MFG/PRD) and batch/lot number.
2. Legibility & Guidance: Read the full date format (day/month/year). If smudged, blurry, or cut off, clearly state so and advise rotating the item or inspecting the bottom/cap under direct light.
3. Safety Disclaimer: Explicitly state that optical date reading is advisory and cannot guarantee product freshness or seal integrity.
2-3 clear sentences without markdown asterisks (**).`;
    }
  }

  // Phase 6 — Clothing & Outfit Assistant
  if (queryType === 'clothing') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت مساعد خبير في وصف الملابس وتنسيق الإطلالة لشخص كفيف:
1. قطع الملابس الظاهرة: سمِّ القطع المرئية (قميص، بنطال، فستان، جاكيت، حذاء، وشاح/حجاب).
2. الألوان والنقوش: حدد درجة اللون بدقة (مثلاً: كحلي داكن، رمادي فحمي، بيج) والنمط (سادة، مقلم، كاروهات، مشجر، منقط، محبوك).
3. أطراف الملابس: إن كانت أطراف القطعة مقطوعة عند حافة الكاميرا أو غير مكتملة، نبه المستخدم لذلك بلطف.
4. نصيحة التنسيق: قدم اقتراحاً عملياً واحداً لتنسيق القطعة مع بنطال أو حذاء بألوان متناسقة.
5. الحيادية التامة: صف الملابس بموضوعية مطلقة وتجنب تماماً أي أحكام شخصية أو تخمينات عن الجسد أو الهوية.
في جملتين إلى ثلاث جمل طبيعية بدون نجوم (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert Clothing Assistant and outfit coordinator for a blind user:
1. Visible Garments: Name the visible items (shirt, trousers, jacket, dress, shoes, scarf, etc.).
2. Color & Pattern: Identify precise nuance (e.g. navy blue, charcoal grey, ivory) and pattern (solid, striped, plaid, floral, polka dots, textured).
3. Frame Boundary Notice: If garments are partially cut off at the edge of the camera view, clearly inform the user.
4. Outfit Matching Advice: Provide 1 tasteful, neutral pairing recommendation for coordinating trousers, shoes, or accessories.
5. Strict Neutrality: Describe clothing objectively. NEVER make subjective body shape, demographic, age, or personal inferences.
2-3 crisp sentences without markdown asterisks (**).`;
    }
  }

  // 3. Phase 3 — Smart Text Reader (Documents, books, signs, labels, printed instructions, continuous reading)
  if (tool === 'read' || queryType === 'ocr') {
    const isDetailed = readAction === 'read' || detailLevel === 'detailed';
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت قارئ نصوص ذكي يساعد شخصاً كفيفاً بقراءة النص المطبوع (كتاب، ورقة، شاشة، لافتة طريق، عبوة دواء، أو مستند).
1. اقرأ كل النصوص المطبوعة الظاهرة بدقة وبالترتيب الطبيعي للقراءة (من اليمين لليسار للسطور العربية، ومن اليسار لليمين للإنجليزية).
2. الأمانة والدقة: اقرأ النص بأمانة تامة دون اختلاق كلمات مفقودة أو تخمين ما لا تراه.${
        isDetailed
          ? '\n3. نمط القراءة التفصيلي: اقرأ النص المكتوب كاملاً حرفياً سطراً بسطر.'
          : '\n3. نمط القراءة الموجز: لخص الرسالة الأساسية أو العنوان والمحتوى الرئيسي في جملتين مركزتين.'
      }
4. كشف النواقص والتشويش: إذا كان النص مقطوعاً عند حافة الورقة أو مشوشاً بالإضاءة، وضح ذلك صراحة ("النص مقطوع عند الحافة السفلية" أو "الإضاءة خافتة وتعذر قراءة السطر الأخير").
5. لا تدّعي قراءة خط اليد غير المؤكد.
6. إذا لم يكن هناك نص مطبوع واضح، قل: "لا يوجد نص مطبوع واضح في هذا الإطار، حاول تقريب الكاميرا وتثبيتها."
${isContinuousReading ? 'نظم النص في فقرات واضحة ومترابطة لتسهيل القراءة المتتابعة.' : ''}
بدون نجوم ماركداون (**) أو عناوين روبوتية.`;
    } else if (lang === 'fr') {
      return `${langMandate}${uncertaintyInstruction}Vous êtes un lecteur de texte intelligent pour une personne aveugle.
1. Lisez le texte fidèlement selon l'ordre naturel de lecture (LTR).
2. Signalez tout texte tronqué aux bords ou flou. Ne fabriquez aucun mot manquant.${
        isDetailed ? '\n3. Mode complet : Lisez le texte fidèlement et intégralement.' : '\n3. Mode concis : Résumez le message principal.'
      }
Sans astérisques markdown (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert Smart Text Reader for a blind or visually impaired user reading documents, books, signs, labels, or printed instructions.
1. Reading Order: Read all visible printed text accurately, preserving natural reading order.
2. Absolute Fidelity: Read text faithfully. NEVER fabricate missing words or hallucinate obscured letters.${
        isDetailed
          ? '\n3. Detailed Mode: Transcribe and read the visible text verbatim and completely.'
          : '\n3. Concise Mode: Summarize key headlines, sign meanings, and essential notices in 1-2 direct sentences.'
      }
4. Boundary & Blur Detection: Explicitly indicate if text is cut off at the edge of the page or affected by glare/blur ("Text appears partially cut off at the bottom border").
5. Do not claim handwriting recognition unless printed and unmistakable.
6. If no clear text is visible, say: "No clear printed text detected, try moving closer and holding steady."
${isContinuousReading ? 'Structure text into clean logical paragraphs for continuous paragraph-by-paragraph reading.' : ''}
Deliver natural spoken speech without markdown asterisks (**) or robotic headings.`;
    }
  }

  // 4. Phase 3 — Banknote / Currency Reader
  if (tool === 'currency' || queryType === 'currency') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت خبير في فحص وقراءة العملات النقدية الورقية والقطع المعدنية لشخص كفيف (جنيه مصري، دولار أمريكي، يورو، ريال سعودي).
1. الفئة والعملة: اذكر بوضوح الفئة واسم العملة فوراً (مثلاً: مئتا جنيه مصري، عشرون دولاراً أمريكياً).
2. تقييم الثقة والوضوح: إذا كانت الورقة مطوية جزئياً أو في إضاءة خافتة، اذكر الفئة المحتملة مع التنبيه بضرورة فرد الورقة والتأكد تحت ضوء ساطع.
3. تنبيه التزييف: لا تدّعي أبداً كشف التزوير أو فحص العلامات المائية الأمنية.
4. إذا لم تكن هناك عملة واضحة: قل: "لم أتمكن من التعرف على عملة نقدية واضحة، يرجى فرد الورقة وتقريب الكاميرا تحت إضاءة جيدة."
${CURRENCY_COUNTERFEIT_DISCLAIMER_AR}
في جملة أو جملتين ودودتين بدون نجوم (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert currency identifier speaking aloud to a blind user.
1. Denomination & Currency: Clearly state denomination and currency (e.g. 200 Egyptian Pounds, 20 US Dollars, 50 Euros, 100 Saudi Riyals).
2. Confidence & Clarity: If the bill is folded, shadowed, or partially hidden, state the tentative denomination and advise unfolding the note under better light.
3. Counterfeit Boundary: Never claim counterfeit detection or security watermark validation.
4. If no clear bill is detected, say: "No clear currency detected, please unfold the bill under good light."
${CURRENCY_COUNTERFEIT_DISCLAIMER_EN}
1-2 natural sentences without asterisks (**).`;
    }
  }

  // 5. Phase 3 & 6 — Spatial Memory & Object Finder (Cluttered Scenes, Landmarks, Clock Positions)
  if (tool === 'object' || queryType === 'object') {
    const itemTarget = targetItemQuery?.trim();
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت متخصص في الذاكرة المكانية وتحديد أماكن الأغراض الشخصية في المشاهد العادية والمزدحمة (مفاتيح، محفظة، هاتف، كوب، نظارة، باب، كرسي) لشخص كفيف:
${
  itemTarget
    ? `الغرض المطلوب البحث عنه بالتحديد هو: "${itemTarget}".
تعليمات البحث في البيئات المزدحمة:
1. ابحث عن "${itemTarget}" بناءً على الأدلة البصرية في هذا الإطار فقط.
2. إن وجدته: حدد موضعه بنظام اتجاه عقارب الساعة (الساعة 1 إلى 12)، والاتجاه النسبي (على يمينك، على يسارك، أمامك)، والمعالم المجاورة (مثلاً: بجوار اللابتوب، خلف الكوب).
3. كشف التداخل والحجب: إذا كان الغرض متداخلاً مع غرض آخر أو محجوباً جزئياً خلف شيء آخر، وضح ذلك صراحة.
4. منع المسافات الوهمية: لا تخترع مسافات مترية رقمية وهمية (مثل "1.3 متر"). استخدم تعبيرات نسبية (في متناول اليد، أمامك مباشرة، في الخلفية).
5. إن لم تجده: قل بوضوح: "لم أتمكن من رؤية ${itemTarget} في هذه الزاوية، جرب تحريك الكاميرا ببطء لليمين أو إمالتها لأسفل نحو الطاولة."`
    : `1. حدد موضع كل غرض بارز بنظام عقارب الساعة والاتجاه النسبي والمعالم المجاورة (مثلاً: المفاتيح عند الساعة 2 بجوار اللابتوب).
2. وضح إذا كانت الأغراض متداخلة أو محجوبة جزئياً، واذكر ما إذا كان المسار سالكاً.`
}
جملتان واضحتان بدون نجوم (**) وبدون مسافات مترية وهمية.`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are a spatial object finder speaking aloud to a blind user in standard and cluttered scenes.
${
  itemTarget
    ? `The user is specifically searching for: "${itemTarget}".
Instructions for cluttered scenes:
1. Search for "${itemTarget}" based solely on visual evidence in this frame.
2. If found: describe location using clock-face directions (1 to 12 o'clock), relative placement (left, right, center, in front), and nearby landmarks (e.g. "next to the laptop, behind the coffee mug").
3. Occlusion & Overlap: If the target object is partially obscured, covered, or overlapping with another item, explain this limitation clearly.
4. Grounded Proximity: NEVER invent exact metric distances (no "1.42 meters"). Use qualitative grounded terms (within arm's reach, directly ahead, in background).
5. If NOT found: explicitly say "${itemTarget} is not visible in this view. Try panning slowly to your right or tilting down toward the surface under clear light."`
    : `1. Locate personal items with clock-face directions, relative cues, and landmark references (e.g. keys at 2 o'clock next to the laptop).
2. Note any overlapping items or obstacles before reaching.`
}
2 crisp sentences without asterisks (**) and without fake metric distances.`;
    }
  }

  // 6. Phase 6 — Color & Pattern Detector
  if (tool === 'color' || queryType === 'color') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت خبير في فحص درجات الألوان وتنسيق الملابس وفحص الأنماط لشخص كفيف.
1. الألوان السائدة ودرجتها: حدد اللون الأساسي بدقة مع نغمته (كحلي داكن، زيتي، بيج، رمادي فحمي).
2. النمط والنقش: وضح هل النمط سادة، مقلم بخطوط، كاروهات ومربعات، مشجر بنقوش زهور، منقط، أم محبوك بنسيج بارز.
3. تنبيه الإضاءة والظلال: إن كانت الإضاءة خافتة أو مشوشة، وضح صراحة أن التمييز الدقيق بين الألوان الداكنة (مثل الكحلي والأسود) غير مؤكد بصرياً.
4. نصيحة التنسيق: قدم نصيحة سريعة ومتناسقة للألوان المكملة.
في جملتين بدون نجوم (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You are an expert color and pattern analyzer speaking to a blind user.
1. Primary Nuance & Dominant Colors: Identify exact color and nuance (e.g. navy blue, olive green, charcoal grey).
2. Pattern Classification: State whether it is solid, striped, plaid/checkered, floral, polka dots, or textured/knit.
3. Lighting Uncertainty: If illumination is dim or shadowy, explicitly state that optical distinction between dark shades (e.g. navy vs. black) cannot be verified with certainty.
4. Complementary Advice: Provide 1 brief recommendation for matching colors.
2 crisp sentences without asterisks (**).`;
    }
  }

  // 7. Person & Face Presence (Privacy-respecting)
  if (tool === 'face' || queryType === 'face') {
    if (lang === 'ar') {
      return `${langMandate}${uncertaintyInstruction}أنت رفيق ذكي لتنبيه الشخص الكفيف بوجود أشخاص في مجال الرؤية.
1. وجود الأشخاص وموقعهم النسبي: هل يوجد شخص أمامك، على اليمين، أو على اليسار، وموقعه التقريبي.
2. المظهر العام: تعبير الوجه التقديري (مبتسم، يتحدث) ولون الملابس للمساعدة في التمييز.
3. تنبيه خصوصية حاسم: لا تذكر أبداً أسماء شخصية حقيقية ولا تدعي التعرف البيومتري على الهويات.
جملتان طبيعيتان بدون نجوم (**).`;
    } else {
      return `${langMandate}${uncertaintyInstruction}You alert a blind user to human presence in their visual field.
1. Presence & Position: Note if a person is standing ahead, left, or right, and approximate relative proximity.
2. General Appearance: Note facial expression and prominent clothing color for context.
3. Strict Privacy: Never guess or output real names of private individuals.
2 natural sentences without asterisks (**).`;
    }
  }

  // Default: Scene Description & Safety Guidance
  let basePrompt = '';
  if (lang === 'ar') {
    basePrompt = `${langMandate}${uncertaintyInstruction}أنت رفيق ومساعد بصري ذكي يتحدث بصوته لشخص كفيف عبر الكاميرا.
صف المشهد أمام الكاميرا الآن بدقة وأمانة بالترتيب التالي:
1. السلامة والعوائق: ابدأ فوراً بتوضيح حالة المسار (إذا كان خالياً من العوائق قل: "المسار سالك أمامك"، وإذا كان هناك عائق أو درج نبه إليه فوراً مع تحديد مكانه).
2. الأشخاص والأغراض البارزة: اذكر العناصر الأساسية ومواقعها النسبية (يسار، يمين، أمامك، بالساعة والمسافة النسبية).
3. قراءة اللافتات: اقرأ أي نص بارز يحدد المكان.
4. الإيجاز: تحدث بلغة عربية عامية سهلة وطبيعية وودودة، بدون أي نجوم ماركداون (**) أو عناوين روبوتية.
${safetyDisclaimer}`;
  } else if (lang === 'fr') {
    basePrompt = `${langMandate}${uncertaintyInstruction}Vous êtes un assistant visuel parlant pour une personne aveugle ou malvoyante via sa caméra.
1. Sécurité : Indiquez si le passage est dégagé ou s'il y a un obstacle/escalier.
2. Éléments clés : Décrivez les personnes et objets avec leurs positions relatives (gauche, droite, heures d'horloge).
3. Texte : Lisez les panneaux ou enseignes visibles.
4. Concision : 2 à 3 phrases fluides sans astérisques markdown (**).
${safetyDisclaimer}`;
  } else {
    basePrompt = `${langMandate}${uncertaintyInstruction}You are an expert visual companion speaking aloud to a blind or low-vision user through their camera.
Describe what is visible right now with precision and natural warmth:
1. Safety & Obstacles: State if the path ahead is clear ("Area in front of you is clear"), or immediately alert to hazards, stairs, or obstacles with their relative positions.
2. Key Objects & Spatial Layout: Name main objects and people with approximate relative positions (left, right, center, clock-face, relative proximity).
3. Visible Signs: Read any prominent signs or labels.
4. Tone & Brevity: Deliver 2-3 crisp, natural sentences without markdown asterisks (**) or robotic headings.
${safetyDisclaimer}`;
  }

  // Apply detail level modifier
  if (detailLevel === 'concise') {
    basePrompt +=
      lang === 'ar'
        ? '\nمستوى الإيجاز: لخص النتيجة في جملة واحدة فقط واضحة تركز على المسار والأمان.'
        : L('\nDetail level: Summarize in 1 concise sentence focusing on safety and clear pathway.');
  } else if (detailLevel === 'detailed') {
    basePrompt +=
      lang === 'ar'
        ? '\nمستوى التفصيل: قدم وصفاً وافياً في 3 إلى 4 جمل تشمل توزيع المكان والإضاءة والمواقع بالساعة.'
        : L('\nDetail level: Provide a comprehensive 3-4 sentence description detailing spatial layout, lighting, and relative clock positions.');
  }

  return basePrompt;
}

/* =========================================================================
   Phase 4: Production Readiness — Audio Priority, Frame Quality & Telemetry
   ========================================================================= */

export {
  AudioPriority,
  speakWithPriority,
  replayLastSpeech,
  getCurrentAudioPriority,
  resetAudioPriority,
  getLastSpokenText,
  type PrioritySpeakOptions,
  type PrioritySpeakResult,
} from './tts.js';

export interface VisualCompanionTelemetry {
  cameraInitTimeMs: number | null;
  lastCaptureTimeMs: number | null;
  lastAnalysisLatencyMs: number | null;
  totalRequestsCount: number;
  completedRequestsCount: number;
  failedRequestsCount: number;
  cancelledRequestsCount: number;
  staleRequestsDroppedCount: number;
  speechErrorsCount: number;
  lowQualityFramesDetected: number;
  sessionStartTime: number;
}

export interface FrameQualityResult {
  isUsable: boolean;
  brightnessScore: number;
  varianceScore: number;
  reason?: 'too-dark' | 'lens-covered' | 'glare-overexposed' | 'usable';
  guidanceAr?: string;
  guidanceEn?: string;
}

/**
 * Client-side pre-check for camera frames before dispatching network requests.
 * Detects pitch-black, underexposed, lens-covered, or severely glare/overexposed frames
 * and provides immediate spoken feedback.
 */
export function evaluateFramePixels(pixels: Uint8ClampedArray | number[]): FrameQualityResult {
  const len = pixels.length;
  if (!len || len < 4) {
    return {
      isUsable: false,
      brightnessScore: 0,
      varianceScore: 0,
      reason: 'too-dark',
      guidanceAr: 'الإطار غير متاح أو لا يحتوي على بيانات صورة.',
      guidanceEn: 'Frame is empty or contains no pixel data.',
    };
  }

  let totalLuminance = 0;
  let sampleCount = 0;
  const step = Math.max(4, Math.floor(len / 4000) * 4);
  const luminanceSamples: number[] = [];

  for (let i = 0; i < len; i += step) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;
    luminanceSamples.push(lum);
    sampleCount++;
  }

  const avgBrightness = sampleCount > 0 ? totalLuminance / sampleCount : 0;

  let sumSqDiff = 0;
  for (let j = 0; j < luminanceSamples.length; j++) {
    const diff = luminanceSamples[j] - avgBrightness;
    sumSqDiff += diff * diff;
  }
  const variance = sampleCount > 0 ? sumSqDiff / sampleCount : 0;

  if (avgBrightness < 16) {
    return {
      isUsable: false,
      brightnessScore: Math.round(avgBrightness),
      varianceScore: Math.round(variance * 100) / 100,
      reason: 'too-dark',
      guidanceAr: 'الإطار مظلم جداً. يرجى تشغيل الإضاءة وتوجيه الكاميرا نحو ما تريد فحصه.',
      guidanceEn: 'The frame is too dark. Please turn on the lights and aim the camera at what you wish to inspect.',
    };
  }

  if (avgBrightness < 32 && variance < 4.5) {
    return {
      isUsable: false,
      brightnessScore: Math.round(avgBrightness),
      varianceScore: Math.round(variance * 100) / 100,
      reason: 'lens-covered',
      guidanceAr: 'عدسة الكاميرا مغطاة أو قريبة جداً من سطح معتم. تأكد من إزالة أي غطاء أمام الكاميرا.',
      guidanceEn: 'The camera lens appears covered or pointing at a solid dark surface. Please ensure the lens is uncovered.',
    };
  }

  // Phase 5: Detect severe overexposure / direct light glare
  if (avgBrightness > 240 && variance < 15) {
    return {
      isUsable: false,
      brightnessScore: Math.round(avgBrightness),
      varianceScore: Math.round(variance * 100) / 100,
      reason: 'glare-overexposed',
      guidanceAr: 'الإطار ساطع جداً أو به وهج ضوئي شديد يحجب الرؤية. يرجى توجيه الكاميرا بعيداً عن مصدر الضوء المباشر.',
      guidanceEn: 'The frame is overexposed or has severe glare blocking the view. Please point the camera away from direct light sources.',
    };
  }

  return {
    isUsable: true,
    brightnessScore: Math.round(avgBrightness),
    varianceScore: Math.round(variance * 100) / 100,
    reason: 'usable',
  };
}

export function analyzeCanvasFrameQuality(canvas: HTMLCanvasElement): FrameQualityResult {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        isUsable: true,
        brightnessScore: 128,
        varianceScore: 50,
        reason: 'usable',
      };
    }
    const w = canvas.width || 320;
    const h = canvas.height || 240;
    const imgData = ctx.getImageData(0, 0, w, h);
    return evaluateFramePixels(imgData.data);
  } catch (e) {
    return {
      isUsable: true,
      brightnessScore: 128,
      varianceScore: 50,
      reason: 'usable',
    };
  }
}

export type VoiceCommandType =
  | 'scene'
  | 'read'
  | 'product'
  | 'continuous'
  | 'currency'
  | 'color'
  | 'object'
  | 'face'
  | 'repeat'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'save'
  | 'back'
  | 'diagnostics'
  | 'barcode'
  | 'expiry'
  | 'clothing'
  | 'document'
  | 'memory'
  | 'unknown';

export interface ParsedVoiceCommand {
  command: VoiceCommandType;
  rawTranscript: string;
  itemTarget?: string;
  confidence: number;
}

/**
 * Natural voice command parser supporting Arabic, English, and French voice intents.
 */
export function parseVoiceCommand(transcript: string, lang?: 'ar' | 'en' | 'fr'): ParsedVoiceCommand {
  const text = (transcript || '').trim();
  const lower = text.toLowerCase();

  // Repeat / Replay
  if (/(أعد|كرر|سمعني|ثاني|ثانية|repeat|replay)/i.test(lower)) {
    return { command: 'repeat', rawTranscript: text, confidence: 0.95 };
  }

  // Pause (tested before stop to prevent 'وقف' in 'أوقف مؤقتاً')
  if (/(أوقف مؤقتاً|مؤقتاً|انتظر|استنى|pause)/i.test(lower)) {
    return { command: 'pause', rawTranscript: text, confidence: 0.9 };
  }

  // Stop / Silence
  if (/(اسكت|توقف|وقف|اصمت|stop|quiet|silence)/i.test(lower)) {
    return { command: 'stop', rawTranscript: text, confidence: 0.95 };
  }

  // Continuous Reading (must be tested before resume to avoid 'تابع' substring in 'متتابع')
  if (/(متتابع|متتابعة|قراءة متتابعة|continuous)/i.test(lower)) {
    return { command: 'continuous', rawTranscript: text, confidence: 0.9 };
  }

  // Resume
  if (/(واصل|أكمل|استمر|resume|continue|(?:^|\s)تابع(?:\s|$))/i.test(lower)) {
    return { command: 'resume', rawTranscript: text, confidence: 0.9 };
  }

  // Diagnostics
  if (/(فحص الأداء|تشخيص|الحالة|diagnostics|telemetry|system status)/i.test(lower)) {
    return { command: 'diagnostics', rawTranscript: text, confidence: 0.9 };
  }

  // Save memory
  if (/(احفظ|ذاكرة|حفظ|save|remember)/i.test(lower)) {
    return { command: 'save', rawTranscript: text, confidence: 0.9 };
  }

  // Back / Exit
  if (/(رجوع|ارجع|خروج|back|exit)/i.test(lower)) {
    return { command: 'back', rawTranscript: text, confidence: 0.9 };
  }

  // Phase 6: Barcode scanning
  if (/(?:باركود|امسح الباركود|كود العبوة|barcode|scan barcode|upc)/i.test(lower)) {
    return { command: 'barcode', rawTranscript: text, confidence: 0.95 };
  }

  // Phase 6: Expiry date inspection
  if (/(?:تاريخ الصلاحية|تاريخ الانتهاء|صلاحية العبوة|تاريخ الصنع|انتهاء الصلاحية|expiry date|expiration date|best before)/i.test(lower)) {
    return { command: 'expiry', rawTranscript: text, confidence: 0.95 };
  }

  // Phase 6: Clothing / Outfit matching (distinct from color inspection)
  if (!/(ألوان|لون|color)/i.test(lower) && /(?:تنسيق الملابس|طقم|ملابس|لبس|هدوم|outfit|clothing|match clothes)/i.test(lower)) {
    return { command: 'clothing', rawTranscript: text, confidence: 0.9 };
  }

  // Phase 6: Document structure & invoices
  if (/(?:مستند|وثيقة|فاتورة|جدول|تقرير|استمارة|document|invoice|receipt|table|form)/i.test(lower)) {
    return { command: 'document', rawTranscript: text, confidence: 0.9 };
  }

  // Phase 6: Scene Memory Contextual Query
  if (/(?:هل تغير شيء|أين رأيت|ماذا كان بجوار|ذاكرة المشهد|has anything changed|where did i last see|what was next to)/i.test(lower)) {
    return { command: 'memory', rawTranscript: text, confidence: 0.9 };
  }

  // Product Inspection (checked before generic read)
  if (/(منتج|عبوة|سعر|صلاحية|ماركة|product|package|brand|expiry)/i.test(lower)) {
    return { command: 'product', rawTranscript: text, confidence: 0.9 };
  }

  // OCR / Read
  if (/(اقرأ|نص|ورقة|كتاب|قراءة|مستند|read|text|ocr|document)/i.test(lower)) {
    return { command: 'read', rawTranscript: text, confidence: 0.9 };
  }

  // Currency
  if (/(فلوس|نقود|عملة|جنيه|cash|money|currency|banknote|dollar|pound)/i.test(lower)) {
    return { command: 'currency', rawTranscript: text, confidence: 0.95 };
  }

  // Color / Outfit
  if (/(ألوان|لون|ملابس|لبس|قميص|بنطلون|color|outfit|clothes)/i.test(lower)) {
    return { command: 'color', rawTranscript: text, confidence: 0.9 };
  }

  // Object Finder
  if (/(ابحث|مكان|أين|دور|غرض|فين|find|locate|where is|search)/i.test(lower)) {
    let target = '';
    const arMatch = lower.match(/(?:ابحث عن|دور على|أين|فين)\s+([\u0600-\u06FF\w\s]+)/i);
    const enMatch = lower.match(/(?:find|where is|locate)(?:\s+my)?\s+([a-zA-Z\s]+)/i);
    if (arMatch && arMatch[1]) {
      target = arMatch[1].trim();
    } else if (enMatch && enMatch[1]) {
      target = enMatch[1].trim();
    }
    return { command: 'object', rawTranscript: text, itemTarget: target || undefined, confidence: 0.9 };
  }

  // People / Face
  if (/(شخص|ناس|وجوه|وجه|مين|person|face|who|people)/i.test(lower)) {
    return { command: 'face', rawTranscript: text, confidence: 0.9 };
  }

  // Scene & Safety (General vision)
  if (/(ماذا|مشهد|أمام|شوف|انظر|محيط|طريق|look|scene|what|ahead|surroundings)/i.test(lower)) {
    return { command: 'scene', rawTranscript: text, confidence: 0.85 };
  }

  return { command: 'unknown', rawTranscript: text, confidence: 0 };
}

/**
 * Creates a command debouncer to prevent duplicate triggering when speech recognition
 * delivers rapid successive result events for the same phrase.
 */
export function createVoiceCommandDebouncer(windowMs = 1500) {
  let lastCommand = '';
  let lastTimestamp = 0;

  return {
    shouldProcess(command: string): boolean {
      const now = Date.now();
      const norm = (command || '').trim().toLowerCase();
      if (norm === lastCommand && now - lastTimestamp < windowMs) {
        return false;
      }
      lastCommand = norm;
      lastTimestamp = now;
      return true;
    },
    reset(): void {
      lastCommand = '';
      lastTimestamp = 0;
    },
  };
}

