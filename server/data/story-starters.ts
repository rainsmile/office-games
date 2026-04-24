export const storyStarters = [
  '那天早上醒来，我发现自己变成了一只猫。',
  '公司突然宣布，今天全员去火星出差。',
  '快递小哥送来了一个会说话的包裹。',
  '我在地铁上捡到了一本来自未来的日记。',
  '办公室的咖啡机突然开始预言未来。',
  '今天的会议室里多了一个没人认识的同事。',
  '下班后我按了电梯，门开了，里面是一片森林。',
  '老板说今天谁最后一个完成任务就能获得超能力。',
  '食堂阿姨神秘地递给我一碗会发光的面条。',
  '深夜加班时，我听到服务器机房传来了歌声。',
];

export function getRandomStarter(): string {
  return storyStarters[Math.floor(Math.random() * storyStarters.length)];
}
