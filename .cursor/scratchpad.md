# StampMe - A Farcaster "Pay-per-Bundle" Messaging App

## Background and Motivation

The goal is to build a "pay-per-bundle" messaging application, deployable as a Farcaster mini-app. Users can buy message bundles to contact other users, with payments handled by a real smart contract on the Base Sepolia testnet. We've completed the initial setup, core chat functionality, and smart contract integration. The next phase is to enhance the Farcaster-specific user experience and finalize features before deployment.

## Key Challenges and Analysis

1.  **Farcaster Authentication:** The standard "Connect Wallet" flow is not ideal for Mini Apps. We need a seamless auto-sign-in experience for users coming from Farcaster clients like Warpcast. This involves handling and validating a signed payload from the client.
2.  **User Discovery:** To make the app useful, users need to be able to find and message others. The best-in-class experience is to let them search and message people they already follow on Farcaster.
3.  **Local Testing:** Simulating the Farcaster client environment for testing auto-sign-in locally requires specific tools like `ngrok` and a Frame Debugger.
4.  **Messaging Unregistered Users (Future Task):** A key challenge identified is how to handle a user trying to message someone from their Farcaster following list who has not yet registered on our app. The best solution ("Ghost Profile" approach) is to create a placeholder user record on-the-fly, allowing the first message to be sent. This creates a seamless experience for the sender and a strong onboarding incentive for the recipient. This will be addressed after the current tasks are complete.

## High-level Task Breakdown

The project will proceed in the following order:

1.  **Implement Farcaster Auto-Sign-In:** Create a seamless login experience for users opening the app from a Farcaster client.
2.  **Finish the Search Modal:** Allow users to search and message people from their Farcaster following list.
3.  **Deploy to Farcaster:** Deploy the application and configure its manifest to be a fully functional Mini App.

## Project Status Board

- [x] **Task 1: Implement Farcaster Auto-Sign-In** `completed`
- [ ] **Task 2: Finish the Search Modal** `in_progress`
- [ ] **Task 3: Deploy to Farcaster** `pending`

### Completed
- [x] **Initial Setup & Core Chat**
- [x] **Smart Contract Payment Integration**
- [x] **Fixing Various UI/UX & Database Bugs**

## Executor's Feedback or Assistance Requests

*No feedback or requests at this time. Starting work on Task 2.*

## Lessons

*   When a git push fails due to non-fast-forward errors, commit local changes, then `git pull` to merge, and then `git push` again. Avoid `git reset`.
*   The `&&` operator does not work for chaining commands in Windows PowerShell. Run commands sequentially.
*   The Farcaster Mini App spec requires handling a `POST` request to the app's main URL for authentication. This will likely involve a rewrite rule in `next.config.mjs` to direct POST requests to a specific API route, while GET requests are handled by the main page.
*   The MockUSDC token was deployed with 18 decimals, not 6. All `parseUnits` and `formatUnits` calls must reflect this.
*   Environment variables (`.env`) are critical and must be consistent across all environments: local development (`mini-app/.env`), smart contract deployment (`smart-contract/.env`), and Vercel. Required variables include `DATABASE_URL`, `NEYNAR_API_KEY`, `DEPLOYER_PRIVATE_KEY`, and `BASE_SEPOLIA_RPC_URL`.
