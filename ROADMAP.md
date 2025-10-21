# 🗺️ Project Roadmap
Welcome to the roadmap for Empires 4X! This document provides an overview of our development plans and direction. This is a living document and may be updated as we progress and gather feedback.

We welcome community contributions! Please check out our [CONTRIBUTING.md](https://github.com/YodasWs/Empires-4x/tree/master?tab=contributing-ov-file) for guidelines on how to get started.
And olease check our [Project Hub](https://github.com/users/YodasWs/projects/3) for the most up-to-date information on open coding issues.

## ➡️ Now: Core Gameplay Loop (v0.1)
This milestone is focused on building the absolute minimum viable product (MVP) with a playable core loop.
- **Core Mechanics**:
  - [x] Let the Player use Workers to build Farms.
  - [x] Farms produce Food at the start of each round.
    [Issue #4](https://github.com/YodasWs/Empires-4x/issues/4)
  - [x] Food has to move to the City to give the Player money.
    [Issue #11](https://github.com/YodasWs/Empires-4x/issues/11)
  - [ ] Let the Player change Laborer assignments.
    [Issue #19](https://github.com/YodasWs/Empires-4x/issues/19)
  - [ ] Let the Player hire more Workers and Laborers.
    [Issue #18](https://github.com/YodasWs/Empires-4x/issues/18)
- **UI Elements**: Add the most essential user interface elements, like letting the Player move the Units and perform actions and see territory claims on each Tile.
  - [ ] [Notify Player of start of turn](https://github.com/YodasWs/Empires-4x/issues/6)
  - [x] [Some basic UI needs](https://github.com/YodasWs/Empires-4x/issues/22)
  - [ ] [Tile information screen](https://github.com/YodasWs/Empires-4x/issues/20)

## 🔧 Improve Scalability and Maintainability (v0.2)
To prepare for easier, faster expansion with fewer bugs and more contributions, we will be undertaking a significant refactoring effort aimed at improving the project's long-term health and development velocity. Our primary goals for this initiative are:
- **Embrace Functional Programming:** Transitioning more of the core game logic to a functional programming style to reduce side effects and improve code predictability.
- **Increase Modularity:** Moving game classes and logic into separate, distinct modules. This will make the codebase easier to reason about, test, and extend.
- **Adopt Test-Driven Development (TDD):** Implementing a TDD workflow for all new features and bug fixes. This will ensure greater code quality and provide an automated safety net for future development.

This foundational work will enable faster, more confident development of new features in the future.

## 🔜 Soon: Minimum Viable Product (v0.3)
After the core loop is solid, we can add other UI/UX elements necessary for a Minimum Viable Product:
- [ ] [Action buttons](https://github.com/YodasWs/Empires-4x/issues/27) on screen.
- [ ] [Side panel](https://github.com/YodasWs/Empires-4x/issues/30) listing units on the selected tile.
- [ ] [Title Screen](https://github.com/YodasWs/Empires-4x/issues/3)
- [ ] [Main Menu](https://github.com/YodasWs/Empires-4x/issues/2)
- [ ] [Settings Screen](https://github.com/YodasWs/Empires-4x/issues/43)
- [ ] [Map Overlays](https://github.com/YodasWs/Empires-4x/issues/39)

## 🆕 Then: Expanding the World (v0.4)
Once we have the main core down and the basics of a great, useful UI, we can start adding more content and expanding the game world!
- Ranches
- Mines
- Marshes
- Marauders
- Soldiers
- AI Opponents

## 🌟 Later: (v0.5+)
Start working on unified graphics design and sounds.
