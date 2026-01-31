// Types for the AI Voice Customer Support Agent

export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  price: number;
  stock_available: number;
  rating: number;
  review_count: number;
  description: string;
  discount_percentage?: number;
  return_eligible: boolean;
  delivery_time_days: number;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ProductFAQ {
  product_id: string;
  product_name: string;
  faqs: FAQ[];
}

export interface OrderProduct {
  product_id: string;
  product_name: string;
}

export interface Order {
  order_id: string;
  customer_id: string;
  products: OrderProduct[];
  order_status: 'Placed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  order_date: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: Product[];
  order?: Order;
}

export interface SessionContext {
  customerId: string;
  lastOrderId?: string;
  lastProductId?: string;
  lastIntent?: string;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface ConversationHistory {
  customerId: string;
  messages: Message[];
  lastUpdated: Date;
}
