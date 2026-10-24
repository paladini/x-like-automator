// Action labels copied from X responsive-web locale bundles
// (https://abs.twimg.com/responsive-web/client-web/i18n/).
// Message ids: d636ebc6 Like, eb3a8b0c Unlike, f2919fb8 plain Repost,
// fd1e5446 Undo repost, bb5c5864 Quote.
// pt-BR is the pt bundle. Descurtir is message ca0f5894 in that bundle.
const NEVER_QUOTE = [
  "Citar",
  "Comentar",
  "Quote",
  "اقتباس",
  "Цитат",
  "উদ্ধৃতি",
  "Cita",
  "Citace",
  "Citat",
  "Zitat",
  "Παράθεση",
  "Aipamena",
  "نقل‌قول",
  "Lainaa",
  "Citation",
  "Sliocht",
  "અવતરણ",
  "ציטוט",
  "कोट",
  "Idézés",
  "Kutipan",
  "Citazione",
  "引用",
  "ಕೋಟ್‌",
  "인용",
  "भाष्य",
  "Petikan",
  "Sitat",
  "Geciteerd",
  "Cytuj",
  "Цитата",
  "Citát",
  "மேற்கோள்",
  "การอ้างอิง",
  "Alıntı",
  "Trích dẫn",
];

const UI_LANGUAGES = [
  {
    id: "pt-BR",
    label: "Português (Brasil)",
    like: [
      "Curtir",
    ],
    unlike: [
      "Desfazer Curtir",
      "Descurtir",
    ],
    repost: [
      "Repostar",
    ],
    undoRepost: [
      "Desfazer repost",
    ],
    quote: [
      "Comentar",
    ],
  },
  {
    id: "en",
    label: "English",
    like: [
      "Like",
    ],
    unlike: [
      "Unlike",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Quote",
    ],
  },
  {
    id: "ar",
    label: "ar · أعجبني",
    like: [
      "أعجبني",
    ],
    unlike: [
      "إلغاء الإعجاب",
    ],
    repost: [
      "إعادة النشر",
    ],
    undoRepost: [
      "التراجع عن إعادة النشر",
    ],
    quote: [
      "اقتباس",
    ],
  },
  {
    id: "ar-x-fm",
    label: "ar-x-fm · أعجبني",
    like: [
      "أعجبني",
    ],
    unlike: [
      "إلغاء الإعجاب",
    ],
    repost: [
      "إعادة النشر",
    ],
    undoRepost: [
      "التراجع عن إعادة النشر",
    ],
    quote: [
      "Quote",
    ],
  },
  {
    id: "bg",
    label: "bg · Харесване",
    like: [
      "Харесване",
    ],
    unlike: [
      "Отмяна на харесването",
    ],
    repost: [
      "Препубликуване",
    ],
    undoRepost: [
      "Отмяна на препубликуване",
    ],
    quote: [
      "Цитат",
    ],
  },
  {
    id: "bn",
    label: "bn · পছন্দ করুন",
    like: [
      "পছন্দ করুন",
    ],
    unlike: [
      "অপছন্দ করুন",
    ],
    repost: [
      "রিপোস্ট",
    ],
    undoRepost: [
      "রিপোস্ট আন ডু করুন",
    ],
    quote: [
      "উদ্ধৃতি",
    ],
  },
  {
    id: "ca",
    label: "ca · M'agrada",
    like: [
      "M'agrada",
    ],
    unlike: [
      "No m'agrada",
    ],
    repost: [
      "Republicació",
    ],
    undoRepost: [
      "Desfés la republicació",
    ],
    quote: [
      "Cita",
    ],
  },
  {
    id: "cs",
    label: "cs · Lajknout",
    like: [
      "Lajknout",
    ],
    unlike: [
      "Zrušit lajk",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Zrušit repost",
    ],
    quote: [
      "Citace",
    ],
  },
  {
    id: "da",
    label: "da · Like",
    like: [
      "Like",
    ],
    unlike: [
      "Fjern like",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Fortryd repost",
    ],
    quote: [
      "Citat",
    ],
  },
  {
    id: "de",
    label: "de · Gefällt mir",
    like: [
      "Gefällt mir",
    ],
    unlike: [
      "Gefällt mir nicht mehr",
    ],
    repost: [
      "Reposten",
    ],
    undoRepost: [
      "Repost rückgängig machen",
    ],
    quote: [
      "Zitat",
    ],
  },
  {
    id: "el",
    label: "el · Σήμανση \"Μου αρέσει\"",
    like: [
      "Σήμανση \"Μου αρέσει\"",
    ],
    unlike: [
      "Αναίρεση της σήμανσης \"Μου αρέσει\"",
    ],
    repost: [
      "Αναδημοσίευση",
    ],
    undoRepost: [
      "Αναίρεση αναδημοσίευσης",
    ],
    quote: [
      "Παράθεση",
    ],
  },
  {
    id: "en-GB",
    label: "en-GB · Like",
    like: [
      "Like",
    ],
    unlike: [
      "Unlike",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Quote",
    ],
  },
  {
    id: "es",
    label: "es · Me gusta",
    like: [
      "Me gusta",
    ],
    unlike: [
      "Cancelar Me gusta",
    ],
    repost: [
      "Repostear",
    ],
    undoRepost: [
      "Deshacer repost",
    ],
    quote: [
      "Cita",
    ],
  },
  {
    id: "eu",
    label: "eu · Atsegin",
    like: [
      "Atsegin",
    ],
    unlike: [
      "Adierazi ez zaizula gustatzen",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Aipamena",
    ],
  },
  {
    id: "fa",
    label: "fa · پسندیدن",
    like: [
      "پسندیدن",
    ],
    unlike: [
      "نپسندیدن",
    ],
    repost: [
      "بازپست",
    ],
    undoRepost: [
      "واگرد بازپست",
    ],
    quote: [
      "نقل‌قول",
    ],
  },
  {
    id: "fi",
    label: "fi · Tykkää",
    like: [
      "Tykkää",
    ],
    unlike: [
      "Poista tykkäys",
    ],
    repost: [
      "Uudelleenjulkaise",
    ],
    undoRepost: [
      "Peru uudelleenjulkaisu",
    ],
    quote: [
      "Lainaa",
    ],
  },
  {
    id: "fil",
    label: "fil · Gustuhin",
    like: [
      "Gustuhin",
    ],
    unlike: [
      "I-unlike",
    ],
    repost: [
      "I-repost",
    ],
    undoRepost: [
      "I-undo ang repost",
    ],
    quote: [
      "Quote",
    ],
  },
  {
    id: "fr",
    label: "fr · Aimer",
    like: [
      "Aimer",
    ],
    unlike: [
      "Ne plus aimer",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Annuler le repost",
    ],
    quote: [
      "Citation",
    ],
  },
  {
    id: "ga",
    label: "ga · Thaitin seo le",
    like: [
      "Thaitin seo le",
    ],
    unlike: [
      "Bain Is maith liom",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Sliocht",
    ],
  },
  {
    id: "gl",
    label: "gl · Gústame",
    like: [
      "Gústame",
    ],
    unlike: [
      "Xa non me gusta",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Cita",
    ],
  },
  {
    id: "gu",
    label: "gu · લાઈક",
    like: [
      "લાઈક",
    ],
    unlike: [
      "નાપસંદ કરો",
    ],
    repost: [
      "રીપોસ્ટ કરો",
    ],
    undoRepost: [
      "પુનઃપોસ્ટ પૂર્વવત્ કરો",
    ],
    quote: [
      "અવતરણ",
    ],
  },
  {
    id: "he",
    label: "he · סמן כאהוב",
    like: [
      "סמן כאהוב",
    ],
    unlike: [
      "לא אהוב",
    ],
    repost: [
      "לפרסם מחדש",
    ],
    undoRepost: [
      "ביטול פרסום מחדש",
    ],
    quote: [
      "ציטוט",
    ],
  },
  {
    id: "hi",
    label: "hi · पसंद करें",
    like: [
      "पसंद करें",
    ],
    unlike: [
      "पसंद हटाएं",
    ],
    repost: [
      "रीपोस्ट",
    ],
    undoRepost: [
      "रीपोस्ट को पूर्ववत करें",
    ],
    quote: [
      "कोट",
    ],
  },
  {
    id: "hr",
    label: "hr · Označi sa \"sviđa mi se\"",
    like: [
      "Označi sa \"sviđa mi se\"",
    ],
    unlike: [
      "Poništi oznaku „sviđa mi se”",
    ],
    repost: [
      "Proslijedi objavu",
    ],
    undoRepost: [
      "Poništi prosljeđivanje objave",
    ],
    quote: [
      "Citat",
    ],
  },
  {
    id: "hu",
    label: "hu · Kedvelés",
    like: [
      "Kedvelés",
    ],
    unlike: [
      "Kedvelés visszavonása",
    ],
    repost: [
      "Újraposztolás",
    ],
    undoRepost: [
      "Újraposztolás visszavonása",
    ],
    quote: [
      "Idézés",
    ],
  },
  {
    id: "id",
    label: "id · Suka",
    like: [
      "Suka",
    ],
    unlike: [
      "Batalkan suka",
    ],
    repost: [
      "Posting ulang",
    ],
    undoRepost: [
      "Batalkan posting ulang",
    ],
    quote: [
      "Kutipan",
    ],
  },
  {
    id: "ig",
    label: "ig · Mmasị",
    like: [
      "Mmasị",
    ],
    unlike: [
      "Wepụ mmasị",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Quote",
    ],
  },
  {
    id: "it",
    label: "it · Metti Mi piace",
    like: [
      "Metti Mi piace",
    ],
    unlike: [
      "Togli Mi piace",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Annulla repost",
    ],
    quote: [
      "Citazione",
    ],
  },
  {
    id: "ja",
    label: "ja · いいね",
    like: [
      "いいね",
    ],
    unlike: [
      "いいねを取り消す",
    ],
    repost: [
      "リポスト",
    ],
    undoRepost: [
      "ポストを取り消す",
    ],
    quote: [
      "引用",
    ],
  },
  {
    id: "kn",
    label: "kn · ಇಷ್ಟಪಡಿ",
    like: [
      "ಇಷ್ಟಪಡಿ",
    ],
    unlike: [
      "ಇಷ್ಟವಿಲ್ಲ",
    ],
    repost: [
      "ಮರುಪೋಸ್ಟ್ ಮಾಡಿ",
    ],
    undoRepost: [
      "ಮರುಪೋಸ್ಟ್ ಅನ್ನು ರದ್ದುಗೊಳಿಸಿ",
    ],
    quote: [
      "ಕೋಟ್‌",
    ],
  },
  {
    id: "ko",
    label: "ko · 마음에 들어요",
    like: [
      "마음에 들어요",
    ],
    unlike: [
      "마음에 들어요 취소",
    ],
    repost: [
      "재게시",
    ],
    undoRepost: [
      "재게시 취소",
    ],
    quote: [
      "인용",
    ],
  },
  {
    id: "mr",
    label: "mr · पसंत केले",
    like: [
      "पसंत केले",
    ],
    unlike: [
      "नापसंत",
    ],
    repost: [
      "पुन्हा पोस्ट करा",
    ],
    undoRepost: [
      "पुन्हा पोस्ट करणे रद्द करा",
    ],
    quote: [
      "भाष्य",
    ],
  },
  {
    id: "ms",
    label: "ms · Suka",
    like: [
      "Suka",
    ],
    unlike: [
      "Nyahsuka",
    ],
    repost: [
      "Siaran semula",
    ],
    undoRepost: [
      "Buat asal siaran semula",
    ],
    quote: [
      "Petikan",
    ],
  },
  {
    id: "nb",
    label: "nb · Liker",
    like: [
      "Liker",
    ],
    unlike: [
      "Liker ikke",
    ],
    repost: [
      "Republiser",
    ],
    undoRepost: [
      "Angre republisering",
    ],
    quote: [
      "Sitat",
    ],
  },
  {
    id: "nl",
    label: "nl · Leuk",
    like: [
      "Leuk",
    ],
    unlike: [
      "Niet meer leuk",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Maak repost ongedaan",
    ],
    quote: [
      "Geciteerd",
    ],
  },
  {
    id: "pl",
    label: "pl · Lubię",
    like: [
      "Lubię",
    ],
    unlike: [
      "Przestań lubić",
    ],
    repost: [
      "Podaj dalej wpis",
    ],
    undoRepost: [
      "Cofnij podanie dalej wpisu",
    ],
    quote: [
      "Cytuj",
    ],
  },
  {
    id: "ro",
    label: "ro · Apreciază",
    like: [
      "Apreciază",
    ],
    unlike: [
      "Anulează aprecierea",
    ],
    repost: [
      "Repostează",
    ],
    undoRepost: [
      "Anulează repostarea",
    ],
    quote: [
      "Citat",
    ],
  },
  {
    id: "ru",
    label: "ru · Нравится",
    like: [
      "Нравится",
    ],
    unlike: [
      "Больше не нравится",
    ],
    repost: [
      "Сделать репост",
    ],
    undoRepost: [
      "Отменить репост",
    ],
    quote: [
      "Цитата",
    ],
  },
  {
    id: "sk",
    label: "sk · Páči sa",
    like: [
      "Páči sa",
    ],
    unlike: [
      "Nepáči sa",
    ],
    repost: [
      "Opätovné uverejnenie",
    ],
    undoRepost: [
      "Zrušiť opätovné uverejnenie",
    ],
    quote: [
      "Citát",
    ],
  },
  {
    id: "sr",
    label: "sr · Свиђа ми се",
    like: [
      "Свиђа ми се",
    ],
    unlike: [
      "Не свиђа ми се",
    ],
    repost: [
      "Поново објави",
    ],
    undoRepost: [
      "Опозови поновну објаву",
    ],
    quote: [
      "Цитат",
    ],
  },
  {
    id: "sv",
    label: "sv · Gilla",
    like: [
      "Gilla",
    ],
    unlike: [
      "Ogilla",
    ],
    repost: [
      "Återpublicera",
    ],
    undoRepost: [
      "Ångra återpublicering",
    ],
    quote: [
      "Citat",
    ],
  },
  {
    id: "ta",
    label: "ta · விரும்பு",
    like: [
      "விரும்பு",
    ],
    unlike: [
      "விருப்பமில்லை",
    ],
    repost: [
      "மறுஇடுகை",
    ],
    undoRepost: [
      "மறுஇடுகையைச் செயல்தவிர்",
    ],
    quote: [
      "மேற்கோள்",
    ],
  },
  {
    id: "th",
    label: "th · ชื่นชอบ",
    like: [
      "ชื่นชอบ",
    ],
    unlike: [
      "เลิกชื่นชอบ",
    ],
    repost: [
      "รีโพสต์",
    ],
    undoRepost: [
      "ยกเลิกการรีโพสต์",
    ],
    quote: [
      "การอ้างอิง",
    ],
  },
  {
    id: "tr",
    label: "tr · Beğen",
    like: [
      "Beğen",
    ],
    unlike: [
      "Beğenmekten vazgeç",
    ],
    repost: [
      "Yeniden gönder",
    ],
    undoRepost: [
      "Yeniden gönderiyi geri al",
    ],
    quote: [
      "Alıntı",
    ],
  },
  {
    id: "uk",
    label: "uk · Вподобати",
    like: [
      "Вподобати",
    ],
    unlike: [
      "Видалити вподобання",
    ],
    repost: [
      "Зробити репост",
    ],
    undoRepost: [
      "Скасувати репост",
    ],
    quote: [
      "Цитата",
    ],
  },
  {
    id: "vi",
    label: "vi · Thích",
    like: [
      "Thích",
    ],
    unlike: [
      "Không thích",
    ],
    repost: [
      "Đăng lại",
    ],
    undoRepost: [
      "Hoàn tác đăng lại",
    ],
    quote: [
      "Trích dẫn",
    ],
  },
  {
    id: "yo",
    label: "yo · Fẹ́rán",
    like: [
      "Fẹ́rán",
    ],
    unlike: [
      "Máa féran mọ",
    ],
    repost: [
      "Repost",
    ],
    undoRepost: [
      "Undo repost",
    ],
    quote: [
      "Quote",
    ],
  },
  {
    id: "zh",
    label: "zh · 喜欢",
    like: [
      "喜欢",
    ],
    unlike: [
      "取消喜欢",
    ],
    repost: [
      "转帖",
    ],
    undoRepost: [
      "撤销转帖",
    ],
    quote: [
      "引用",
    ],
  },
  {
    id: "zh-Hant",
    label: "zh-Hant · 喜歡",
    like: [
      "喜歡",
    ],
    unlike: [
      "取消喜歡",
    ],
    repost: [
      "轉發",
    ],
    undoRepost: [
      "取消轉發",
    ],
    quote: [
      "引用",
    ],
  },
];

globalThis.XLikesLanguages = UI_LANGUAGES;
globalThis.XLikesNeverQuote = NEVER_QUOTE;
