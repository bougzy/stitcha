"use client";

import { motion } from "framer-motion";
import { Phone, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials, formatPhone, formatDate } from "@/lib/utils";
import type { Client } from "@/types";

interface ClientCardProps {
  client: Client;
  index?: number;
}

export function ClientCard({ client, index = 0 }: ClientCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => router.push(`/clients/${client._id}`)}
      className={cn(
        "group cursor-pointer",
        "rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md",
        "shadow-[0_8px_32px_rgba(26,26,46,0.06)]",
        "transition-all duration-300",
        "hover:border-white/30 hover:bg-white/55",
        "hover:shadow-[0_12px_40px_rgba(26,26,46,0.1)]",
        "hover:-translate-y-0.5",
        "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            "text-sm font-bold text-white",
            "transition-transform duration-300 group-hover:scale-105",
            client.gender === "female"
              ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
              : "bg-gradient-to-br from-[#1A1A2E] to-[#C75B39]"
          )}
        >
          {getInitials(client.name)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#1A1A2E]">
              {client.name}
            </h3>
            <Badge
              variant={client.gender === "female" ? "default" : "secondary"}
              className="shrink-0 text-[10px] capitalize"
            >
              {client.gender}
            </Badge>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#1A1A2E]/55">
            <Phone className="h-3 w-3" />
            <span className="truncate">{formatPhone(client.phone)}</span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#1A1A2E]/45">
            <Calendar className="h-3 w-3" />
            <span>
              {client.lastMeasuredAt
                ? `Measured ${formatDate(client.lastMeasuredAt)}`
                : "No measurements"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
