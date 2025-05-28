"use client";
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export interface ProfileCardProps {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  matchScore?: number;
  imageUrl?: string;
  query?: string;
}

function toCsv(profile: ProfileCardProps) {
  const headers = ['name', 'title', 'company', 'email'];
  const rows = [
    [profile.name, profile.title ?? '', profile.company ?? '', profile.email ?? ''],
  ];
  const csv = [headers.join(','), rows.map((r) => r.join(',')).join('\n')].join('\n');
  return csv;
}

export default function ProfileCard({
  name,
  title,
  company,
  email,
  matchScore,
  imageUrl,
  query,
}: ProfileCardProps) {
  const handleExport = () => {
    const csv = toCsv({ name, title, company, email });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    window.open(url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const initials = name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4"
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar>
            {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle>{name}</CardTitle>
            {(title || company) && (
              <CardDescription>
                {title}
                {title && company ? ', ' : ''}
                {company}
              </CardDescription>
            )}
            {query && (
              <p className="text-xs text-muted-foreground mt-1">Query: {query}</p>
            )}
          </div>
          {typeof matchScore === 'number' && (
            <Badge variant="secondary" className="self-start">
              {Math.round(matchScore * 100)}%
            </Badge>
          )}
        </CardHeader>
        <CardContent></CardContent>
        <CardFooter className="justify-end space-x-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
          {email && (
            <Button size="sm" onClick={() => (window.location.href = `mailto:${email}`)}>
              Contact
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
