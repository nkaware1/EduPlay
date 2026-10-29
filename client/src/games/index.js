import { quizGames } from './mcqGames.jsx';
import { simpleGames } from './simpleGames.jsx';
import { puzzleGames } from './puzzleGames.jsx';
import { extra1 } from './extraGames1.jsx';
import { extra2 } from './extraGames2.jsx';
import { extra3 } from './extraGames3.jsx';

export const players = { ...quizGames, ...simpleGames, ...puzzleGames, ...extra1, ...extra2, ...extra3 };
