"use client";

import { useAddFrame, useMiniKit } from '@coinbase/onchainkit/minikit';

export default function AddAppButton() {
  const addFrame = useAddFrame();
  const { context } = useMiniKit();

  // Return null if we are not in the Base App or the app is already added.
  // We'll need to figure out how to reliably detect the Base App environment.
  // For now, we'll assume a property like `context.client.isBaseApp` might exist.
  // And based on the docs, we can check `context.client.added`.
  if (!context?.client?.isBaseApp || context?.client?.added) {
    return null;
  }

  const handleSave = async () => {
    try {
      const result = await addFrame();
      if (result) {
        // We can add analytics or save the notification token here later.
        console.log('App saved successfully:', result.url);
      } else {
        console.log('User cancelled or app was already added.');
      }
    } catch (error) {
      console.error('Failed to save app:', error);
    }
  };

  return (
    <div className="p-4 w-full max-w-md mx-auto">
        <button 
            onClick={handleSave}
            className="w-full bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors"
        >
            Add to Base for quick access
        </button>
    </div>
  );
}
