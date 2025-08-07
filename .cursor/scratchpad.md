# StampMe - A Farcaster "Pay-per-Bundle" Messaging App

## Background and Motivation

The goal is to build a "pay-per-bundle" messaging application, deployed as a Farcaster mini-app. Users can buy message bundles to contact other users, with payments handled by a real smart contract on the Base Sepolia testnet. We've completed the initial setup, core chat functionality, smart contract integration, and Farcaster Mini App deployment.

## Key Challenges and Analysis

1.  **Farcaster Authentication:** The standard "Connect Wallet" flow is not ideal for Mini Apps. We need a seamless auto-sign-in experience for users coming from Farcaster clients like Warpcast. This involves handling and validating a signed payload from the client.
2.  **User Discovery:** To make the app useful, users need to be able to find and message others. The best-in-class experience is to let them search and message people they already follow on Farcaster.
3.  **Manifest Configuration:** Farcaster requires a manifest file (`.well-known/farcaster.json`) that includes a developer "Account Association" signature to prove ownership of the domain. This required using Farcaster's developer tools to generate a signature.
4.  **Messaging Unregistered Users (Future Task):** A key challenge identified is how to handle a user trying to message someone from their Farcaster following list who has not yet registered on our app. The best solution ("Ghost Profile" approach) is to create a placeholder user record on-the-fly. This will be addressed in a future session.

## High-level Task Breakdown

All major tasks for this phase are now complete.

1.  **Implement Farcaster Auto-Sign-In:** Create a seamless login experience for users opening the app from a Farcaster client.
2.  **Finish the Search Modal:** Allow users to search and message people from their Farcaster following list.
3.  **Deploy to Farcaster:** Deploy the application and configure its manifest to be a fully functional Mini App.

## Project Status Board

- [x] **Task 1: Implement Farcaster Auto-Sign-In** `completed`
- [x] **Task 2: Finish the Search Modal** `completed`
- [x] **Task 3: Deploy to Farcaster** `completed`

### Completed
- [x] **Initial Setup & Core Chat**
- [x] **Smart Contract Payment Integration**
- [x] **Fixing Various UI/UX & Database Bugs**

## Executor's Feedback or Assistance Requests

All planned tasks are complete. Awaiting new instructions for the next set of fixes.

## Lessons

*   When a git push fails due to non-fast-forward errors, commit local changes, then `git pull` to merge, and then `git push` again. Avoid `git reset`.
*   The `&&` operator does not work for chaining commands in Windows PowerShell. Run commands sequentially.
*   The Farcaster Mini App spec requires handling a `POST` request to the app's main URL for authentication. This involves a rewrite rule in `next.config.mjs`.
*   The MockUSDC token was deployed with 18 decimals, not 6. All `parseUnits` and `formatUnits` calls must reflect this.
*   Environment variables (`.env`) are critical and must be consistent across all environments.
*   **OnchainKit for Mini Apps:** To interact with the Farcaster Mini App container (e.g., to dismiss the splash screen), the app must be wrapped in a `<MiniKitProvider>` from `@coinbase/onchainkit/minikit`. The `useMiniKit` hook can then be used to access the SDK, and `setFrameReady()` should be called (with no arguments) to signal the app has loaded. This is distinct from the general `@coinbase/onchainkit` package.
