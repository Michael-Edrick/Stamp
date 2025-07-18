# ReachMe - Pay-per-Bundle Messaging Feature

### Final Requirement
Implement a "pay-per-bundle" messaging system where users pay to initiate a conversation that includes a bundle of 10 messages. The system should be integrated into a seamless, modern chat interface.

### Background and Motivation
The initial concept was a one-time payment to unlock a conversation. This has been refined into a more sustainable "pay-per-bundle" model. A single payment grants a sender a bundle of 10 messages (replies from either user decrement the count). This encourages more meaningful, recurring interactions. The user experience has been shifted from a separate "new message" page to a dynamic, all-in-one chat page with a conditional payment modal, based on detailed designs.

### Key Challenges and Analysis
1.  **Data Modeling:** Required introducing a `Conversation` model to link participants and track the `messagesRemaining` in a bundle. The `Message` model was updated to link to a `Conversation`.
2.  **API Logic:** The `/api/messages/send` endpoint was completely refactored to be the central point of logic, responsible for checking the message counter, requiring payment when a bundle is empty, and decrementing the counter. A new endpoint to fetch conversation history was also created.
3.  **Frontend UX:** The primary challenge was building a single, dynamic chat page that manages loading states, conversation history, and the conditional rendering of a payment modal without navigating the user away from the conversation.

### High-level Task Breakdown
1.  **Task 1: Update the Database Schema** - Add `Conversation` model and refactor `Message` model.
2.  **Task 2: Create and Refactor Backend APIs** - Build new conversation history endpoint and refactor the send message API for bundle logic.
3.  **Task 3: Build the Static Chat Page UI** - Create the new chat page UI with mock data based on designs.
4.  **Task 4: Implement Dynamic Chat Logic and Payment Modal** - Make the chat page dynamic, fetching real data and implementing the payment modal flow.
5.  **Task 5: Connect Homepage to Chat Page** - Link the user cards on the homepage to the new chat pages.
6.  **Task 6: End-to-End Testing** - Perform a full test of the user journey.

---

## Project Status Board
- [x] Task 1: Update the Database Schema
- [x] Task 2: Create and Refactor Backend APIs
- [x] Task 3: Build the Static Chat Page UI
- [x] Task 4: Implement Dynamic Chat Logic and Payment Modal
- [x] Task 5: Connect Homepage to Chat Page
- [x] Task 6: End-to-End Testing *(In Progress)*

## Current Status / Progress Tracking
- We have completed the initial implementation of all 6 tasks.
- We are currently in the end-to-end testing phase.
- The user has correctly identified two key discrepancies from the final vision:
    1.  The payment flow is currently a **simulation** and is not connected to a real smart contract.
    2.  The "claimed!" status is appearing incorrectly on newly sent messages.

## Executor's Feedback or Assistance Requests
- **Pending Decision:** How should the "claimed!" status be handled? Based on our original plan, it should appear only after a recipient has replied to a message, triggering the release of escrowed funds. Please confirm if we should proceed with fixing the UI to reflect this logic.

## Lessons
- **Windows File Locking:** The `EPERM` error during `prisma generate` on Windows is due to file locks from the Node.js dev server or the code editor. The solution is to stop the dev server and fully restart the editor and terminal before running the command.
- **Next.js `params` Object:** In recent Next.js versions, accessing `params` in Client Components must be done via the `useParams()` hook. In API Route Handlers, parsing the ID from the request URL is a more robust method than relying on the `params` object passed to the function.
- **Prisma Import Style:** The Prisma client in this project is a default export. Use `import prisma from '@/lib/prisma';` not `import { prisma } from ...`.
- **Vercel Deployment Errors:**
    - **TypeScript vs. ESLint:** It's crucial to distinguish between TypeScript compilation errors and ESLint rule violations. Disabling ESLint in `next.config.js` will not bypass type errors from the TypeScript compiler, which are fatal to the build.
    - **Schema / Type Synchronization:** If the build fails with type errors related to the Prisma schema (e.g., "Property 'X' does not exist on type 'Y'"), it's often because the generated Prisma Client is out of sync with the schema. Running `npx prisma generate` is the first step, but a corrupted `node_modules` can prevent the fix from being recognized. A clean reinstall (`rm -rf node_modules && npm install`) is sometimes necessary.
    - **Git Synchronization:** Before pushing fixes, especially after a complex debugging session involving `git reset`, ensure the local repository is synchronized with the remote. A `git pull` is required if the remote has changes not present locally. If a merge conflict occurs, it must be resolved before the push can succeed.
- **Next.js 15 Route Handler `params`:** In Next.js 15, the `params` object in dynamic API route handlers is a `Promise`. It must be awaited (e.g., `const { userId } = await params;`) to access the route parameters.