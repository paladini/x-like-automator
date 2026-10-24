// Labels taken from real X controls, not guessed.
// pt-BR menu: Repostar (plain) and Comentar (quote). Undo item: "Desfazer repost".
// English menu: Repost (plain) and Quote. Undo label: "Undo repost".
// Like / Curtir were read off x.com. Citar is never clicked because it is a quote label.
const NEVER_QUOTE = ["Comentar", "Quote", "Citar"];

const UI_LANGUAGES = [
  {
    id: "pt-BR",
    label: "Português (Brasil)",
    like: ["Curtir"],
    unlike: ["Descurtir"],
    repost: ["Repostar"],
    undoRepost: ["Desfazer repost"],
    quote: ["Comentar", "Citar"],
  },
  {
    id: "en",
    label: "English",
    like: ["Like"],
    unlike: ["Unlike"],
    repost: ["Repost"],
    undoRepost: ["Undo repost"],
    quote: ["Quote"],
  },
];

globalThis.XLikesLanguages = UI_LANGUAGES;
globalThis.XLikesNeverQuote = NEVER_QUOTE;
