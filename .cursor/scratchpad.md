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
