export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  category: string;
}

export const quizQuestions: QuizQuestion[] = [
  { question: '地球上最大的海洋是？', options: ['大西洋', '太平洋', '印度洋', '北冰洋'], answer: 1, category: '常识' },
  { question: '光年是什么单位？', options: ['时间', '距离', '速度', '质量'], answer: 1, category: '科技' },
  { question: '人体最大的器官是？', options: ['肝脏', '大脑', '皮肤', '心脏'], answer: 2, category: '常识' },
  { question: '"床前明月光" 的作者是？', options: ['杜甫', '李白', '白居易', '王维'], answer: 1, category: '文学' },
  { question: 'HTTP 状态码 404 表示？', options: ['服务器错误', '未找到', '重定向', '未授权'], answer: 1, category: '科技' },
  { question: '世界上最长的河流是？', options: ['亚马逊河', '长江', '尼罗河', '密西西比河'], answer: 2, category: '常识' },
  { question: 'DNA 的全称是？', options: ['脱氧核糖核酸', '核糖核酸', '蛋白质', '氨基酸'], answer: 0, category: '科技' },
  { question: '一年有多少个星期？', options: ['48', '50', '52', '54'], answer: 2, category: '常识' },
  { question: '"千里江陵一日还" 描写的交通工具是？', options: ['马', '船', '车', '飞鸽'], answer: 1, category: '文学' },
  { question: '世界杯足球赛几年举办一次？', options: ['2年', '3年', '4年', '5年'], answer: 2, category: '娱乐' },
  { question: 'JavaScript 中 typeof null 的结果是？', options: ['"null"', '"undefined"', '"object"', '"boolean"'], answer: 2, category: '科技' },
  { question: '人类有多少对染色体？', options: ['22', '23', '24', '25'], answer: 1, category: '科技' },
  { question: '《哈利波特》的作者是？', options: ['托尔金', 'J.K.罗琳', 'C.S.刘易斯', '乔治·马丁'], answer: 1, category: '娱乐' },
  { question: '什么东西越洗越脏？', options: ['衣服', '碗', '水', '手'], answer: 2, category: '脑筋急转弯' },
  { question: '太阳系中最大的行星是？', options: ['土星', '木星', '海王星', '天王星'], answer: 1, category: '常识' },
  { question: '世界上面积最小的国家是？', options: ['摩纳哥', '梵蒂冈', '列支敦士登', '圣马力诺'], answer: 1, category: '常识' },
];

export function getRandomQuestions(count: number): QuizQuestion[] {
  const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
