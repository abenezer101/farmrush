import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, createServer, context, reddit } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Game initialization - get username and leaderboard
router.get('/api/game-init', async (_req, res): Promise<void> => {
  try {
    const { userId, postId } = context;
    
    if (!userId || !postId) {
      res.status(400).json({ error: 'Missing user or post context' });
      return;
    }

    // Get username
    let username = 'Anonymous';
    try {
      const user = await reddit.getUserById(userId);
      if (user?.username) {
        username = user.username;
      } else {
        console.log(`User ${userId} has no username property:`, user);
      }
    } catch (error) {
      console.error(`Failed to get username for ${userId}:`, error);
    }

    // Get current user score
    const userScoreKey = `score:${postId}:${userId}`;
    const currentScore = await redis.get(userScoreKey);

    // Get top 10 leaderboard (sorted by score, highest first)
    const leaderboardData = await redis.zRange(`leaderboard:${postId}`, 0, 9, { reverse: true });
    
    console.log(`Game Init - Leaderboard data (${leaderboardData.length} entries)`);
    
    const leaderboard = await Promise.all(
      leaderboardData.map(async (entry, index) => {
        const userId = entry.member as `t2_${string}`;
        const score = entry.score;
        const user = await reddit.getUserById(userId);
        return {
          username: user?.username || 'Anonymous',
          score: score,
          rank: index + 1,
        };
      })
    );

    console.log(`Game Init - User: ${username}, Current score: ${currentScore || 0}`);
    res.json({
      username,
      currentScore: currentScore ? parseInt(currentScore) : 0,
      leaderboard,
    });
  } catch (error) {
    console.error('Game init error:', error);
    res.status(500).json({ error: 'Failed to initialize game' });
  }
});

// Save player score at end of game
router.post('/api/save-score', async (req, res): Promise<void> => {
  try {
    const { userId, postId } = context;
    
    if (!userId || !postId) {
      res.status(400).json({ error: 'Missing user or post context' });
      return;
    }

    const { score } = req.body as { score: number };

    if (typeof score !== 'number' || score < 0) {
      res.status(400).json({ error: 'Invalid score' });
      return;
    }

    // Get current high score for this player
    const leaderboardKey = `leaderboard:${postId}`;
    const currentScoreData = await redis.zScore(leaderboardKey, userId);
    const currentHighScore = currentScoreData || 0;

    // Only update if new score is higher
    if (score > currentHighScore) {
      console.log(`Updating ${userId} score from ${currentHighScore} to ${score}`);
      await redis.zAdd(leaderboardKey, { member: userId, score });
    } else {
      console.log(`Score ${score} not higher than current ${currentHighScore}, not updating`);
    }

    res.json({ success: true, isNewHighScore: score > currentHighScore });
  } catch (error) {
    console.error('Save score error:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Get leaderboard
router.get('/api/leaderboard', async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    
    if (!postId) {
      res.status(400).json({ error: 'Missing post context' });
      return;
    }

    // Get top 10 leaderboard (sorted by score, highest first)
    const leaderboardData = await redis.zRange(`leaderboard:${postId}`, 0, 9, { reverse: true });
    
    console.log(`Leaderboard raw data (${leaderboardData.length} entries):`, 
      leaderboardData.map(e => `${e.member}: ${e.score}`).join(', '));
    
    const leaderboard = await Promise.all(
      leaderboardData.map(async (entry, index) => {
        const userId = entry.member as `t2_${string}`;
        const score = entry.score;
        let username = 'Player';
        try {
          const user = await reddit.getUserById(userId);
          username = user?.username || userId.replace('t2_', '').substring(0, 10);
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error);
          username = userId.replace('t2_', '').substring(0, 10);
        }
        return {
          username,
          score: score,
          rank: index + 1,
        };
      })
    );

    console.log(`Leaderboard processed:`, leaderboard.map(e => `${e.rank}. ${e.username}: ${e.score}`).join(', '));
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Update player position (for multiplayer)
router.post('/api/player-position', async (req, res): Promise<void> => {
  try {
    const { userId, postId } = context;
    
    if (!userId || !postId) {
      console.error('Missing context in player-position:', { userId, postId });
      res.status(400).json({ error: 'Missing user or post context' });
      return;
    }

    const { x, y, rotation, cornCount } = req.body as { x: number; y: number; rotation: number; cornCount: number };

    // Store player position in Redis with 5 second TTL
    const playerKey = `player:${postId}:${userId}`;
    await redis.hSet(playerKey, {
      x: x.toString(),
      y: y.toString(),
      rotation: rotation.toString(),
      cornCount: cornCount.toString(),
      lastUpdate: Date.now().toString(),
    });
    
    // Set expiry to 5 seconds - if player disconnects, they disappear
    await redis.expire(playerKey, 5);
    
    // Store in active players hash: key=userId, value=JSON player data
    const activePlayersHashKey = `active-players:${postId}`;
    await redis.hSet(activePlayersHashKey, {
      [userId]: JSON.stringify({
        x: x.toString(),
        y: y.toString(),
        rotation: rotation.toString(),
        cornCount: cornCount.toString(),
      }),
    });
    
    // Set expiry on the active players hash (cleanup)
    await redis.expire(activePlayersHashKey, 5);
    
    console.log(`Updated position for ${userId.slice(0, 10)}... at (${Math.floor(x)}, ${Math.floor(y)}) with ${cornCount} corn`);

    res.json({ success: true });
  } catch (error) {
    console.error('Update position error:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// Get all active players (for multiplayer)
router.get('/api/active-players', async (_req, res): Promise<void> => {
  try {
    const { userId, postId } = context;
    
    if (!postId) {
      console.error('Missing postId in active-players');
      res.status(400).json({ error: 'Missing post context' });
      return;
    }

    // Get all active players from hash
    const activePlayersHashKey = `active-players:${postId}`;
    const playersHash = await redis.hGetAll(activePlayersHashKey);
    
    console.log(`Found ${Object.keys(playersHash).length} active players for post ${postId}`);
    
    const players = await Promise.all(
      Object.entries(playersHash).map(async ([playerId, playerDataStr]) => {
        // Skip current player
        if (playerId === userId) return null;
        
        try {
          const playerData = JSON.parse(playerDataStr as string);
          
          // Get username
          let username = 'Player';
          try {
            const user = await reddit.getUserById(playerId as `t2_${string}`);
            username = user?.username || playerId.replace('t2_', '').substring(0, 10);
          } catch (e) {
            console.error('Error fetching username for player:', e);
            username = playerId.replace('t2_', '').substring(0, 10);
          }
          
          return {
            userId: playerId,
            username,
            x: parseFloat(playerData.x || '0'),
            y: parseFloat(playerData.y || '0'),
            rotation: parseFloat(playerData.rotation || '0'),
            cornCount: parseInt(playerData.cornCount || '0'),
          };
        } catch (e) {
          console.error('Error parsing player data:', e);
          return null;
        }
      })
    );

    // Filter out nulls (current player and errors)
    const activePlayers = players.filter(p => p !== null);

    res.json({ players: activePlayers });
  } catch (error) {
    console.error('Get active players error:', error);
    res.status(500).json({ error: 'Failed to get active players' });
  }
});

// Get global timer state
router.get('/api/game-timer', async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    
    if (!postId) {
      res.status(400).json({ error: 'Missing post context' });
      return;
    }

    const timerKey = `timer:${postId}`;
    const timerData = await redis.hGetAll(timerKey);
    
    if (!timerData.state) {
      // Initialize timer - starts in WAITING state
      const now = Date.now();
      const waitEndTime = now + 10000; // 10 seconds wait
      
      await redis.hSet(timerKey, {
        state: 'WAITING',
        startTime: now.toString(),
        waitEndTime: waitEndTime.toString(),
        gameEndTime: '0',
      });
      
      res.json({
        state: 'WAITING',
        timeRemaining: 10,
        waitTimeRemaining: 10,
      });
      return;
    }

    const state = timerData.state;
    const now = Date.now();
    
    if (state === 'WAITING') {
      const waitEndTime = parseInt(timerData.waitEndTime || '0');
      const waitTimeRemaining = Math.max(0, (waitEndTime - now) / 1000);
      
      // Check if wait period is over
      if (waitTimeRemaining <= 0) {
        // Transition to ACTIVE
        const gameEndTime = now + 60000; // 60 seconds game time
        await redis.hSet(timerKey, {
          state: 'ACTIVE',
          gameStartTime: now.toString(),
          gameEndTime: gameEndTime.toString(),
        });
        
        res.json({
          state: 'ACTIVE',
          timeRemaining: 60,
          waitTimeRemaining: 0,
        });
        return;
      }
      
      res.json({
        state: 'WAITING',
        timeRemaining: 60,
        waitTimeRemaining: Math.ceil(waitTimeRemaining),
      });
      return;
    }
    
    if (state === 'ACTIVE') {
      const gameEndTime = parseInt(timerData.gameEndTime || '0');
      const timeRemaining = Math.max(0, (gameEndTime - now) / 1000);
      
      // Check if game is over
      if (timeRemaining <= 0) {
        // Transition to ENDED
        const leaderboardEndTime = now + 10000; // 10 seconds on leaderboard
        await redis.hSet(timerKey, {
          state: 'ENDED',
          leaderboardEndTime: leaderboardEndTime.toString(),
        });
        
        res.json({
          state: 'ENDED',
          timeRemaining: 0,
          waitTimeRemaining: 10,
        });
        return;
      }
      
      res.json({
        state: 'ACTIVE',
        timeRemaining: Math.ceil(timeRemaining),
        waitTimeRemaining: 0,
      });
      return;
    }
    
    if (state === 'ENDED') {
      const leaderboardEndTime = parseInt(timerData.leaderboardEndTime || '0');
      const waitTimeRemaining = Math.max(0, (leaderboardEndTime - now) / 1000);
      
      // Check if leaderboard wait is over
      if (waitTimeRemaining <= 0) {
        // Reset to WAITING for next round
        const newWaitEndTime = now + 10000;
        await redis.hSet(timerKey, {
          state: 'WAITING',
          startTime: now.toString(),
          waitEndTime: newWaitEndTime.toString(),
          gameEndTime: '0',
        });
        
        res.json({
          state: 'WAITING',
          timeRemaining: 60,
          waitTimeRemaining: 10,
        });
        return;
      }
      
      res.json({
        state: 'ENDED',
        timeRemaining: 0,
        waitTimeRemaining: Math.ceil(waitTimeRemaining),
      });
      return;
    }

    res.json({
      state: 'WAITING',
      timeRemaining: 60,
      waitTimeRemaining: 10,
    });
  } catch (error) {
    console.error('Get timer error:', error);
    res.status(500).json({ error: 'Failed to get timer' });
  }
});

// Harvest corn endpoint (mark corn as harvested globally)
router.post('/api/harvest-corn', async (req, res): Promise<void> => {
  try {
    const { postId } = context;
    
    if (!postId) {
      res.status(400).json({ error: 'Missing post context' });
      return;
    }

    const { x, y } = req.body as { x: number; y: number };

    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    // Store harvested corn in Redis hash
    const harvestedCornKey = `harvested-corn:${postId}`;
    const cornId = `${x},${y}`;
    
    await redis.hSet(harvestedCornKey, {
      [cornId]: Date.now().toString(),
    });

    console.log(`Corn harvested at (${x}, ${y}) by ${context.userId?.slice(0, 10)}...`);

    res.json({ success: true });
  } catch (error) {
    console.error('Harvest corn error:', error);
    res.status(500).json({ error: 'Failed to harvest corn' });
  }
});

// Get harvested corn positions endpoint
router.get('/api/harvested-corn', async (_req, res): Promise<void> => {
  try {
    const { postId } = context;
    
    if (!postId) {
      res.status(400).json({ error: 'Missing post context' });
      return;
    }

    // Get all harvested corn
    const harvestedCornKey = `harvested-corn:${postId}`;
    const harvestedCornHash = await redis.hGetAll(harvestedCornKey);
    
    const harvestedCorn = Object.keys(harvestedCornHash).map(cornId => {
      const [x, y] = cornId.split(',');
      return { x: parseInt(x), y: parseInt(y) };
    });

    console.log(`Returning ${harvestedCorn.length} harvested corn positions`);

    res.json({ harvestedCorn });
  } catch (error) {
    console.error('Get harvested corn error:', error);
    res.status(500).json({ error: 'Failed to get harvested corn' });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
