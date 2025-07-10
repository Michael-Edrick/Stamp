# Stamp Mini-App Project

## Background and Motivation

The goal is to build "Stamp", a decentralized messaging mini-app on the Base platform, inspired by `reachme.io`. The app will allow users (followers) to send messages to Key Opinion Leaders (KOLs) by purchasing a digital "stamp". This stamp acts as a paywall ticket. The payment is held in an on-chain escrow contract. If the KOL replies to the message within a specified timeframe, they receive the funds. If not, the user can claim a refund.

This project will extend the functionality of an existing sample mini-app, which already provides a solid foundation with wallet integration and Farcaster frame support.

## Codebase Analysis & Architecture

The project will be built upon the existing `mini-app` codebase. The architecture will follow the provided specification:

-   **Frontend**: Next.js, React, TailwindCSS, compatible with Base Mini-App specs.
-   **Backend**: Next.js API Routes.
-   **Authentication**: Sign-In With Ethereum (SIWE).
-   **Database**: PostgreSQL with Prisma ORM. (This replaces the Upstash Redis from the base project).
-   **Blockchain**: Base (Mainnet and Testnet).
-   **Smart Contracts**: Solidity for the `MessageEscrow` contract.
-   **Deployment**: Docker.

## High-level Task Breakdown

The project will be broken down into five main phases:

### Phase 1: Smart Contract Development
The core logic for handling stamps and payments will reside in a smart contract.

1.  **Define Smart Contract Logic**: Finalize the design for the `MessageEscrow` contract based on the provided spec. Key features: `sendMessage`, `releaseFunds`, `claimRefund`. Important considerations: USDC (ERC20) only, event emissions for frontend sync, OpenZeppelin's `ReentrancyGuard`, and using block numbers for expiry.
2.  **Set up Development Environment**: Initialize a Hardhat or Foundry environment for contract development and testing.
3.  **Implement Smart Contract**: Write the Solidity code for the `MessageEscrow` contract.
4.  **Test Smart Contract**: Develop and run comprehensive tests covering all functions, edge cases, and security considerations (TDD approach).
5.  **Deploy Smart Contract**: Deploy the contract to a testnet (e.g., Base Sepolia) and record the contract address and ABI.

### Phase 2: Backend Development
The Next.js backend will handle authentication, database interactions, and communication with the smart contract.

1.  **Database & Auth Setup**:
    *   Replace Upstash Redis with PostgreSQL and Prisma ORM.
    *   Set up database schemas for Users, Messages, etc.
    *   Implement SIWE for authentication (`/api/auth/...`).
2.  **User Profile Management**: Implement API endpoints for creating and managing user profiles (`/api/users/...`).
3.  **Core Messaging & Contract Interaction**: Implement the messaging APIs (`/api/messages/...`) that link off-chain data with on-chain transactions.

### Phase 3: Frontend Development
The user interface will be built out to support all "Stamp" features, with a mobile-first approach, based on the provided designs.

1.  **UI Mockups & Style**:
    *   Implement the main screen as a feed of KOL profiles.
    *   Create the bottom navigation bar with Search, Message, and a central "+" button.
    -   Build the search modal with profile and tag filtering.
2.  **Onboarding & Profile UI**: Create the user registration flow and profile management pages.
3.  **Core Messaging UI**: Build the messaging interface for both followers and KOLs, including inbox, sent items, and reply functionality.
4.  **Payment Flow Integration**: Connect the frontend to the `sendMessage` smart contract function to handle the payment and message sending flow.
5.  **Refund Flow**: Implement the UI for users to claim refunds after the expiry window.

### Phase 4: Admin Features
A dedicated set of features for platform administration.

1.  **Implement Admin APIs**: Build the secure backend endpoints for admin actions (`/api/admin/...`).
2.  **Develop Admin Dashboard**: Create a frontend dashboard for user search, transaction viewing, and manual overrides.

### Phase 5: Testing and Deployment
Thorough end-to-end testing before going live.

1.  **End-to-End Testing**: Test the entire user flow on a testnet, from registration to messaging, payment, replies, and refunds.
2.  **Prepare for Deployment**: Dockerize the application and prepare deployment scripts.
3.  **Production Deployment**: Deploy the application and the smart contract to Base Mainnet.

## Project Status Board

-   [x] **Phase 1: Smart Contract Development**
    -   [x] Task 1.1: Define Smart Contract Logic
    -   [x] Task 1.2: Set up Development Environment
    -   [x] Task 1.3: Implement Smart Contract
    -   [x] Task 1.4: Test Smart Contract
    -   [x] Task 1.5: Deploy Smart Contract
-   [ ] **Phase 2: Backend Development**
    -   [x] Task 2.1: Database & Auth Setup
    -   [x] Task 2.2: User Profile Management
    -   [x] Task 2.3: Core Messaging & Contract Interaction
-   [ ] **Phase 3: Frontend Development**
    -   [x] Task 3.1: UI Mockups & Style
    -   [x] Task 3.2: Onboarding & Profile UI
    -   [x] Task 3.3: Core Messaging UI
    -   [ ] Task 3.4: Payment Flow Integration
    -   [ ] Task 3.5: Refund Flow
-   [ ] **Phase 4: Admin Features**
    -   [ ] Task 4.1: Implement Admin APIs
    -   [ ] Task 4.2: Develop Admin Dashboard
-   [ ] **Phase 5: Testing and Deployment**
    -   [ ] Task 5.1: End-to-End Testing
    -   [ ] Task 5.2: Prepare for Deployment
    -   [ ] Task 5.3: Production Deployment

## Executor's Feedback or Assistance Requests

*No feedback at this time.*

## Lessons

*No lessons learned yet.* 