// مواصفات التوليد لكل قالب: شكل JSON المطلوب + تعليمات خاصة.
// يُنتَج «جزء» من المحتوى (القوائم النصية فقط)؛ الحقول الأخرى (صور، فيديو، فرق...) يحافظ عليها المحرر.
const MCQ = '{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"feedback":"one short sentence explaining the right answer"}]}';
const MCQ_NOTES = 'Exactly 4 options per question and exactly one correct option. "answer" is the 0-based index of the correct option. Plausible distractors.';

export const AI_SPECS = {
  quiz: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES },
  asterquiz: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES + ' Short questions and short options (they appear inside asteroids).' },
  froggy: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES },
  racing: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES + ' Short, quickly answerable questions.' },
  millionaire: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES + ' Order the questions from easiest to hardest.' },
  speedtest: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES + ' Very short questions answerable in a few seconds.' },
  triviashow: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES },
  hiddenimage: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES },
  maze: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES },
  videoquiz: { key: 'questions', keys: ['questions'], shape: MCQ, notes: MCQ_NOTES + ' The questions relate to a video on the given topic; base them on the provided material.' },
  truefalse: { key: 'statements', keys: ['statements'], shape: '{"statements":[{"text":"...","answer":true,"feedback":"short explanation"}]}', notes: 'Roughly half true and half false. Each statement must be clearly true or clearly false.' },
  riddle: { key: 'items', keys: ['items'], shape: '{"items":[{"question":"riddle text","answer":"main answer","alternatives":"other accepted answers separated by commas","hint":"short hint"}]}', notes: 'Answers are one or two words.' },
  matching: { key: 'pairs', keys: ['pairs'], shape: '{"pairs":[{"left":"...","right":"..."}]}', notes: 'Short items (a few words). Each right side is unique.' },
  memory: { key: 'pairs', keys: ['pairs'], shape: '{"pairs":[{"a":"...","b":"..."}]}', notes: 'Very short texts (one or two words, or a single emoji for "a"). Maximum 10 pairs.' },
  groupsort: { key: 'groups', keys: ['groups'], shape: '{"groups":[{"name":"group name","items":["...","..."]}]}', notes: '2 to 4 groups, 3 to 6 short items each, no item belongs to two groups.' },
  lineup: { key: 'items', keys: ['prompt', 'items'], shape: '{"prompt":"instruction","items":["first","second","third"]}', notes: 'Items are listed in the CORRECT order (e.g. chronological or by size). 4 to 8 items.' },
  unscramble: { key: 'items', keys: ['mode', 'items'], shape: '{"mode":"letters","items":[{"answer":"single word","hint":"short hint"}]}', notes: 'Use mode "letters" with single words of 3 to 8 letters, unless the user asks for sentences, then use mode "words" with sentences of 3 to 7 words.' },
  fillblanks: { key: 'items', keys: ['items', 'distractors'], shape: '{"items":[{"text":"sentence with the hidden word wrapped like [[word]]"}],"distractors":["wrong word","wrong word"]}', notes: 'Each text contains one or two [[hidden words]]. Provide 2 to 5 plausible distractor words.' },
  wordsearch: { key: 'words', keys: ['words'], shape: '{"words":["word1","word2"]}', notes: 'Single words without spaces, 3 to 9 letters each, 5 to 12 words.' },
  dictation: { key: 'items', keys: ['items'], shape: '{"items":[{"text":"sentence to dictate","lang":"ar","audioUrl":""}]}', notes: 'Short sentences (3 to 10 words). "lang" is "ar" or "en" matching the sentence language.' },
  flashcards: { key: 'cards', keys: ['cards'], shape: '{"cards":[{"front":"term or question","back":"definition or answer"}]}', notes: 'Concise.' },
  slideshow: { key: 'slides', keys: ['slides'], shape: '{"slides":[{"title":"slide title","text":"2-3 short sentences","image":""}]}', notes: 'A short structured lesson of 4 to 8 slides. Leave "image" empty.' },
  dialogue: { key: 'steps', keys: ['partner', 'you', 'steps'], shape: '{"partner":"name of the other speaker","you":"You","steps":[{"line":"what the partner says","choices":[{"text":"reply","correct":true},{"text":"reply","correct":false}],"response":"partner follow-up after the right reply"}]}', notes: 'Each step has 2 or 3 replies and exactly one with "correct": true.' },
  wheel: { key: 'items', keys: ['items'], shape: '{"items":["...","..."]}', notes: 'Short entries (one to three words).' },
  crossword: { key: 'entries', keys: ['entries'], shape: '{"entries":[{"answer":"single word","clue":"clue"}]}', notes: 'Single words of 3 to 9 letters that share letters with each other so the grid can cross. 6 to 12 entries.' },
  hangman: { key: 'items', keys: ['items'], shape: '{"items":[{"word":"single word","hint":"short hint"}]}', notes: 'Single words of 4 to 9 letters.' },
  wordchain: { key: 'words', keys: ['words'], shape: '{"words":["first","second","third"]}', notes: 'Each word must START with the LAST letter of the previous word (ignore diacritics; treat Arabic "ة" as "ه"). The first word is the starting word. 6 to 10 words.' },
  oddone: { key: 'items', keys: ['items'], shape: '{"items":[{"group":["related","related","related"],"odd":"the word that does not belong","reason":"why"}]}', notes: 'Three related words and one clear odd word.' },
  pattern: { key: 'items', keys: ['items'], shape: '{"items":[{"sequence":"2, 4, 6, 8","answer":"10","distractors":"9, 12, 14"}]}', notes: 'The sequence lists the visible terms separated by commas; "answer" is the next term; distractors are 2 to 3 wrong options separated by commas.' },
  truthslie: { key: 'items', keys: ['items'], shape: '{"items":[{"who":"","truths":["true statement","true statement"],"lie":"false statement"}]}', notes: 'Statements on the topic; the lie must be plausible but clearly false. Leave "who" empty.' },
  escape: { key: 'items', keys: ['intro', 'items'], shape: '{"intro":"short story hook","items":[{"scene":"short scene description","question":"puzzle","answer":"short answer or code","alternatives":"","hint":"hint"}]}', notes: 'Answers are short (a number or one word). 3 to 6 puzzles, increasing difficulty.' },
  poll: { key: 'questions', keys: ['questions'], shape: '{"questions":[{"question":"...","options":["...","..."]}]}', notes: 'Opinion questions suitable for a class vote, 2 to 5 options each.' },
  wyr: { key: 'items', keys: ['items'], shape: '{"items":[{"a":"first option","b":"second option"}]}', notes: 'Fun, classroom-appropriate dilemmas.' },
  decisiontree: { key: null, keys: ['scenario', 'start', 'nodes'], shape: '{"scenario":"situation","start":"n1","nodes":[{"id":"n1","text":"...","end":false,"outcome":"neutral","choices":[{"text":"...","next":"n2"}]},{"id":"n2","text":"ending text","end":true,"outcome":"good","choices":[]}]}', notes: 'A branching story of 6 to 10 nodes. Non-ending nodes have 2 or 3 choices whose "next" are existing node ids. Ending nodes have "end": true, an outcome of "good", "neutral" or "bad", and empty choices. Every path must reach an ending.' },
  roleplay: { key: null, keys: ['role', 'scenario', 'start', 'nodes'], shape: '{"role":"the role the student plays","scenario":"situation","start":"n1","nodes":[{"id":"n1","text":"...","end":false,"outcome":"neutral","choices":[{"text":"...","next":"n2"}]},{"id":"n2","text":"ending text","end":true,"outcome":"good","choices":[]}]}', notes: 'A branching role-play of 6 to 10 nodes. Non-ending nodes have 2 or 3 choices whose "next" are existing node ids. Ending nodes have "end": true, outcome "good"/"neutral"/"bad", and empty choices.' },
  brainstorm: { key: 'columns', keys: ['prompt', 'columns'], shape: '{"prompt":"open brainstorming question","columns":["column title","column title","column title"]}', notes: '2 to 4 columns.' },
  charades: { key: 'items', keys: ['items'], shape: '{"items":["word or phrase"]}', notes: 'Words or short phrases that can be acted out or drawn, 10 to 20 items.' },
  scavenger: { key: 'items', keys: ['items'], shape: '{"items":["item to find"]}', notes: 'Everyday items that can be found in a classroom or home, 8 to 15 items.' },
  fivesec: { key: 'items', keys: ['items'], shape: '{"items":["Name 3 ..."]}', notes: 'Each item is a category prompt asking for three things, 8 to 15 items.' },
  tower: { key: 'items', keys: ['items'], shape: '{"items":["challenge description"]}', notes: 'Team building challenges using simple materials, 3 to 6 items.' },
  innovation: { key: 'items', keys: ['items'], shape: '{"items":["unusual problem to solve creatively"]}', notes: '4 to 8 unusual problems.' },
  bingo: { key: 'traits', keys: ['traits'], shape: '{"traits":["Likes ...","Has ..."]}', notes: 'Exactly 9 or 16 short "find someone who..." traits.' },
};

// حقول إضافية يحتاجها المُتحقِّق ولا يولّدها الذكاء الاصطناعي
export const STUBS = { triviashow: { teams: ['A', 'B'] }, hiddenimage: { image: 'x' }, videoquiz: { videoUrl: 'x' } };
export const MCQ_TYPES = ['quiz', 'asterquiz', 'froggy', 'racing', 'millionaire', 'speedtest', 'triviashow', 'hiddenimage', 'maze', 'videoquiz'];
export const DEFAULT_COUNT = 8;
