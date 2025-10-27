import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'FarmRush',
      buttonLabel: 'Play FarmRush',
      description: 'Harvest crops and collect corn in this fun farming game!',
      heading: '🚜 Welcome to FarmRush! 🌽',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'FarmRush - Harvest the Farm!',
  });
};
