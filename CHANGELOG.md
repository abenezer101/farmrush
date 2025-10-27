# Changelog

All notable changes to FarmRush will be documented in this file.

## [1.0.0] - 2024-10-23

### 🎮 Initial Release - Single Player Edition

#### Added
- **Core Gameplay**
  - Top-down tractor movement with WASD/Arrow keys
  - 20x15 tile grid farm (800x600 pixels)
  - Harvest mechanic: drive over tiles to collect corn
  - Tile regrowth system (60-second timer)
  - Real-time score tracking

- **User Interface**
  - Custom splash screen with player name input
  - In-game HUD showing player name and corn count
  - Game over screen with final score
  - Responsive design for desktop and mobile

- **Technical Features**
  - Phaser 3 game engine with Arcade Physics
  - TypeScript for type safety
  - Vite build system
  - Express server with Devvit integration
  - Modular scene architecture

- **Scenes**
  - Boot: Initial boot scene
  - Preloader: Loading screen with progress bar
  - SplashScreen: Player name input and instructions
  - FarmGame: Main gameplay scene
  - GameOver: End game screen with replay option

- **Visual Feedback**
  - Tile color changes (green → brown)
  - Scale tweens on harvest/regrow
  - Smooth camera following
  - Fixed HUD overlay

- **Documentation**
  - README.md: Project overview
  - QUICKSTART.md: 5-minute setup guide
  - GAMEPLAY.md: How to play guide
  - DEVELOPMENT.md: Developer documentation
  - PROJECT_SUMMARY.md: Comprehensive summary
  - CHANGELOG.md: This file

#### Technical Details
- **Phaser**: v3.88.2
- **Devvit**: v0.12.1
- **TypeScript**: v5.8.2
- **Vite**: v6.2.4
- **Node.js**: v22.2.0+ required

#### Known Limitations
- Single-player only (no multiplayer)
- No score persistence (resets on refresh)
- Client-side only (no server validation)
- No sound effects or music
- Fixed grid size (20x15)

---

## [Unreleased] - Future Plans

### 🎯 Planned Features

#### Phase 1: Multiplayer Foundation
- [ ] Server-side game state management
- [ ] Redis storage for persistence
- [ ] Player position synchronization
- [ ] Server-side harvest validation
- [ ] Polling system for real-time updates

#### Phase 2: Multiplayer Features
- [ ] Display other players' tractors
- [ ] Global leaderboard
- [ ] Real-time score updates
- [ ] Player colors/avatars
- [ ] Competitive harvesting

#### Phase 3: Enhanced Gameplay
- [ ] Sound effects (harvest, movement, regrow)
- [ ] Background music
- [ ] Power-ups (speed boost, multi-harvest)
- [ ] Obstacles and challenges
- [ ] Different crop types
- [ ] Achievements system

#### Phase 4: Polish & Optimization
- [ ] Animated sprites for tractor
- [ ] Particle effects
- [ ] Better visual feedback
- [ ] Performance optimizations
- [ ] Mobile touch controls
- [ ] Tutorial system

#### Phase 5: Community Features
- [ ] Daily challenges
- [ ] Seasonal events
- [ ] Custom farm themes
- [ ] Player profiles
- [ ] Historical stats
- [ ] Social sharing

---

## Version History

### Version Numbering
- **Major**: Breaking changes or complete rewrites
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes and small improvements

### Release Schedule
- **v1.0.0**: Single-player foundation (Current)
- **v1.1.0**: Multiplayer foundation (Planned)
- **v1.2.0**: Enhanced gameplay (Planned)
- **v2.0.0**: Full multiplayer release (Future)

---

## Contributing

When contributing, please:
1. Update this CHANGELOG.md with your changes
2. Follow the version numbering scheme
3. Add entries under "Unreleased" section
4. Move to versioned section on release

### Changelog Format
```markdown
### [Version] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing features

#### Fixed
- Bug fixes

#### Removed
- Removed features
```

---

**Current Version**: 1.0.0 (Single Player Edition)
**Status**: ✅ Ready for Testing
**Last Updated**: 2024-10-23
