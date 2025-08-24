"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface ProfileCardProps {
  name: string;
  description?: string;
  image?: string;
}

export function ProfileCard({ name, description, image }: ProfileCardProps) {
  return (
    <Card className="p-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {image ? (
            <AvatarImage src={image} alt={name} />
          ) : (
            <AvatarFallback>{name?.[0] ?? "?"}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="text-sm font-semibold leading-none">{name}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
