# StampMe - A Farcaster "Pay-per-Bundle" Messaging App

## Background and Motivation

The goal is to build a "pay-per-bundle" messaging application, deployed as a Farcaster mini-app. Users can buy message bundles to contact other users, with payments handled by a real smart contract on the Base Sepolia testnet. We've completed the initial setup, core chat functionality, smart contract integration, and Farcaster Mini App deployment.

## Key Challenges and Analysis

1.  **Farcaster Authentication:** The standard "Connect Wallet" flow is not ideal for Mini Apps. We need a seamless auto-sign-in experience for users coming from Farcaster clients like Warpcast. This involves handling and validating a signed payload from the client.
2.  **User Discovery:** To make the app useful, users need to be able to find and message others. The best-in-class experience is to let them search and message people they already follow on Farcaster.
3.  **Manifest Configuration:** Farcaster requires a manifest file (`.well-known/farcaster.json`) that includes a developer "Account Association" signature to prove ownership of the domain. This required using Farcaster's developer tools to generate a signature.
4.  **Messaging Unregistered Users:** A key challenge is handling a user trying to message someone from their Farcaster following list who has not yet used our app. The system must create a "placeholder" user profile on-the-fly, which the recipient can seamlessly claim upon their first visit.

## High-level Task Breakdown

1.  **Refactor Homepage:** Redesign the homepage to show previews of recent chats and the user's Farcaster following list, similar to the Base app.
2.  **Implement Just-in-Time User Creation:** Modify the messaging flow to allow users to send messages to any Farcaster user, even if they haven't registered on the app yet. This involves creating placeholder profiles for new recipients.

## Project Status Board

- [x] **Task: Refactor Homepage** `completed`
  - [x] Fetch and display inbox preview
  - [x] Fetch and display Farcaster following list
- [ ] **Task: Implement Just-in-Time User Creation** `in_progress`
  - [ ] Modify `POST /api/messages/send` to accept a `recipientWalletAddress`.
  - [ ] Implement "find or create" logic for the recipient user in the backend.
  - [ ] Modify the new-message UI to send `recipientWalletAddress` instead of an internal ID.

### Completed
- [x] **Initial Setup & Core Chat**
- [x] **Smart Contract Payment Integration**
- [x] **Fixing Various UI/UX & Database Bugs**
- [x] **Implement Farcaster Auto-Sign-In**
- [x] **Deploy to Farcaster**

## Executor's Feedback or Assistance Requests

Ready to begin implementation of the "Just-in-Time User Creation" feature. Starting with the backend `send` endpoint modification.

## Lessons

*   When a git push fails due to non-fast-forward errors, commit local changes, then `git pull` to merge, and then `git push` again. Avoid `git reset`.
*   The `&&` operator does not work for chaining commands in Windows PowerShell. Run commands sequentially.
*   The Farcaster Mini App spec requires handling a `POST` request to the app's main URL for authentication. This involves a rewrite rule in `next.config.mjs`.
*   The MockUSDC token was deployed with 18 decimals, not 6. All `parseUnits` and `formatUnits` calls must reflect this.
*   Environment variables (`.env`) are critical and must be consistent across all environments.
*   **OnchainKit for Mini Apps:** To interact with the Farcaster Mini App container (e.g., to dismiss the splash screen), the app must be wrapped in a `<MiniKitProvider>` from `@coinbase/onchainkit/minikit`. The `useMiniKit` hook can then be used to access the SDK, and `setFrameReady()` should be called (with no arguments) to signal the app has loaded. This is distinct from the general `@coinbase/onchainkit` package.
*   **React Hook Dependencies:** In React, when using hooks like `useCallback` or `useEffect`, ensure that any functions or variables used inside the hook are defined *before* the hook that depends on them. This prevents `ReferenceError: Cannot access '...' before initialization` errors.
