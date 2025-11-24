"use client";

import { useAddFrame, useMiniKit } from '@coinbase/onchainkit/minikit';
import { useEffect, useState } from 'react';

export default function AddAppButton() {
  const addFrame = useAddFrame();
  const { context } = useMiniKit();
  const [hasBeenPrompted, setHasBeenPrompted] = useState(false);

  useEffect(() => {
    // Check if the client context is available, if the app has not been added,
    // and if we haven't already prompted the user in this session.
    if (context?.client && !context.client.added && !hasBeenPrompted) {
      
      const showPrompt = async () => {
        setHasBeenPrompted(true); // Ensure we only prompt once per session
        try {
          const result = await addFrame();
          if (result) {
            console.log('App saved successfully:', result.url);
          } else {
            console.log('User cancelled or app was already added.');
          }
        } catch (error) {
          console.error('Failed to save app:', error);
        }
      };

      showPrompt();
    }
  }, [context, addFrame, hasBeenPrompted]);

  // This component no longer renders a visible button.
  // Its only purpose is to trigger the prompt.
  return null;
}
