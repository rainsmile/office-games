export interface SpyWordPair {
  normal: string;
  spy: string;
}

export const spyWordPairs: SpyWordPair[] = [
  { normal: '苹果', spy: '梨子' },
  { normal: '可乐', spy: '雪碧' },
  { normal: '微信', spy: '支付宝' },
  { normal: '火锅', spy: '麻辣烫' },
  { normal: '篮球', spy: '排球' },
  { normal: '地铁', spy: '公交车' },
  { normal: '猫', spy: '狗' },
  { normal: '医生', spy: '护士' },
  { normal: '手机', spy: '平板' },
  { normal: '牛奶', spy: '豆浆' },
  { normal: '星巴克', spy: '瑞幸' },
  { normal: '抖音', spy: '快手' },
  { normal: '钢琴', spy: '吉他' },
  { normal: '大学', spy: '高中' },
  { normal: '飞机', spy: '高铁' },
  { normal: '西装', spy: '衬衫' },
  { normal: '北京', spy: '上海' },
  { normal: '日本', spy: '韩国' },
  { normal: '圣诞节', spy: '万圣节' },
  { normal: '蛋糕', spy: '面包' },
];

export function getRandomWordPair(): SpyWordPair {
  return spyWordPairs[Math.floor(Math.random() * spyWordPairs.length)];
}
