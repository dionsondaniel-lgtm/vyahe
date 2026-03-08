export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Customer" | "Rider" | "Admin";
  is_online?: boolean;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  created_at: string;
  customer_id: string;
  rider_id?: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  payment_method: "Cash" | "GCash";
  payment_status: "pending" | "paid";
  status: "pending_approval" | "approved" | "assigned" | "picked_up" | "delivered" | "completed" | "cancelled";
  assigned_at?: string;
  delivered_at?: string;
  customer?: UserProfile; // Joined data
  rider?: UserProfile; // Joined data
}

export interface Notification {
  id: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read_status: boolean;
  room_id: string;
}

export interface Message {
  id: string;
  created_at: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
}
