

# AI Voice Customer Support Agent

A full-stack voice-first customer support agent for e-commerce that handles product discovery, order tracking, cancellations, returns, and policy explanations using your provided datasets.

---

## 🎨 Interface Design

**Modern & Minimal Style**
- Clean white background with subtle gray accents
- Professional call-center aesthetic with clear visual hierarchy
- Responsive design that works on desktop and mobile

---

## 📱 Frontend Features

### Entry Screen
- **Customer ID Input** - Required field before starting any conversation
- Validates customer ID exists in the order database
- Stores customer context for personalized support

### Main Support Interface
- **Voice Control Panel**
  - Large microphone button with visual feedback
  - "Listening" indicator with audio waveform animation
  - "Speaking" indicator when AI responds
  
- **Live Transcript Panel**
  - Real-time display of user's spoken words
  - Shows speech-to-text conversion as user speaks
  
- **Assistant Response Panel**
  - AI responses displayed with clear formatting
  - Product cards for search results (with images, prices, ratings)
  - Order status cards for tracking queries
  
- **Chat Fallback**
  - Text input field always available
  - Auto-activates if microphone permission denied
  - Seamless switch between voice and text

- **Conversation History**
  - Scrollable message thread showing full conversation
  - Persisted in localStorage for returning users
  - Clear history option per customer ID

---

## 🔧 Backend Services (Edge Functions)

### Data Management
- Load all JSON datasets at startup
- **Products Service**: Search by name, category, price range; get details
- **FAQ Service**: Lookup FAQs by product ID
- **Orders Service**: Track orders, validate customer ownership
- **Policy Service**: Retrieve policy information by type

### AI Agent Endpoint
- Powered by Lovable AI (Gemini model)
- Streaming responses for real-time voice output
- Session context memory (customerId, lastOrderId, lastProductId, lastIntent)

---

## 🤖 AI Agent Capabilities

### Intent Recognition
The agent will understand and handle:
- **Product Search**: "Show me laptops under $500"
- **Product Details**: "Tell me about the Luma Monitor Pro"
- **Product FAQs**: "What's the warranty on this product?"
- **Order Tracking**: "Where is my order O0001?"
- **Cancellation Requests**: "I want to cancel my order"
- **Return Requests**: "How do I return this item?"
- **Policy Questions**: "What's your refund policy?"

### Smart Context Memory
- Remembers customer ID throughout session
- References last discussed product for follow-ups ("What's the price?" after discussing a product)
- Tracks last order for natural conversation flow

### Tool Functions (Function Calling)
1. `searchProducts(filters)` - Search by name, category, price range
2. `getProductDetails(productId)` - Full product information
3. `getProductFAQs(productId)` - Product-specific FAQs
4. `trackOrder(orderId, customerId)` - Order status lookup
5. `initiateCancellation(orderId)` - Returns confirmation message (no data mutation)
6. `initiateReturn(orderId)` - Returns confirmation message (no data mutation)
7. `getPolicy(policyType)` - Return, refund, cancellation, or delivery policy

---

## 🎤 Voice Features

### Speech-to-Text (Input)
- Web Speech API for browser-native voice recognition
- Real-time transcription display
- Graceful fallback to chat if mic unavailable

### Text-to-Speech (Output)
- Browser SpeechSynthesis for AI responses
- Clear, natural speaking voice
- Can be muted/unmuted by user

### Visual States
- **Idle**: Microphone ready
- **Listening**: Active recording indicator
- **Processing**: AI thinking indicator
- **Speaking**: AI response playback

---

## 📋 Data Files Integration

Your uploaded files will be converted to:
- `policies.json` - Extracted from your Word document
- `products.json` - Your product catalog
- `faqs.json` - Product FAQs
- `orders.json` - Order database

All stored in the edge function and queried locally (no external API calls for data).

---

## 💬 Response Behavior

- Short, conversational sentences optimized for voice
- Always confirms actions ("I have initiated your cancellation request")
- Asks clarifying questions only when essential data is missing
- Maintains friendly, professional support tone
- Never invents product or order information

