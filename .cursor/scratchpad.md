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

## Lessons
*   The Neynar API `fetchUserFollowing` endpoint has a maximum limit of 100 users per request. To fetch larger sets of data, pagination using the `cursor` is required.
*   TypeScript build errors can sometimes occur due to outdated or mismatched type definitions in an SDK. Accessing properties using bracket notation (e.g., `user['follower_count']`) can be a viable workaround to bypass incorrect type checking during the build process.
*   When a client-side `fetch` call to a backend API endpoint returns a `400 Bad Request`, it's crucial to verify that all required query parameters or body data are being sent correctly from the client.
*   When implementing a significant data model change (like the `VerifiedAddress` table), it is critical to trace all data flows and update every API endpoint that relies on the old structure to prevent authentication and data retrieval errors. Forgetting to update even one dependent component can lead to bugs that are hard to trace.
