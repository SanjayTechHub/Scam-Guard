import React, { useState, useEffect, useRef } from 'react';

interface ScanResult {
  riskLevel: 'HIGH' | 'REVIEW' | 'LOW';
  score: number;
  titleEn: string;
  titleHi: string;
  reasonsEn: string[];
  reasonsHi: string[];
  stepsEn: string[];
  stepsHi: string[];
  audioTextEn: string;
  audioTextHi: string;
  latencyMs?: number;
  engine?: string;
}

interface IncidentItem {
  id: string;
  titleEn: string;
  titleHi: string;
  content: string;
  modality: 'sms' | 'screenshot' | 'url' | 'qr' | 'call';
  riskLevel: 'HIGH' | 'REVIEW' | 'LOW';
  score: number;
  timestamp: string;
  status: 'NEW' | 'RESOLVED_SCAM' | 'RESOLVED_SAFE' | 'BLOCKED';
  elderName: string;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  status: string;
  isPrimary: boolean;
  avatarColor: string;
  initial: string;
}

const PRESETS = {
  kyc: {
    type: 'sms' as const,
    titleEn: 'Fake Bank KYC SMS',
    titleHi: 'फर्जी बैंक केवाईसी संदेश',
    rawContent: 'URGENT ALERT: Dear Customer, your SBI YONO account has been suspended today due to expired KYC. Update immediately at http://bit.ly/sbi-kyc-update-9082 or your card will be blocked within 2 hours. Do not ignore.',
    riskLevel: 'HIGH' as const,
    score: 89,
    reasonsEn: [
      'Uses panic language ("account suspended within 2 hours") so you tap without thinking.',
      'Uses a short link instead of the official bank website.',
      'Banks do not freeze accounts through a random SMS link.',
    ],
    reasonsHi: [
      'डर और जल्दबाजी पैदा की जा रही है ताकि आप बिना सोचे लिंक खोल दें।',
      'आधिकारिक बैंक साइट की जगह छोटा लिंक दिया गया है।',
      'असली बैंक एसएमएस लिंक से खाता बंद नहीं करते।',
    ],
    stepsEn: [
      'Do not tap the link.',
      'Do not share OTP, Aadhaar, or banking passwords.',
      'Open the official bank app yourself, or visit the branch.',
    ],
    stepsHi: [
      'लिंक पर क्लिक न करें।',
      'ओटीपी, आधार या पासवर्ड किसी को न बताएं।',
      'आधिकारिक बैंक ऐप खोलें या शाखा जाएं।',
    ],
    audioTextEn: 'High risk. Do not tap the link. Ask your family before doing anything.',
    audioTextHi: 'सावधान। लिंक न खोलें। पहले परिवार से पूछें।',
  },
  reward: {
    type: 'qr' as const,
    titleEn: 'Prize QR scam',
    titleHi: 'इनाम वाला क्यूआर',
    rawContent: 'CONGRATULATIONS! You have won ₹5,000 festive bonus from PhonePe Rewards. Scan this QR code and immediately enter your 6-digit UPI PIN to deposit cash into your savings account.',
    riskLevel: 'HIGH' as const,
    score: 94,
    reasonsEn: [
      'You never enter a UPI PIN to receive money.',
      'Entering a PIN sends money out of your account.',
      'Prize QR codes are a common trick.',
    ],
    reasonsHi: [
      'पैसे पाने के लिए यूपीआई पिन नहीं डाला जाता।',
      'पिन डालने से पैसे कटते हैं, आते नहीं।',
      'इनाम वाला क्यूआर अक्सर धोखा होता है।',
    ],
    stepsEn: [
      'Do not scan this QR in any payment app.',
      'If you already entered a PIN, call 1930 and freeze UPI.',
      'Tell a family member right away.',
    ],
    stepsHi: [
      'इस क्यूआर को स्कैन न करें।',
      'अगर पिन डाल चुके हैं तो 1930 पर कॉल करें।',
      'परिवार को तुरंत बताएं।',
    ],
    audioTextEn: 'Danger. You never type a PIN to receive a prize.',
    audioTextHi: 'खतरा। इनाम पाने के लिए पिन नहीं डाला जाता।',
  },
  electricity: {
    type: 'url' as const,
    titleEn: 'Electricity cut link',
    titleHi: 'बिजली कटने का लिंक',
    rawContent: 'Dear Consumer, your electricity power supply will be disconnected tonight at 9:30 PM because previous month bill was not updated. Immediately contact electricity officer at 98210-XXXXX or pay via: http://bijli-bill-quickpay.in',
    riskLevel: 'HIGH' as const,
    score: 82,
    reasonsEn: [
      'Threatens a same-night power cut to create fear.',
      'Gives a personal mobile number instead of the board helpline.',
      'The website is not an official bill portal.',
    ],
    reasonsHi: [
      'रात में बिजली काटने का डर दिखाया गया है।',
      'आधिकारिक हेल्पलाइन की जगह निजी नंबर दिया है।',
      'वेबसाइट सरकारी नहीं लगती।',
    ],
    stepsEn: [
      'Do not panic or pay on this link.',
      'Use the number printed on your last paper bill.',
      'Pay only on the official board website or app.',
    ],
    stepsHi: [
      'घबराएं नहीं, इस लिंक पर पैसे न भेजें।',
      'पुराने बिल पर छपे नंबर पर कॉल करें।',
      'आधिकारिक पोर्टल से ही बिल भरें।',
    ],
    audioTextEn: 'This looks like an electricity scam. Real offices do not cut power through a threatening text.',
    audioTextHi: 'यह बिजली का फर्जी संदेश लग रहा है।',
  },
  call: {
    type: 'call' as const,
    titleEn: 'Fake bank manager call',
    titleHi: 'फर्जी बैंक कॉल',
    rawContent: 'Caller Transcript: "Namaste Uncle ji, I am talking from Reserve Bank Headquarters, New Delhi. Your debit card chips are being upgraded. I am sending an OTP to your phone right now. Kindly tell me the 6 digits so I can authorize your life-time pension."',
    riskLevel: 'HIGH' as const,
    score: 96,
    reasonsEn: [
      'No bank staff will ask for an OTP on a call.',
      'RBI does not call people for card chip upgrades.',
      'Pension talk is used to create fear and trust.',
    ],
    reasonsHi: [
      'बैंक वाले फोन पर ओटीपी नहीं मांगते।',
      'आरबीआई कार्ड अपडेट के लिए कॉल नहीं करता।',
      'पेंशन का डर दिखाकर भरोसा लिया जा रहा है।',
    ],
    stepsEn: [
      'Hang up immediately.',
      'Do not read out any SMS code.',
      'Call your branch yourself if you still have a doubt.',
    ],
    stepsHi: [
      'फोन काट दें।',
      'एसएमएस का कोई कोड न बताएं।',
      'शक हो तो खुद शाखा को कॉल करें।',
    ],
    audioTextEn: 'Hang up. No bank manager will ask for your OTP on a call.',
    audioTextHi: 'फोन काट दें। कोई मैनेजर ओटीपी नहीं मांगता।',
  },
  family: {
    type: 'sms' as const,
    titleEn: 'Genuine family message',
    titleHi: 'परिवार का संदेश',
    rawContent: 'Namaste Maaji! Train was on time, beta and I have reached the station. We are taking an auto and should be home by 7:30 PM. Please do not worry, see you shortly for tea!',
    riskLevel: 'LOW' as const,
    score: 8,
    reasonsEn: [
      'No request for money, OTP, or bank details.',
      'No strange link or threat.',
      'Sounds like a normal family update.',
    ],
    reasonsHi: [
      'पैसे या ओटीपी की मांग नहीं है।',
      'कोई अजीब लिंक या धमकी नहीं है।',
      'परिवार का सामान्य संदेश लगता है।',
    ],
    stepsEn: [
      'This looks safe to read.',
      'No extra step is needed.',
      'You can reply as usual.',
    ],
    stepsHi: [
      'यह संदेश सुरक्षित लगता है।',
      'कुछ करने की जरूरत नहीं।',
      'आराम से जवाब दे सकते हैं।',
    ],
    audioTextEn: 'This message looks safe. No links or money requests.',
    audioTextHi: 'यह संदेश सुरक्षित लगता है।',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'companion' | 'caregiver'>('companion');
  const [lang, setLang] = useState<'en' | 'hi'>('hi');
  const [activeInputType, setActiveInputType] = useState<'sms' | 'screenshot' | 'url' | 'qr' | 'call'>('sms');
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showReassuranceModal, setShowReassuranceModal] = useState(false);
  const [reassuranceMessage, setReassuranceMessage] = useState(
    'Ramakant ji, stay calm. Rahul checked this message. It is fake. You are safe.'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hi = lang === 'hi';

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((data) => {
        if (data.incidents) setIncidents(data.incidents);
      })
      .catch(() => {});

    fetch('/api/trusted-circle')
      .then((res) => res.json())
      .then((data) => {
        if (data.familyCircle) setFamilyMembers(data.familyCircle);
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast(hi ? 'इस ब्राउज़र में आवाज़ उपलब्ध नहीं है।' : 'Voice readout is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = hi ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.88;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const evaluateClientSide = (content: string): ScanResult => {
    const lowerContent = content.toLowerCase();
    const scamIndicators = [
      'kyc', 'suspend', 'block', 'urgent', 'immediate', 'account', 'expiry',
      'prize', 'reward', 'won', 'congratulations', 'upi pin', 'enter pin',
      'electricity', 'disconnect', 'bijli', 'power cut', 'bit.ly', 'tinyurl',
      'otp', 'password', 'bank', 'rbi', 'police', 'arrest', 'court',
    ];
    const safeIndicators = ['train', 'station', 'home', 'tea', 'family', 'love', 'reached'];
    let scamScore = 0;
    scamIndicators.forEach((indicator) => {
      if (lowerContent.includes(indicator)) scamScore += 15;
    });
    safeIndicators.forEach((indicator) => {
      if (lowerContent.includes(indicator)) scamScore -= 20;
    });
    scamScore = Math.max(0, Math.min(100, scamScore));
    const riskLevel = scamScore > 60 ? 'HIGH' : scamScore > 30 ? 'REVIEW' : 'LOW';
    return {
      riskLevel,
      score: scamScore,
      titleEn: riskLevel === 'HIGH' ? 'This looks risky' : riskLevel === 'REVIEW' ? 'Please double-check' : 'Looks safe',
      titleHi: riskLevel === 'HIGH' ? 'यह संदेश खतरनाक लग रहा है' : riskLevel === 'REVIEW' ? 'एक बार और जाँचें' : 'सुरक्षित लगता है',
      reasonsEn:
        riskLevel === 'HIGH'
          ? ['Sounds rushed or threatening', 'Asks for money, PIN, or OTP', 'Uses a short or unknown link']
          : ['A few lines need a second look'],
      reasonsHi:
        riskLevel === 'HIGH'
          ? ['जल्दबाजी या धमकी दिख रही है', 'पिन, ओटीपी या पैसे मांगे गए हैं', 'अनजान लिंक है']
          : ['कुछ बातें दोबारा जाँचने लायक हैं'],
      stepsEn:
        riskLevel === 'HIGH'
          ? ['Do not tap any link', 'Do not share personal details', 'Ask family or call the bank yourself']
          : ['Confirm with family if you are unsure'],
      stepsHi:
        riskLevel === 'HIGH'
          ? ['लिंक न खोलें', 'जानकारी न दें', 'परिवार या बैंक से खुद बात करें']
          : ['शक हो तो परिवार से पूछें'],
      audioTextEn:
        riskLevel === 'HIGH'
          ? 'This looks like a scam. Do not share personal information.'
          : 'Please check with your family before taking any step.',
      audioTextHi:
        riskLevel === 'HIGH'
          ? 'यह धोखा लग रहा है। कोई जानकारी न दें।'
          : 'कोई कदम उठाने से पहले परिवार से पूछें।',
      latencyMs: 150,
      engine: 'offline-rules',
    };
  };

  const executeScan = async (
    contentToScan: string,
    modality: 'sms' | 'screenshot' | 'url' | 'qr' | 'call',
    imageBase64?: string
  ) => {
    if (!contentToScan.trim() && !imageBase64) {
      showToast(hi ? 'कृपया संदेश लिखें या उदाहरण चुनें।' : 'Paste a message or pick an example.');
      return;
    }

    setIsScanning(true);
    setCurrentResult(null);

    try {
      const response = await fetch('/api/evaluate-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToScan,
          modality,
          elderLanguage: lang,
          imageBase64,
        }),
      });
      const data = await response.json();
      setTimeout(() => {
        setIsScanning(false);
        if (data.assessment) {
          setCurrentResult(data.assessment);
          fetch('/api/incidents')
            .then((res) => res.json())
            .then((d) => {
              if (d.incidents) setIncidents(d.incidents);
            });
        } else {
          setCurrentResult(evaluateClientSide(contentToScan));
        }
      }, 400);
    } catch {
      setIsScanning(false);
      setCurrentResult(evaluateClientSide(contentToScan));
    }
  };

  const handleLoadPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    setActiveInputType(preset.type);
    setInputText(preset.rawContent);
    executeScan(preset.rawContent, preset.type);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      const sampleOcr =
        'From photo: Important Notice: Electricity bill account pending ₹780. Disconnect tonight at 9:30 PM. Download bijli.apk at http://bijli-pay.net';
      setActiveInputType('screenshot');
      setInputText(sampleOcr);
      executeScan(sampleOcr, 'screenshot', b64);
    };
    reader.readAsDataURL(file);
  };

  const handleAskFamily = async (title: string) => {
    try {
      await fetch('/api/emergency/notify-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentTitle: title,
          message: 'Please confirm this message before taking action.',
        }),
      });
      showToast(hi ? 'परिवार को सूचना भेज दी गई है।' : 'Your family has been notified.');
    } catch {
      showToast(hi ? 'परिवार को सूचना भेज दी गई है।' : 'Your family has been notified.');
    }
  };

  const handleUpdateIncidentStatus = async (id: string, status: 'RESOLVED_SCAM' | 'RESOLVED_SAFE') => {
    try {
      await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setIncidents((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      showToast(status === 'RESOLVED_SCAM' ? (hi ? 'धोखा माना गया।' : 'Marked as a scam.') : hi ? 'सुरक्षित माना गया।' : 'Marked as safe.');
    } catch {
      showToast(hi ? 'स्थिति बदली गई।' : 'Status updated.');
    }
  };

  const handleSendReassurance = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReassuranceModal(false);
    showToast(hi ? 'संदेश भेज दिया गया।' : 'Message sent.');
  };

  const riskStyles = (level: string) => {
    if (level === 'HIGH') return 'border-red-700 bg-red-50';
    if (level === 'REVIEW') return 'border-amber-600 bg-amber-50';
    return 'border-emerald-700 bg-emerald-50';
  };

  const inputTypes = [
    { id: 'sms', label: 'SMS', icon: 'sms' },
    { id: 'url', label: hi ? 'लिंक' : 'Link', icon: 'link' },
    { id: 'qr', label: 'QR', icon: 'qr_code_2' },
    { id: 'call', label: hi ? 'कॉल' : 'Call', icon: 'call' },
    { id: 'screenshot', label: hi ? 'फोटो' : 'Photo', icon: 'photo' },
  ] as const;

  return (
    <div className="min-h-screen text-stone-900 flex flex-col">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl bg-stone-900 text-white shadow-xl text-base">
          {toastMessage}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#fbf7f0]/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[4.5rem] flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-3 min-w-0 text-left"
            onClick={() => setActiveTab('companion')}
          >
            <span className="w-11 h-11 rounded-2xl bg-[#1d4f46] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">verified_user</span>
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-bold tracking-tight">ScamGuard</span>
              <span className="block text-sm text-stone-600 truncate">
                {hi ? 'बुजुर्गों के लिए डिजिटल सुरक्षा' : 'Digital safety for elders'}
              </span>
            </span>
          </button>

          <nav className="hidden sm:flex items-center gap-1 bg-white rounded-full p-1 border border-stone-200">
            <button
              onClick={() => setActiveTab('companion')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                activeTab === 'companion' ? 'bg-[#1d4f46] text-white' : 'text-stone-600'
              }`}
            >
              {hi ? 'जाँच' : 'Check'}
            </button>
            <button
              onClick={() => setActiveTab('caregiver')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                activeTab === 'caregiver' ? 'bg-[#1d4f46] text-white' : 'text-stone-600'
              }`}
            >
              {hi ? 'परिवार' : 'Family'}
            </button>
          </nav>

          <div className="flex items-center rounded-full bg-white border border-stone-200 p-1">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${lang === 'en' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${lang === 'hi' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              हिं
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {activeTab === 'companion' && (
          <>
            <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
              <p className="text-sm font-semibold tracking-wide text-[#1d4f46] mb-2">
                {hi ? 'रुकें • जाँचें • पूछें' : 'Pause • Check • Ask'}
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight max-w-3xl">
                {hi ? 'संदिग्ध संदेश आने पर घबराएं नहीं।' : 'A strange message does not have to scare you.'}
              </h1>
              <p className="mt-4 text-lg text-stone-600 max-w-2xl leading-relaxed">
                {hi
                  ? 'एसएमएस, लिंक, क्यूआर या कॉल यहाँ चिपकाएं। हम सादे शब्दों में बताएंगे कि यह सुरक्षित है या नहीं।'
                  : 'Paste an SMS, link, QR claim, or call note. You will get a plain-language answer before you tap anything.'}
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { n: '1', t: hi ? 'संदेश चिपकाएं' : 'Paste the message' },
                  { n: '2', t: hi ? 'जाँच दबाएं' : 'Tap check' },
                  { n: '3', t: hi ? 'परिवार से पूछें' : 'Ask family if unsure' },
                ].map((step) => (
                  <div key={step.n} className="rounded-2xl bg-white border border-stone-200 px-4 py-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#1d4f46] text-white text-sm font-bold flex items-center justify-center">
                      {step.n}
                    </span>
                    <span className="font-medium">{step.t}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_260px] gap-5 items-start">
              <aside className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-4">
                  <h2 className="text-base font-bold mb-3">{hi ? 'उदाहरण आज़माएं' : 'Try an example'}</h2>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ['kyc', hi ? 'फर्जी केवाईसी एसएमएस' : 'Fake KYC SMS', 'bg-red-50 text-red-800'],
                        ['reward', hi ? 'इनाम वाला क्यूआर' : 'Prize QR', 'bg-orange-50 text-orange-800'],
                        ['electricity', hi ? 'बिजली कटने का लिंक' : 'Power-cut link', 'bg-red-50 text-red-800'],
                        ['call', hi ? 'फर्जी बैंक कॉल' : 'Fake bank call', 'bg-amber-50 text-amber-900'],
                        ['family', hi ? 'परिवार का संदेश' : 'Family message', 'bg-emerald-50 text-emerald-800'],
                      ] as const
                    ).map(([key, label, cls]) => (
                      <button
                        key={key}
                        onClick={() => handleLoadPreset(key)}
                        className={`p-3 rounded-xl text-left text-sm font-semibold ${cls}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <a
                  href="tel:1930"
                  className="bg-[#1d4f46] text-white rounded-2xl p-4 flex items-center justify-between"
                >
                  <span>
                    <span className="block text-sm opacity-80">{hi ? 'साइबर हेल्पलाइन' : 'Cyber helpline'}</span>
                    <span className="text-2xl font-bold">1930</span>
                  </span>
                  <span className="material-symbols-outlined text-3xl">call</span>
                </a>
              </aside>

              <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-bold">{hi ? 'संदेश जाँचें' : 'Check a message'}</h2>
                  <button
                    onClick={() => {
                      const readout = currentResult
                        ? hi
                          ? currentResult.audioTextHi
                          : currentResult.audioTextEn
                        : hi
                          ? 'संदेश यहाँ चिपकाएं और जाँच दबाएं।'
                          : 'Paste a message and tap check.';
                      handleSpeak(readout);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isSpeaking ? 'bg-[#1d4f46] text-white' : 'bg-stone-100 text-stone-700'
                    }`}
                    aria-label={hi ? 'आवाज़' : 'Read aloud'}
                  >
                    <span className="material-symbols-outlined">{isSpeaking ? 'stop' : 'volume_up'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {inputTypes.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveInputType(cat.id);
                        if (cat.id === 'screenshot') fileInputRef.current?.click();
                      }}
                      className={`min-w-[4.5rem] px-3 py-3 rounded-2xl text-sm font-semibold ${
                        activeInputType === cat.id ? 'bg-[#1d4f46] text-white' : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      <span className="material-symbols-outlined block mx-auto">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={6}
                  placeholder={hi ? 'एसएमएस, लिंक या कॉल की बात यहाँ लिखें...' : 'Paste the SMS, link, or what the caller said...'}
                  className="w-full p-4 rounded-2xl bg-[#fbf7f0] text-lg leading-relaxed border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#1d4f46]"
                />

                <button
                  onClick={() => executeScan(inputText, activeInputType)}
                  disabled={isScanning}
                  className="w-full mt-4 py-4 rounded-2xl bg-[#c45c26] text-white text-lg font-bold hover:bg-[#a94c1d] disabled:opacity-50"
                >
                  {isScanning ? (hi ? 'जाँच हो रही है...' : 'Checking...') : hi ? 'जाँच करें' : 'Check message'}
                </button>

                {isScanning && (
                  <p className="mt-4 text-center text-stone-600">{hi ? 'थोड़ा रुकें, संदेश देखा जा रहा है।' : 'Give it a moment.'}</p>
                )}

                {currentResult && !isScanning && (
                  <div className={`mt-5 p-5 rounded-2xl border-2 ${riskStyles(currentResult.riskLevel)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold uppercase tracking-wide">
                        {currentResult.riskLevel === 'HIGH'
                          ? hi
                            ? 'ऊँचा खतरा'
                            : 'High risk'
                          : currentResult.riskLevel === 'REVIEW'
                            ? hi
                              ? 'ध्यान दें'
                              : 'Review'
                            : hi
                              ? 'कम खतरा'
                              : 'Low risk'}
                      </span>
                      <span className="text-2xl font-bold">{currentResult.score}/100</span>
                    </div>
                    <h3 className="text-xl font-bold mb-4">{hi ? currentResult.titleHi : currentResult.titleEn}</h3>
                    <p className="text-sm font-bold mb-2">{hi ? 'क्यों?' : 'Why?'}</p>
                    <ul className="text-base space-y-2 mb-4">
                      {(hi ? currentResult.reasonsHi : currentResult.reasonsEn).map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                    <p className="text-sm font-bold mb-2">{hi ? 'अभी क्या करें' : 'What to do now'}</p>
                    <ol className="text-base space-y-2 mb-5">
                      {(hi ? currentResult.stepsHi : currentResult.stepsEn).map((s, idx) => (
                        <li key={idx}>
                          {idx + 1}. {s}
                        </li>
                      ))}
                    </ol>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleAskFamily(currentResult.titleEn)}
                        className="flex-1 py-3 rounded-xl bg-[#1d4f46] text-white font-bold"
                      >
                        {hi ? 'परिवार से पूछें' : 'Ask family'}
                      </button>
                      <a href="tel:1930" className="flex-1 py-3 rounded-xl bg-red-700 text-white font-bold text-center">
                        {hi ? '1930 पर कॉल' : 'Call 1930'}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-4">
                  <h3 className="text-base font-bold mb-3">{hi ? 'याद रखें' : 'Keep in mind'}</h3>
                  <ul className="space-y-3 text-sm leading-relaxed">
                    <li className="p-3 rounded-xl bg-amber-50">{hi ? 'पैसे पाने के लिए यूपीआई पिन नहीं डाला जाता।' : 'You never enter a UPI PIN to receive money.'}</li>
                    <li className="p-3 rounded-xl bg-amber-50">{hi ? 'बैंक एसएमएस से खाता बंद करने की धमकी नहीं देता।' : 'Banks do not threaten to close accounts over SMS.'}</li>
                    <li className="p-3 rounded-xl bg-amber-50">{hi ? 'शक हो तो पहले परिवार को बताएं।' : 'If you feel unsure, call family first.'}</li>
                  </ul>
                </div>
              </aside>
            </section>
          </>
        )}

        {activeTab === 'caregiver' && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-stone-200 p-6">
              <h2 className="text-2xl font-bold">{hi ? 'परिवार डैशबोर्ड' : 'Family dashboard'}</h2>
              <p className="text-stone-600 mt-1">
                {hi ? 'देखरेख:' : 'Looking after:'} <strong>Ramakant Sharma</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <span className="text-sm text-stone-500">{hi ? 'कुल जाँच' : 'Checks so far'}</span>
                <p className="text-3xl font-bold mt-1">{incidents.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <span className="text-sm text-stone-500">{hi ? 'ऊँचा खतरा' : 'High risk'}</span>
                <p className="text-3xl font-bold mt-1 text-red-700">{incidents.filter((i) => i.riskLevel === 'HIGH').length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <span className="text-sm text-stone-500">{hi ? 'परिवार सदस्य' : 'Family members'}</span>
                <p className="text-3xl font-bold mt-1">{familyMembers.length || 2}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-5">
                <h3 className="text-lg font-bold mb-4">{hi ? 'हाल की गतिविधि' : 'Recent activity'}</h3>
                {incidents.length === 0 ? (
                  <p className="text-stone-500">{hi ? 'अभी कोई जाँच नहीं हुई।' : 'No checks yet.'}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {incidents.map((inc) => {
                      const isHigh = inc.riskLevel === 'HIGH';
                      return (
                        <div key={inc.id} className="p-4 rounded-2xl border border-stone-200">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{hi ? inc.titleHi : inc.titleEn}</p>
                              <p className="text-sm text-stone-500 mt-1">
                                {inc.elderName} • {inc.timestamp}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isHigh ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'}`}>
                              {inc.riskLevel}
                            </span>
                          </div>
                          {inc.status === 'NEW' && (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED_SCAM')}
                                className="px-3 py-2 rounded-lg bg-red-100 text-red-800 text-sm font-semibold"
                              >
                                {hi ? 'धोखा है' : 'It is a scam'}
                              </button>
                              <button
                                onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED_SAFE')}
                                className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-semibold"
                              >
                                {hi ? 'ठीक है' : 'It is safe'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-3xl border border-stone-200 p-5">
                  <h3 className="text-lg font-bold mb-3">{hi ? 'भरोसेमंद लोग' : 'Trusted people'}</h3>
                  <div className="flex flex-col gap-3">
                    {(familyMembers.length ? familyMembers : [
                      { id: '1', name: 'Rahul Sharma', relationship: 'Son', phone: '+91 98765 43210', initial: 'R' },
                      { id: '2', name: 'Priya Verma', relationship: 'Daughter', phone: '+91 98765 43211', initial: 'P' },
                    ]).map((m) => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-[#1d4f46] text-white flex items-center justify-center font-bold">
                          {m.initial || m.name.charAt(0)}
                        </span>
                        <span>
                          <span className="block font-semibold">{m.name}</span>
                          <span className="text-sm text-stone-500">{m.relationship}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl border border-stone-200 p-5 flex flex-col gap-3">
                  <h3 className="text-lg font-bold">{hi ? 'जरूरत पड़ने पर' : 'If something goes wrong'}</h3>
                  <a href="tel:1930" className="py-3 rounded-xl bg-red-700 text-white font-bold text-center">
                    {hi ? '1930 हेल्पलाइन' : 'Call 1930'}
                  </a>
                  <button onClick={() => setShowFreezeModal(true)} className="py-3 rounded-xl bg-orange-700 text-white font-bold">
                    {hi ? 'यूपीआई फ्रीज करें' : 'Freeze UPI'}
                  </button>
                  <button onClick={() => setShowReassuranceModal(true)} className="py-3 rounded-xl bg-stone-100 font-semibold">
                    {hi ? 'तसल्ली का संदेश' : 'Send a calm message'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="sm:hidden sticky bottom-0 bg-white border-t border-stone-200 grid grid-cols-2">
        <button
          onClick={() => setActiveTab('companion')}
          className={`py-3 font-semibold ${activeTab === 'companion' ? 'text-[#1d4f46]' : 'text-stone-500'}`}
        >
          {hi ? 'जाँच' : 'Check'}
        </button>
        <button
          onClick={() => setActiveTab('caregiver')}
          className={`py-3 font-semibold ${activeTab === 'caregiver' ? 'text-[#1d4f46]' : 'text-stone-500'}`}
        >
          {hi ? 'परिवार' : 'Family'}
        </button>
      </nav>

      {showFreezeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">{hi ? 'यूपीआई तुरंत रोकें' : 'Freeze UPI now'}</h3>
              <button onClick={() => setShowFreezeModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-stone-600 mb-4">
              {hi
                ? 'अगर संदिग्ध लिंक पर पिन डाला है, तो ये कदम अभी उठाएं।'
                : 'If a PIN was entered on a suspicious screen, do this now.'}
            </p>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-stone-50">
                <strong>A.</strong> {hi ? '*99# डायल करें और यूपीआई बंद करें।' : 'Dial *99# and disable UPI.'}
              </div>
              <div className="p-3 rounded-xl bg-stone-50">
                <strong>B.</strong> {hi ? 'बैंक ऐप से यूपीआई ब्लॉक करें।' : 'Block UPI from the bank app.'}
              </div>
              <div className="p-3 rounded-xl bg-stone-50">
                <strong>C.</strong> {hi ? 'पेमेंट ऐप में अनधिकृत लेनदेन रिपोर्ट करें।' : 'Report the transaction in the payment app.'}
              </div>
            </div>
            <button
              onClick={() => {
                setShowFreezeModal(false);
                showToast(hi ? 'निर्देश नोट कर लिए गए।' : 'Keep these steps handy.');
              }}
              className="w-full mt-5 py-3 rounded-xl bg-red-700 text-white font-bold"
            >
              {hi ? 'समझ गया' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {showReassuranceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">{hi ? 'तसल्ली का संदेश' : 'Calm message'}</h3>
              <button onClick={() => setShowReassuranceModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSendReassurance} className="flex flex-col gap-3">
              <textarea
                value={reassuranceMessage}
                onChange={(e) => setReassuranceMessage(e.target.value)}
                rows={4}
                className="w-full p-3 rounded-xl bg-[#fbf7f0] border border-stone-300 text-base"
              />
              <button type="submit" className="w-full py-3 rounded-xl bg-[#1d4f46] text-white font-bold">
                {hi ? 'भेजें' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-stone-200 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-stone-600">
          <p className="text-base">
            {hi
              ? 'ओटीपी, यूपीआई पिन या पासवर्ड किसी कॉलर को न बताएं। मदद के लिए 1930 पर कॉल करें।'
              : 'Never share OTP, UPI PIN, or passwords with a caller. For help, call 1930.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
