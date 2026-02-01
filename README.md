# Nova Voice - AI-Powered Customer Support Agent

Nova Voice is a state-of-the-art, voice-first intelligent customer support agent designed for modern e-commerce. It leverages advanced Large Language Models (LLMs) and Edge Computing to provide near-instant responses, helping customers track orders, browse products, and resolve issues purely through voice interaction.

---

## 🚀 Features

-   **Voice-First Interface**: Native browser-based Speech-to-Text (STT) and Text-to-Speech (TTS) for zero-lag interaction.
-   **Intelligent Reasoning**: Powered by Google Gemini 1.5 Flash to understand complex user intents and follow-up questions.
-   **Context-Aware**: Maintains conversation history (last order discussed, product interests) to provide personalized assistance.
-   **Live Data Integration**: Uses AI function calling to interact with real-time product databases and order management systems.
-   **Premium UI**: Built with a modern, glassmorphic design system using React and Tailwind CSS.
-   **Low Latency**: Optimized backend via Supabase Edge Functions for global performance.

## 🛠️ Tech Stack

-   **Frontend**: React 18, Vite, TypeScript
-   **Styling**: Tailwind CSS, shadcn/ui, Lucide Icons
-   **AI Engine**: Google Gemini 1.5 Flash (via Gateway)
-   **Backend & Orchestration**: Supabase Edge Functions (Deno)
-   **Voice Processing**: Web Speech API (Native Browser Support)
-   **State Management**: React Hooks & TanStack Query

## 🏗️ System Architecture

Nova Voice follows a serverless, decoupled architecture:

1.  **Client-Side**: Captures voice input locally, converts to text, and sends a lightweight JSON payload.
2.  **Edge Compute**: Supabase Edge Functions manage the business logic and session context.
3.  **AI Layer**: Gemini processes the intent and decides whether to trigger "Tools" (like checking order status).
4.  **Response**: The AI response is streamed back and synthesized into a natural-sounding voice on the client.

## 🏁 Getting Started

### Prerequisites

-   Node.js (v18+)
-   npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd voice-first-guide
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root and add your Supabase and AI Gateway credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📜 Business Use Cases

-   **E-commerce**: Track packages, search for items by description, and handle return requests.
-   **SaaS Support**: Answer FAQ queries and guide users through platform features.
-   **Booking Services**: Check reservation status and provide policy information.

---

*This project was developed for the Hackathon 2026.*
