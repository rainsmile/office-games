export interface EmojiWord {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const emojiWords: EmojiWord[] = [
  { word: '西瓜', difficulty: 'easy' },
  { word: '下雨', difficulty: 'easy' },
  { word: '生日', difficulty: 'easy' },
  { word: '睡觉', difficulty: 'easy' },
  { word: '跑步', difficulty: 'easy' },
  { word: '开心', difficulty: 'easy' },
  { word: '游泳', difficulty: 'easy' },
  { word: '音乐', difficulty: 'easy' },
  { word: '看书', difficulty: 'easy' },
  { word: '吃饭', difficulty: 'easy' },
  { word: '飞机', difficulty: 'easy' },
  { word: '太阳', difficulty: 'easy' },
  { word: '蜜蜂', difficulty: 'medium' },
  { word: '地铁', difficulty: 'medium' },
  { word: '外卖', difficulty: 'medium' },
  { word: '加班', difficulty: 'medium' },
  { word: '迟到', difficulty: 'medium' },
  { word: '拍照', difficulty: 'medium' },
  { word: '减肥', difficulty: 'medium' },
  { word: '失眠', difficulty: 'medium' },
  { word: '网购', difficulty: 'medium' },
  { word: '追剧', difficulty: 'medium' },
  { word: '塞车', difficulty: 'medium' },
  { word: '约会', difficulty: 'medium' },
  { word: '世界末日', difficulty: 'hard' },
  { word: '一见钟情', difficulty: 'hard' },
  { word: '对牛弹琴', difficulty: 'hard' },
  { word: '守株待兔', difficulty: 'hard' },
  { word: '望梅止渴', difficulty: 'hard' },
  { word: '画蛇添足', difficulty: 'hard' },
];

export function getRandomEmojiWord(difficulty?: string): EmojiWord {
  const filtered = difficulty ? emojiWords.filter((w) => w.difficulty === difficulty) : emojiWords;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
