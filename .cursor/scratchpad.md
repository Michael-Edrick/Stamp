# StampMe - Mini-App Layout Refactor

## Background and Motivation

The application currently suffers from a critical layout bug when run as a Farcaster mini-app. A large, empty gap appears at the bottom of the screen, especially when scrolling or interacting with the page. This issue does not occur in a standard web browser. The root cause is a combination of using standard CSS viewport units (`vh`) which are unreliable in the Farcaster webview environment, and using `position: fixed` for the header and footer, which breaks the page's layout flow.

This plan outlines the steps to refactor the application's layout to be robust and correctly sized within the Farcaster mini-app environment, ensuring a clean and professional user experience.

## Key Challenges and Analysis

1.  **Unreliable Viewport Units:** CSS `vh` units do not respect the UI chrome of the host Farcaster application, leading to incorrect height calculations.
2.  **`position: fixed` Issues:** Fixed positioning removes elements from the document flow, which causes layout instability and scrolling conflicts inside a webview.
3.  **The SDK Solution:** The `@coinbase/onchainkit` library provides the `useMiniKit` hook. This hook exposes the `safeAreaInsets` (top and bottom padding occupied by the Farcaster native UI), which is the definitive way to calculate the true available screen space for our app.

## High-level Task Breakdown

The strategy is to create a master `AppFrame` component that correctly calculates the available height, and then refactor our pages to use a modern Flexbox layout within that frame.

1.  **Task 1: Create a Dedicated `AppFrame` Client Component**
    *   **Action:** Create a new file: `mini-app/app/AppFrame.tsx`.
    *   **Details:** This will be a `'use client'` component. It will import and use the `useMiniKit` hook to access `context.client.safeAreaInsets`. It will then calculate the true available height (`calc(100vh - topInset - bottomInset)`) and render a `<main>` tag that wraps its children and has its height set to this calculated value.
    *   **Success Criteria:** The component is created and encapsulates the logic for calculating the mini-app's true height. The app builds without errors.

2.  **Task 2: Integrate `AppFrame` into the Root Layout**
    *   **Action:** Modify `mini-app/app/layout.tsx`.
    *   **Details:** The root layout will remain a simple server component. It will import the new `AppFrame` component and use it to wrap the `{children}`. This must be done *inside* the `<Providers>` component to ensure the `useMiniKit` hook has access to the required context.
    *   **Success Criteria:** The application's core structure is updated. Every page is now rendered inside a container that is perfectly sized to the Farcaster mini-app's visible area.

3.  **Task 3: Refactor Homepage to a Flexbox Layout**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:** The page's root `div` will be changed to `className="h-full flex flex-col"`. The `<header>` and `BottomNav` components will have their `position: fixed` CSS removed. The main content area will be wrapped in a `div` with `className="flex-1 overflow-y-auto"` to make it the single, scrollable area that fills the remaining space.
    *   **Success Criteria:** The homepage layout is now robust, uses the full available space correctly, and the scroll/gap bug is eliminated.

4.  **Task 4: Refactor Chat Page to a Flexbox Layout**
    *   **Action:** Modify `mini-app/app/chat/[fid]/page.tsx`.
    *   **Details:** The same Flexbox architecture will be applied. The root `div` will become `h-full flex flex-col`. The header and message input footer will have `position: sticky` removed. The message list will become the scrollable `flex-1` content area.
    *   **Success Criteria:** The chat page layout is fixed, consistent with the homepage, and works correctly when the on-screen keyboard appears. The bug is universally resolved.

## Project Status Board
- [x] Task 1: Create a Dedicated `AppFrame` Client Component
- [x] Task 2: Integrate `AppFrame` into the Root Layout
- [x] Task 3: Refactor Homepage to a Flexbox Layout
- [x] Task 4: Refactor Chat Page to a Flexbox Layout
- [x] Fix "Could not identify current user in conversation" bug by fetching current user data correctly.
- [x] Sort the homepage "Following" list by follower count, fetching the top 250 users for accuracy.
- [x] Implement "Just-in-Time User Creation" for messaging unregistered Farcaster users.
- [x] Refactor APIs to support multiple wallet addresses per user.
- [x] Fix conversation loading and message sending with secondary wallet.

## Executor's Feedback or Assistance Requests
*All previous tasks are complete. The multi-address authentication and messaging flow is now working correctly.*

**Update:** The "Platform Fee Implementation" feature has been successfully implemented, tested, and the new contract has been deployed. The platform is now correctly collecting a 10% fee on claimed messages. All related tasks are complete.

---

# UI & Flow Refactoring

## Background and Motivation
The user wants to refactor the application's user interface, starting with the homepage. The goal is to simplify the main view by removing the list of "Following" users, while preserving the code for potential future use.

## High-level Task Breakdown

*   **Task 1: Temporarily Remove the "Following" List from the Homepage**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:**
        1.  Locate the `fetch` call to the `/api/users/following` endpoint and comment it out.
        2.  Locate the JSX code that maps over the `following` state variable to render the `UserCard` components and comment out the entire section.
    *   **Success Criteria:** The homepage loads and functions correctly, but the list of followed users is no longer visible. The application builds without errors.

*   **Task 2: Create a Reusable `Inbox` Component**
    *   **Action:** Create a new file: `mini-app/app/components/Inbox.tsx`.
    *   **Details:**
        1.  Move the data fetching logic (the call to `/api/messages/inbox`) and state management from the existing `inbox/page.tsx` into this new component.
        2.  The component will render the full, scrollable list of conversations.
    *   **Success Criteria:** A self-contained `Inbox.tsx` component is created that handles all logic for fetching and displaying a user's complete inbox.

*   **Task 3: Integrate the `Inbox` Component into the Homepage**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:**
        1.  Remove the old "Your chats" section and its associated data fetching logic.
        2.  Import and render the new `<Inbox />` component in its place.
    *   **Success Criteria:** The homepage now displays the full, scrollable inbox.

*   **Task 4: Clean up the old `/inbox` Page**
    *   **Action:** Modify `mini-app/app/inbox/page.tsx`.
    *   **Details:**
        1.  Strip the page down to a simple container that imports and displays the `<Inbox />` component.
    *   **Success Criteria:** The `/inbox` page continues to work correctly but with much simpler, non-duplicated code.

*   **Task 5: Update App Color Scheme and Conversation Card Layout**
    *   **Action:** Modify global CSS and the `Inbox.tsx` component.
    *   **Details:**
        1.  Change the application's primary background color from `#F0F2F5` to `#DEDEDE`.
        2.  In `mini-app/app/components/Inbox.tsx`, change the background color of conversation cards to `#ECECEC`.
        3.  In the same component, adjust the layout to display the username next to the display name (e.g., "**Display Name** @username").
    *   **Success Criteria:** The app's background and card colors are updated, and the username appears correctly formatted on each conversation card.

*   **Task 6: Remove "StampMe" Title from Homepage Header**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:** Locate and remove the `<h1>StampMe</h1>` element from the header.
    *   **Success Criteria:** The homepage header no longer displays the "StampMe" title.

*   **Task 7: Create a Reusable `StampIcon` SVG Component**
    *   **Action:** Create a new file: `mini-app/app/components/StampIcon.tsx`.
    *   **Details:** Write a new React component that renders a precise SVG of the orange stamp shape.
    *   **Success Criteria:** The `StampIcon.tsx` component is created and displays the stamp icon correctly.

*   **Task 8: Add the Stamp Icon Home Button to the Homepage Header**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:**
        1.  Import the new `StampIcon` component.
        2.  Place the `StampIcon` inside a Next.js `<Link href="/">` component to act as a home button.
        3.  Integrate this link into the header on the top-left.
    *   **Success Criteria:** The homepage header displays the stamp icon button in the top-left corner, and it functions as a link to home.

*   **Task 9: Remove the `BottomNav` Component**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:** Completely remove the `BottomNav` component and its invocation from the homepage layout.
    *   **Success Criteria:** The application renders without the black bottom navigation bar.

*   **Task 10: Implement the Floating `+` Button**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:** Add a new circular, blue button with a `+` icon, using fixed positioning to float it in the bottom-right corner of the page.
    *   **Success Criteria:** A floating action button is visible and correctly positioned on the homepage.

*   **Task 11: Move the Profile Avatar to the Header**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:** Relocate the user's profile avatar from the old navigation bar to the top-right of the main header. It will function as a link to the profile page.
    *   **Success Criteria:** The user's avatar appears in the header and links correctly to their profile, matching the new design.

*   **Task 12: Temporarily Hide Wallet Information from Header**
    *   **Action:** Modify `mini-app/app/page.tsx`.
    *   **Details:** Comment out the block of code that displays the connected wallet address, network switcher, and logout button.
    *   **Success Criteria:** The header renders with only the stamp icon on the left and the profile avatar on the right.

---

# Farcaster Embed Failure (Root Cause Analysis)

**Status: Active**

## Background and Motivation
Despite having a valid `farcaster.json` manifest, sharing the app's URL in the Base app does not generate a rich embed preview. The URL is treated as a plain link. This prevents the app from being launched as a mini-app from a shared link.

## Analysis and Findings
1.  **Initial Hypothesis (Incorrect):** The issue was initially believed to be caused by an incorrect Farcaster Frame action type (`post` vs `launch_frame`) or a leftover `rewrites` rule in `next.config.mjs`. These were corrected, but the problem persisted.
2.  **Diagnostic Testing:** A test was performed to isolate the `MiniKitProvider` by commenting out other providers (`WagmiProvider`, `SessionProvider`, `QueryClientProvider`). This caused the build to fail, preventing the test's completion.
3.  **Definitive Root Cause:** By inspecting the live, deployed HTML of the homepage, it was confirmed that the crucial **`fc:frame` meta tags are completely missing from the final server output.** The `generateMetadata` function in `layout.tsx` is not being rendered into the HTML `<head>`.

## Conclusion
The failure of the `generateMetadata` function to execute correctly on the server is the root cause. This is almost certainly due to a conflict in the `providers.tsx` file, where the complex nesting of client-side providers (Wagmi, NextAuth) is preventing Next.js from server-rendering the necessary metadata tags. The link scraper sees no frame tags and correctly treats the URL as a regular webpage.

The next step is to refactor `providers.tsx` to resolve this conflict.

---

# Farcaster Login Flow Debugging

**Status: Completed**

## Background and Motivation
When logging in from a Farcaster-native environment (like the Base app), some users were having a blank "New User" profile created instead of being logged into their existing account. This was caused by a frontend race condition that was fixed, but a final backend error was preventing successful login.

## Analysis and Findings
1.  **Frontend Race Condition:** The initial problem was a race condition in `app/page.tsx`. The app was calling the backend to fetch the user *after* the wallet was connected but *before* the Farcaster `useMiniKit` hook had provided the user's Farcaster identity. This caused the frontend to make an unauthenticated request, leading the backend to create a new user.
2.  **Solution (Frontend):** The race condition was resolved by implementing a robust `useEffect` hook with a 5-second timeout. The app now waits for the Farcaster user data to arrive. If it does, it proceeds immediately (Success Path). If it doesn't arrive within 5 seconds, it assumes a regular browser environment and proceeds (Fallback Path). This ensures the frontend logic is correct.
3.  **Backend `401 Unauthorized` Error:** After fixing the frontend, logins were still failing. The final issue was a `401 Unauthorized` error when the backend tried to call the Neynar API.
4.  **Root Cause (Backend):** The `NEYNAR_API_KEY` environment variable stored in Vercel had expired. Updating the key to a valid one resolved the `401` error.

## Conclusion
The entire end-to-end login flow is now fixed. The frontend correctly waits for Farcaster data, and the backend is correctly authenticated with the Neynar API.

## Lessons
*   When debugging a `401 Unauthorized` error from an external API, the first step should always be to verify that the API key is correct, valid, and has been correctly configured in the environment variables.
*   React `useEffect` dependency arrays can be tricky. When a `useCallback` function is a dependency, ensure that its own dependency array is correct, otherwise, the `useEffect` may not re-run when expected.
*   Complex race conditions on the frontend can be reliably solved with a timeout-based fallback mechanism.

## Project Status Board
- [x] Debug and fix the "New User" creation bug for Farcaster logins.
- [x] Restore the profile button and other header UI elements.

## Executor's Feedback or Assistance Requests
*All tasks related to the login flow are now complete. The application is stable and ready for the next set of improvements.*

---

# Compose Modal UI/UX Improvement

**Status: Completed**

## Background and Motivation
The user wanted to improve the UI/UX of the "Compose Message" modal. The original implementation required the user to press "Enter" to send and lacked clear visual feedback. The goal was to implement a design with a dedicated, state-aware "Send" button.

## Analysis and Implementation
1.  **Added a "Send" Button:** A new button with a paper airplane icon was added to the modal. This replaced the reliance on the "Enter" key as the only way to send a message.
2.  **State-Aware Logic:** The button's state is conditionally controlled. It is disabled and styled in gray when either a recipient has not been selected or the message body is empty. It becomes enabled and styled in blue as soon as both conditions are met, providing clear visual feedback to the user that they can now send the message.
3.  **Layout Refinements:** The button was initially placed inside the recipient input field. Based on user feedback, it was relocated to be part of a single, unified header bar, creating a cleaner layout with the "Close" button on the left, the recipient input in the middle, and the "Send" button on the right.
4.  **Icon Polish:** As a final touch, the paper airplane icon was rotated -45 degrees to point towards the top-right, giving it a more dynamic and active feel.

## Conclusion
The `ComposeModal` has been successfully updated to match the new design, providing a more intuitive and visually appealing user experience for sending new messages.

## Project Status Board
- [x] Debug and fix the "New User" creation bug for Farcaster logins.
- [x] Restore the profile button and other header UI elements.
- [x] Redesign and implement the "Compose Message" modal UI.

---

# Mainnet Deployment Strategy

**Status: Planning**

## Background and Motivation
The application is currently running on the Base Sepolia testnet. The next major milestone is to deploy the application to the Base mainnet, allowing for real-user interaction with real funds. This requires a robust, secure, and maintainable deployment strategy that clearly separates the test and production environments. Based on user requirements for managing Farcaster mini-app testing on Vercel's free tier, this will be achieved by creating a separate, dedicated repository for the mainnet codebase.

## High-level Task Breakdown

*   **Task 1: Implement Environment-Aware Configuration**
    *   **Action:** Create a central configuration file (e.g., `mini-app/lib/config.ts`) that reads `process.env.NEXT_PUBLIC_NETWORK`.
    *   **Details:** Based on whether the variable is `'mainnet'` or `'testnet'`, this file will export the correct contract addresses (`MessageEscrow`, `USDC`), chain ID, and any other environment-specific settings. This ensures the codebase remains the same for all environments.
    *   **Success Criteria:** The application's blockchain configuration can be switched between testnet and mainnet solely by changing an environment variable.

*   **Task 2: Deploy Smart Contracts to Mainnet**
    *   **Action:** Deploy the `MessageEscrow.sol` contract to the Base mainnet.
    *   **Details:** This will require running the deployment scripts targeted at the Base mainnet. We will obtain new, official contract addresses for the production environment and will need to use the official Base USDC token address.
    *   **Success Criteria:** The contract is live on Base mainnet, and we have the final production contract addresses.

*   **Task 3: Provision Production Database**
    *   **Action:** Set up a new, dedicated database instance for the production environment.
    *   **Details:** This ensures a complete separation of user data between the test and live applications, which is critical for security and data integrity. The new database connection string will be set as the `DATABASE_URL` in the production environment.
    *   **Success Criteria:** A new, empty, and accessible database for mainnet is ready.

*   **Task 4: Create a Dedicated Mainnet Repository**
    *   **Action:** Clone the current repository to create a new, separate repository for the mainnet application.
    *   **Details:** This new repository will be the source of truth for the production deployment. The existing repository will continue to serve as the testnet environment.
    *   **Success Criteria:** A new GitHub repository for the mainnet codebase is created and accessible.
    *   **Note on Maintenance:** It will be critical to establish a strict manual process for keeping the two repositories in sync. Any bug fixes or features applied to the testnet repo must be carefully ported to the mainnet repo to prevent them from diverging.

*   **Task 5: Configure a New Vercel Project for Mainnet**
    *   **Action:** Create a new Vercel project and connect it to the new mainnet GitHub repository.
    *   **Details:**
        1.  The new Vercel project will be configured with the production environment variables (mainnet database URL, mainnet contract addresses, `NEXT_PUBLIC_NETWORK='mainnet'`).
        2.  The `main` branch of the new repository will be set as the Production Branch.
        3.  The existing Vercel project will remain connected to the original testnet repository.
    *   **Success Criteria:** We have two distinct Vercel deployments: one for production connected to the mainnet repository, and one for testing connected to the testnet repository.

---

# Success Modal Redesign

**Status: Planning**

## Background and Motivation
The user wants to replace the current generic success pop-up with a more visually appealing and branded modal that matches a provided mockup. This new design will feature a dynamic postcard image, displaying the amount of money sent and the recipient's username, all over a blurred background. A dedicated `SuccessModal` component will be created to encapsulate this new design, leaving the existing `InfoModal` untouched.

## High-level Task Breakdown

*   **Task 1: Redesign the `SuccessModal` Component**
    *   **Action:** Modify `mini-app/app/components/SuccessModal.tsx`.
    *   **Details:**
        1.  Add `amount: number` and `recipientUsername: string` to the component's props to accept the dynamic data.
        2.  Update the modal's backdrop style to include a `backdrop-blur` CSS filter.
        3.  Use the `postcard-frame.png` image from the `/public` directory as the centerpiece of the modal.
        4.  Create a container with the postcard as a background and use CSS `position: absolute` to overlay the amount and username text on top of it, matching the layout in your mockup.
        5.  The existing "Finish" button will be styled to match the mockup, and a placeholder for the "Share" button will be considered in the layout.
    *   **Success Criteria:** The `SuccessModal` component is visually redesigned to match the mockup, including the postcard image, dynamic text, and blurred background.

*   **Task 2: Integrate the Redesigned Modal into the `ComposeModal`**
    *   **Action:** Modify `mini-app/app/components/ComposeModal.tsx`.
    *   **Details:** When a paid message is sent successfully, retrieve the `amount` from `pendingAmountRef` and the `recipientUsername` from `recipientDbUserRef` and pass them as props to the redesigned `<SuccessModal />`.
    *   **Success Criteria:** When a paid message is sent, the new, beautifully designed success pop-up appears, displaying the correct amount and recipient username.

## Project Status Board
- [x] Fix long usernames in `SuccessModal` by implementing a hybrid approach (right-align and truncate).
- [ ] Task 2: Integrate the Redesigned Modal into the `ComposeModal`
