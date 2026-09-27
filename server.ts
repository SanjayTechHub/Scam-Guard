import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Optional live checker (needs API key)
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

interface Incident {
  id: string;
  titleEn: string;
  titleHi: string;
  content: string;
  modality: 'sms' | 'screenshot' | 'url' | 'qr' | 'call';
  riskLevel: 'HIGH' | 'REVIEW' | 'LOW';
  score: number;
  reasonsEn: string[];
  reasonsHi: string[];
  stepsEn: string[];
  stepsHi: string[];
  audioTextEn: string;
  audioTextHi: string;
  timestamp: string;
  status: 'NEW' | 'RESOLVED_SCAM' | 'RESOLVED_SAFE' | 'BLOCKED';
  elderName: string;
  senderPhone?: string;
}

// In-memory persistent state for the session
let incidents: Incident[] = [
  {
    id: 'inc-1',
    titleEn: 'Fake Bank KYC SMS',
    titleHi: 'फर्जी बैंक केवाईसी संदेश',
    content: 'URGENT ALERT: Dear Customer, your SBI YONO account has been suspended today due to expired KYC. Update immediately at http://bit.ly/sbi-kyc-update-9082 or your card will be blocked within 2 hours. Do not ignore.',
    modality: 'sms',
    riskLevel: 'HIGH',
    score: 89,
    reasonsEn: [
      'Uses intense artificial panic ("account suspended within 2 hours") to make you hurry without thinking.',
      'Contains an unofficial short link ("bit.ly") instead of the official "sbi.co.in" banking portal.',
      'Legitimate banks never threaten immediate account suspension over standard SMS.'
    ],
    reasonsHi: [
      'कृत्रिम डर और जल्दबाजी पैदा की जा रही है ("2 घंटे में खाता बंद") ताकि आप बिना सोचे निर्णय लें।',
      'अनौपचारिक छोटा लिंक ("bit.ly") है, आधिकारिक बैंक पोर्टल ("sbi.co.in") नहीं।',
      'असली बैंक कभी भी साधारण एसएमएस पर खाता तुरंत बंद करने की धमकी नहीं देते।'
    ],
    stepsEn: [
      'DO NOT click the link or open any website from this SMS.',
      'NEVER share OTP, Aadhaar, or NetBanking passwords.',
      'Open your official YONO App directly or visit your local branch manager.'
    ],
    stepsHi: [
      'इस संदेश में दिए गए लिंक पर बिल्कुल क्लिक न करें।',
      'ओटीपी, आधार या बैंक पासवर्ड किसी के साथ साझा न करें।',
      'सीधे आधिकारिक योनो ऐप खोलें या अपनी नजदीकी बैंक शाखा में संपर्क करें।'
    ],
    audioTextEn: 'High Risk Detected. Do not click the link. Your bank does not suspend accounts through SMS links. Please ask your son or daughter before doing anything.',
    audioTextHi: 'सावधान! यह उच्च जोखिम वाला संदेश है। लिंक पर क्लिक न करें। आपका बैंक कभी भी एसएमएस लिंक के जरिए खाता बंद नहीं करता।',
    timestamp: 'Today, 11:20 AM',
    status: 'NEW',
    elderName: 'Ramakant Sharma (Father, 72)'
  },
  {
    id: 'inc-2',
    titleEn: 'Prize / Reward QR Scam',
    titleHi: 'इनाम / पुरस्कार क्यूआर धोखाधड़ी',
    content: 'CONGRATULATIONS! You have won ₹5,000 festive bonus from PhonePe Rewards. Scan this QR code and immediately enter your 6-digit UPI PIN to deposit cash into your savings account.',
    modality: 'qr',
    riskLevel: 'HIGH',
    score: 94,
    reasonsEn: [
      'FUNDAMENTAL RULE: You NEVER need to enter your UPI PIN to RECEIVE money.',
      'Entering a UPI PIN always deducts funds from your bank balance instantly.',
      'Scammers disguise pay-requests as reward collections to deceive older citizens.'
    ],
    reasonsHi: [
      'मूल नियम: पैसे प्राप्त करने के लिए कभी भी यूपीआई पिन डालने की आवश्यकता नहीं होती।',
      'यूपीआई पिन दर्ज करने से हमेशा आपके खाते से पैसे कटते हैं, आते नहीं।',
      'धोखेबाज पैसे मांगने वाले क्यूआर को इनाम बताकर वरिष्ठ नागरिकों को गुमराह करते हैं।'
    ],
    stepsEn: [
      'DO NOT scan this QR code inside Google Pay, PhonePe, or Paytm.',
      'If you entered your PIN already, call 1930 and freeze your UPI instantly.',
      'Inform Rahul or Priya right now through your Trusted Circle.'
    ],
    stepsHi: [
      'इस क्यूआर कोड को गूगल पे या फोनपे में स्कैन न करें।',
      'यदि आपने पिन दर्ज कर दिया है, तो तुरंत 1930 पर कॉल करें।',
      'अपने परिवार के सदस्य राहुल या प्रिया को तुरंत सूचित करें।'
    ],
    audioTextEn: 'Danger! You never need to enter your secret PIN to receive any prize or money. Scanning this will take money out of your account.',
    audioTextHi: 'चेतावनी! पैसे पाने के लिए कभी भी गुप्त पिन नहीं डाला जाता। इसे स्कैन करने पर आपके खाते से पैसे कट जाएंगे।',
    timestamp: 'Yesterday, 3:40 PM',
    status: 'BLOCKED',
    elderName: 'Ramakant Sharma (Father, 72)'
  },
  {
    id: 'inc-3',
    titleEn: 'Family WhatsApp Arrival Note',
    titleHi: 'परिवार का सामान्य संदेश',
    content: 'Namaste Maaji! Train was on time, beta and I have reached the station. We are taking an auto and should be home by 7:30 PM. Please do not worry, see you shortly for tea!',
    modality: 'sms',
    riskLevel: 'LOW',
    score: 8,
    reasonsEn: [
      'Contains no requests for money, OTPs, bank cards, or financial transfers.',
      'No suspicious links, shortened web addresses, or urgent threats.',
      'Conversational, recognizable everyday family routine context.'
    ],
    reasonsHi: [
      'इसमें कोई पैसे, ओटीपी, बैंक कार्ड या ट्रांसफर की मांग नहीं की गई है।',
      'कोई संदिग्ध लिंक, वेबसाइट या जल्दबाजी की धमकी नहीं है।',
      'यह परिवार का सामान्य और सुरक्षित संदेश प्रतीत होता है।'
    ],
    stepsEn: [
      'This message appears peaceful and safe to read.',
      'No action is required.',
      'You can reply normally as you wish.'
    ],
    stepsHi: [
      'यह संदेश सुरक्षित और सामान्य लगता है।',
      'किसी प्रकार की चिंता की आवश्यकता नहीं है।',
      'आप सामान्य रूप से उत्तर दे सकते हैं।'
    ],
    audioTextEn: 'This message appears safe. There are no links or requests for money. It is a normal message from your family.',
    audioTextHi: 'यह संदेश सुरक्षित है। इसमें पैसे या लिंक की कोई मांग नहीं है। यह आपके परिवार का सामान्य संदेश है।',
    timestamp: '2 days ago',
    status: 'RESOLVED_SAFE',
    elderName: 'Ramakant Sharma (Father, 72)'
  }
];

let familyCircle = [
  {
    id: 'rel-1',
    name: 'Rahul Sharma',
    relationship: 'Son',
    phone: '+91 98765 43210',
    status: 'Available',
    isPrimary: true,
    avatarColor: 'bg-primary text-on-primary',
    initial: 'R'
  },
  {
    id: 'rel-2',
    name: 'Priya Verma',
    relationship: 'Daughter',
    phone: '+91 98765 43211',
    status: 'Available',
    isPrimary: false,
    avatarColor: 'bg-secondary text-on-secondary',
    initial: 'P'
  }
];

// Fallback Heuristics Evaluation Function
function runDeterministicHeuristics(content: string, modality: string) {
  const text = (content || '').toLowerCase();
  
  const hasUrgency = /within \d+ hours?|tonight|immediately|urgent|today|blocked within|disconnect|suspended|last chance|warning|alert/i.test(text);
  const hasOTP = /otp|cvv|pin|password|upi pin|atm pin|6-digit|code/i.test(text);
  const hasBanking = /sbi|yono|kyc|bank|account|pan card|aadhaar|debit card|credit card|rbi|manager|customs|police/i.test(text);
  const hasShortLink = /bit\.ly|tinyurl|is\.gd|cutt\.ly|goo\.gl|t\.co|shorturl|\.apk|http:\/\/|quickpay/i.test(text);
  const hasMoneyTrap = /win|won|lottery|reward|bonus|₹\s*\d+|\d+\s*rupees|deposit cash|prize/i.test(text);
  const hasUtilityThreat = /electricity|power|bijli|bill|water|lpg|gas/i.test(text);

  let score = 10;
  const reasonsEn: string[] = [];
  const reasonsHi: string[] = [];
  const stepsEn: string[] = [];
  const stepsHi: string[] = [];

  if (hasOTP && (hasMoneyTrap || hasBanking || text.includes('receive'))) {
    score += 45;
    reasonsEn.push('GOLDEN RULE: You NEVER type your secret UPI PIN to receive money or bonuses. Entering a PIN always deducts funds from your account.');
    reasonsHi.push('स्वर्ण नियम: पैसे प्राप्त करने के लिए कभी भी यूपीआई पिन दर्ज नहीं किया जाता। पिन डालने से हमेशा पैसे कटते हैं।');
  }

  if (hasUrgency) {
    score += 25;
    reasonsEn.push('Manufactures intense artificial panic ("within 2 hours / tonight") to provoke hasty, anxious decisions. Real banks or government utilities send official postal letters.');
    reasonsHi.push('कृत्रिम डर और जल्दबाजी दिखाई गई है ("2 घंटे में खाता बंद") ताकि आप घबराकर तुरंत कदम उठाएं। वास्तविक बैंक हमेशा डाक से सूचना भेजते हैं।');
  }

  if (hasShortLink) {
    score += 25;
    reasonsEn.push('Contains an unverified or shortened link (e.g. bit.ly, non-bank URL, or .apk file) designed to hijack phone passwords or SMS OTPs.');
    reasonsHi.push('संदिग्ध छोटा लिंक या बाहरी ऐप (.apk) का पता दिया गया है जो आपके फोन से बैंक ओटीपी चुरा सकता है।');
  }

  if (hasUtilityThreat && hasUrgency) {
    score += 20;
    reasonsEn.push('Impersonates the electricity distribution board. Real government boards never disconnect home power at night without documented meter audits.');
    reasonsHi.push('बिजली विभाग का फर्जी रूप धारण किया गया है। सरकारी विभाग कभी भी रात में बिना औपचारिक नोटिस के बिजली नहीं काटते।');
  }

  if (score > 100) score = 98;

  let riskLevel: 'HIGH' | 'REVIEW' | 'LOW' = 'LOW';
  if (score >= 60) riskLevel = 'HIGH';
  else if (score >= 35) riskLevel = 'REVIEW';

  if (riskLevel === 'HIGH') {
    stepsEn.push('DO NOT click any link, scan QR codes, or enter your secret PIN.');
    stepsEn.push('NEVER share OTPs received on SMS with any caller, even if they claim to be RBI or Police.');
    stepsEn.push('Tap "Ask Rahul or Priya" below to consult your family circle calmly.');
    stepsHi.push('किसी भी लिंक पर क्लिक न करें और न ही कोई क्यूआर कोड स्कैन करें।');
    stepsHi.push('एसएमएस पर आए किसी भी ओटीपी या पिन को किसी को न बताएं।');
    stepsHi.push('नीचे "परिवार से पूछें" पर क्लिक करके निश्चिंत होकर सलाह लें।');
  } else if (riskLevel === 'REVIEW') {
    stepsEn.push('Verify the sender identity directly by calling official customer care.');
    stepsEn.push('Do not download attachments or files from unfamiliar numbers.');
    stepsHi.push('संदेश भेजने वाले का नंबर आधिकारिक वेबसाइट से मिलाकर जांचें।');
    stepsHi.push('अज्ञात नंबरों से आई किसी भी फाइल को डाउनलोड न करें।');
  } else {
    reasonsEn.push('No suspicious payment links, OTP requests, or artificial threats detected.');
    reasonsHi.push('इसमें कोई संदिग्ध भुगतान लिंक, ओटीपी की मांग या धमकी भरे शब्द नहीं मिले।');
    stepsEn.push('This message appears peaceful and safe to read.');
    stepsEn.push('Remember to never disclose bank passwords even in everyday conversations.');
    stepsHi.push('यह संदेश सामान्य और सुरक्षित प्रतीत होता है।');
    stepsHi.push('याद रखें कि सामान्य बातचीत में भी बैंक पासवर्ड किसी से साझा न करें।');
  }

  const titleEn = riskLevel === 'HIGH' ? 'Critical Cyber Scam Pattern Detected' : (riskLevel === 'REVIEW' ? 'Suspicious Request - Caution Advised' : 'Safe Everyday Communication');
  const titleHi = riskLevel === 'HIGH' ? 'गंभीर धोखाधड़ी का खतरा पहचाना गया' : (riskLevel === 'REVIEW' ? 'संदिग्ध संदेश - सावधानी बरतें' : 'सुरक्षित सामान्य संदेश');

  const audioTextEn = riskLevel === 'HIGH' 
    ? 'High risk alert! Please do not click the link or type your secret PIN. Banks never rush you. Please consult your family right now.'
    : 'This message appears safe. Remember to never share your secret banking password with anyone.';

  const audioTextHi = riskLevel === 'HIGH'
    ? 'सावधान! यह उच्च जोखिम वाला संदेश है। किसी लिंक पर क्लिक न करें और न ही गुप्त पिन डालें। तुरंत अपने परिवार से बात करें।'
    : 'यह संदेश सुरक्षित जान पड़ता है। कभी भी किसी के साथ अपना बैंक पिन साझा न करें।';

  return {
    riskLevel,
    score,
    titleEn,
    titleHi,
    reasonsEn,
    reasonsHi,
    stepsEn,
    stepsHi,
    audioTextEn,
    audioTextHi
  };
}

// Threat Evaluation Endpoint
app.post('/api/evaluate-threat', async (req: Request, res: Response) => {
  const { content, modality = 'sms', elderLanguage = 'hi', imageBase64, mimeType } = req.body;
  const startTime = Date.now();

  if (!content && !imageBase64) {
    return res.status(400).json({ error: 'Content or image is required for scam analysis.' });
  }

  // 1. Compute deterministic heuristic baseline
  const heuristicResult = runDeterministicHeuristics(content || '', modality);

  // 2. Live check when an API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const systemInstruction = `You are ScamGuard, a calm digital safety helper for senior citizens in India.
Evaluate whether a text message, QR claim, URL, or call transcript looks like financial fraud.
Speak with dignity. Never blame the person.
Common cases: fake bank KYC SMS, electricity disconnection links, prize QR codes that ask for UPI PIN, and callers pretending to be from a bank.
Reply in strict JSON matching this schema:
{
  "riskLevel": "HIGH" | "REVIEW" | "LOW",
  "score": number between 1 and 100,
  "titleEn": string (short punchy title in English),
  "titleHi": string (short title in Devanagari Hindi),
  "reasonsEn": string[] (2-3 concise reasons in simple English, strictly avoid technical jargon like "DNS spoofing"),
  "reasonsHi": string[] (same reasons in polite Hindi),
  "stepsEn": string[] (3 calm, protective immediate actions in English),
  "stepsHi": string[] (same actions in polite Hindi),
  "audioTextEn": string (warm 1-2 sentence readout suitable for elder text-to-speech),
  "audioTextHi": string (warm 1-2 sentence readout in Devanagari Hindi)
}`;

      let contents: any;
      if (imageBase64) {
        contents = {
          parts: [
            {
              inlineData: {
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: mimeType || 'image/png',
              },
            },
            {
              text: `Analyze this image (screenshot or QR code). Extracted query context: "${content || 'Detect if this contains scam, fake bill, APK download, or fraudulent UPI request'}". Return valid JSON only.`,
            },
          ],
        };
      } else {
        contents = `Modality: ${modality}. Content to evaluate: "${content}". Return valid JSON matching the schema.`;
      }

      const response = await genai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || '';
      const parsedAi = JSON.parse(responseText);

      const finalResult = {
        ...heuristicResult,
        ...parsedAi,
        latencyMs: Date.now() - startTime,
        engine: 'live-check',
      };

      // Add to session incident stream
      const newInc: Incident = {
        id: `inc-${Date.now()}`,
        titleEn: finalResult.titleEn || heuristicResult.titleEn,
        titleHi: finalResult.titleHi || heuristicResult.titleHi,
        content: content || '[Screenshot Analysis]',
        modality: (modality as any) || 'sms',
        riskLevel: finalResult.riskLevel || heuristicResult.riskLevel,
        score: finalResult.score || heuristicResult.score,
        reasonsEn: finalResult.reasonsEn || heuristicResult.reasonsEn,
        reasonsHi: finalResult.reasonsHi || heuristicResult.reasonsHi,
        stepsEn: finalResult.stepsEn || heuristicResult.stepsEn,
        stepsHi: finalResult.stepsHi || heuristicResult.stepsHi,
        audioTextEn: finalResult.audioTextEn || heuristicResult.audioTextEn,
        audioTextHi: finalResult.audioTextHi || heuristicResult.audioTextHi,
        timestamp: 'Just now',
        status: finalResult.riskLevel === 'HIGH' ? 'NEW' : 'RESOLVED_SAFE',
        elderName: 'Ramakant Sharma (Father, 72)',
      };
      incidents.unshift(newInc);

      return res.json({
        success: true,
        assessment: finalResult,
        incidentId: newInc.id,
      });
    } catch (err: any) {
      console.warn('Live check failed, using local rules:', err?.message);
    }
  }

  // Fallback to high-accuracy deterministic heuristic engine
  const fallbackResult = {
    ...heuristicResult,
    latencyMs: Date.now() - startTime,
    engine: 'offline-rules',
  };

  const newInc: Incident = {
    id: `inc-${Date.now()}`,
    titleEn: fallbackResult.titleEn,
    titleHi: fallbackResult.titleHi,
    content: content || '[Manual Check]',
    modality: (modality as any) || 'sms',
    riskLevel: fallbackResult.riskLevel,
    score: fallbackResult.score,
    reasonsEn: fallbackResult.reasonsEn,
    reasonsHi: fallbackResult.reasonsHi,
    stepsEn: fallbackResult.stepsEn,
    stepsHi: fallbackResult.stepsHi,
    audioTextEn: fallbackResult.audioTextEn,
    audioTextHi: fallbackResult.audioTextHi,
    timestamp: 'Just now',
    status: fallbackResult.riskLevel === 'HIGH' ? 'NEW' : 'RESOLVED_SAFE',
    elderName: 'Ramakant Sharma (Father, 72)',
  };
  incidents.unshift(newInc);

  return res.json({
    success: true,
    assessment: fallbackResult,
    incidentId: newInc.id,
  });
});

// Incidents Feed
app.get('/api/incidents', (_req: Request, res: Response) => {
  res.json({ incidents });
});

app.post('/api/incidents', (req: Request, res: Response) => {
  const newIncident = {
    id: `inc-${Date.now()}`,
    ...req.body,
    timestamp: 'Just now',
  };
  incidents.unshift(newIncident);
  res.json({ success: true, incident: newIncident });
});

app.patch('/api/incidents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const inc = incidents.find((i) => i.id === id);
  if (inc) {
    inc.status = status;
    return res.json({ success: true, incident: inc });
  }
  res.status(404).json({ error: 'Incident not found' });
});

app.delete('/api/incidents', (_req: Request, res: Response) => {
  incidents = [];
  res.json({ success: true, message: 'Incident log cleared' });
});

// Trusted Family Circle
app.get('/api/trusted-circle', (_req: Request, res: Response) => {
  res.json({ familyCircle });
});

app.post('/api/trusted-circle', (req: Request, res: Response) => {
  const { name, relationship, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }
  const newMember = {
    id: `rel-${Date.now()}`,
    name,
    relationship: relationship || 'Family',
    phone,
    status: 'Available',
    isPrimary: false,
    avatarColor: 'bg-primary-container text-on-primary-container',
    initial: name.charAt(0).toUpperCase(),
  };
  familyCircle.push(newMember);
  res.json({ success: true, member: newMember, familyCircle });
});

// Emergency alert notification
app.post('/api/emergency/notify-circle', (req: Request, res: Response) => {
  const { incidentTitle, message } = req.body;
  res.json({
    success: true,
    recipients: familyCircle.map((m) => m.name),
    sentAt: new Date().toISOString(),
    broadcastNote: `Priority Alert transmitted to ${familyCircle.length} guardians: "${incidentTitle || 'Potential Scam Alert'}"`,
  });
});

// Safety Advisories
app.get('/api/safety-advisories', (_req: Request, res: Response) => {
  res.json({
    advisories: [
      {
        id: 'adv-1',
        title: 'Fake "Digital Arrest" Video Call Extortion',
        titleHi: 'फर्जी "डिजिटल अरेस्ट" वीडियो कॉल ठगी',
        severity: 'CRITICAL',
        source: 'Indian Cyber Crime Coordination Centre (I4C)',
        description: 'Scammers dress in fake police/CBI uniforms over Skype/WhatsApp video calls claiming illegal parcels or money laundering, demanding bank transfers to "clear charges".',
        defense: 'Indian police NEVER conducts interrogation or arrest over video calls. Hang up immediately and dial 1930.',
        date: 'Updated September 2026'
      },
      {
        id: 'adv-2',
        title: 'Electricity Bill Disconnection APK Malware',
        titleHi: 'बिजली बिल और एपीके फाइल फ्रॉड',
        severity: 'HIGH',
        source: 'National Cyber Crime Portal',
        description: 'Messages warning that electricity will be disconnected tonight by 9:30 PM, instructing elders to install an "official" bijli.apk file.',
        defense: 'Never download .apk files from SMS or WhatsApp. Power utilities only send physical paper notices.',
        date: 'Updated September 2026'
      },
      {
        id: 'adv-3',
        title: 'Fake Bank KYC & SBI YONO Suspension Links',
        titleHi: 'एसबीआई योनो और पैन अपडेट फर्जी लिंक',
        severity: 'HIGH',
        source: 'Reserve Bank of India Advisory',
        description: 'Phishing SMS with bit.ly or clone websites asking for NetBanking password and Aadhaar OTP to prevent account suspension within 2 hours.',
        defense: 'Banks never suspend accounts over SMS links. Visit your home branch or use official bank apps.',
        date: 'Updated September 2026'
      },
      {
        id: 'adv-4',
        title: 'Reward & Cashback UPI QR Scam',
        titleHi: 'इनाम और कैशबैक क्यूआर कोड धोखाधड़ी',
        severity: 'HIGH',
        source: 'NPCI / UPI Safety Council',
        description: 'Scammers send scratch cards or "Cashback" QR codes asking elders to enter their 6-digit UPI PIN to "deposit" ₹5,000.',
        defense: 'UPI PIN is strictly for PAYING money. You NEVER need to enter a PIN to receive money.',
        date: 'Updated September 2026'
      }
    ]
  });
});

// Backend Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: process.env.GEMINI_API_KEY ? 'live-check' : 'offline-rules',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// In production, serve the built Vite app; in dev, mount Vite middleware
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`ScamGuard running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});
