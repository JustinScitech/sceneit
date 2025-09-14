import { NextApiRequest, NextApiResponse } from 'next';
import { WebSocket } from 'ws';

// Global WebSocket server instance - use global to persist across hot reloads
declare global {
  var __wsServer: any;
  var __connectedClients: Set<WebSocket>;
}

let wsServer: any = global.__wsServer;
const connectedClients: Set<WebSocket> = global.__connectedClients || new Set<WebSocket>();

// Initialize WebSocket server if not already running
function initWebSocketServer() {
  if (wsServer && wsServer.readyState !== 3) { // 3 = CLOSED
    return wsServer;
  }

  try {
    const WebSocketServer = require('ws').Server;
    
    // Create WebSocket server directly
    wsServer = new WebSocketServer({ port: 8081 });
    global.__wsServer = wsServer;
    global.__connectedClients = connectedClients;
    
    setupWebSocketHandlers();
    console.log('WebSocket server started on port 8081');
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.log('Port 8081 already in use, WebSocket server already running');
      // Try to reuse existing server
      return wsServer;
    } else {
      console.error('Failed to start WebSocket server:', error);
    }
  }

  return wsServer;
}

function setupWebSocketHandlers() {
  if (!wsServer) return;

  wsServer.on('connection', (ws: WebSocket) => {
    console.log('WS-CLIENT-CONNECTED - Total clients:', connectedClients.size + 1);
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('WS-CLIENT-DISCONNECTED - Total clients:', connectedClients.size - 1);
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WS-CLIENT-ERROR:', error);
      connectedClients.delete(ws);
    });
  });

  console.log('WebSocket server started on port 8081');
}

// Broadcast message to all connected clients
function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  console.log('WEBSOCKET-BROADCAST:', { clientCount: connectedClients.size, message });
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      console.log('SENT-TO-CLIENT');
    } else {
      console.log('CLIENT-NOT-READY:', client.readyState);
    }
  });
}

// Handle function calls from VAPI
function handleFunctionCall(functionCall: { name: string; parameters: any }) {
  const { name, parameters } = functionCall;
  
  switch (name) {
    case 'executeCameraMovement':
      return executeCameraMovement(parameters);
    case 'processPurchase':
      return processPurchase(parameters);
    default:
      return { 
        success: false, 
        message: `Unknown function: ${name}` 
      };
  }
}

// Predefined camera positions
const cameraPositions: Record<string, { x: number; y: number; z: number; target: { x: number; y: number; z: number } }> = {
  front: { x: 0, y: 2.5, z: 5, target: { x: 0, y: 0.5, z: 0 } },
  back: { x: 0, y: 2.5, z: -5, target: { x: 0, y: 0.5, z: 0 } },
  left: { x: -5, y: 2.5, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  right: { x: 5, y: 2.5, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  top: { x: 0, y: 7, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  bottom: { x: 0, y: -3, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  front_view: { x: 0, y: 2.5, z: 5, target: { x: 0, y: 0.5, z: 0 } },
  side_view: { x: 5, y: 2.5, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  top_view: { x: 0, y: 7, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  isometric: { x: 3, y: 5, z: 3, target: { x: 0, y: 0.5, z: 0 } }
};

function moveToNamedPosition(positionName: string) {
  const normalizedName = positionName.toLowerCase().replace(/\s+/g, '_');
  
  // Try exact match first
  if (cameraPositions[normalizedName]) {
    return cameraPositions[normalizedName];
  }
  
  // Try partial matches
  for (const [key, position] of Object.entries(cameraPositions)) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return position;
    }
  }
  
  // Try word matches in the position name
  const words = normalizedName.split(/[\s_-]+/);
  for (const word of words) {
    for (const [key, position] of Object.entries(cameraPositions)) {
      if (key.includes(word) || word.includes(key)) {
        return position;
      }
    }
  }
  
  return null;
}

function executeCameraMovement(params: any) {
  console.log('CAMERA-MOVEMENT:', JSON.stringify(params, null, 2));
  
  // First check for named position (prioritize this over coordinates)
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      const namedPosition = moveToNamedPosition(value);
      if (namedPosition) {
        const { x, y, z, target } = namedPosition;
        console.log('BROADCAST-NAMED:', { position: value, coords: { x, y, z, target } });
        console.log('CLIENT-COUNT:', connectedClients.size);
        
        // Add a small delay to ensure clients are ready
        setTimeout(() => {
          broadcastToClients({
            type: 'cameraCommand',
            action: 'moveTo',
            params: { x, y, z, target }
          });
        }, 100);
        
        return { 
          success: true, 
          message: `Camera moved to ${value} view` 
        };
      }
    }
  }
  
  // Only use direct coordinates if no named position found
  if (typeof params.x === 'number' && typeof params.y === 'number' && typeof params.z === 'number') {
    console.log('BROADCAST-COORDS:', { x: params.x, y: params.y, z: params.z, target: params.target });
    console.log('CLIENT-COUNT:', connectedClients.size);
    
    setTimeout(() => {
      broadcastToClients({
        type: 'cameraCommand',
        action: 'moveTo',
        params: { x: params.x, y: params.y, z: params.z, target: params.target }
      });
    }, 100);
    
    return { 
      success: true, 
      message: `Camera moved to position ${params.x}, ${params.y}, ${params.z}` 
    };
  }
  
  return { 
    success: false, 
    message: `Invalid camera position. Available positions: ${Object.keys(cameraPositions).join(', ')}` 
  };
}

function processPurchase(params: any) {
  console.log('Processing purchase:', params);
  
  return {
    success: true, 
    message: 'Purchase processed successfully' 
  };
}

// Initialize WebSocket server immediately when module loads
initWebSocketServer();

export default function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (message?.type === 'tool-calls' && message?.toolCallList) {
      console.log('TOOL-CALLS:', JSON.stringify(message.toolCallList, null, 2));
      
      const results = [];
      
      // Process each tool call in the list
      for (const toolCall of message.toolCallList) {
        // VAPI sends tool calls with nested structure: toolCall.function.name and toolCall.function.arguments
        const functionName = toolCall.function?.name || toolCall.name;
        const functionArgs = toolCall.function?.arguments || toolCall.arguments;
        
        if (!functionName) {
          continue;
        }
        
        const result = handleFunctionCall({
          name: functionName,
          parameters: functionArgs
        });
        
        results.push({
          toolCallId: toolCall.id,
          result: result
        });
      }
      
      res.json({ results });
    } else {
      res.json({ received: true });
    }
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('====================');
    res.status(500).json({ error: error.message });
  }
}
