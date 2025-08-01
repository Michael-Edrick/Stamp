# ReachMe - Pay-per-Bundle Messaging Feature

### Final Requirement
Implement a "pay-per-bundle" messaging system where users pay to initiate a conversation that includes a bundle of 10 messages. The system should be integrated into a seamless, modern chat interface and deployed as a Farcaster mini-app.

### Background and Motivation
The initial concept was a one-time payment to unlock a conversation. This has been refined into a more sustainable "pay-per-bundle" model. A single payment grants a sender a bundle of 10 messages (replies from either user decrement the count). This encourages more meaningful, recurring interactions. The user experience has been shifted from a separate "new message" page to a dynamic, all-in-one chat page with a conditional payment modal, based on detailed designs. We have successfully implemented and tested the core application logic with a simulated payment flow and deployed it to Vercel. We are now ready to integrate real on-chain payments and deploy to Farcaster.

### Key Challenges and Analysis (Phase 1 - Completed)
1.  **Data Modeling:** Required introducing a `Conversation` model to link participants and track the `messagesRemaining` in a bundle. The `Message` model was updated to link to a `Conversation`.
2.  **API Logic:** The `/api/messages/send` endpoint was completely refactored to be the central point of logic, responsible for checking the message counter, requiring payment when a bundle is empty, and decrementing the counter. A new endpoint to fetch conversation history was also created.
3.  **Frontend UX:** The primary challenge was building a single, dynamic chat page that manages loading states, conversation history, and the conditional rendering of a payment modal without navigating the user away from the conversation.

### Key Challenges and Analysis (Phase 2 - Smart Contract Integration)
1.  **Smart Contract Interaction:** The frontend needs to be able to read data from and write data to the `MessageEscrow` smart contract. This involves using a library like `viem` or `ethers.js` to call contract functions.
2.  **Testnet Configuration:** We need to deploy the smart contract to a public testnet (e.g., Base Sepolia) and configure the application to interact with it. This includes managing contract addresses and ABIs.
3.  **Transaction Lifecycle Management:** The frontend must handle the entire lifecycle of a blockchain transaction: prompting the user to sign, displaying a loading state while the transaction is pending, and then confirming the success or failure of the transaction.

---

### High-level Task Breakdown (Phase 1 - Completed)
1.  ~~**Task 1: Update the Database Schema** - Add `Conversation` model and refactor `Message` model.~~
2.  ~~**Task 2: Create and Refactor Backend APIs** - Build new conversation history endpoint and refactor the send message API for bundle logic.~~
3.  ~~**Task 3: Build the Static Chat Page UI** - Create the new chat page UI with mock data based on designs.~~
4.  ~~**Task 4: Implement Dynamic Chat Logic and Payment Modal** - Make the chat page dynamic, fetching real data and implementing the payment modal flow.~~
5.  ~~**Task 5: Connect Homepage to Chat Page** - Link the user cards on the homepage to the new chat pages.~~
6.  ~~**Task 6: End-to-End Testing & Bug Fixing** - Perform a full test of the user journey, including fixing the search modal, chat UI, and missing profile tags.~~

### High-level Task Breakdown (Phase 2 - Smart Contract Integration)
1.  **Task 7: Prepare Frontend for Smart Contract Interaction** - Add the contract ABI and address to the project, and set up a client for interacting with the blockchain.
2.  **Task 8: Implement `deposit` Function Call** - Replace the simulated payment flow with a real call to the `deposit` function on the `MessageEscrow` contract.
3.  **Task 9: Handle Transaction Lifecycle in UI** - Update the UI to show pending, success, and error states for the deposit transaction.
4.  **Task 10: Backend Verification (Stretch Goal)** - Implement a mechanism on the backend to verify the transaction hash before storing the message.

---

## Project Status Board

### Phase 1: Core App & Simulated Payments
- [x] Task 1: Update the Database Schema
- [x] Task 2: Create and Refactor Backend APIs
- [x] Task 3: Build the Static Chat Page UI
- [x] Task 4: Implement Dynamic Chat Logic and Payment Modal
- [x] Task 5: Connect Homepage to Chat Page
- [x] Task 6: End-to-End Testing & Bug Fixing

### Phase 2: Smart Contract Integration
- [x] Task 7: Prepare Frontend for Smart Contract Interaction
- [x] Task 8: Implement `deposit` Function Call
- [x] Task 9: Handle Transaction Lifecycle in UI
- [ ] Task 10: Backend Verification (Stretch Goal)


## Current Status / Progress Tracking
- Phase 1 is complete. The application is functional with a simulated payment flow.
- We are now beginning Phase 2: Smart Contract Integration.
- **Task 7 is complete.** We have added the contract ABI and address to the frontend.
- **Task 8 & 9 are complete.** The frontend now initiates a real, two-step transaction (`approve` and `sendMessage`) and provides UI feedback for the transaction lifecycle.

## Executor's Feedback or Assistance Requests
- Awaiting permission to begin with Task 10, or to move on to deploying as a mini-app.

## Lessons
- **Windows File Locking:** The `