# StampMe - Mini-App Layout Refactor

### Critical Security Patch: React2Shell (CVE-2025-66478) [COMPLETED]
- **Objective**: Address a critical Remote Code Execution (RCE) vulnerability (CVSS 10.0) affecting our version of Next.js (15.x).
- **Action Taken**: Utilized the official `npx fix-react2shell-next` tool provided by the Next.js and Vercel teams.
- **Outcome**: The tool successfully identified the vulnerability, updated the `next` package in `package.json` to the patched version (`15.5.9`), and ran `npm install`. The application is now secure from this threat.
- **Reference**: [Official Next.js Security Advisory](https://nextjs.org/blog/CVE-2025-66478)

# "Sender Not Found" Error Debugging

**Status: Completed**

## Background and Motivation
When a user tried to compose and send a new message, the application would fail with a "Sender not found" error. This was a critical bug preventing the core messaging functionality from working.

## Analysis and Findings
1.  **Initial Incorrect Theories:** The problem was initially misdiagnosed multiple times due to a misunderstanding of the application's complex user creation and authentication flow. I incorrectly identified the source of the `walletAddress` used for new Farcaster users multiple times.
2.  **User-Led Diagnosis:** The user correctly diagnosed the root cause of the problem. The issue stemmed from an inconsistency in which wallet address was being used to identify the sender.
3.  **The Core Problem:**
    *   When a user logs in, the backend's `/api/users/me` endpoint links their **currently connected wallet address** to their user profile in the `VerifiedAddress` table. This is the address the backend can use to reliably look them up.
    *   However, the frontend's `ComposeModal.tsx` was reading the `walletAddress` field from the user's database record (`currentUser.walletAddress`). This database field is populated from the user's *primary Farcaster address*, which can be different from the address they are currently connected with.
    *   The frontend was sending this (potentially incorrect) primary Farcaster address in the `x-wallet-address` header. The backend would then fail to find this address in the `VerifiedAddress` table, resulting in the "Sender not found" error.
4.  **The Solution:** The user correctly proposed that the `x-wallet-address` header should **always** contain the address of the currently connected wallet, not the address from the database record.

## Implementation
- **Action:** Modified `mini-app/app/components/ComposeModal.tsx`.
- **Details:** The `useAccount` hook from `wagmi` was used to get the active wallet address (renamed to `selfAddress` for consistency). This address is now used for the value of the `x-wallet-address` header in all API calls made from the component. A guard clause was also corrected to use this `selfAddress` to prevent sending messages when a wallet is not connected.
- **Outcome:** The backend now correctly identifies the sender using the address they are actively using, resolving the bug.


## Lessons
*   It is critical to have a precise and accurate understanding of the data flow, especially in authentication and user identification. My repeated failures to trace the `walletAddress` value from its source to its use caused significant delays and frustration.
*   When identifying a user on the backend, the identifier sent from the frontend must be the same one used to establish the session or link the user's identity. In this case, the `connectingAddress` is the source of truth for a session, not a static field from the database.


## Project Status Board
- [x] Debug and fix the "Sender not found" error.


# Paid Message Claim Animation

**Status: Completed**

## Background and Motivation
To enhance the user experience of claiming a paid message, a satisfying visual animation was implemented. When a user successfully claims the funds from a paid message, the existing message "stamp" peels away to reveal a new "claimed" version of the stamp. This effect is persistent, meaning that once a message is claimed, it will always show the "claimed" stamp on subsequent views.

## Analysis and High-level Plan
The animation was implemented using the `Peel.js` library for the geometry and the `GSAP` (GreenSock Animation Platform) library for smooth animation tweening. The implementation was isolated into a new, dedicated component to avoid affecting existing components. A new `isClaimed` boolean field was added to the `Message` model in the database to persist the claimed state.

### Implementation Details

*   **Task 1: Database Migration**
    *   **Action:** Added an `isClaimed` field to the `Message` model in `prisma/schema.prisma` and ran a database migration.
    *   **Success Criteria:** The database schema is updated to track the claimed status of each message.

*   **Task 2: Backend Logic Update**
    *   **Action:** Modified the `/api/messages/send` endpoint.
    *   **Details:** When a user replies to a paid message (the "claim" action), the backend now sets `isClaimed: true` for the original message in the database. It also returns a `claimSuccess: true` flag and the `claimedMessageId` to the frontend.
    *   **Success Criteria:** The backend correctly updates the database and informs the frontend when a claim is successful.

*   **Task 3: Create a New `ClaimableStamp.tsx` Component**
    *   **Action:** Created `mini-app/app/components/ClaimableStamp.tsx`.
    *   **Details:** This component contains the three-layer HTML structure required by `Peel.js` and uses React hooks (`useRef`, `useEffect`) to manage the animation lifecycle. It accepts props to control the animation and display the correct state (claimed or unclaimed).
    *   **Success Criteria:** The component successfully initializes the peel animation and can trigger it programmatically.

*   **Task 4: Integrate `ClaimableStamp` into `ChatPage.tsx`**
    *   **Action:** Modified `mini-app/app/chat/[userId]/page.tsx`.
    *   **Details:**
        1.  Replaced the `<StampAvatar>` with the new `<ClaimableStamp>` component.
        2.  Added state (`animatingMessageId`) to track which message should be animating.
        3.  When the backend returns `claimSuccess`, the frontend sets `animatingMessageId` to trigger the animation on the correct stamp.
        4.  An `onAnimationComplete` callback was implemented to update the local message state to `isClaimed: true` *after* the animation finishes, preventing a visual flash.
    *   **Success Criteria:** The peel animation is correctly triggered on the specific message being claimed, and the "claimed" state persists correctly on subsequent page loads.

## Project Status Board
- [x] Task 1: Add `isClaimed` field to the database.
- [x] Task 2: Update backend to handle claim status.
- [x] Task 3: Create the `ClaimableStamp` animation component.
- [x] Task 4: Integrate the animation into the chat page.


# Inbox & Stamp UI Polish

**Status: Completed**

## Background and Motivation
The user requested a series of visual refinements to the inbox list and the paid message "stamp" to improve clarity, aesthetics, and handle edge cases like long usernames gracefully.

## High-level Task Breakdown

*   **Task 1: Replace Username with Initials on Stamp**
    *   **Action:** Modify the `StampAvatar` component.
    *   **Details:** The component was updated to accept a user's full display name, from which it generates and displays initials (e.g., "Danielle Michelle" -> "DM") instead of the full username. This was applied to stamps in both the inbox and chat views for consistency.
    *   **Success Criteria:** All stamps correctly show the sender's initials.

*   **Task 2: Add Designer-Approved Effects to Stamp**
    *   **Action:** Modify the `StampAvatar` component.
    *   **Details:** Two effects from the Figma design were applied to the user's profile picture within the stamp:
        1.  A `linear-gradient(0deg, rgba(185, 185, 185, 0.1), rgba(185, 185, 185, 0.1))` overlay.
        2.  A "monotone noise" effect using a custom SVG filter to add texture, with the color `#A04B00` at `32%` opacity.
    *   **Success Criteria:** The stamp's visual effects perfectly match the Figma design specifications.

*   **Task 3: Implement Dynamic Username Truncation in Inbox**
    *   **Action:** Create a new `TruncatedUsername` component and integrate it into `Inbox.tsx`.
    *   **Details:** To handle long usernames that could break the layout, a new component was built. This component uses a hybrid approach:
        1.  CSS Flexbox is used to determine the available space for the username.
        2.  A `useLayoutEffect` hook in React measures the component's rendered width.
        3.  If the component detects that its content is overflowing, it uses JavaScript to reformat the username string into a `start...end` format (e.g., `airialmanage...eth`).
    *   **Success Criteria:** Long usernames in the inbox list are now gracefully and dynamically truncated, preventing any layout overflow issues.

*   **Task 4: Refine Paid Message Card Layout**
    *   **Action:** Modify the `Inbox.tsx` component.
    *   **Details:**
        1.  The horizontal `<hr>` divider was removed from the paid message card for a cleaner look.
        2.  The "Reply to... to collect..." text was wrapped in a smaller, white, pill-shaped container.
        3.  The layout was updated using Flexbox to push this new button to the bottom of the card, ensuring a consistent and clean visual hierarchy.
    *   **Success Criteria:** The paid message card's call-to-action button is correctly styled and positioned at the bottom of the card.


# Success Modal Redesign

**Status: Completed**

## Background and Motivation
The user wanted to replace the current generic success pop-up with a more visually appealing and branded modal that matches a provided mockup. This new design features a dynamic postcard image, displaying the amount of money sent and the recipient's username, all over a blurred background. This was accomplished by creating a dedicated `SuccessModal` component, which was then enhanced with custom fonts, celebratory effects, and social sharing functionality.

## High-level Task Breakdown

*   **Task 1: Create and Integrate the `SuccessModal`**
    *   **Action:** Create a new `SuccessModal.tsx` component and integrate it into the `ComposeModal.tsx`'s success flow for paid messages.
    *   **Details:** The new modal was designed to accept `amount` and `recipientUsername` as props. The `ComposeModal` was updated to show this new modal upon a successful transaction instead of redirecting.
    *   **Success Criteria:** When a paid message is sent, the new success pop-up appears, displaying the correct amount and recipient username.

*   **Task 2: Redesign the `SuccessModal` UI**
    *   **Action:** Modify `mini-app/app/components/SuccessModal.tsx`.
    *   **Details:**
        1.  The modal's backdrop was styled with a `backdrop-blur` CSS filter.
        2.  The `postcard-frame.png` image was used as the centerpiece.
        3.  The amount and username were overlaid on the postcard using absolute positioning.
        4.  Long usernames were handled gracefully with right-alignment and truncation.
    *   **Success Criteria:** The `SuccessModal` component is visually redesigned to match the mockup, including the postcard image, dynamic text, and blurred background.

*   **Task 3: Add Custom Font**
    *   **Action:** Integrate the "Bad Script" Google Font.
    *   **Details:** The font was imported in `layout.tsx` and applied specifically to the recipient's username in the `SuccessModal`.
    *   **Success Criteria:** The username on the success postcard is rendered in the "Bad Script" font.

*   **Task 4: Implement Celebratory Effects**
    *   **Action:** Add confetti and vibration effects to the `SuccessModal`.
    *   **Details:** The `react-confetti` library was used to display a confetti animation when the modal appears. The browser's Vibration API (`window.navigator.vibrate`) was used to provide haptic feedback on mobile devices.
    *   **Success Criteria:** The modal's appearance is accompanied by a visual confetti burst and a physical vibration.

*   **Task 5: Activate the "Share" Button**
    *   **Action:** Implement Farcaster sharing functionality.
    *   **Details:** The `useComposeCast` hook from OnchainKit was used to open the native Farcaster compose window. A pre-filled message was created, including the transaction amount, recipient, and an embed link back to the app.
    *   **Success Criteria:** Clicking the "Share" button opens the Farcaster composer with the correct, pre-populated cast.

# Payment Modal Redesign

**Status: Completed**

## Background and Motivation
The user requested a complete redesign of the `PaymentModal` to match a new design provided by the design team. The goal was to create a more visually engaging and informative selection screen for sending paid messages.

## High-level Task Breakdown

*   **Task 1: Simplify and Refine Layout**
    *   **Action:** Modify `mini-app/app/components/PaymentModal.tsx`.
    *   **Details:** The "None" option was removed. The layout of the remaining buttons was changed to display the price on the left, followed by the stamp name (e.g., "$1 Standard Stamp"). The button colors were updated to match the new design specs.
    *   **Success Criteria:** The modal displays two options with the correct text, colors, and layout.

*   **Task 2: Add Stamp Previews**
    *   **Action:** Create `StampPreview.tsx` and `PriorityStampPreview.tsx` components and integrate them into `PaymentModal.tsx`.
    *   **Details:** New components were created to render a preview of the stamp, including a static background image, the sender's initials, and the message price. These were added to the right side of each button in the `PaymentModal`.
    *   **Success Criteria:** The `PaymentModal` displays a visual preview of each stamp type next to its corresponding button.

*   **Task 3: Implement Animated Gradient Border**
    *   **Action:** Add new CSS to `globals.css` and modify the `PriorityStampPreview` integration.
    *   **Details:** An advanced CSS technique was used to create an animated border for the "Priority Stamp" preview. A `conic-gradient` was used as a background for a pseudo-element, and its starting angle was animated to create the effect of the gradient flowing around the border's shape. CSS masking (`mask-image`) was used to clip both the gradient and the stamp into the correct perforated shape.
    *   **Success Criteria:** The "Priority Stamp" preview has a smoothly animating, multi-colored border that follows the contour of the stamp.

*   **Task 4: Add Animated Sparkles**
    *   **Action:** Create a `<Sparkle />` component, add CSS, and update `PaymentModal.tsx`.
    *   **Details:** A new SVG component was created for the star shape. A CSS `sparkle-effect` animation was added to make them twinkle. Logic was added to the `PaymentModal` to render several of these sparkles at fixed positions around the "Priority Stamp" preview, each with a random animation delay.
    *   **Success Criteria:** The "Priority Stamp" preview is surrounded by several twinkling, four-pointed stars, matching the design mockup.

## Project Status Board
- [x] Task 1: Simplify and Refine Layout
- [x] Task 2: Add Stamp Previews
- [x] Task 3: Implement Animated Gradient Border
- [x] Task 4: Add Animated Sparkles

# Mainnet Deployment Strategy

**Status: In Progress**

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
