// Utility function to initialize the WebSocket server
export async function initializeWebhookServer(): Promise<boolean> {
  try {
    const response = await fetch('/api/vapi/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ init: true }),
    });
    
    if (response.ok) {
      console.log('WebSocket server initialized successfully');
      return true;
    } else {
      console.error('Failed to initialize WebSocket server:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error initializing WebSocket server:', error);
    return false;
  }
}
