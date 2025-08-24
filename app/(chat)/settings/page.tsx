import { ThemeCustomizer } from '@/components/theme-customizer';

export default function SettingsPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Theme Settings</h1>
      <ThemeCustomizer />
    </main>
  );
}
