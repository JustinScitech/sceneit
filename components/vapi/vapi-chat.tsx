'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initializeWebhookServer } from '@/lib/utils/webhook-init';

declare global {
  interface Window {
    vapiSDK: any;
  }
}

interface VapiChatProps {
  className?: string;
  productContext?: {
    name: string;
    price: string;
    description?: string;
    detailedDescription?: string;
  };
}

export function VapiChat({ className, productContext }: VapiChatProps) {
  console.log('VAPI-CHAT: Component rendered with productContext:', productContext);
  
  const vapiInstanceRef = useRef<any>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [assistantId, setAssistantId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebSocket server when component loads
    initializeWebhookServer();

    // VAPI Configuration
    const envAssistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;

    // Don't initialize VAPI if no API key is provided
    if (!apiKey) {
      console.error('VAPI API key not found. Please set NEXT_PUBLIC_VAPI_API_KEY in your .env.local file');
      return;
    }

    // Don't initialize VAPI if no assistant ID is provided
    if (!envAssistantId) {
      console.error('VAPI assistant ID not found. Please set NEXT_PUBLIC_VAPI_ASSISTANT_ID in your .env.local file');
      return;
    }

    // Set the assistant ID in state so it can be accessed by other functions
    setAssistantId(envAssistantId); 

    // Initialize VAPI SDK without floating button
    const initVapi = () => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
      script.defer = true;
      script.async = true;
      
      script.onload = () => {
        if (window.vapiSDK && window.vapiSDK.run) {
          // Initialize VAPI SDK with the new API - this creates the floating button by default
          // We'll hide it with CSS and use our custom UI
          console.log('Initializing VAPI with:', { apiKey: apiKey ? 'present' : 'missing', assistantId: envAssistantId });
          
          // Initialize VAPI SDK with the new API - this creates the floating button by default
          // We'll hide it with CSS and use our custom UI
          const vapi = window.vapiSDK.run({
            apiKey: apiKey,
            assistant: {
              assistantId: envAssistantId
            },
            config: {
              // Hide the default button since we're using custom UI
              position: "bottom-right",
              offset: "-1000px", // Move it off-screen
              width: "0px",
              height: "0px"
            }
          });
          
          if (vapi) {
            vapiInstanceRef.current = vapi;
            
            // Set up event listeners
            vapiInstanceRef.current.on('call-start', () => {
              console.log('VAPI call started');
              setIsCallActive(true);
              setCallStatus('connected');
              setIsLoading(false);
            });
            
            vapiInstanceRef.current.on('call-end', () => {
              console.log('VAPI call ended');
              setIsCallActive(false);
              setCallStatus('ended');
              setIsLoading(false);
              setTimeout(() => setCallStatus('idle'), 2000);
            });
            
            vapiInstanceRef.current.on('error', (error: any) => {
              console.error('VAPI error:', error);
              setIsLoading(false);
              setCallStatus('idle');
            });
            
            vapiInstanceRef.current.on('message', (message: any) => {
              if (message.type === 'tool-calls') {
                console.log('VAPI message:', message);
              }
            });
            
            console.log('VAPI initialized with custom UI');
          }
        }
      };
      
      document.head.appendChild(script);
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="vapiAI"]');
    if (!existingScript) {
      initVapi();
    } else if (window.vapiSDK && window.vapiSDK.run) {
      // Script already loaded, initialize directly
      const vapi = window.vapiSDK.run({
        apiKey: apiKey,
        assistant: {
          assistantId: envAssistantId
        },
        config: {
          position: "bottom-right",
          offset: "-1000px",
          width: "0px",
          height: "0px"
        }
      });
      
      if (vapi) {
        vapiInstanceRef.current = vapi;
        
        // Set up event listeners for existing instance
        vapiInstanceRef.current.on('call-start', () => {
          setIsCallActive(true);
          setCallStatus('connected');
          setIsLoading(false);
        });
        
        vapiInstanceRef.current.on('call-end', () => {
          setIsCallActive(false);
          setCallStatus('ended');
          setIsLoading(false);
          setTimeout(() => setCallStatus('idle'), 2000);
        });
        
        vapiInstanceRef.current.on('error', (error: any) => {
          console.error('VAPI error:', error);
          setIsLoading(false);
          setCallStatus('idle');
        });
      }
    }

    return () => {
      // Cleanup if needed
      if (vapiInstanceRef.current) {
        try {
          vapiInstanceRef.current.stop?.();
        } catch (error) {
          console.log('VAPI cleanup completed');
        }
      }
    };
  }, [productContext]);

  const startCall = async () => {
    if (!vapiInstanceRef.current) return;
    
    console.log('VAPI-CHAT: Starting call with product context:', productContext);
    
    setIsLoading(true);
    setCallStatus('connecting');
    
    try {
      // Only use server-side assistant creation - no fallback
      if (!productContext) {
        throw new Error('Product context is required for assistant creation');
      }

      console.log('VAPI-CHAT: Creating server-side assistant with product context:', productContext.name);
      
      const response = await fetch('/api/vapi/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productContext }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create assistant: ${errorData.error}`);
      }

      const { assistantId: createdAssistantId } = await response.json();
      console.log('VAPI-CHAT: Created assistant with ID:', createdAssistantId);
      
      await vapiInstanceRef.current.start(createdAssistantId);
    } catch (error) {
      console.error('Failed to start VAPI call:', error);
      setIsLoading(false);
      setCallStatus('idle');
      throw error; // Re-throw to surface the error to the caller
    }
  };

  const endCall = () => {
    if (vapiInstanceRef.current && isCallActive) {
      vapiInstanceRef.current.stop();
    }
  };

  const toggleMute = () => {
    if (vapiInstanceRef.current && isCallActive) {
      if (isMuted) {
        vapiInstanceRef.current.setMuted(false);
      } else {
        vapiInstanceRef.current.setMuted(true);
      }
      setIsMuted(!isMuted);
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Voice Active';
      case 'ended': return 'Call Ended';
      default: return 'Voice Control';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting': return 'bg-yellow-500';
      case 'connected': return 'bg-red-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className={cn('p-4 bg-white/95 backdrop-blur-sm border shadow-lg', className)}>
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">SceneIt Voice Assistant</h3>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          
          {productContext && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3">
              <div className="font-medium">{productContext.name}</div>
              <div className="text-green-600 font-semibold">{productContext.price}</div>
              {productContext.description && (
                <div className="mt-1 text-gray-500">{productContext.description}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {!isCallActive ? (
            <Button 
              onClick={startCall}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {isLoading ? 'Connecting...' : 'Start Voice Chat'}
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                className={cn(
                  'px-4 py-2 rounded-full flex items-center gap-2',
                  isMuted 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              
              <Button
                onClick={endCall}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-center text-gray-500 space-y-1">
          <div>💡 <strong>Try saying:</strong></div>
          <div>"Show me the product from the side"</div>
          <div>"Rotate the camera around"</div>
          <div>"Tell me about this product"</div>
          <div>"I want to buy this"</div>
        </div>
      </div>
    </Card>
  );
}
