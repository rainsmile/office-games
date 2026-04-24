export interface RankQuestion {
  topic: string;
  items: string[];
  correctOrder: number[];
}

export const rankQuestions: RankQuestion[] = [
  { topic: '以下国家面积从大到小排列', items: ['加拿大', '中国', '美国', '巴西', '澳大利亚'], correctOrder: [0, 3, 2, 1, 4] },
  { topic: '以下行星离太阳从近到远排列', items: ['地球', '火星', '金星', '水星', '木星'], correctOrder: [3, 2, 0, 1, 4] },
  { topic: '以下编程语言发布时间从早到晚', items: ['Python', 'Java', 'JavaScript', 'Go', 'Rust'], correctOrder: [0, 1, 2, 3, 4] },
  { topic: '以下动物寿命从长到短', items: ['乌龟', '大象', '鹦鹉', '狗', '仓鼠'], correctOrder: [0, 1, 2, 3, 4] },
  { topic: '以下建筑高度从高到低', items: ['哈利法塔', '上海中心', '东京晴空塔', '帝国大厦', '埃菲尔铁塔'], correctOrder: [0, 1, 2, 3, 4] },
  { topic: '以下社交媒体月活用户从多到少', items: ['Facebook', 'YouTube', 'WhatsApp', 'Instagram', 'TikTok'], correctOrder: [0, 1, 2, 3, 4] },
  { topic: '以下食物卡路里从高到低（每100g）', items: ['巧克力', '薯片', '米饭', '苹果', '黄瓜'], correctOrder: [0, 1, 2, 3, 4] },
  { topic: '以下奥运会举办时间从早到晚', items: ['北京奥运会', '伦敦奥运会', '里约奥运会', '东京奥运会', '巴黎奥运会'], correctOrder: [0, 1, 2, 3, 4] },
];

export function getRandomRankQuestions(count: number): RankQuestion[] {
  const shuffled = [...rankQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
