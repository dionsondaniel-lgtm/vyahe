import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Message, UserProfile } from "../types";
import { FiSend, FiX } from "react-icons/fi";

interface ChatProps {
  orderId: string;
  currentUser: UserProfile;
  otherUser: { id: string; name: string };
  onClose: () => void;
}

export default function Chat({ orderId, currentUser, otherUser, onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "VYAHE_messages" },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg.order_id === orderId) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("VYAHE_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("VYAHE_messages").insert([
      {
        order_id: orderId,
        sender_id: currentUser.id,
        receiver_id: otherUser.id,
        content: newMessage,
      },
    ]);

    if (!error) {
      setNewMessage("");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex justify-between items-center">
        <div>
          <h3 className="font-bold">{otherUser.name}</h3>
          <p className="text-xs opacity-80">Order #{orderId.slice(0, 6)}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
          <FiX size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">No messages yet. Say hi!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none shadow-sm"
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
}
