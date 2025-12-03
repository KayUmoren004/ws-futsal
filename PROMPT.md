You are a senior React Native / Expo engineer and product designer.  
Your task is to DESIGN and then IMPLEMENT (with code) a small React Native app that manages a one-night futsal round-robin tournament with playoffs.

The app is for a **local futsal league** where we have X teams with M players each, and we want to:

- Generate a **round robin schedule** for the night so all teams play each other at least once.
- Then automatically progress into **semi-finals**, **consolation match** (for semi-final losers, winner gets 3rd place), and **final**.

---

## Platform & Tech

- Use **React Native with Expo**, **TypeScript**, and **functional components** with hooks.
- Use **Expo Router** bottom tabs (2 tabs total).
- Use simple state management (e.g., React Context or Zustand; pick one and justify).
- Use **local persistence** (e.g., AsyncStorage or SQLite; pick one and justify) so that all data for each game-night is stored on the device and can be reloaded.

---

## Functional Requirements

### Team & Player Setup

1. **Max teams**: The app must support **2–6 teams**.
2. **Team data**:
   - Team name (string).
   - Bib/penny color (choose from a configurable palette; must be clearly visible in the UI).
3. **Player data**:
   - Only store **name** for each player.
4. **Player transfers**:
   - Players can be transferred between teams at any time during the night.
   - Transfers should be quick to do with minimal navigation (e.g., inline or a lightweight modal).
5. **Single-night scope**:
   - We are managing one “game night” at a time, but we want to **persist each night’s data** so you can later revisit past nights.

### Tournament Structure

1. **Round Robin Phase**

   - Generate a round robin schedule where **every team plays every other team at least once**.
   - Each matchup is a match with:
     - Home team, away team, kick-off order/slot, and score.
   - Make sure the scheduling algorithm:
     - Works for any number of teams from 2 to 6.
     - Avoids obviously unfair patterns if possible (e.g., one team playing several times in a row while others rest).

2. **Odd Number of Teams Rule**

   - If the number of teams is **odd**, there is a “qualification” step for the semi-finals:
     - After the round robin is complete, the **two bottom teams** in the table (by points, then goal difference, then other tiebreakers) play an extra match.
     - The **winner of that extra match** progresses to the semi-finals with the other top teams.
   - Make the logic and tiebreakers explicit and deterministic.

3. **Points & Table**

   - For each match, we track:
     - Goals scored by each team.
     - Result (win/draw/loss).
   - League table fields for each team:
     - Games played
     - Wins
     - Draws
     - Losses
     - Goals for
     - Goals against
     - Goal difference
     - Points
   - Points system: define and implement (e.g., 3 for win, 1 for draw, 0 for loss).
   - Table must **auto-update** after each match result is entered.

4. **Semi-Finals, Consolation, Final**
   - After the round robin (and qualification game if needed), automatically seed teams into:
     - Semi-final 1 and Semi-final 2
     - Winners of semi-finals go to the **Final**.
     - Losers of semi-finals go to the **Consolation** match (winner of this is **3rd place**).
   - Clearly show the bracket structure and progression in the UI.
   - Bracket should lock once it starts, based on table standings.

---

## UI / UX Requirements

### Overall Philosophy

- **Single-page feel**: Design for **minimum clicks and navigation**.  
  Most user actions should happen from a single primary screen (with secondary overlays as needed).
- Use **only two bottom tabs**:
  1. **Games** (or “Tournament”) tab – main management view.
  2. **Timer** tab – simple match timer controls.

### Games / Tournament Tab

This tab is the “control center” for the night. It should allow all of the following with minimal navigation:

1. **Top section**: Current game night summary

   - Date and name/label for the game night.
   - Quick actions: “Add/Manage Teams”, “Reset Night”, etc.

2. **Teams & Colors**

   - List of all teams with:
     - Team name
     - Bib/penny color as a colored chip/badge.
   - Easy way to edit team name and color.
   - Player list for each team, with quick way to:
     - Add player (name input).
     - Transfer player: select player → choose destination team → confirm.

3. **League Table**

   - Table view listing teams with their current stats:
     - Position, Team name, Color chip
     - Points, Goal difference, Goals for, Goals against, Played.
   - Real-time update when match scores are entered.
   - Visual highlight for teams currently in semi-final positions (and for bottom 2 when odd teams and qualification is needed).

4. **Match List & Data Entry**

   - Section for current phase:
     - Round Robin, Qualification (if any), Semi-finals, Consolation, Final.
   - For each match:
     - Show match slot/order.
     - Team names with color chips.
     - Input fields/buttons for goals scored by each team.
     - A simple “Save / Update” action.
   - Consider inline edit for scores to reduce navigation.

5. **Bracket View**
   - Simple bracket visualization for:
     - Semi-finals
     - Consolation
     - Final
   - Show which team advances as soon as scores are entered.

### Timer Tab

- A simple timer interface used during each match.
- Requirements:
  - Two presets: **6 minutes** and **8 minutes** (user can choose).
  - Start, pause, and reset controls.
  - Large, clear countdown display.
- You don’t need deep integration between the timer and specific matches, but:
  - If possible, allow the user to tag which match is currently being timed, or at least show “Current match: [Team A vs Team B]” if supplied from the Games tab.

---

## Data Model & Persistence

Design TypeScript interfaces/types for at least:

- `Player`
- `Team`
- `Match`
- `GameNight` (one game night containing teams, matches, and final standings)
- `TimerSettings` (if needed)

Requirements:

- Represent **round robin matches**, **qualification match**, **semi-finals**, **consolation**, and **final** clearly in the data model.
- Store **all data for a game night** locally, so that when the app is closed and reopened:
  - The user can resume the same night.
  - The user can also see a list/history of past nights with key summaries (date, number of teams, winner, etc.).

---

## Algorithms & Logic

Explain and implement:

1. **Round Robin schedule generation**:

   - A deterministic algorithm that handles 2–6 teams.
   - Ensure each pair of teams plays once in the round robin.
   - Support odd team count logically (e.g., by including byes but still adhering to the described rules for semi-final qualification).

2. **Points calculation and table sorting**:

   - Implement a function that computes table stats from a list of matches.
   - Sorting priorities:
     1. Total points
     2. Goal difference
     3. Goals scored (GF)
     4. Head-to-head or other tiebreaker (define and implement).

3. **Seeding for semi-finals**:
   - Given the final table (after round robin and qualification game if needed), compute:
     - Which teams play in semi-final 1 and semi-final 2.
     - How the semi-final losers are placed into the consolation match.
     - How to identify 1st, 2nd, and 3rd place at the end of the night.

Describe the algorithms in plain language and provide the actual TypeScript implementations as helper functions.

---

## What to Output

Please produce a **thorough, structured answer** that includes:

1. **High-level architecture**:

   - Component tree / screen structure.
   - State management strategy (Contexts/Zustand stores, etc.).
   - Data flow between components, including how the Games tab and Timer tab share any context.

2. **Data model & types**:

   - TypeScript interfaces and types for all domain entities.
   - Example initial state for a new game night.

3. **Core algorithms**:

   - Round robin generation function (with code).
   - Table calculation and sorting function (with code).
   - Semi-final and bracket seeding logic (with code).

4. **UI implementation**:

   - Example code for the main `App.tsx` (with navigation).
   - Example code for the Games tab:
     - Team list and editing.
     - Player transfer interactions.
     - Match list and score entry.
     - League table rendering.
     - Bracket rendering.
   - Example code for the Timer tab:
     - 6/8 minute presets.
     - Basic countdown timer component.

5. **Persistence layer**:

   - Chosen library (AsyncStorage or SQLite).
   - Functions to save/load current game night and list of past nights.
   - Example of how and when data is persisted (e.g., on score change, on interval, or on explicit “Save”).

6. **UX considerations**:
   - How to keep the experience “single-page-like” despite having two tabs.
   - How to minimize clicks for common actions like entering scores, transferring players, and checking standings.
   - Suggestions for color palette and visual hierarchies to make team colors clear.

Aim for production-quality patterns, but keep the implementation understandable and well-commented so it can be extended later.
