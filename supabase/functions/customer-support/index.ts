import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import data files
import products from "./data/products.json" with { type: "json" };
import faqs from "./data/faqs.json" with { type: "json" };
import orders from "./data/orders.json" with { type: "json" };
import policies from "./data/policies.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for the AI agent
const tools = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search products by name, category, or price range. Use this when user wants to find or browse products.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product name to search for (partial match)" },
          category: { type: "string", description: "Product category (e.g., Electronics, Clothing, Home, Beauty, Sports)" },
          minPrice: { type: "number", description: "Minimum price filter" },
          maxPrice: { type: "number", description: "Maximum price filter" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getProductDetails",
      description: "Get detailed information about a specific product by ID",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "The product ID (e.g., P1001)" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getProductFAQs",
      description: "Get frequently asked questions for a specific product",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "The product ID (e.g., P1001)" }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trackOrder",
      description: "Track an order's status. Validates that the order belongs to the customer.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID (e.g., O0001)" },
          customerId: { type: "string", description: "The customer ID to validate ownership" }
        },
        required: ["orderId", "customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCustomerOrders",
      description: "Get all orders for a specific customer",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "The customer ID" }
        },
        required: ["customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "initiateCancellation",
      description: "Initiate a cancellation request for an order. Does not mutate data, only returns confirmation.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID to cancel" },
          customerId: { type: "string", description: "The customer ID to validate ownership" }
        },
        required: ["orderId", "customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "initiateReturn",
      description: "Initiate a return request for an order. Does not mutate data, only returns confirmation.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID to return" },
          customerId: { type: "string", description: "The customer ID to validate ownership" }
        },
        required: ["orderId", "customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getPolicy",
      description: "Get company policy information for returns, refunds, cancellations, or delivery",
      parameters: {
        type: "object",
        properties: {
          policyType: { 
            type: "string", 
            enum: ["return", "refund", "cancellation", "delivery"],
            description: "Type of policy to retrieve" 
          }
        },
        required: ["policyType"]
      }
    }
  }
];

// Tool implementations
function searchProducts(params: { name?: string; category?: string; minPrice?: number; maxPrice?: number }) {
  let results = [...products];
  
  if (params.name) {
    const searchName = params.name.toLowerCase();
    results = results.filter(p => p.product_name.toLowerCase().includes(searchName));
  }
  
  if (params.category) {
    const searchCategory = params.category.toLowerCase();
    results = results.filter(p => p.category.toLowerCase().includes(searchCategory));
  }
  
  if (params.minPrice !== undefined) {
    results = results.filter(p => p.price >= params.minPrice!);
  }
  
  if (params.maxPrice !== undefined) {
    results = results.filter(p => p.price <= params.maxPrice!);
  }
  
  // Limit to top 5 results for voice-friendly responses
  return results.slice(0, 5);
}

function getProductDetails(productId: string) {
  const product = products.find(p => p.product_id === productId);
  if (!product) {
    return { error: `Product with ID ${productId} not found` };
  }
  return product;
}

function getProductFAQs(productId: string) {
  const productFaq = faqs.find(f => f.product_id === productId);
  if (!productFaq) {
    return { error: `FAQs for product ${productId} not found` };
  }
  return productFaq;
}

function trackOrder(orderId: string, customerId: string) {
  const order = orders.find(o => o.order_id === orderId);
  if (!order) {
    return { error: `Order ${orderId} not found` };
  }
  if (order.customer_id !== customerId) {
    return { error: `Order ${orderId} does not belong to customer ${customerId}` };
  }
  return order;
}

function getCustomerOrders(customerId: string) {
  const customerOrders = orders.filter(o => o.customer_id === customerId);
  if (customerOrders.length === 0) {
    return { message: `No orders found for customer ${customerId}` };
  }
  return customerOrders;
}

function initiateCancellation(orderId: string, customerId: string) {
  const order = orders.find(o => o.order_id === orderId);
  if (!order) {
    return { error: `Order ${orderId} not found` };
  }
  if (order.customer_id !== customerId) {
    return { error: `Order ${orderId} does not belong to customer ${customerId}` };
  }
  if (order.order_status === 'Cancelled') {
    return { message: `Order ${orderId} has already been cancelled.` };
  }
  if (order.order_status === 'Delivered') {
    return { message: `Order ${orderId} has already been delivered. Please use return instead.` };
  }
  if (order.order_status === 'Out for Delivery') {
    return { message: `Order ${orderId} is currently out for delivery and cannot be cancelled. You may refuse delivery or return after receiving.` };
  }
  return { 
    success: true, 
    message: `I have initiated the cancellation request for order ${orderId}. You will receive a confirmation email shortly. The refund will be processed within 3-5 business days.`,
    order
  };
}

function initiateReturn(orderId: string, customerId: string) {
  const order = orders.find(o => o.order_id === orderId);
  if (!order) {
    return { error: `Order ${orderId} not found` };
  }
  if (order.customer_id !== customerId) {
    return { error: `Order ${orderId} does not belong to customer ${customerId}` };
  }
  if (order.order_status !== 'Delivered') {
    return { message: `Order ${orderId} cannot be returned as it has not been delivered yet. Current status: ${order.order_status}` };
  }
  return { 
    success: true, 
    message: `I have initiated the return request for order ${orderId}. A pickup will be scheduled within 2-3 business days. Please ensure items are unused and in original packaging.`,
    order
  };
}

function getPolicy(policyType: string) {
  const policy = policies[policyType as keyof typeof policies];
  if (!policy) {
    return { error: `Policy type '${policyType}' not found. Available types: return, refund, cancellation, delivery` };
  }
  return policy;
}

function validateCustomerId(customerId: string): boolean {
  return orders.some(o => o.customer_id === customerId);
}

function executeToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "searchProducts":
      return searchProducts(args as Parameters<typeof searchProducts>[0]);
    case "getProductDetails":
      return getProductDetails(args.productId as string);
    case "getProductFAQs":
      return getProductFAQs(args.productId as string);
    case "trackOrder":
      return trackOrder(args.orderId as string, args.customerId as string);
    case "getCustomerOrders":
      return getCustomerOrders(args.customerId as string);
    case "initiateCancellation":
      return initiateCancellation(args.orderId as string, args.customerId as string);
    case "initiateReturn":
      return initiateReturn(args.orderId as string, args.customerId as string);
    case "getPolicy":
      return getPolicy(args.policyType as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const systemPrompt = `You are a professional e-commerce customer support voice agent. Your role is to help customers with:
- Product discovery and search
- Product details and FAQs
- Order tracking
- Cancellation and return requests
- Policy explanations

IMPORTANT RULES:
1. Always use the provided tools to look up information. NEVER make up product or order information.
2. Keep responses short and conversational - optimized for voice output.
3. Always confirm actions clearly (e.g., "I have initiated your cancellation request").
4. Only ask clarifying questions when essential data is missing.
5. Maintain a friendly, professional support tone.
6. When discussing prices, format them nicely (e.g., ₹43,395 not 43395).
7. Remember the context from the conversation - use lastProductId for follow-up questions about "this product" or "it".
8. Use lastOrderId when customer says "my order" or "my last order" without specifying an ID.
9. The customer's ID is provided in the context - always use it for order-related queries.
10. For cancellation and return requests, the tools do NOT mutate data - they only return confirmation messages.

Context Memory:
- customerId: The logged-in customer's ID
- lastOrderId: The last order discussed in conversation
- lastProductId: The last product discussed in conversation
- lastIntent: The previous intent detected

Available Categories: Electronics, Clothing, Home, Beauty, Sports
Order Statuses: Placed, Shipped, Out for Delivery, Delivered, Cancelled`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, action } = await req.json();
    
    // Handle customer validation
    if (action === "validateCustomer") {
      const isValid = validateCustomerId(context?.customerId);
      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context message
    const contextMessage = context ? 
      `\n\nCurrent Context:\n- Customer ID: ${context.customerId}${context.lastOrderId ? `\n- Last Order ID: ${context.lastOrderId}` : ''}${context.lastProductId ? `\n- Last Product ID: ${context.lastProductId}` : ''}${context.lastIntent ? `\n- Last Intent: ${context.lastIntent}` : ''}` 
      : '';

    // Initial request with tools
    let aiMessages = [
      { role: "system", content: systemPrompt + contextMessage },
      ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
    ];

    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;
    
    // Handle tool calls in a loop
    let iterations = 0;
    const maxIterations = 5;
    const toolResults: Array<{ name: string; result: unknown }> = [];

    while (assistantMessage.tool_calls && iterations < maxIterations) {
      iterations++;
      
      // Execute all tool calls
      const toolCallResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = executeToolCall(toolCall.function.name, args);
        toolResults.push({ name: toolCall.function.name, result });
        toolCallResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      // Add assistant message with tool calls and tool results
      aiMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolCallResults
      ];

      // Request next completion
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        throw new Error("AI gateway error during tool handling");
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    // Extract context updates from tool results
    let updatedContext = { ...context };
    for (const { name, result } of toolResults) {
      if (name === "getProductDetails" && (result as { product_id?: string }).product_id) {
        updatedContext.lastProductId = (result as { product_id: string }).product_id;
        updatedContext.lastIntent = "product_details";
      } else if (name === "searchProducts" && Array.isArray(result) && result.length > 0) {
        updatedContext.lastProductId = result[0].product_id;
        updatedContext.lastIntent = "product_search";
      } else if (name === "trackOrder" && (result as { order_id?: string }).order_id) {
        updatedContext.lastOrderId = (result as { order_id: string }).order_id;
        updatedContext.lastIntent = "order_tracking";
      } else if (name === "initiateCancellation") {
        updatedContext.lastIntent = "cancellation";
      } else if (name === "initiateReturn") {
        updatedContext.lastIntent = "return";
      } else if (name === "getPolicy") {
        updatedContext.lastIntent = "policy";
      }
    }

    return new Response(
      JSON.stringify({
        content: assistantMessage.content,
        context: updatedContext,
        toolResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Customer support error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
