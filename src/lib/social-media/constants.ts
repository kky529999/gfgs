// Reward calculation constants - exported from client-accessible module
export const REWARD_NORMAL = 5;      // 普通视频
export const REWARD_REAL_PERSON = 50; // 真人出镜
export const REWARD_LIVE = 100;       // 直播 (预留)

export function calculateReward(isRealPerson: boolean, isLive?: boolean): number {
  if (isLive) return REWARD_LIVE;
  return isRealPerson ? REWARD_REAL_PERSON : REWARD_NORMAL;
}
